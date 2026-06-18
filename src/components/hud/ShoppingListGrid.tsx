import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';

export function ShoppingListGrid() {
  const items = usePlayerStore((s) => s.inventory.items);
  const phase = useGameStore((s) => s.phase);

  return (
    <section className="sidebar-section manifest-section">
      <div className="section-label">Shopping List</div>
      <div className="manifest-table-wrap">
        <table className="manifest-table">
          <thead>
            <tr>
              <th className="col-sku">SKU</th>
              <th>Item</th>
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={item.collected ? 'row-done' : ''}>
                <td className="col-sku">{item.sku}</td>
                <td className="col-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-aisle">{item.aisle}</span>
                </td>
                <td className="col-status">
                  {item.collected
                    ? '✓'
                    : phase === 'SHOPPING'
                      ? 'Find'
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
