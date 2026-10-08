'use strict';

/**
 * Fixed-window rate limiting for /api/chat.
 *
 * Serverless instances don't share memory, so an in-memory counter alone is
 * not a real limit. When Upstash Redis credentials are configured (free tier,
 * or the Upstash integration from the Vercel Marketplace) counters are shared
 * across every instance via Upstash's REST API — no extra dependency needed.
 * Without them we fall back to a per-instance in-memory limiter, which only
 * slows down bursts hitting the same warm instance. See README for details.
 */

const crypto = require('crypto');

const toInt = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

function getLimits(env = process.env) {
  return {
    perMinute: toInt(env.RATE_LIMIT_PER_MINUTE, 8),
    perDay: toInt(env.RATE_LIMIT_PER_DAY, 60),
    globalPerDay: toInt(env.RATE_LIMIT_GLOBAL_PER_DAY, 500),
  };
}

function getRedisConfig(env = process.env) {
  // Upstash's own names, or the names the Vercel Marketplace integration injects.
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

/** Hash the IP so raw visitor addresses are never stored. */
function hashClient(ip) {
  const salt = process.env.RATE_LIMIT_SALT || 'portfolio-chat';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 24);
}

function buildRules(clientId, now, limits) {
  const minute = Math.floor(now / 60000);
  const day = Math.floor(now / 86400000);
  return [
    { key: `chat:rl:m:${clientId}:${minute}`, limit: limits.perMinute, ttl: 60, resetAt: (minute + 1) * 60000 },
    { key: `chat:rl:d:${clientId}:${day}`, limit: limits.perDay, ttl: 86400, resetAt: (day + 1) * 86400000 },
    { key: `chat:rl:g:${day}`, limit: limits.globalPerDay, ttl: 86400, resetAt: (day + 1) * 86400000 },
  ];
}

async function incrementRedis(redis, rules) {
  const commands = rules.flatMap((r) => [['INCR', r.key], ['EXPIRE', r.key, String(r.ttl)]]);
  const response = await fetch(`${redis.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redis.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const results = await response.json();
  return rules.map((_, i) => {
    const entry = results[i * 2];
    if (!entry || entry.error) throw new Error(`Upstash error: ${entry && entry.error}`);
    return Number(entry.result);
  });
}

const memoryCounters = new Map();

function incrementMemory(rules, now) {
  if (memoryCounters.size > 5000) {
    for (const [key, value] of memoryCounters) {
      if (value.resetAt <= now) memoryCounters.delete(key);
    }
  }
  return rules.map((r) => {
    const entry = memoryCounters.get(r.key) || { count: 0, resetAt: r.resetAt };
    entry.count += 1;
    memoryCounters.set(r.key, entry);
    return entry.count;
  });
}

/**
 * Counts this request and reports whether it is allowed.
 * Fails open (falls back to memory) if Redis is unreachable, so an Upstash
 * outage doesn't take the chatbot down.
 */
async function checkRateLimit(ip, { now = Date.now(), env = process.env, logger = console } = {}) {
  const limits = getLimits(env);
  const rules = buildRules(hashClient(ip || 'unknown'), now, limits);
  const redis = getRedisConfig(env);

  let counts;
  let store = 'memory';
  if (redis) {
    try {
      counts = await incrementRedis(redis, rules);
      store = 'redis';
    } catch (err) {
      logger.error('[chat] rate limit store unavailable, using in-memory fallback:', err.message);
    }
  }
  if (!counts) counts = incrementMemory(rules, now);

  const exceeded = rules.find((r, i) => counts[i] > r.limit);
  if (!exceeded) return { allowed: true, store };
  return {
    allowed: false,
    store,
    scope: exceeded.key.startsWith('chat:rl:g:') ? 'global' : 'client',
    retryAfter: Math.max(1, Math.ceil((exceeded.resetAt - now) / 1000)),
  };
}

function resetMemoryRateLimit() {
  memoryCounters.clear();
}

module.exports = { checkRateLimit, getLimits, getRedisConfig, resetMemoryRateLimit };
