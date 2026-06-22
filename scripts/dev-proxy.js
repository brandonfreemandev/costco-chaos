#!/usr/bin/env node
// DEPRECATED: use `npm run dev` — Vite now proxies /ollama-api via scripts/ollamaDevProxy.ts.
// Kept for manual debugging only.

import http from 'http';
import https from 'https';

// ── Config (matches api/chat.php) ────────────────────────────
const PORT        = 8081;
const OLLAMA_KEY  = process.env.OLLAMA_API_KEY ?? '';
const OLLAMA_HOST = 'ollama.com';
const OLLAMA_PATH = '/api/chat';
const MODEL       = 'gemma4:31b';

if (!OLLAMA_KEY) {
  console.error('[dev-proxy] ERROR: set OLLAMA_API_KEY env var before running.');
  console.error('  Example: OLLAMA_API_KEY=your_key node scripts/dev-proxy.js');
  process.exit(1);
}

// ── Server ───────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const cors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  cors();

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let parsed;
    try { parsed = JSON.parse(body); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    if (!Array.isArray(parsed?.messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing messages array' }));
      return;
    }

    const payload = JSON.stringify({ model: MODEL, messages: parsed.messages, stream: false });

    const upstream = https.request(
      { hostname: OLLAMA_HOST, path: OLLAMA_PATH, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OLLAMA_KEY}` } },
      (upRes) => {
        let data = '';
        upRes.on('data', (c) => { data += c; });
        upRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json?.message?.content) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ content: json.message.content }));
            } else {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unexpected upstream response', raw: json }));
            }
          } catch {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to parse upstream response' }));
          }
        });
      }
    );

    upstream.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream request failed', detail: err.message }));
    });

    upstream.write(payload);
    upstream.end();
  });
});

server.listen(PORT, () => {
  console.log(`[dev-proxy] Listening on http://localhost:${PORT}`);
  console.log(`[dev-proxy] Forwarding /api/chat.php -> https://${OLLAMA_HOST}${OLLAMA_PATH}`);
  console.log(`[dev-proxy] Model: ${MODEL}`);
});
