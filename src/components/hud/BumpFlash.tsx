import { useUIStore } from '../../stores/uiStore';

export function BumpFlash() {
  const bumpFlash = useUIStore((s) => s.bumpFlash);
  const lastMessage = useUIStore((s) => s.lastCollisionMessage);

  if (bumpFlash <= 0 && !lastMessage) return null;

  return (
    <>
      <div className="bump-vignette" style={{ opacity: bumpFlash * 0.85 }} aria-hidden />
      {lastMessage && bumpFlash > 0 && (
        <div className={`bump-toast ${bumpFlash > 0.7 ? 'bump-toast-checkout' : ''}`}>{lastMessage}</div>
      )}
    </>
  );
}
