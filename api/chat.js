'use strict';

/**
 * POST /api/chat — Vercel Serverless Function (Node.js runtime).
 *
 * Request:  { "messages": [{ "role": "user" | "assistant", "content": string }, ...] }
 *           The last message must come from the user.
 * Response: 200 { "reply": string }
 *           4xx/5xx { "error": { "code": string, "message": string } }
 *
 * The Gemini API key stays on the server (GEMINI_API_KEY env var). Provider
 * errors are logged here and never forwarded to the visitor.
 */

const { buildSystemInstruction } = require('./_lib/knowledge');
const { checkRateLimit } = require('./_lib/rateLimit');
const { getProviderConfig, generateReply } = require('./_lib/provider');

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGES = 20; // accepted from the client
const MAX_HISTORY = 12; // forwarded to the model
const MAX_USER_CHARS = 1000;
const MAX_ASSISTANT_CHARS = 4000; // trimmed further before forwarding
const FORWARDED_ASSISTANT_CHARS = 1500;
const DEFAULT_PROVIDER_TIMEOUT_MS = 20000;

const SYSTEM_INSTRUCTION = buildSystemInstruction();

const MESSAGES = {
  method_not_allowed: 'Method not allowed.',
  forbidden_origin: 'Requests from this origin are not allowed.',
  unsupported_media_type: 'Content-Type must be application/json.',
  payload_too_large: 'The request is too large.',
  invalid_json: 'The request body is not valid JSON.',
  invalid_request: 'Invalid request.',
  message_too_long: `Your message is too long (max ${MAX_USER_CHARS} characters).`,
  not_configured: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
  rate_limited: 'Too many requests. Please try again in a moment.',
  quota_exceeded: 'The assistant has reached its usage limit for now. Please try again later.',
  timeout: 'The assistant took too long to respond. Please try again.',
  unavailable: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
  empty_reply: "Sorry, I couldn't generate an answer to that. Could you rephrase your question?",
  internal_error: 'Something went wrong. Please try again later.',
};

class RequestError extends Error {
  constructor(status, code, detail) {
    super(detail || code);
    this.status = status;
    this.code = code;
  }
}

function send(res, status, payload, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function sendError(res, status, code, headers) {
  send(res, status, { error: { code, message: MESSAGES[code] || MESSAGES.internal_error } }, headers);
}

function firstHeader(value) {
  return (Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();
}

function getClientIp(req) {
  return firstHeader(req.headers['x-real-ip'])
    || firstHeader(req.headers['x-forwarded-for'])
    || (req.socket && req.socket.remoteAddress)
    || 'unknown';
}

/**
 * Browsers always send Origin on cross-site POSTs, so this blocks other
 * websites from embedding the endpoint. It is NOT protection against scripts
 * (they can omit or forge Origin) — rate limiting covers that.
 */
function isAllowedOrigin(req) {
  const origin = firstHeader(req.headers.origin);
  if (!origin) return true;
  let parsed;
  try {
    parsed = new URL(origin);
  } catch (err) {
    return false;
  }
  const host = firstHeader(req.headers['x-forwarded-host']) || firstHeader(req.headers.host);
  if (parsed.host === host) return true;
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/+$/, ''));
  return extra.includes(parsed.origin);
}

