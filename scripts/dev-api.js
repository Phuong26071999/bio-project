'use strict';

/**
 * Local development only: serves the Vercel function in api/chat.js on
 * http://localhost:3010 so `npm start` (which proxies /api via the "proxy"
 * field in package.json) can talk to it without the Vercel CLI.
 * Production never uses this file — Vercel runs api/chat.js directly.
 *
 *   npm run dev:api        # terminal 1
 *   npm start              # terminal 2
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

for (const file of ['.env.local', '.env']) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) process.loadEnvFile(fullPath);
}

const PORT = Number(process.env.DEV_API_PORT || 3010);

// CRA's proxy rewrites Origin to the proxy target and sets X-Forwarded-Host to
// the dev server, so allow those local origins (dev only).
if (!process.env.ALLOWED_ORIGINS) {
  const ports = [PORT, 3000, 3001, 3002, 3003];
  process.env.ALLOWED_ORIGINS = ports
    .flatMap((port) => [`http://localhost:${port}`, `http://127.0.0.1:${port}`])
    .join(',');
}

const chatHandler = require('../api/chat');

http
  .createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/chat') return chatHandler(req, res);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'not_found', message: 'Not found.' } }));
  })
  .listen(PORT, () => {
    const provider = process.env.CHAT_PROVIDER || 'gemini';
    console.log(`[dev-api] /api/chat listening on http://localhost:${PORT} (provider: ${provider})`);
  });
