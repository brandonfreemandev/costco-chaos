import { usePlayerStore } from '../../stores/playerStore';

function integrityColor(value: number): string {
  if (value > 60) return '#2e8b2e';
  if (value > 30) return '#c4a000';
  return '#b30000';
}

export function ComplianceGauge() {
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);

  return (
    <div className="panel compliance-panel">
      <div className="panel-title">Employee System Integrity Monitor v2.4.1</div>
      <div className="gauge-row">
        <span className="label">Compliance Index:</span>
        <div className="gauge-track">
          <div
            className="gauge-fill"
            style={{
              width: `${mentalHealth}%`,
              backgroundColor: integrityColor(mentalHealth),
            }}
          />
        </div>
        <span className="value">{mentalHealth.toFixed(1)}%</span>
      </div>
      <div className="fine-print">
        NOTICE: Index below 0% triggers mandatory wellness review.
      </div>
    </div>
  );
}
