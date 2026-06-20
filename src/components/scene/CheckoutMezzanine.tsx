import { Text } from '@react-three/drei';
import { useGameStore } from '../../stores/gameStore';
import { useCheckoutStore } from '../../stores/checkoutStore';
import { FRONT_COURT_MIN_Z, WH_CEILING, WH_MAX_X, WH_MAX_Z, WH_MIN_X } from './warehouseLayout';
import {
  CHECKOUT_APPROACH,
  CHECKOUT_BACK_WALL_Z,
  CHECKOUT_FACADE_Z,
  CHECKOUT_LANE_IDS,
  CHECKOUT_LANE_X,
  CHECKOUT_BELT_LENGTH,
  CHECKOUT_BELT_ORIGIN_Z,
  CHECKOUT_MEZZANINE,
  MAX_VISIBLE_QUEUE,
  queueSlotZ,
} from './checkoutLayout';
import { CashierAvatar, ShopperAvatar, cashierLook, queueNpcLook } from './ShopperAvatar';

/** Face toward shoppers approaching from the warehouse (south / −Z). */
const FACE_SHOPPER: [number, number, number] = [0, Math.PI, 0];

const STEEL = { color: '#374151', roughness: 0.35, metalness: 0.48 };
const BELT = { color: '#1f2937', roughness: 0.55, metalness: 0.35 };

/** Customer / cart side — west of belt (−X). They unload eastward onto the belt. */
const CUSTOMER_SIDE_X = -0.72;
/** Cashier stands on the opposite (east, +X) side of the belt, facing the customers. */
const CASHIER_SIDE_X = 0.8;
const BELT_WIDTH = 0.72;

function CheckoutLabel({
  children,
  position,
  fontSize,
  color,
  maxWidth,
  rotation = FACE_SHOPPER,
}: {
  children: string;
  position: [number, number, number];
  fontSize: number;
  color: string;
  maxWidth?: number;
  rotation?: [number, number, number];
}) {
  return (
    <Text
      position={position}
      rotation={rotation}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      maxWidth={maxWidth}
    >
      {children}
    </Text>
  );
}

function isRegisterBusy(lane: { processingRemaining: number; priceCheckRemaining: number }): boolean {
  return lane.processingRemaining > 0 || lane.priceCheckRemaining > 0;
}

/**
 * One continuous checkout surface: steel deck + conveyor belt running north toward the exit wall.
 * Cashier stands on the west side at the north end — behind the belt, facing the right wall (+X).
 */
