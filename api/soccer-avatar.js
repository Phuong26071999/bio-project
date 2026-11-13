'use strict';

/**
 * /api/soccer-avatar — profile photos for the /soccer page.
 *
 * GET  ?id=<memberId>&v=<n>          -> the image (cached for a year; v busts the cache)
 * POST { id, photo: "data:image/…" } -> 200 { avatar: "/api/soccer-avatar?id=…&v=…" }
 *
 * Photos are resized in the browser before upload (small JPEGs), stored
 * one key per member so the main page state stays small. Uploading is open
 * to everyone, like other member edits, and rate limited per client.
 */

const { RequestError, send, getClientIp, readBody, assertJsonRequest } = require('./_lib/http');
const { hitLimit } = require('./_lib/rateLimit');
const { ValidationError, getBackend, loadState, parseAvatarDataUrl, saveAvatar, loadAvatar } = require('./_lib/soccerStore');

const MAX_BODY_BYTES = 120 * 1024;
const UPLOAD_LIMIT = { limit: 30, windowSeconds: 10 * 60 };
const ID = /^[a-z0-9-]{1,40}$/;

const MESSAGES = {
  method_not_allowed: 'Method not allowed.',
  forbidden_origin: 'Requests from this origin are not allowed.',
  unsupported_media_type: 'Content-Type must be application/json.',
  payload_too_large: 'The photo is too large.',
  invalid_json: 'The request body is not valid JSON.',
  invalid_request: 'Invalid request.',
  not_found: 'Photo not found.',
  read_only: 'Editing is not set up on this deployment.',
  rate_limited: 'Too many uploads. Please wait a moment.',
  storage_error: 'Could not reach the database. Please try again.',
};

function sendError(res, status, code, extra = {}, headers) {
  send(res, status, { error: { code, message: MESSAGES[code] || MESSAGES.storage_error, ...extra } }, headers);
}

async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = String((req.query && req.query.id) || new URL(req.url, 'http://x').searchParams.get('id') || '');
      if (!ID.test(id)) throw new RequestError(400, 'invalid_request');
      const photo = await loadAvatar(id);
      if (!photo) throw new RequestError(404, 'not_found');
      const bytes = Buffer.from(photo.data, 'base64');
      res.statusCode = 200;
      res.setHeader('Content-Type', photo.type);
      res.setHeader('Content-Length', String(bytes.length));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(bytes);
    }

    if (req.method !== 'POST') return sendError(res, 405, 'method_not_allowed', {}, { Allow: 'GET, POST' });
    if (!getBackend()) throw new RequestError(403, 'read_only');
    assertJsonRequest(req, MAX_BODY_BYTES);
    const body = await readBody(req, MAX_BODY_BYTES);
    const id = String((body && body.id) || '');
    if (!ID.test(id)) throw new RequestError(400, 'invalid_request');
    const state = await loadState();
    if (!state.members.some((m) => m.id === id)) throw new RequestError(400, 'invalid_request');
    const photo = parseAvatarDataUrl(body.photo);

    const limit = await hitLimit('soccer-avatar', getClientIp(req), UPLOAD_LIMIT);
    if (!limit.allowed) throw Object.assign(new RequestError(429, 'rate_limited'), { retryAfter: limit.retryAfter });

    await saveAvatar(id, photo);
    return send(res, 200, { avatar: `/api/soccer-avatar?id=${id}&v=${Date.now()}` });
  } catch (err) {
    if (err instanceof RequestError) {
      const headers = err.retryAfter ? { 'Retry-After': String(err.retryAfter) } : undefined;
      return sendError(res, err.status, err.code, {}, headers);
    }
    if (err instanceof ValidationError) return sendError(res, 400, 'invalid_request', { detail: err.message });
    console.error('[soccer-avatar] storage or unexpected error:', err);
    return sendError(res, 503, 'storage_error');
  }
}

module.exports = handler;
