import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import {
  buildInitialMessages,
  sendSpouseMessage,
  checkProxySignal,
  type ChatMessage,
} from '../../services/spouseChat';

const BONUS_ITEMS = ['sparkling water', 'mixed nuts'];
const MH_REWARD = 18;

interface Bubble {
  from: 'spouse' | 'player';
  text: string;
}

type SignalState =
  | { status: 'checking' }
  | { status: 'ok' }
  | { status: 'error'; summary: string; detail: string };

function currentTime() {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

async function checkSignal(): Promise<SignalState> {
  const result = await checkProxySignal();
  if (result.ok) return { status: 'ok' };
  const lines = result.detail.split('\n');
  return { status: 'error', summary: lines[0] ?? 'Error', detail: result.detail };
}

function SignalIndicator({ signal }: { signal: SignalState }) {
  const [expanded, setExpanded] = useState(false);

  if (signal.status === 'checking') {
    return <span className="phone-signal phone-signal-checking">⟳ API</span>;
  }
  if (signal.status === 'ok') {
    return <span className="phone-signal phone-signal-ok">● API</span>;
  }
  return (
    <span className="phone-signal phone-signal-error" onClick={() => setExpanded((x) => !x)} title="Click for details">
      ✕ API
      {expanded && (
        <span className="phone-signal-detail">
          <strong>{signal.summary}</strong>{'\n'}{signal.detail}
        </span>
      )}
    </span>
  );
}

export function PhoneInterlude() {
  const phase = useGameStore((s) => s.phase);
  const showPhone = useGameStore((s) => s.showPhoneInterlude);
  const dismissPhone = useGameStore((s) => s.dismissPhoneInterlude);
  const addBonusItem = useGameStore((s) => s.addBonusItem);
  const healPlayer = usePlayerStore((s) => s.restoreMentalHealth);

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(0);
  const [signal, setSignal] = useState<SignalState>({ status: 'checking' });
  const historyRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPhone) return;
    const init = buildInitialMessages();
    historyRef.current = init;
    setBubbles([{ from: 'spouse', text: init[init.length - 1].content }]);
    setInput('');
    setAgreed(0);
    setSignal({ status: 'checking' });
    navigator.vibrate?.([120, 60, 120, 60, 80]);
    checkSignal().then(setSignal);
  }, [showPhone]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [bubbles]);

  if (!showPhone || (phase !== 'SHOPPING' && phase !== 'CHECKOUT')) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setBubbles((b) => [...b, { from: 'player', text }]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }];
    setLoading(true);

    try {
      const reply = await sendSpouseMessage(historyRef.current.slice(0, -1), text);
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }];
      setBubbles((b) => [...b, { from: 'spouse', text: reply }]);
      navigator.vibrate?.([80, 40, 80]);
      setSignal({ status: 'ok' });

      const lowerText = text.toLowerCase();
      const agreeWords = ['ok', 'okay', 'sure', 'yes', 'yeah', 'fine', 'will do', 'got it', 'on it'];
      const playerAgreed = agreeWords.some((w) => lowerText.includes(w));
      if (playerAgreed && agreed < BONUS_ITEMS.length) {
        const item = BONUS_ITEMS[agreed];
        setAgreed((n) => n + 1);
        addBonusItem(item);
        healPlayer(MH_REWARD);
        setBubbles((b) => [
          ...b,
          { from: 'spouse', text: `✅ ${item} added to your list. +${MH_REWARD} MH for being a team player 💛` },
        ]);
        navigator.vibrate?.([40, 20, 40]);
      }

      if (historyRef.current.filter((m) => m.role === 'assistant').length >= 4) {
        setTimeout(dismissPhone, 3200);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSignal({ status: 'error', summary: 'Send failed', detail: msg });
      setBubbles((b) => [...b, { from: 'spouse', text: '(no signal… try again?)' }]);
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
    <div className="phone-interlude-overlay">
      <div className="phone-hand-scene">
        <div className="phone-hand-wrap">
          <div className="phone-shell">

            <div className="phone-btn-vol-up" />
            <div className="phone-btn-vol-down" />
            <div className="phone-btn-power" />

            <div className="phone-screen">

              {/* Status bar */}
              <div className="phone-status-bar">
                <span className="phone-time">{currentTime()}</span>
                <div className="phone-notch" />
                <div className="phone-status-icons">
                  <SignalIndicator signal={signal} />
                  <span>🔋</span>
                </div>
              </div>

              {/* Nav bar */}
              <div className="phone-nav-bar">
                <button type="button" className="phone-back" onClick={dismissPhone}>
                  ‹ Messages
                </button>
                <div className="phone-contact">
                  <div className="phone-avatar">B</div>
                  <div className="phone-contact-name">Babe</div>
                </div>
                <button type="button" className="phone-nav-action" onClick={dismissPhone} aria-label="Close">✕</button>
              </div>

              {/* Bubbles */}
              <div className="phone-bubbles" ref={scrollRef}>
                {bubbles.map((b, i) => (
                  <div key={i} className={`phone-bubble-wrap phone-bubble-wrap-${b.from}`}>
                    <div className={`phone-bubble phone-bubble-${b.from}`}>{b.text}</div>
                  </div>
                ))}
                {loading && (
                  <div className="phone-bubble-wrap phone-bubble-wrap-spouse">
                    <div className="phone-bubble phone-bubble-spouse phone-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="phone-input-bar">
                <div className="phone-input-shell">
                  <input
                    className="phone-input"
                    type="text"
                    placeholder="iMessage"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    maxLength={160}
                  />
                </div>
                <button
                  type="button"
                  className="phone-send"
                  onClick={() => void handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label="Send"
                >
                  ↑
                </button>
              </div>

              <div className="phone-home-indicator" />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