function LaneRegister({
  priceCheck,
  isOpen,
  clerk,
  laneId,
  beltOriginZ,
  beltLen,
}: {
  priceCheck: boolean;
  isOpen: boolean;
  clerk: { skin: string; hair: string };
  laneId: string;
  beltOriginZ: number;
  beltLen: number;
}) {
  const beltHalf = beltLen / 2;
  const northEndZ = beltLen - 0.25;

  return (
    <group position={[0, 0, beltOriginZ]}>
      {/* Unified checkout deck — no separate cashier table */}
      <mesh castShadow position={[0, 0.34, beltHalf]}>
        <boxGeometry args={[BELT_WIDTH, 0.68, beltLen]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh castShadow position={[0, 0.66, beltHalf]} rotation={[0.06, 0, 0]}>
        <boxGeometry args={[BELT_WIDTH - 0.12, 0.05, beltLen - 0.15]} />
        <meshStandardMaterial {...BELT} />
      </mesh>

      {Array.from({ length: Math.floor(beltLen / 0.55) }).map((_, i) => (
        <mesh key={`stripe-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.695, 0.28 + i * 0.55]}>
          <planeGeometry args={[BELT_WIDTH - 0.18, 0.06]} />
          <meshStandardMaterial color="#475569" roughness={0.7} />
        </mesh>
      ))}

      {/* Scanner / POS on belt at north end */}
      <mesh position={[0.08, 0.92, northEndZ]}>
        <boxGeometry args={[0.24, 0.16, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh position={[0.08, 0.99, northEndZ + 0.04]}>
        <boxGeometry args={[0.2, 0.11, 0.02]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={priceCheck ? '#ef4444' : '#6366f1'}
          emissiveIntensity={priceCheck ? 1.1 : 0.55}
        />
      </mesh>

      {/* Cashier on the east side of the belt at the north end, facing −X across the
          belt toward the customers unloading on the west side. */}
      <group position={[CASHIER_SIDE_X, 0, northEndZ]}>
        <CashierAvatar skinTone={clerk.skin} hairColor={clerk.hair} rotationY={Math.PI / 2} />
      </group>

      {!isOpen && (
        <>
          <mesh position={[0, 1.05, northEndZ + 0.15]}>
            <boxGeometry args={[0.85, 0.35, 0.04]} />
            <meshStandardMaterial color="#450a0a" emissive="#991b1b" emissiveIntensity={0.4} />
          </mesh>
          <CheckoutLabel position={[0, 1.05, northEndZ + 0.18]} fontSize={0.16} color="#fecaca">
            CLOSED
          </CheckoutLabel>
        </>
      )}

      <CheckoutLabel position={[0, 1.55, northEndZ + 0.1]} fontSize={0.22} color={isOpen ? '#fde047' : '#94a3b8'}>
        {`LANE ${laneId}`}
      </CheckoutLabel>
    </group>
  );
}

/** Exit facade — windows + EXIT doors on the store-facing (south) side of the back wall. */
function CheckoutBackWall() {
  const wallW = WH_MAX_X - WH_MIN_X;
  const wallH = WH_CEILING - 0.4;
  const wallZ = CHECKOUT_BACK_WALL_Z;
  /** Store interior side — shoppers approach from −Z and see this face. */
  const facadeZ = CHECKOUT_FACADE_Z;
  const wallY = wallH / 2;
  const thick = 0.5;

  const doorSpecs = [
    { x: -15, w: 3.4 },
    { x: 15, w: 3.4 },
  ];

  const windowCols = [-10, -5, 0, 5, 10];

  /** Fill wall horizontally, skipping door openings below the lintel. */
  const lintelY = 3.05;
  const lintelH = wallH - lintelY;
  const segments: { x: number; w: number }[] = [];
  let cursor = WH_MIN_X + 0.25;
  for (const { x, w } of [...doorSpecs].sort((a, b) => a.x - b.x)) {
    const gap0 = x - w / 2;
    const gap1 = x + w / 2;
    if (gap0 > cursor) segments.push({ x: (cursor + gap0) / 2, w: gap0 - cursor });
    cursor = gap1;
  }
  if (WH_MAX_X - 0.25 > cursor) {
    segments.push({ x: (cursor + WH_MAX_X - 0.25) / 2, w: WH_MAX_X - 0.25 - cursor });
  }

  return (
    <group>
      {segments.map(({ x, w }, i) => (
        <mesh key={`seg-${i}`} position={[x, wallY, wallZ]} receiveShadow castShadow>
          <boxGeometry args={[w, wallH, thick]} />
          <meshStandardMaterial color="#6b7280" roughness={0.88} />
        </mesh>
      ))}

      {doorSpecs.map(({ x, w }) => (
        <mesh key={`lintel-${x}`} position={[x, lintelY + lintelH / 2, wallZ]} receiveShadow castShadow>
          <boxGeometry args={[w + 0.4, lintelH, thick]} />
          <meshStandardMaterial color="#6b7280" roughness={0.88} />
        </mesh>
      ))}

      <mesh position={[0, 1.25, facadeZ]}>
        <boxGeometry args={[wallW - 0.5, 2.5, 0.14]} />
        <meshStandardMaterial color="#c4b5a5" roughness={0.92} />
      </mesh>

      {windowCols.map((x, i) => (
        <group key={`win-${i}`} position={[x, 4.75, facadeZ - 0.12]}>
          <mesh renderOrder={3}>
            <boxGeometry args={[3.6, 1.65, 0.18]} />
            <meshStandardMaterial
              color="#7dd3fc"
              emissive="#0ea5e9"
              emissiveIntensity={1.1}
              roughness={0.05}
              metalness={0.2}
            />
          </mesh>
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[3.75, 1.78, 0.06]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[0.08, 1.65, 0.04]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[3.6, 0.08, 0.04]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}

      {doorSpecs.map(({ x, w }) => (
        <group key={`door-${x}`} position={[x, 0, facadeZ - 0.15]}>
          <mesh position={[0, 1.55, 0]}>
            <boxGeometry args={[w + 0.45, 3.15, 0.2]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.55} />
          </mesh>
          <mesh position={[0, 1.45, -0.06]}>
            <boxGeometry args={[w - 0.15, 2.9, 0.28]} />
            <meshStandardMaterial color="#020617" roughness={1} />
          </mesh>
          <mesh position={[-w * 0.22, 1.45, 0.08]}>
            <boxGeometry args={[w * 0.44, 2.7, 0.07]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={0.45}
              roughness={0.1}
              metalness={0.35}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[w * 0.22, 1.45, 0.08]}>
            <boxGeometry args={[w * 0.44, 2.7, 0.07]} />
            <meshStandardMaterial
              color="#e0f2fe"
              emissive="#38bdf8"
              emissiveIntensity={0.45}
              roughness={0.1}
              metalness={0.35}
              transparent
              opacity={0.75}
            />
          </mesh>
          <mesh position={[0, 2.98, 0.14]} renderOrder={4}>
            <boxGeometry args={[w * 0.82, 0.48, 0.1]} />
            <meshStandardMaterial color="#dc2626" emissive="#ef4444" emissiveIntensity={1.6} roughness={0.4} />
          </mesh>
          <CheckoutLabel position={[0, 2.98, 0.16]} fontSize={0.26} color="#fff">
            EXIT
          </CheckoutLabel>
          <pointLight position={[0, 2.2, 0.55]} intensity={0.7} color="#fef9c3" distance={7} decay={2} />
        </group>
      ))}

      <CheckoutLabel position={[0, 6.2, facadeZ - 0.1]} fontSize={0.3} color="#f1f5f9">
        RECEIPT CHECK →
      </CheckoutLabel>
    </group>
  );
}

/** Ground-level front-court checkout — belts along exit wall, queues into store. */
export function CheckoutMezzanine() {
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const phase = useGameStore((s) => s.phase);
  const lanes = useCheckoutStore((s) => s.lanes);
  const playerLaneId = useCheckoutStore((s) => s.playerLaneId);
  const slotsFromFront = useCheckoutStore((s) => s.slotsFromFront);
  const beingServed = useCheckoutStore((s) => s.beingServed);
  const active = shoppingListComplete || phase === 'CHECKOUT';

  const { minZ, maxZ } = CHECKOUT_MEZZANINE;
  const centerZ = (minZ + maxZ) / 2;
  const deckD = maxZ - minZ;
  const courtW = WH_MAX_X - WH_MIN_X - 2;
  const courtD = WH_MAX_Z - FRONT_COURT_MIN_Z;
  const beltOriginZ = CHECKOUT_BELT_ORIGIN_Z;
  const beltLen = CHECKOUT_BELT_LENGTH;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, FRONT_COURT_MIN_Z + courtD / 2]}>
        <planeGeometry args={[courtW, courtD]} />
        <meshStandardMaterial
          color={active ? '#d1d9e6' : '#bcc6d4'}
          roughness={0.8}
          emissive={active ? '#1e3a5f' : '#000000'}
          emissiveIntensity={active ? 0.06 : 0}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, (CHECKOUT_APPROACH.minZ + CHECKOUT_APPROACH.maxZ) / 2]}>
        <planeGeometry args={[CHECKOUT_APPROACH.maxX - CHECKOUT_APPROACH.minX, CHECKOUT_APPROACH.maxZ - CHECKOUT_APPROACH.minZ]} />
        <meshStandardMaterial color={active ? '#fde047' : '#64748b'} transparent opacity={active ? 0.35 : 0.2} />
      </mesh>

      <CheckoutLabel
        position={[0, 2.8, CHECKOUT_APPROACH.minZ + 0.8]}
        fontSize={0.32}
        color={active ? '#fde047' : '#64748b'}
      >
        {active ? 'CHECKOUT AHEAD — drive north ↑' : 'CHECKOUT (complete list first)'}
      </CheckoutLabel>

      <CheckoutLabel position={[0, 3.4, FRONT_COURT_MIN_Z + 1.2]} fontSize={0.55} color="#f8fafc">
        CHECKOUT
      </CheckoutLabel>
      <CheckoutLabel position={[0, 2.75, FRONT_COURT_MIN_Z + 1.5]} fontSize={0.2} color="#cbd5e1" maxWidth={14}>
        {active ? 'Unload on belt · cart to your right · press 1–6 for lanes' : 'Complete your list first'}
      </CheckoutLabel>

      {CHECKOUT_LANE_X.map((laneX, i) => {
        const laneId = CHECKOUT_LANE_IDS[i];
        const sim = lanes.find((l) => l.id === laneId);
        const isOpen = sim?.isOpen ?? true;
        const isPlayerLane = playerLaneId === laneId;
        const customersAhead = sim?.customersAhead ?? 0;
        const registerBusy = sim ? isRegisterBusy(sim) : false;
        const priceCheck = (sim?.priceCheckRemaining ?? 0) > 0;
        const clerk = cashierLook(laneId);

        return (
          <group key={laneId} position={[laneX, 0, 0]}>
            {/* Queue pad — west side where shoppers unload onto belt */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[CUSTOMER_SIDE_X, 0.03, beltOriginZ + beltLen / 2]}>
              <planeGeometry args={[1.25, beltLen + 0.8]} />
              <meshStandardMaterial
                color={isPlayerLane ? '#166534' : '#334155'}
                emissive={isPlayerLane ? '#22c55e' : priceCheck ? '#991b1b' : '#000000'}
                emissiveIntensity={isPlayerLane ? 0.35 : priceCheck ? 0.3 : 0}
                roughness={0.88}
              />
            </mesh>

            <LaneRegister
              priceCheck={priceCheck}
              isOpen={isOpen}
              clerk={clerk}
              laneId={laneId}
              beltOriginZ={beltOriginZ}
              beltLen={beltLen}
            />

            {isOpen &&
              (() => {
                const totalInLine = customersAhead + (registerBusy ? 1 : 0);
                const visible = Math.min(totalInLine, MAX_VISIBLE_QUEUE);
                return Array.from({ length: visible }).map((_, q) => {
                  const look = queueNpcLook(laneId, q);
                  return (
                    <group key={`q-${q}`} position={[CUSTOMER_SIDE_X, 0, queueSlotZ(q)]} rotation={[0, 0, 0]}>
                      <ShopperAvatar
                        shirtColor={look.shirt}
                        skinTone={look.skin}
                        hairColor={look.hair}
                        hasCart={q > 0 || registerBusy}
                      />
                    </group>
                  );
                });
              })()}

            {isPlayerLane && phase === 'CHECKOUT' && !beingServed && slotsFromFront > 0 && (
              <CheckoutLabel position={[CUSTOMER_SIDE_X, 0.65, queueSlotZ(slotsFromFront)]} fontSize={0.14} color="#86efac">
                {`YOU · ${slotsFromFront} ahead`}
              </CheckoutLabel>
            )}

            {isPlayerLane && phase === 'CHECKOUT' && (beingServed || slotsFromFront === 0) && (
              <CheckoutLabel position={[CUSTOMER_SIDE_X, 0.65, queueSlotZ(0)]} fontSize={0.14} color="#86efac">
                {beingServed ? 'YOU · SCANNING…' : 'YOU · AT BELT'}
              </CheckoutLabel>
            )}
          </group>
        );
      })}

      {CHECKOUT_LANE_X.slice(0, -1).map((laneX, i) => {
        const midX = (laneX + CHECKOUT_LANE_X[i + 1]) / 2;
        return (
          <mesh key={`rail-${i}`} castShadow position={[midX, 0.5, centerZ + 1.2]}>
            <boxGeometry args={[0.06, 1, deckD - 1.5]} />
            <meshStandardMaterial color="#64748b" roughness={0.5} metalness={0.35} />
          </mesh>
        );
      })}

      {/* Render exit facade last so doors/windows sit in front of belts */}
      <CheckoutBackWall />
    </group>
  );
}