async function readBody(req) {
  // Vercel pre-parses JSON bodies; its getter throws on malformed JSON.
  let parsed;
  try {
    parsed = req.body;
  } catch (err) {
    throw new RequestError(400, 'invalid_json');
  }
  if (parsed !== undefined && parsed !== null && typeof parsed !== 'string' && !Buffer.isBuffer(parsed)) {
    return parsed;
  }

  let raw = typeof parsed === 'string' || Buffer.isBuffer(parsed) ? String(parsed) : '';
  if (!raw && typeof req.on === 'function') {
    raw = await new Promise((resolve, reject) => {
      const chunks = [];
      let size = 0;
      req.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
          reject(new RequestError(413, 'payload_too_large'));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw new RequestError(413, 'payload_too_large');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new RequestError(400, 'invalid_json');
  }
}

/** Validates the payload and returns the trimmed history to send to the model. */
function validateMessages(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.messages)) {
    throw new RequestError(400, 'invalid_request', 'messages must be an array');
  }
  const { messages } = body;
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    throw new RequestError(400, 'invalid_request', `messages must contain 1-${MAX_MESSAGES} items`);
  }

  const cleaned = messages.map((m, i) => {
    if (!m || typeof m !== 'object' || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      throw new RequestError(400, 'invalid_request', `messages[${i}] is malformed`);
    }
    const content = m.content.replace(/\u0000/g, '').trim();
    if (!content) throw new RequestError(400, 'invalid_request', `messages[${i}] is empty`);
    const max = m.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS;
    if (content.length > max) {
      throw new RequestError(400, m.role === 'user' ? 'message_too_long' : 'invalid_request', `messages[${i}] too long`);
    }
    return {
      role: m.role,
      content: m.role === 'assistant' ? content.slice(0, FORWARDED_ASSISTANT_CHARS) : content,
    };
  });

  if (cleaned[cleaned.length - 1].role !== 'user') {
    throw new RequestError(400, 'invalid_request', 'last message must be from the user');
  }

  const history = cleaned.slice(-MAX_HISTORY);
  // Gemini conversations must start with a user turn.
  while (history.length && history[0].role !== 'user') history.shift();
  // Merge consecutive same-role turns (e.g. a user message whose reply failed).
  return history.reduce((turns, m) => {
    const prev = turns[turns.length - 1];
    if (prev && prev.role === m.role) prev.content = `${prev.content}\n\n${m.content}`;
    else turns.push({ ...m });
    return turns;
  }, []);
}

const PROVIDER_ERRORS = {
  quota: [429, 'quota_exceeded'],
  timeout: [504, 'timeout'],
  config: [503, 'not_configured'],
  empty: [502, 'empty_reply'],
  unavailable: [503, 'unavailable'],
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'method_not_allowed', { Allow: 'POST' });
  }
  try {
    if (!isAllowedOrigin(req)) return sendError(res, 403, 'forbidden_origin');

    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.startsWith('application/json')) return sendError(res, 415, 'unsupported_media_type');

    const declaredLength = Number(req.headers['content-length']);
    if (declaredLength > MAX_BODY_BYTES) return sendError(res, 413, 'payload_too_large');

    const history = validateMessages(await readBody(req));

    const config = getProviderConfig();
    if (config.error) {
      console.error(`[chat] misconfigured: ${config.error}`);
      return sendError(res, 503, 'not_configured');
    }

    const limit = await checkRateLimit(getClientIp(req));
    if (!limit.allowed) {
      console.warn(`[chat] rate limited (${limit.scope}, store=${limit.store})`);
      return sendError(res, 429, 'rate_limited', { 'Retry-After': String(limit.retryAfter) });
    }

    const timeoutMs = Number(process.env.CHAT_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS;
    const signal = AbortSignal.timeout(timeoutMs);
    const reply = await generateReply(config, { systemInstruction: SYSTEM_INSTRUCTION, history, signal });
    return send(res, 200, { reply });
  } catch (err) {
    if (err instanceof RequestError) {
      return sendError(res, err.status, err.code);
    }
    if (err && err.name === 'ProviderError') {
      const [status, code] = PROVIDER_ERRORS[err.code] || PROVIDER_ERRORS.unavailable;
      console.error(`[chat] provider error (${err.code}): ${err.message}`, err.cause ? err.cause.message : '');
      return sendError(res, status, code, status === 429 ? { 'Retry-After': '60' } : undefined);
    }
    console.error('[chat] unexpected error:', err);
    return sendError(res, 500, 'internal_error');
  }
}

module.exports = handler;
module.exports.validateMessages = validateMessages;
module.exports.limits = { MAX_MESSAGES, MAX_HISTORY, MAX_USER_CHARS };
