'use strict';

/**
 * Storage + validation for the /soccer team page.
 *
 * The whole page state is one small JSON document. On Vercel it lives in
 * Upstash Redis (same credentials as the chat rate limiter). Locally, without
 * Redis, it is kept in .data/soccer.json so it survives dev-server restarts.
 * Deployed without Redis the page is read-only (seed data).
 */

const fs = require('fs');
const path = require('path');
const { getRedisConfig } = require('./rateLimit');
const seed = require('../../src/soccer/seed.json');

const KEY = 'soccer:state';
const LOCAL_FILE = path.join(__dirname, '..', '..', '.data', 'soccer.json');

const LIMITS = { members: 40, months: 36, expenses: 300, matches: 200, teams: 4 };

class ValidationError extends Error {}

const fail = (msg) => { throw new ValidationError(msg); };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function str(v, max, field, { optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return '';
    fail(`${field} is required`);
  }
  if (typeof v !== 'string') fail(`${field} must be a string`);
  const s = v.replace(/[\u0000-\u001f]/g, '').trim();
  if (!s && !optional) fail(`${field} is required`);
  if (s.length > max) fail(`${field} is too long`);
  return s;
}

function int(v, min, max, field) {
  if (!Number.isInteger(v) || v < min || v > max) fail(`${field} must be an integer between ${min} and ${max}`);
  return v;
}

function id(v, field) {
  const s = str(v, 40, field);
  if (!/^[a-z0-9-]+$/.test(s)) fail(`${field} has invalid characters`);
  return s;
}

// Uploaded photos are served by /api/soccer-avatar (see saveAvatar below).
const UPLOADED_AVATAR = /^\/api\/soccer-avatar\?id=[a-z0-9-]+&v=\d{1,15}$/;

function avatarUrl(v, field) {
  const s = str(v, 400, field, { optional: true });
  if (s && !/^https:\/\//i.test(s) && !UPLOADED_AVATAR.test(s)) fail(`${field} must be an https URL or an uploaded photo`);
  return s;
}

/** Shirt number 0-99, or null when not set. */
function shirtNumber(v, field) {
  if (v === undefined || v === null || v === '') return null;
  return int(v, 0, 99, field);
}

/** Returns a clean copy of the client's state or throws ValidationError. */
function validateState(input) {
  if (!isObj(input)) fail('state must be an object');
  const { members, fund, matches } = input;

  if (!Array.isArray(members) || members.length > LIMITS.members) fail('members must be an array');
  const memberIds = new Set();
  const cleanMembers = members.map((m, i) => {
    if (!isObj(m)) fail(`members[${i}] is invalid`);
    const memberId = id(m.id, `members[${i}].id`);
    if (memberIds.has(memberId)) fail(`members[${i}].id is duplicated`);
    memberIds.add(memberId);
    // Older saves may still carry a "role" field; it is no longer used and is dropped here.
    return {
      id: memberId,
      name: str(m.name, 60, `members[${i}].name`),
      number: shirtNumber(m.number, `members[${i}].number`),
      tier: int(m.tier, 1, 5, `members[${i}].tier`),
      goals: int(m.goals, 0, 9999, `members[${i}].goals`),
      avatar: avatarUrl(m.avatar, `members[${i}].avatar`),
    };
  });
  const knownId = (v, field) => {
    const s = id(v, field);
    if (!memberIds.has(s)) fail(`${field} is not a member`);
    return s;
  };

  if (!isObj(fund)) fail('fund must be an object');
  if (!isObj(fund.payments) || Object.keys(fund.payments).length > LIMITS.months) fail('fund.payments is invalid');
  const payments = {};
  Object.entries(fund.payments).forEach(([month, ids]) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail(`fund.payments month "${month}" is invalid`);
    if (!Array.isArray(ids)) fail(`fund.payments.${month} must be an array`);
    payments[month] = [...new Set(ids.map((v, i) => knownId(v, `fund.payments.${month}[${i}]`)))];
  });
  if (!Array.isArray(fund.expenses) || fund.expenses.length > LIMITS.expenses) fail('fund.expenses is invalid');
  const expenses = fund.expenses.map((e, i) => {
    if (!isObj(e)) fail(`fund.expenses[${i}] is invalid`);
    const date = str(e.date, 10, `fund.expenses[${i}].date`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`fund.expenses[${i}].date is invalid`);
    return {
      id: id(e.id, `fund.expenses[${i}].id`),
      date,
      note: str(e.note, 120, `fund.expenses[${i}].note`),
      amount: int(e.amount, 0, 1000000000, `fund.expenses[${i}].amount`),
    };
  });

  if (!Array.isArray(matches) || matches.length > LIMITS.matches) fail('matches must be an array');
  const cleanMatches = matches.map((m, i) => {
    if (!isObj(m)) fail(`matches[${i}] is invalid`);
    const date = str(m.date, 25, `matches[${i}].date`);
    if (Number.isNaN(Date.parse(date))) fail(`matches[${i}].date is invalid`);
    if (!Array.isArray(m.teams) || m.teams.length > LIMITS.teams) fail(`matches[${i}].teams is invalid`);
    return {
      id: id(m.id, `matches[${i}].id`),
      date,
      location: str(m.location, 120, `matches[${i}].location`),
      note: str(m.note, 200, `matches[${i}].note`, { optional: true }),
      score: str(m.score, 20, `matches[${i}].score`, { optional: true }),
      teams: m.teams.map((team, t) => {
        if (!Array.isArray(team) || team.length > LIMITS.members) fail(`matches[${i}].teams[${t}] is invalid`);
        return team.map((v, k) => knownId(v, `matches[${i}].teams[${t}][${k}]`));
      }),
    };
  });

  return {
    members: cleanMembers,
    fund: { fee: int(fund.fee, 0, 100000000, 'fund.fee'), payments, expenses },
    matches: cleanMatches,
  };
}

