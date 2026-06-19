import { useEffect, useState } from 'react';
import { useBootStore } from '../../stores/bootStore';

const AD_LINES = [
  'Kirkland Signature™ Mental Health — now in a 48-roll pallet.',
  'Executive Membership includes: bulk anxiety, two carts, and regret.',
  'Sample stations are not responsible for your life choices.',
  'Hot dogs: $1.50. Dignity: sold separately.',
  'Parking lot survival tip: everyone else is also late.',
];

const BOOT_MIN_MS = 2800;

/** Satirical Costco preloader while WebGL boots. */
export function LoadingScreen() {
  const sceneReady = useBootStore((s) => s.sceneReady);
  const minTimeElapsed = useBootStore((s) => s.minTimeElapsed);
  const [progress, setProgress] = useState(0);
  const [adIndex, setAdIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    const tick = window.setInterval(() => {
      const elapsed = performance.now() - t0;
      const fake = Math.min(88, (elapsed / BOOT_MIN_MS) * 92);
      setProgress((p) => Math.max(p, fake));
      if (elapsed >= BOOT_MIN_MS) {
        useBootStore.getState().setMinTimeElapsed();
      }
    }, 80);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const rotate = window.setInterval(() => {
      setAdIndex((i) => (i + 1) % AD_LINES.length);
    }, 2400);
    return () => window.clearInterval(rotate);
  }, []);

  useEffect(() => {
    if (!sceneReady || !minTimeElapsed) return;
    setProgress(100);
    setFadeOut(true);
    const hide = window.setTimeout(() => {
      setVisible(false);
      document.getElementById('boot-splash')?.remove();
      (window as Window & { __hideBootSplash?: () => void }).__hideBootSplash?.();
    }, 520);
    return () => window.clearTimeout(hide);
  }, [sceneReady, minTimeElapsed]);

  if (!visible) return null;

  return (
    <div className={`loading-screen ${fadeOut ? 'loading-screen-out' : ''}`} aria-live="polite" aria-busy={!fadeOut}>
      <div className="loading-panel">
        <div className="loading-brand-row">
          <span className="loading-logo">CC</span>
          <div>
            <div className="loading-title">Costco Chaos</div>
            <div className="loading-subtitle">Warehouse loading… please remain in your cart.</div>
          </div>
        </div>

        <div className="loading-ad-card">
          <div className="loading-ad-badge">MEMBER ALERT</div>
          <p className="loading-ad-line" key={adIndex}>
            {AD_LINES[adIndex]}
          </p>
          <div className="loading-ad-footer">*Not valid in Canada. Or reality.</div>
        </div>

        <div className="loading-cart-art" aria-hidden>
          <div className="loading-cart-handle" />
          <div className="loading-cart-basket" />
          <div className="loading-cart-wheel loading-cart-wheel-l" />
          <div className="loading-cart-wheel loading-cart-wheel-r" />
        </div>

        <div className="loading-bar-track">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-status">
          {progress < 100
            ? sceneReady
              ? 'Polishing concrete…'
              : 'Warming rotisserie…'
            : 'Doors opening…'}
        </p>
      </div>
    </div>
  );
}

/** Hook for optional boot-complete side effects. */
export function useBootComplete(): boolean {
  const sceneReady = useBootStore((s) => s.sceneReady);
  const minTimeElapsed = useBootStore((s) => s.minTimeElapsed);
  return sceneReady && minTimeElapsed;
}
