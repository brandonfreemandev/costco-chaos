import { usePlayerStore } from '../../stores/playerStore';
import { useUIStore } from '../../stores/uiStore';

function healthColor(value: number): string {
  if (value > 60) return '#22c55e';
  if (value > 30) return '#eab308';
  return '#ef4444';
}

export function MentalHealthGauge({ floating = false }: { floating?: boolean }) {
  const mentalHealth = usePlayerStore((s) => s.mentalHealth);
  const bumpFlash = useUIStore((s) => s.bumpFlash);
  const healFlash = useUIStore((s) => s.healFlash);
  const damagePulse = useUIStore((s) => s.damagePulse);

  return (
    <section className={floating ? 'float-hud float-hud-mh' : 'sidebar-section mental-health-section'}>
      <div className={floating ? 'float-hud-label' : 'section-label'}>Mental Health</div>
      <div className="mental-health-row">
        <div className="mental-health-track">
          <div
            className={`mental-health-fill ${healFlash > 0 ? 'mh-heal' : ''}`}
            style={{
              width: `${mentalHealth}%`,
              backgroundColor: healthColor(mentalHealth),
            }}
          />
        </div>
        <span
          className={`mental-health-value ${bumpFlash > 0 ? 'mh-hit' : ''} ${healFlash > 0 ? 'mh-heal-text' : ''}`}
          key={damagePulse}
        >
          {mentalHealth.toFixed(0)}%
        </span>
      </div>
    </section>
  );
}
