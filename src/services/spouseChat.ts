export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MODEL = 'gemma4:31b-cloud';

// Same-origin proxy. Follows Vite's base path automatically:
//   Cloudflare/root  → /ollama-api          (handled by _worker.js)
//   InfinityFree     → /costco-chaos/ollama-api (handled by ollama-proxy.php)
// VITE_CHAT_PROXY_URL overrides for local dev (node scripts/dev-proxy.js).
const PROXY_BASE = import.meta.env.VITE_CHAT_PROXY_URL
  ?? `${window.location.origin}${import.meta.env.BASE_URL}ollama-api`;

const SPOUSE_SYSTEM_PROMPT = `You are the spouse of someone currently doing a solo Costco run.
You always sign off or refer to yourself endearingly — never use a name, just "babe", "hon", or "love".
You text in short, casual bursts — 1-3 sentences max, no walls of text.
You are loving but slightly passive-aggressive about the shopping list.
The rotisserie chicken is ALREADY on the list — do NOT ask for it.
You want your spouse to add 2 extra items: a case of sparkling water and a giant bag of mixed nuts.
Mention one item per message naturally. Don't mention both at once.
Use light humor. Occasionally drop an emoji. Never break character.
If they agree to add items, be warm and grateful. If they push back, guilt-trip them gently but lovingly.
A MH boost ("you'll feel better for it 😊") is your main persuasion tool.
Keep all messages under 40 words.`;

export function buildInitialMessages(): ChatMessage[] {
  return [
    { role: 'system', content: SPOUSE_SYSTEM_PROMPT },
    {
      role: 'assistant',
      content: "Hey babe! How's the chaos in there? 😬 While you're at it — can you grab a case of sparkling water? We're almost out. Please??",
    },
  ];
}

// Sends as form-encoded payload= field — InfinityFree strips raw JSON bodies.
async function proxyPost(path: string, bodyObj: unknown): Promise<Response> {
  const json = JSON.stringify(bodyObj);
  return fetch(`${PROXY_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `payload=${encodeURIComponent(json)}`,
  });
}

export async function checkProxySignal(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${PROXY_BASE}/ping?model=${encodeURIComponent(MODEL)}`);
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}\n${text.slice(0, 500)}` };
    let json: Record<string, unknown>;
    try { json = JSON.parse(text) as Record<string, unknown>; }
    catch { return { ok: false, detail: `Bad JSON:\n${text.slice(0, 500)}` }; }
    if (json.message) return { ok: true, detail: '' };
    return { ok: false, detail: JSON.stringify(json, null, 2).slice(0, 600) };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendSpouseMessage(history: ChatMessage[], userText: string): Promise<string> {
  const messages: ChatMessage[] = [...history, { role: 'user', content: userText }];
  const payload = { model: MODEL, messages, stream: false };

  const res = await proxyPost('api/chat', payload); // → /ollama-api/api/chat → chat.php?path=api/chat
  const text = await res.text();

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

  let json: Record<string, unknown>;
  try { json = JSON.parse(text) as Record<string, unknown>; }
  catch { throw new Error(`Bad JSON from proxy: ${text.slice(0, 200)}`); }

  const content = (json.message as Record<string, unknown> | undefined)?.content;
  if (typeof content === 'string') return content;
  if (json.error) throw new Error(String(json.error));
  throw new Error(`No content in response: ${JSON.stringify(json).slice(0, 200)}`);
}
