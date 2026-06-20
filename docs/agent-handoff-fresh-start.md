# Costco Chaos — Agent Handoff (Fresh Start)

> **CEO / rebuild planning:** See [`ceo-rebuild-strategy.md`](./ceo-rebuild-strategy.md) for post-mortem tables, weighted route analysis (Plans 1–3), and executive decision worksheet. **Detailed execution architecture (`architecture-v2/`, `agent-handoff-execute.md`) is generated after the CEO picks route 1, 2, or 3.**

This document exists because multiple iterations failed to keep **NPC patrol geometry**, **rack collision**, and **rack visuals** in sync. A successor agent should treat this as the canonical “what went wrong” and “how to rebuild without repeating mistakes.”

---

## Project goal (unchanged)

Browser-based 3D Costco warehouse sim (React Three Fiber + Rapier):

1. **Parking lot** — outdoor phase, gauntlet NPCs, cars, textures
2. **Warehouse interior** — racetrack loop, pallet racks, sample kiosks, quest items, checkout
3. **Player** — first-person cart, mental health, chaos watchdog
4. **NPCs** — grid patrol on walkable aisles; sample hunters; quest friction

Stack: Vite, TypeScript, `@react-three/fiber`, `@react-three/drei`, Rapier, Zustand.

---

## What went well (keep these patterns)

### Layout constants as single source of truth

`src/components/scene/warehouseLayout.ts` defines:

- `AISLE_SPECS` / `AISLE_CENTERS_X` — N–S walk columns at `±7.5` and `0`
- `RACK_PAIR_CENTERS_Z` — E–W rack row centers (back-to-back pairs)
- `rackRowGapCentersZ()` — **only** valid E–W patrol Z (gaps *between* pairs, never on pair centers)
- `snapCrossAisleZ()` — snap any Z to nearest row gap
- `sanitizeWarehouseWaypoint()` / `clampWarehouseWaypoint()` — snap X to patrol column, Z to row gap

**Always derive patrol coordinates from these helpers.** Never hardcode `-0.3`, `5.3`, `10.8`, etc.

### Carved rack collision

`buildRackCollisionObstacles()` carves N–S aisle corridors out of full-width rack blocks using `AISLE_SPECS`. Player/NPC AABB tests must use this, not full segment width.

### Grid patrol model

NPC routes are **2-waypoint** segments only:

- **Column** — fixed X (`±7.5`, `0`, or racetrack X), two Z endpoints in `rackRowGapCentersZ()`
- **Row** — fixed Z (row gap), two X endpoints in `AISLE_CENTERS_X`

Heading locked per axis in `NPC.tsx` (`gridPatrolHeading`). Cart mesh offset is **in front** of avatar (`ShopperAvatar` local `z: +0.58` — handle toward avatar, basket ahead). **Do not use player-yaw convention on NPCs until unified in architecture-v2.**

### Culled / always-active crowds

- `NpcCrowd` anchor = centroid of all waypoints (not just wp[0])
- Warehouse + parking NPCs use `alwaysActive` so culling doesn’t freeze distant shoppers

### Chaos watchdog

`src/systems/chaosMonitor.ts` — skip `paused` NPCs; use `cartOverlapsRackObstacle()` for player-in-rack.

---

## What did NOT go well (do not repeat)

### 1. Visual racks ≠ collision racks (root cause of “NPC inside rack”)

**Bug:** `RackInstances` rendered **full-width** segments (`x0`→`x1`) while collision **carved aisles**. Physics said walkable at `x=±7.5`; meshes showed solid steel through the aisle.

**Fix (now in tree):** `buildRackVisualChunks()` — same carve logic as collision; `WarehouseAisles`, `ShelfWallpaper`, `RackBulkProps`, `RackUprights` use chunks.

**Rule:** Any change to `rackCollisionBoxesForSegment` must update **both** collision and visual chunk builders.

### 2. Patrol routes stacked on identical column endpoints

Zone loops (`wh-west-mid`, `wh-east-mid`), quest columns, and sample hunters all used `x=±7.5` with **shared endpoints** (e.g. `(7.5, 5.25)`). `npcColumnTraffic` + mutual obstacle boxes → permanent yield at junctions → watchdog `npc-stuck`.

