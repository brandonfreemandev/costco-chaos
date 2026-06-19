import { useGameStore } from '../../stores/gameStore';
import { usePlayerStore } from '../../stores/playerStore';
import { useCartTransformStore } from '../../stores/cartTransformStore';
import { CHECKOUT_MEZZANINE } from '../scene/checkoutLayout';
import { FRONT_COURT_MIN_Z, CROSS_AISLES_Z, WH_DEPTH, WH_MAX_Z, WH_MIN_X, WH_WIDTH } from '../scene/warehouseLayout';

const MAP_W = 220;
const MAP_H = Math.round((WH_DEPTH / WH_WIDTH) * MAP_W);

function toMapX(wx: number): number {
  return ((wx - WH_MIN_X) / WH_WIDTH) * MAP_W;
}

function toMapY(wz: number): number {
  return ((WH_MAX_Z - wz) / WH_DEPTH) * MAP_H;
}

const ITEM_SHORT: Record<string, string> = {
  'item-meat': 'Chicken',
  'item-bakery': 'Muffins',
  'item-electronics': 'TV',
  'item-paper': 'Tissue',
};

/** Top-down warehouse map — player dot + quest item pins. */
export function WarehouseMap() {
  const phase = useGameStore((s) => s.phase);
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const items = usePlayerStore((s) => s.inventory.items);
  const px = useCartTransformStore((s) => s.position.x);
  const pz = useCartTransformStore((s) => s.position.z);

  if (phase !== 'SHOPPING' && phase !== 'CHECKOUT') return null;

  const coolerW = 9;
  const coolerD = 7;
  const mezzW = CHECKOUT_MEZZANINE.maxX - CHECKOUT_MEZZANINE.minX;
  const mezzD = CHECKOUT_MEZZANINE.maxZ - CHECKOUT_MEZZANINE.minZ;
  const courtD = WH_MAX_Z - FRONT_COURT_MIN_Z;

  return (
    <section className="sidebar-section warehouse-map-section">
      <div className="section-label">Store Map</div>
      <svg
        className="warehouse-map"
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        role="img"
        aria-label="Warehouse map showing your cart and shopping list items"
      >
        <rect width={MAP_W} height={MAP_H} className="map-floor" rx={4} />

        {CROSS_AISLES_Z.map((z) => (
          <line
            key={`cross-${z}`}
            x1={0}
            y1={toMapY(z)}
            x2={MAP_W}
            y2={toMapY(z)}
            className="map-cross-aisle"
          />
        ))}

        <rect
          x={toMapX(WH_MIN_X + 1)}
          y={toMapY(WH_MAX_Z)}
          width={((WH_WIDTH - 2) / WH_WIDTH) * MAP_W}
          height={(courtD / WH_DEPTH) * MAP_H}
          className="map-front-court"
          rx={2}
        />
        <rect
          x={toMapX(CHECKOUT_MEZZANINE.minX)}
          y={toMapY(CHECKOUT_MEZZANINE.maxZ)}
          width={(mezzW / WH_WIDTH) * MAP_W}
          height={(mezzD / WH_DEPTH) * MAP_H}
          className={shoppingListComplete ? 'map-checkout map-checkout-active' : 'map-checkout'}
          rx={2}
        />
        <text
          x={toMapX(0)}
          y={toMapY(CHECKOUT_MEZZANINE.centerZ) + 4}
          className="map-checkout-label"
          textAnchor="middle"
        >
          CHECKOUT L2
        </text>

        <rect
          x={toMapX(-11 - coolerW / 2)}
          y={toMapY(-24 + coolerD / 2)}
          width={(coolerW / WH_WIDTH) * MAP_W}
          height={(coolerD / WH_DEPTH) * MAP_H}
          className="map-cooler"
          rx={2}
        />
        <text x={toMapX(-11)} y={toMapY(-24) + 4} className="map-cooler-label" textAnchor="middle">
          MEAT
        </text>

        {items.map((item) => (
          <g key={item.id}>
            <circle
              cx={toMapX(item.worldPosition.x)}
              cy={toMapY(item.worldPosition.z)}
              r={item.collected ? 3 : 5}
              className={item.collected ? 'map-pin map-pin-done' : 'map-pin map-pin-quest'}
            />
            {!item.collected && (
              <text
                x={toMapX(item.worldPosition.x)}
                y={toMapY(item.worldPosition.z) - 8}
                className="map-pin-label"
                textAnchor="middle"
              >
                {ITEM_SHORT[item.id] ?? '?'}
              </text>
            )}
          </g>
        ))}

        <circle cx={toMapX(px)} cy={toMapY(pz)} r={6} className="map-player" />
        <text x={toMapX(px)} y={toMapY(pz) + 3.5} className="map-player-icon" textAnchor="middle">
          ▲
        </text>
      </svg>

      <p className="map-hint">
        North (top) = entrance &amp; checkout. Complete your list, then drive north.
      </p>
    </section>
  );
}
