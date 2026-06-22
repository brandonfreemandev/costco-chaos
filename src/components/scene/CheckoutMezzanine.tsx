import { Billboard, Text } from '@react-three/drei';
import { useGameStore } from '../../stores/gameStore';
import { useCheckoutStore } from '../../stores/checkoutStore';
import { WH_CEILING, WH_MAX_X, WH_MIN_X } from './warehouseLayout';
import {
  CHECKOUT_APPROACH,
  CHECKOUT_BELT_LENGTH,
  CHECKOUT_BELT_ORIGIN_Z,
  CHECKOUT_VESTIBULE_DOORS,
  CHECKOUT_EXIT_WALL_Z,
  CHECKOUT_FACADE_LINTEL_Y,
  CHECKOUT_FACADE_Z,
  CHECKOUT_MEZZANINE,
  CHECKOUT_NORTH_EDGE_Z,
  CHECKOUT_VESTIBULE_MIN_Z,
  CHECKOUT_WALL_THICK,
  CHECKOUT_LANE_IDS,
  CHECKOUT_LANE_X,
  MAX_VISIBLE_QUEUE,
  QUEUE_SLOT_SPACING,
  checkoutWallFillSegments,
  queueSlotZ,
} from './checkoutLayout';
import { CashierAvatar, ShopperAvatar, cashierLook, queueNpcLook } from './ShopperAvatar';
import { BuildingWestVestibuleInterior } from './BuildingSideDoorBank';
import { VESTIBULE_ENTRANCE, VESTIBULE_EXIT } from './buildingFacadeLayout';

/** Face +Z so shoppers approaching from the warehouse (north) read labels correctly. */
const FACE_SHOPPER: [number, number, number] = [0, 0, 0];

const STEEL = { color: '#374151', roughness: 0.35, metalness: 0.48 };
const BELT = { color: '#1f2937', roughness: 0.55, metalness: 0.35 };

const CUSTOMER_SIDE_X = -0.72;
const CASHIER_SIDE_X = 0.8;
const BELT_WIDTH = 0.72;

function CheckoutLabel({
  children,
  position,
  fontSize,
  color,
  maxWidth,
  rotation = FACE_SHOPPER,
  billboard = false,
}: {
  children: string;
  position: [number, number, number];
  fontSize: number;
  color: string;
  maxWidth?: number;
  rotation?: [number, number, number];
  billboard?: boolean;
}) {
  const text = (
    <Text
      position={billboard ? [0, 0, 0] : position}
      rotation={billboard ? [0, 0, 0] : rotation}
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      maxWidth={maxWidth}
    >
      {children}
    </Text>
  );
  // Billboard freestanding labels (lane numbers) so they never show a mirrored backface.
  return billboard ? <Billboard position={position}>{text}</Billboard> : text;
}

function isRegisterBusy(lane: { processingRemaining: number; priceCheckRemaining: number }): boolean {
  return lane.processingRemaining > 0 || lane.priceCheckRemaining > 0;
}

/** Belt runs south into the vestibule; register sits on the north end (room before the back wall). */
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
  const registerZ = beltLen - 0.25;

  return (
    <group position={[0, 0, beltOriginZ]}>
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

      <mesh position={[0.08, 0.92, registerZ]}>
        <boxGeometry args={[0.24, 0.16, 0.2]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} />
      </mesh>
      <mesh position={[0.08, 0.99, registerZ + 0.04]}>
        <boxGeometry args={[0.2, 0.11, 0.02]} />
        <meshStandardMaterial
          color="#1e293b"
          emissive={priceCheck ? '#ef4444' : '#6366f1'}
          emissiveIntensity={priceCheck ? 1.1 : 0.55}
        />
      </mesh>

      <group position={[CASHIER_SIDE_X, 0, registerZ]}>
        <CashierAvatar skinTone={clerk.skin} hairColor={clerk.hair} rotationY={Math.PI / 2} />
      </group>

      {!isOpen && (
        <>
          <mesh position={[0, 1.05, registerZ + 0.15]}>
            <boxGeometry args={[0.85, 0.35, 0.04]} />
            <meshStandardMaterial color="#450a0a" emissive="#991b1b" emissiveIntensity={0.4} />
          </mesh>
          <CheckoutLabel position={[0, 1.05, registerZ + 0.18]} fontSize={0.16} color="#fecaca">
            CLOSED
          </CheckoutLabel>
        </>
      )}

      <CheckoutLabel position={[0, 1.55, registerZ + 0.1]} fontSize={0.22} color={isOpen ? '#fde047' : '#94a3b8'} billboard>
        {`LANE ${laneId}`}
      </CheckoutLabel>
    </group>
  );
}

function CheckoutVestibule() {
  const vestZ = (CHECKOUT_VESTIBULE_MIN_Z + CHECKOUT_BELT_ORIGIN_Z) / 2;
  const vestD = CHECKOUT_BELT_ORIGIN_Z - CHECKOUT_VESTIBULE_MIN_Z;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, vestZ]}>
        <planeGeometry args={[WH_MAX_X - WH_MIN_X - 4, vestD]} />
        <meshStandardMaterial color="#d4ccc0" roughness={0.82} />
      </mesh>

      {[-6, -2, 2].map((x) => (
        <mesh key={`kiosk-${x}`} position={[x, 0.55, CHECKOUT_VESTIBULE_MIN_Z + vestD * 0.62]} castShadow>
          <boxGeometry args={[1.1, 1.1, 0.55]} />
          <meshStandardMaterial color="#475569" roughness={0.55} metalness={0.25} />
        </mesh>
      ))}

      <CheckoutLabel position={[-4, 1.35, CHECKOUT_VESTIBULE_MIN_Z + vestD * 0.5]} fontSize={0.14} color="#cbd5e1">
        TRAVEL · BLINDS · KIOSKS → EXIT
      </CheckoutLabel>
    </group>
  );
}

