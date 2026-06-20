import { useChaosTestStore } from '../../stores/chaosTestStore';
import { resetChaosMonitorTracking } from '../../systems/chaosMonitor';

/** Dev-only — logs layout/NPC issues while you play. */
export function ChaosTestPanel() {
  const monitorOn = useChaosTestStore((s) => s.monitorOn);
  const violations = useChaosTestStore((s) => s.violations);
  const lastCheckAt = useChaosTestStore((s) => s.lastCheckAt);
  const setMonitor = useChaosTestStore((s) => s.setMonitor);
  const clearViolations = useChaosTestStore((s) => s.clearViolations);

  if (!monitorOn && violations.length === 0) {
    return (
      <div className="chaos-test-panel chaos-test-idle">
        <span className="chaos-test-label">Watchdog</span>
        <button type="button" className="chaos-test-btn" onClick={() => setMonitor(true)}>
          On (T)
        </button>
      </div>
    );
  }

  return (
    <div className="chaos-test-panel">
      <div className="chaos-test-header">
        <span className="chaos-test-label">Watchdog</span>
        <button type="button" className="chaos-test-btn" onClick={() => setMonitor(false)}>
          Off
        </button>
        <button
          type="button"
          className="chaos-test-btn chaos-test-btn-muted"
          onClick={() => {
            clearViolations();
            resetChaosMonitorTracking();
          }}
        >
          Clear
        </button>
      </div>
      <p className="chaos-test-status">
        Watching while you play
        {lastCheckAt > 0 ? ` · ${new Date(lastCheckAt).toLocaleTimeString()}` : ''}
      </p>
      <p className={`chaos-test-count ${violations.length > 0 ? 'chaos-test-count-bad' : ''}`}>
        {violations.length === 0 ? 'No issues yet' : `${violations.length} issue(s)`}
      </p>
      {violations.length > 0 && (
        <ul className="chaos-test-list">
          {violations.slice(0, 6).map((v) => (
            <li key={`${v.id}-${v.at}`}>
              <strong>{v.kind}</strong> {v.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