**Fix:** One owner per side-aisle column segment; sample hunters moved to **racetrack X** (`eastRacetrackPatrolX()` / `westRacetrackPatrolX()` ≈ `±13.1`). Track `columnEndpoints` when registering routes.

### 3. E–W sample patrol spanning entire floor width

Early `sampleLoiterWaypoints` ran `-7.5`→`7.5` at a single Z — crossed rack rows, caused stuck clusters at off-aisle X (`-1.8`, `-2.7`).

**Rule:** Sample mobile NPCs = **short N–S legs** on racetrack or a single free column segment — never full-width row spans unless intentional row patrol.

### 4. Duplicate sample NPCs per kiosk

`wh-sample-*-0` and `wh-sample-*-1` at identical coords.

**Rule:** Exactly **one** NPC id per kiosk: `wh-sample-${kiosk.id}`.

### 5. Per-NPC whack-a-mole instead of geometry tests

Many fixes tuned individual NPC ids. Durable approach:

- `isColumnPathWalkable(x, z0, z1, cartLoad)` — sample path at 32 steps
- `pathCrossesRacks` / `pathCrossesRacksRow` in `CulledNPC.tsx` at generation time
- DEV assert: no generated waypoint has `isInsideRackFootprint(x, z, margin)`

### 6. Racetrack patrol X mixed with aisle patrol without clamping

Perimeter columns must use `clampWestPatrolX` / `clampEastPatrolX` in `snapPatrolPosition` (`isPerimeterColumnPatrol`).

### 7. Watchdog false positives on paused grid NPCs

Grid patrol pauses set `speed=0`. Watchdog must skip `npc.paused` (in registry via `updateNpcRuntime`).

### 8. Committing layout + NPC changes without playtest loop

User hit a **3–5 fix budget** then planned wipe. Always run:

```bash
npm run build
npx tsx -e "import { generateWarehouseNPCs } from './src/components/scene/CulledNPC.tsx'; ..."
```

Print every route; verify `isColumnPathWalkable` for all column NPCs.

---

## Canonical walkable coordinates

| Axis | Valid values |
|------|----------------|
| **X (column)** | `AISLE_CENTERS_X`: `-7.5`, `0`, `7.5`; racetrack: `westRacetrackPatrolX()`, `eastRacetrackPatrolX()` |
| **Z (row gap)** | `rackRowGapCentersZ()` e.g. `-11.25`, `-5.75`, `-0.25`, `5.25`, `10.75` |

Generate warehouse NPCs in order:

1. Zone columns + rows (deterministic slots)
2. Quest columns (skip if segment overlaps zone)
3. Sample hunters on **racetrack** columns only

Target ~12 NPCs interior; parking gauntlet separate in `generateGauntletNPCs()`.

---

## Key files map

| Area | File |
|------|------|
| Layout / gaps / collision carve | `warehouseLayout.ts` |
| Obstacles / movement | `staticObstacles.ts`, `physicsController.ts` |
| NPC spawn + routes | `CulledNPC.tsx` |
| NPC motion / grid patrol | `NPC.tsx` |
| Registry + patrol axis | `npcRegistry.ts` |
| Watchdog | `chaosMonitor.ts` |
| Scene assembly | `WarehouseAisles.tsx`, `GameScene.tsx` |
| Parking | `ParkingLot.tsx`, `parkingLotLayout.ts` |
| Samples | `sampleStations.ts`, `SampleKiosk.tsx` |
| Player cart camera | `FirstPersonCartCamera.tsx`, `ShoppingCart.tsx` |

---

## Rebuild checklist (fresh branch)

### Phase A — Static layout (no NPCs)

1. Implement `warehouseLayout.ts` racetrack + `RACK_PAIR_CENTERS_Z` + `rackRowGapCentersZ()`
2. `buildRackCollisionObstacles()` with aisle carveouts
3. **`buildRackVisualChunks()`** matching collision (48 chunks / 24 segments expected)
4. Floor + aisle runner textures (`materials/proceduralTextures.ts`)
5. Perimeter departments (`PerimeterDepartments.tsx`) — avoid duplicate Text + texture labels
6. Sample kiosks at `snapCrossAisleZ(CROSS_AISLES_Z[i])` — DEV assert not in rack footprint
7. Player spawn `WAREHOUSE_INTERIOR_SPAWN` — entry clear radius for NPC routes

