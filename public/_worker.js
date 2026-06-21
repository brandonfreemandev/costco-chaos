/**
 * Cloudflare Pages — Advanced-mode Worker.
 * Serves the static game AND proxies /ollama-api/* to ollama.com.
 *
 * The Ollama API key lives in the OLLAMA_API_KEY environment variable:
 *   Pages project → Settings → Variables and Secrets → add OLLAMA_API_KEY.
 * Nothing sensitive is ever committed to the repo.
 *
 * This replaces ollama-proxy.php — one host, one deploy, same-origin (no CORS).
 */

const ALLOWED = new Set(['api/chat', 'api/tags', 'ping']);
const OLLAMA = 'https://ollama.com';
const MODEL_DEFAULT = 'gemma4:31b-cloud';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Anything not under /ollama-api/ is a static asset → let Pages serve it.
    if (!url.pathname.startsWith('/ollama-api')) {
      return env.ASSETS.fetch(request);
    }

    const apiKey = env.OLLAMA_API_KEY;
    if (!apiKey) {
      return json({ error: 'missing OLLAMA_API_KEY env var on the Pages project' }, 401);
    }

    let path = url.pathname.replace(/^\/ollama-api\/?/, '').replace(/\.\./g, '');
    if (path === '') path = 'api/chat';

    // Lightweight health check used by the SMS signal indicator.
    if (path === 'ping') {
      const model = url.searchParams.get('model') || MODEL_DEFAULT;
      const body = JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
        stream: false,
        options: { num_predict: 8, temperature: 0 },
      });
      return forward(`${OLLAMA}/api/chat`, 'POST', apiKey, body);
    }

    if (!ALLOWED.has(path)) return json({ error: 'path not allowed' }, 404);

    // Body arrives either as form field `payload=<json>` or raw JSON.
    let body = '';
    if (request.method === 'POST') {
      const ctype = request.headers.get('content-type') || '';
      const raw = await request.text();
      if (ctype.includes('application/x-www-form-urlencoded') || raw.startsWith('payload=')) {
        body = new URLSearchParams(raw).get('payload') || '';
      } else {
        body = raw;
      }
      if (!body) return json({ error: 'empty POST body' }, 400);
    }

    return forward(`${OLLAMA}/${path}`, request.method, apiKey, body);
  },
};

async function forward(target, method, apiKey, body) {
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  };
  if (method === 'POST') init.body = body;
  try {
    const res = await fetch(target, init);
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
