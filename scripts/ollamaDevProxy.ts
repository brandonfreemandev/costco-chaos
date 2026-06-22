import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const OLLAMA = 'https://ollama.com';
const MODEL_DEFAULT = 'gemma4:31b-cloud';
const ALLOWED = new Set(['api/chat', 'api/tags', 'ping']);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

async function forward(
  target: string,
  method: string,
  apiKey: string,
  body: string,
): Promise<{ status: number; text: string }> {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };
  if (method === 'POST') init.body = body;
  const res = await fetch(target, init);
  return { status: res.status, text: await res.text() };
}

/** Dev-only mirror of public/_worker.js for /ollama-api/* (spouse SMS chat). */
export function ollamaDevProxy(apiKey: string): Plugin {
  return {
    name: 'costco-ollama-dev-proxy',
    apply: 'serve',
    configureServer(server) {
      if (!apiKey) {
        console.warn(
          '[vite] OLLAMA_API_KEY is not set — spouse SMS will show ✕ API on localhost. Add it to .env.local',
        );
      }

      server.middlewares.use(async (req, res, next) => {
        const rawUrl = req.url ?? '';
        const qIdx = rawUrl.indexOf('?');
        const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
        const search = qIdx >= 0 ? rawUrl.slice(qIdx) : '';

        const apiIdx = pathname.indexOf('/ollama-api');
        if (apiIdx === -1) return next();

        if (!apiKey) {
          sendJson(res, 401, {
            error: 'missing OLLAMA_API_KEY — add it to .env.local for local spouse SMS chat',
          });
          return;
        }

        let path = pathname
          .slice(apiIdx + '/ollama-api'.length)
          .replace(/^\//, '')
          .replace(/\.\./g, '');
        if (path === '') path = 'api/chat';

        try {
          if (path === 'ping') {
            const params = new URLSearchParams(search);
            const model = params.get('model') || MODEL_DEFAULT;
            const body = JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
              stream: false,
              options: { num_predict: 8, temperature: 0 },
            });
            const { status, text } = await forward(`${OLLAMA}/api/chat`, 'POST', apiKey, body);
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(text);
            return;
          }

          if (!ALLOWED.has(path)) {
            sendJson(res, 404, { error: 'path not allowed' });
            return;
          }

          if (req.method !== 'POST') {
            sendJson(res, 405, { error: 'Method not allowed' });
            return;
          }

          const raw = await readBody(req);
          const ctype = req.headers['content-type'] ?? '';
          let body = '';
          if (ctype.includes('application/x-www-form-urlencoded') || raw.startsWith('payload=')) {
            body = new URLSearchParams(raw).get('payload') ?? '';
          } else {
            body = raw;
          }
          if (!body) {
            sendJson(res, 400, { error: 'empty POST body' });
            return;
          }

          const { status, text } = await forward(`${OLLAMA}/${path}`, 'POST', apiKey, body);
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(text);
        } catch (e) {
          sendJson(res, 502, {
            error: 'proxy failed',
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      });
    },
  };
}
