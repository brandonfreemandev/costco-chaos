import { usePlayerStore } from '../../stores/playerStore';

function integrityColor(value: number): string {
  if (value > 60) return '#22c55e';
  if (value > 30) return '#eab308';
  return '#ef4444';
}

export function ComplianceGauge() {
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);

  return (
    <section className="sidebar-section compliance-section">
      <div className="section-label">Stress Level</div>
      <div className="compliance-row">
        <div className="compliance-track">
          <div
            className="compliance-fill"
            style={{
              width: `${mentalHealth}%`,
              backgroundColor: integrityColor(mentalHealth),
            }}
          />
        </div>
        <span className="compliance-value">{mentalHealth.toFixed(0)}%</span>
      </div>
    </section>
  );
}
