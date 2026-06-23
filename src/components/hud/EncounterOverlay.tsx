import { useEffect, useRef, useState } from 'react';
import { useEncounterStore } from '../../stores/encounterStore';
import { usePlayerStore } from '../../stores/playerStore';
import {
  PERSONAS,
  buildPersonaMessages,
  sendPersonaMessage,
  checkProxySignal,
  type ChatMessage,
} from '../../services/personaChat';

/** Held-hostage MH drain while the pitch runs, and the reward for committing. */
const DRAIN_PER_TICK = 1;
const DRAIN_INTERVAL_MS = 2000;
const COMMIT_REWARD = 20;

const COMMIT_WORDS = ['hallelujah', 'amen', 'sign me up', 'sold', 'yes', 'ok', 'okay', 'sure', "i'll take", 'i will take', 'shut up and take', 'blend'];

interface Bubble {
  from: 'persona' | 'player';
  text: string;
}

export function EncounterOverlay() {
  const activeId = useEncounterStore((s) => s.active);
  const dismiss = useEncounterStore((s) => s.dismiss);
  const damageMH = usePlayerStore((s) => s.damageMentalHealth);
  const restoreMH = usePlayerStore((s) => s.restoreMentalHealth);

  const persona = activeId ? PERSONAS[activeId] : null;

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [signalOk, setSignalOk] = useState<boolean | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Seed the opening line when an encounter opens.
  useEffect(() => {
    if (!persona) return;
    const init = buildPersonaMessages(persona);
    historyRef.current = init;
    setBubbles([{ from: 'persona', text: persona.opening }]);
    setInput('');
    setCommitted(false);
    setSignalOk(null);
    navigator.vibrate?.([60, 40, 60]);
    checkProxySignal().then((r) => setSignalOk(r.ok));
  }, [persona]);

  // MH tug-of-war: the prophet holds you hostage until you leave or commit.
  useEffect(() => {
    if (!persona || committed) return;
    const id = window.setInterval(() => damageMH(DRAIN_PER_TICK), DRAIN_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [persona, committed, damageMH]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles]);

  if (!persona) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading || committed) return;
    setInput('');
    setBubbles((b) => [...b, { from: 'player', text }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];
    setLoading(true);

    try {
      const reply = await sendPersonaMessage(historyRef.current.slice(0, -1), text);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      setBubbles((b) => [...b, { from: 'persona', text: reply }]);
      setSignalOk(true);

      if (COMMIT_WORDS.some((w) => text.toLowerCase().includes(w))) {
        setCommitted(true);
        restoreMH(COMMIT_REWARD);
        setBubbles((b) => [
          ...b,
          { from: 'persona', text: `🥤 He thrusts a free smoothie into your hands. SALVATION. +${COMMIT_REWARD} MH.` },
        ]);
        navigator.vibrate?.([40, 20, 80]);
        setTimeout(dismiss, 3000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSignalOk(false);
      setBubbles((b) => [...b, { from: 'persona', text: `(the PA crackles… ${msg.slice(0, 60)})` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="encounter-overlay">
      <div className="encounter-card">
        <header className="encounter-header">
          <span className="encounter-avatar">{persona.avatar}</span>
          <div className="encounter-id">
            <div className="encounter-name">{persona.name}</div>
            <div className="encounter-role">{persona.role}</div>
          </div>
          <span className={`encounter-signal ${signalOk === false ? 'bad' : signalOk ? 'ok' : ''}`}>
            {signalOk === null ? '⟳' : signalOk ? '🎙️ LIVE' : '🎙️ ✕'}
          </span>
        </header>

        <div className="encounter-bubbles" ref={scrollRef}>
          {bubbles.map((b, i) => (
            <div key={i} className={`phone-bubble-wrap phone-bubble-wrap-${b.from === 'player' ? 'player' : 'spouse'}`}>
              <div className={`phone-bubble phone-bubble-${b.from === 'player' ? 'player' : 'spouse'}`}>{b.text}</div>
            </div>
          ))}
          {loading && (
            <div className="phone-bubble-wrap phone-bubble-wrap-spouse">
              <div className="phone-bubble phone-bubble-spouse phone-typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        {committed ? (
          <div className="encounter-committed">Blessed be the bulk. 🙌</div>
        ) : (
          <div className="encounter-input-bar">
            <input
              className="encounter-input"
              type="text"
              placeholder="Say something to Brother Blendon…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              maxLength={160}
            />
            <button type="button" className="encounter-send" onClick={() => void handleSend()} disabled={loading || !input.trim()}>↑</button>
            <button type="button" className="encounter-leave" onClick={dismiss}>Walk away</button>
          </div>
        )}
      </div>
    </div>
  );
}
