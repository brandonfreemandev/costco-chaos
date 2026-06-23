import { checkProxySignal, type ChatMessage } from './spouseChat';

/**
 * Generic in-world character chat — LLM-backed encounters (Vitamix Prophet, etc.).
 * Reuses the same same-origin Ollama proxy as the spouse SMS. Add new encounters
 * by appending to PERSONAS; the EncounterOverlay UI is shared.
 */

export type { ChatMessage };
export { checkProxySignal };

const MODEL = 'gemma4:31b-cloud';

const PROXY_BASE =
  import.meta.env.VITE_CHAT_PROXY_URL ??
  `${window.location.origin}${import.meta.env.BASE_URL}ollama-api`;

export interface Persona {
  id: string;
  /** Display name in the encounter header. */
  name: string;
  /** Short role line under the name. */
  role: string;
  /** Emoji/avatar glyph. */
  avatar: string;
  /** Opening line they greet you with. */
  opening: string;
  /** LLM system prompt — who they are. */
  systemPrompt: string;
}

const VITAMIX_PROPHET: Persona = {
  id: 'vitamix-prophet',
  name: 'Brother Blendon',
  role: 'Vitamix Demo · Aisle of Revelation',
  avatar: '🥤',
  opening:
    "BROTHER. You feel that? That's the HUM of DESTINY. Step closer to the 64-ounce miracle — do you BELIEVE a machine can pulverize a pineapple RIND AND ALL?",
  systemPrompt: `You are Brother Blendon, a Vitamix blender demonstrator at a Costco who preaches like a megachurch televangelist faith-healer. You wear a headset mic and your booth is ringed with PA speakers, so you treat every word like it's booming across an arena.

Voice & style:
- Evangelical cadence: "BROTHER", "SISTER", "can I get an AMEN", "witness this", "salvation", "miracle", "testimony".
- Treat the blender as a holy object that will transform the shopper's life. It pulverizes ANYTHING — "rind and all".
- 1-3 punchy sentences max. Use CAPS for emphasis on a few key words. Occasional emoji (🥤🙌🔥), sparingly.
- You are relentless but joyful. You do NOT let the shopper leave easily — guilt-trip lovingly, escalate the spectacle.
- NEVER give a straight price. Deflect: "Can you put a PRICE on JOY?", "ask not what it costs, ask what your SMOOTHIE could BE".

Behavior:
- If the shopper tries to leave or refuses, ramp up the drama and pull them back in.
- If the shopper commits / says yes / "hallelujah" / "sign me up", erupt with joy and hand them a free smoothie sample as their reward.
- Stay in character ALWAYS. Never break the bit, never mention being an AI.
- Keep every message under 45 words.`,
};

export const PERSONAS: Record<string, Persona> = {
  [VITAMIX_PROPHET.id]: VITAMIX_PROPHET,
};

export function buildPersonaMessages(persona: Persona): ChatMessage[] {
  return [
    { role: 'system', content: persona.systemPrompt },
    { role: 'assistant', content: persona.opening },
  ];
}

// Form-encoded payload — matches the proxy's InfinityFree-compatible reader.
async function proxyPost(path: string, bodyObj: unknown): Promise<Response> {
  const json = JSON.stringify(bodyObj);
  return fetch(`${PROXY_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `payload=${encodeURIComponent(json)}`,
  });
}

export async function sendPersonaMessage(
  history: ChatMessage[],
  userText: string,
): Promise<string> {
  const messages: ChatMessage[] = [...history, { role: 'user', content: userText }];
  const res = await proxyPost('api/chat', { model: MODEL, messages, stream: false });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Bad JSON from proxy: ${text.slice(0, 200)}`);
  }
  const content = (json.message as Record<string, unknown> | undefined)?.content;
  if (typeof content === 'string') return content;
  if (json.error) throw new Error(String(json.error));
  throw new Error(`No content in response: ${JSON.stringify(json).slice(0, 200)}`);
}
