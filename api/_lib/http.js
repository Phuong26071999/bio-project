'use strict';

/** Small HTTP helpers shared by the serverless functions in /api. */

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
 * websites from calling the endpoint. It is NOT protection against scripts
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

/** Reads a JSON body (Vercel pre-parses it; the local dev server does not). */
async function readBody(req, maxBytes) {
  // Vercel's body getter throws on malformed JSON.
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
        if (size > maxBytes) {
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
  if (Buffer.byteLength(raw) > maxBytes) throw new RequestError(413, 'payload_too_large');
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new RequestError(400, 'invalid_json');
  }
}

/** Common checks for JSON write requests: origin, content type, declared size. */
function assertJsonRequest(req, maxBytes) {
  if (!isAllowedOrigin(req)) throw new RequestError(403, 'forbidden_origin');
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw new RequestError(415, 'unsupported_media_type');
  if (Number(req.headers['content-length']) > maxBytes) throw new RequestError(413, 'payload_too_large');
}

module.exports = { RequestError, send, firstHeader, getClientIp, isAllowedOrigin, readBody, assertJsonRequest };
