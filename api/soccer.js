'use strict';

/**
 * /api/soccer — Vercel Serverless Function for the /soccer team page.
 *
 * GET                       -> 200 { state, writable, fundPin }
 * POST { action: "verify" } -> 200 { ok: true } when the X-Admin-Pin header is correct
 * PUT  { version, state }   -> 200 { state } (saved), 409 { state } if someone saved first
 *
 * Anyone can read and edit members, teams and the schedule. Changes to the
 * fund (payments, fee, expenses) need the admin PIN (SOCCER_ADMIN_PIN env var);
 * the server checks this by comparing the fund before and after, so it can't
 * be bypassed from the client. Failed PIN attempts and writes are rate limited.
 */

const crypto = require('crypto');
const { RequestError, send, getClientIp, readBody, assertJsonRequest } = require('./_lib/http');
const { hitLimit, redisEnvNames } = require('./_lib/rateLimit');
const { ValidationError, validateState, loadState, saveState, getBackend } = require('./_lib/soccerStore');

const MAX_BODY_BYTES = 128 * 1024;
const PIN_LIMIT = { limit: 5, windowSeconds: 15 * 60 };
// Open edits are unauthenticated, so cap them per client to stop spam.
const WRITE_LIMIT = { limit: 120, windowSeconds: 10 * 60 };

const MESSAGES = {
  method_not_allowed: 'Method not allowed.',
  forbidden_origin: 'Requests from this origin are not allowed.',
  unsupported_media_type: 'Content-Type must be application/json.',
  payload_too_large: 'The request is too large.',
  invalid_json: 'The request body is not valid JSON.',
  invalid_request: 'Invalid request.',
  read_only: 'Editing is not set up on this deployment.',
  fund_locked: 'Fund changes need the admin PIN.',
  rate_limited: 'Too many changes. Please wait a moment.',
  wrong_pin: 'Wrong PIN.',
  pin_locked: 'Too many wrong PINs. Try again later.',
  conflict: 'Someone else saved changes first. The latest data has been loaded.',
  storage_error: 'Could not reach the database. Please try again.',
  internal_error: 'Something went wrong. Please try again later.',
};

function sendError(res, status, code, extra = {}, headers) {
  send(res, status, { error: { code, message: MESSAGES[code] || MESSAGES.internal_error, ...extra } }, headers);
}

const sha = (value) => crypto.createHash('sha256').update(String(value)).digest();
const adminPin = () => (process.env.SOCCER_ADMIN_PIN || '').trim();

/** Order-independent snapshot of the fund, used to detect fund changes. */
function fundKey(fund) {
  const payments = Object.keys(fund.payments || {}).sort()
    .map((month) => [month, [...fund.payments[month]].sort()])
    .filter(([, ids]) => ids.length);
  return JSON.stringify([fund.fee, payments, fund.expenses || []]);
}

/** Throws unless the request carries the admin PIN; failures are rate limited. */
async function requireAdmin(req) {
  const expected = adminPin();
  if (!expected || !getBackend()) throw new RequestError(403, expected ? 'read_only' : 'fund_locked');

  const ip = getClientIp(req);
  const room = await hitLimit('soccer-pin', ip, { ...PIN_LIMIT, peek: true });
  if (!room.allowed) throw Object.assign(new RequestError(429, 'pin_locked'), { retryAfter: room.retryAfter });

  const given = String(req.headers['x-admin-pin'] || '').trim();
  if (!given || !crypto.timingSafeEqual(sha(given), sha(expected))) {
    await hitLimit('soccer-pin', ip, PIN_LIMIT);
    throw new RequestError(401, 'wrong_pin');
  }
}

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const state = await loadState();
      const backend = getBackend();
      const writable = Boolean(backend);
      const body = { state, writable, fundPin: writable && Boolean(adminPin()), storage: backend ? backend.type : 'none' };
      // Setup hint when storage is missing: names only, never values.
      if (!backend) body.redisEnvFound = redisEnvNames();
      return send(res, 200, body);
    }

    if (req.method !== 'POST' && req.method !== 'PUT') {
      return sendError(res, 405, 'method_not_allowed', {}, { Allow: 'GET, POST, PUT' });
    }

    assertJsonRequest(req, MAX_BODY_BYTES);
    const body = await readBody(req, MAX_BODY_BYTES);
    if (!body || typeof body !== 'object') throw new RequestError(400, 'invalid_request');

    if (req.method === 'POST') {
      if (body.action !== 'verify') throw new RequestError(400, 'invalid_request');
      await requireAdmin(req);
      return send(res, 200, { ok: true });
    }

    if (!getBackend()) throw new RequestError(403, 'read_only');
    const clean = validateState(body.state);
    const current = await loadState();
    if (body.version !== current.version) {
      return sendError(res, 409, 'conflict', { state: current });
    }
    if (fundKey(clean.fund) !== fundKey(current.fund)) {
      await requireAdmin(req);
    } else {
      const writes = await hitLimit('soccer-write', getClientIp(req), WRITE_LIMIT);
      if (!writes.allowed) throw Object.assign(new RequestError(429, 'rate_limited'), { retryAfter: writes.retryAfter });
    }
    const next = { version: current.version + 1, updatedAt: new Date().toISOString(), ...clean };
    await saveState(next);
    return send(res, 200, { state: next });
  } catch (err) {
    if (err instanceof RequestError) {
      const headers = err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : undefined;
      return sendError(res, err.status, err.code, {}, headers);
    }
    if (err instanceof ValidationError) {
      return sendError(res, 400, 'invalid_request', { detail: err.message });
    }
    console.error('[soccer] storage or unexpected error:', err);
    return sendError(res, 503, 'storage_error');
  }
}

module.exports = handler;