/** South exit wall — west receipt-check door aligned with parking-lot exit. */
function CheckoutBackWall() {
  const wallH = WH_CEILING - 0.4;
  const wallZ = CHECKOUT_EXIT_WALL_Z;
  const facadeZ = CHECKOUT_FACADE_Z;
  const wallY = wallH / 2;
  const lintelY = CHECKOUT_FACADE_LINTEL_Y;
  const lintelH = wallH - lintelY;
  const segments = checkoutWallFillSegments();

  return (
    <group>
      {segments.map(({ x, w }, i) => (
        <mesh key={`seg-${i}`} position={[x, wallY, wallZ]} receiveShadow castShadow>
          <boxGeometry args={[w, wallH, CHECKOUT_WALL_THICK]} />
          <meshStandardMaterial color="#6b7280" roughness={0.88} />
        </mesh>
      ))}

      {CHECKOUT_VESTIBULE_DOORS.map(({ x, w }) => (
        <mesh key={`lintel-${x}`} position={[x, lintelY + lintelH / 2, wallZ]} receiveShadow castShadow>
          <boxGeometry args={[w + 0.4, lintelH, CHECKOUT_WALL_THICK]} />
          <meshStandardMaterial color="#6b7280" roughness={0.88} />
        </mesh>
      ))}

      <BuildingWestVestibuleInterior facadeZ={facadeZ} />

      <CheckoutLabel position={[VESTIBULE_ENTRANCE.x, 6.2, facadeZ + 0.08]} fontSize={0.26} color="#bbf7d0">
        MEMBER ENTRANCE
      </CheckoutLabel>
      <CheckoutLabel position={[VESTIBULE_EXIT.x, 6.2, facadeZ + 0.08]} fontSize={0.28} color="#f1f5f9">
        RECEIPT CHECK
      </CheckoutLabel>
    </group>
  );
}

export function CheckoutMezzanine() {
  const shoppingListComplete = useGameStore((s) => s.shoppingListComplete);
  const phase = useGameStore((s) => s.phase);
  const lanes = useCheckoutStore((s) => s.lanes);
  const playerLaneId = useCheckoutStore((s) => s.playerLaneId);
  const slotsFromFront = useCheckoutStore((s) => s.slotsFromFront);
  const beingServed = useCheckoutStore((s) => s.beingServed);
  const laneAdvanceAnim = useCheckoutStore((s) => s.laneAdvanceAnim);
  const active = shoppingListComplete || phase === 'CHECKOUT';

  const { minZ, maxZ } = CHECKOUT_MEZZANINE;
  const centerZ = (minZ + maxZ) / 2;
  const deckD = maxZ - minZ;
  const courtW = WH_MAX_X - WH_MIN_X - 2;
  const courtD = CHECKOUT_NORTH_EDGE_Z - CHECKOUT_VESTIBULE_MIN_Z;
  const beltOriginZ = CHECKOUT_BELT_ORIGIN_Z;
  const beltLen = CHECKOUT_BELT_LENGTH;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, CHECKOUT_VESTIBULE_MIN_Z + courtD / 2]}>
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
        position={[0, 2.8, CHECKOUT_APPROACH.maxZ - 0.6]}
        fontSize={0.32}
        color={active ? '#fde047' : '#64748b'}
      >
        {active ? 'CHECKOUT AHEAD — entrance end ↓' : 'CHECKOUT (complete list first)'}
      </CheckoutLabel>

      <CheckoutLabel position={[0, 3.4, CHECKOUT_NORTH_EDGE_Z - 1.2]} fontSize={0.55} color="#f8fafc">
        CHECKOUT
      </CheckoutLabel>
      <CheckoutLabel position={[0, 2.75, CHECKOUT_NORTH_EDGE_Z - 0.9]} fontSize={0.2} color="#cbd5e1" maxWidth={14}>
        {active ? 'Unload on belt · roll to exit vestibule · press 1–6 for lanes' : 'Complete your list first'}
      </CheckoutLabel>

      <CheckoutVestibule />

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
                const anim = laneAdvanceAnim[laneId] ?? 1;
                const slideOffset = (1 - anim) * QUEUE_SLOT_SPACING;
                return Array.from({ length: visible }).map((_, q) => (
                  // Face the register/belt to the south (-Z) — was facing north, away from the line.
                  <group key={`q-${q}`} position={[CUSTOMER_SIDE_X, 0, queueSlotZ(q) - slideOffset]} rotation={[0, Math.PI, 0]}>
                    <ShopperAvatar
                      shirtColor={queueNpcLook(laneId, q).shirt}
                      skinTone={queueNpcLook(laneId, q).skin}
                      hairColor={queueNpcLook(laneId, q).hair}
                      hasCart={q > 0 || registerBusy}
                      animate={false}
                    />
                  </group>
                ));
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

      <CheckoutBackWall />
    </group>
  );
}