async function redisCommand(redis, command) {
  const response = await fetch(redis.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(`Upstash error: ${data.error}`);
  return data.result;
}

/** Where state is stored in this environment; null means read-only. */
function getBackend(env = process.env) {
  const redis = getRedisConfig(env);
  if (redis) return { type: 'redis', redis };
  if (!env.VERCEL) return { type: 'file' };
  return null;
}

async function loadState(env = process.env) {
  const backend = getBackend(env);
  let raw = null;
  if (backend && backend.type === 'redis') raw = await redisCommand(backend.redis, ['GET', KEY]);
  if (backend && backend.type === 'file' && fs.existsSync(LOCAL_FILE)) raw = fs.readFileSync(LOCAL_FILE, 'utf8');
  const state = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(seed));
  // Older saves: drop the removed "role" field and default the shirt number.
  state.members = (state.members || []).map(({ role, ...m }) => ({ ...m, number: m.number ?? null }));
  return state;
}

/* ---------- uploaded profile photos (kept out of the main state) ---------- */

const AVATAR_KEY = (memberId) => `soccer:avatar:${memberId}`;
const AVATAR_DIR = path.join(path.dirname(LOCAL_FILE), 'avatars');
const MAX_AVATAR_BYTES = 80 * 1024;
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Checks a "data:image/...;base64,..." string and returns { type, data }. */
function parseAvatarDataUrl(value) {
  const match = typeof value === 'string' && value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match || !AVATAR_TYPES.includes(match[1])) fail('photo must be a JPEG, PNG or WebP image');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) fail('photo is too large');
  return { type: match[1], data: match[2] };
}

async function saveAvatar(memberId, photo, env = process.env) {
  const backend = getBackend(env);
  if (!backend) throw new Error('No storage configured');
  const json = JSON.stringify(photo);
  if (backend.type === 'redis') {
    await redisCommand(backend.redis, ['SET', AVATAR_KEY(memberId), json]);
  } else {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
    fs.writeFileSync(path.join(AVATAR_DIR, `${memberId}.json`), json);
  }
}

async function loadAvatar(memberId, env = process.env) {
  const backend = getBackend(env);
  let raw = null;
  if (backend && backend.type === 'redis') raw = await redisCommand(backend.redis, ['GET', AVATAR_KEY(memberId)]);
  const file = path.join(AVATAR_DIR, `${memberId}.json`);
  if (backend && backend.type === 'file' && fs.existsSync(file)) raw = fs.readFileSync(file, 'utf8');
  return raw ? JSON.parse(raw) : null;
}

async function saveState(state, env = process.env) {
  const backend = getBackend(env);
  if (!backend) throw new Error('No storage configured');
  const json = JSON.stringify(state);
  if (backend.type === 'redis') {
    await redisCommand(backend.redis, ['SET', KEY, json]);
  } else {
    fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_FILE, json);
  }
}

module.exports = {
  ValidationError, validateState, loadState, saveState, getBackend,
  parseAvatarDataUrl, saveAvatar, loadAvatar,
};
