import { usePlayerStore } from '../../stores/playerStore';
import { useGameStore } from '../../stores/gameStore';

export function ShoppingListGrid() {
  const items = usePlayerStore((s) => s.inventory.items);
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="panel shopping-panel">
      <div className="panel-title">Fulfillment Manifest — Route Sheet</div>
      <table className="datagrid shopping-grid">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Description</th>
            <th>Location</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={item.collected ? 'row-complete' : ''}>
              <td>{item.sku}</td>
              <td>{item.name}</td>
              <td>{item.aisle}</td>
              <td>
                {item.collected
                  ? 'PICKED'
                  : phase === 'PARKING'
                    ? 'AWAITING ENTRY'
                    : phase === 'SHOPPING'
                      ? 'OPEN'
                      : 'QUEUED'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="fine-print">
        {phase === 'PARKING'
          ? 'Push cart to the warehouse entrance. Cross the marked crosswalk and enter through the doors.'
          : phase === 'SHOPPING'
            ? 'First-person aisle navigation active. Steer with ← → while pushing forward.'
            : 'Proceed to checkout when manifest is complete.'}
      </div>
    </div>
  );
}
