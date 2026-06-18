import { usePlayerStore } from '../../stores/playerStore';

function healthColor(value: number): string {
  if (value > 60) return '#22c55e';
  if (value > 30) return '#eab308';
  return '#ef4444';
}

export function MentalHealthGauge() {
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);

  return (
    <section className="sidebar-section mental-health-section">
      <div className="section-label">Mental Health</div>
      <div className="mental-health-row">
        <div className="mental-health-track">
          <div
            className="mental-health-fill"
            style={{
              width: `${mentalHealth}%`,
              backgroundColor: healthColor(mentalHealth),
            }}
          />
        </div>
        <span className="mental-health-value">{mentalHealth.toFixed(0)}%</span>
      </div>
    </section>
  );
}