### Phase B — Player cart

1. Carved collision only for rack tests (`cartOverlapsRackObstacle`)
2. Cart mesh rotation aligned with travel axis
3. No jitter on facade strips — thin dept obstacles on wall plane

### Phase C — NPCs (after A is stable)

1. `generateWarehouseNPCs()` — print all routes in DEV
2. Every column route passes `isColumnPathWalkable`
3. No two column NPCs share same `(x, zEndpoint)` on same X
4. Sample hunters on racetrack X only
5. `NpcCrowd alwaysActive` in warehouse
6. Watchdog: agent telemetry contract — see `ceo-rebuild-strategy.md` §9 (position-only heuristics failed on sample-table jitter)

### Phase D — Parking

1. `outdoor: true` on gauntlet configs
2. `NpcCrowd alwaysActive` in parking when player in gauntlet
3. Separate obstacle set in `getParkingObstacles()`

---

## Testing script (run after NPC changes)

```bash
npm run build

npx tsx -e "
import { generateWarehouseNPCs } from './src/components/scene/CulledNPC.tsx';
import { isColumnPathWalkable, isInsideRackFootprint, buildRackVisualChunks, buildRackSegments } from './src/components/scene/warehouseLayout.ts';

console.log('chunks', buildRackVisualChunks().length, 'segments', buildRackSegments().length);
for (const n of generateWarehouseNPCs()) {
  const [a,b] = n.waypoints;
  const w = n.waypoints.map(p=>'('+p[0].toFixed(1)+','+p[2].toFixed(1)+')').join('->');
  if (Math.abs(a[0]-b[0])<0.2) {
    const ok = isColumnPathWalkable(a[0],a[2],b[2],n.cartLoad);
    const e0 = isInsideRackFootprint(a[0],a[2],0.95);
    const e1 = isInsideRackFootprint(b[0],b[2],0.95);
    console.log(n.id, w, ok?'path-ok':'PATH-BLOCKED', e0||e1?'ENDPOINT-IN-RACK':'');
  } else console.log(n.id, w);
}
"
```

Playtest: walk perimeter, center, sample rings — watchdog should stay at 0 issues for 60s.

---

## Current warehouse NPC routes (after final fix)

| ID | Route | Notes |
|----|-------|-------|
| wh-west-back / wh-east-back | `(±7.5, -11.25)↔(±7.5, -5.75)` | Zone columns |
| wh-west-mid / wh-east-mid | `(±7.5, -0.25)↔(±7.5, 5.25)` | Zone columns |
| wh-back-cross | `z=-11.25` full width | Row |
| wh-mid-cross-west / east | split at `x=0` | Row |
| wh-front-cross | `z=5.25` | Row |
| wh-quest-3 | `(0, -11.25)↔(0, 5.25)` | Center column |
| wh-sample-* | `(±13.1, …)` on racetrack | **Not** on ±7.5 |

Quest columns 0/1/2 skipped when they duplicate zone segments (by design).

---

## Aesthetic / UX notes

- Mental health gauge (not compliance)
- Sample rings: green floor ring, +18 MH
- HUD: store map, watchdog overlay in DEV
- Costco palette: steel racks `#b8bcc4`, orange uprights `#e87722`, floor procedural texture

---

## Git / process

- User prefers **explicit ask** before commits
- Use `gh` for PRs
- Minimize diff scope — one structural fix beats ten NPC id patches

---

## Summary for the next agent

**The game is playable in structure but fragile anywhere patrol coords are hand-tuned.** Success means:

1. **One geometry pipeline** for rack collision + visuals + patrol validation  
2. **Row-gap Z only** from `rackRowGapCentersZ()`  
3. **No endpoint sharing** on the same column X between NPCs  
4. **Automated route dump** before declaring NPC work done  

If starting fresh, copy `warehouseLayout.ts`, `staticObstacles.ts`, carved visual chunk approach, and rebuild NPC generation from the checklist — do not port old random waypoint generators or racetrack-only patrol without aisle carve validation.
