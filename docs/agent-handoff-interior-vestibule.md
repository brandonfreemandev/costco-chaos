# Agent Handoff — Interior Vestibule & Checkout Layout (Opus)

> **Updated:** 2026-06-22  
> **Owner ask:** Exterior parking-lot facade looks decent. **Interior is still wrong** — exit door on wrong wall, entrance/exit don't line up, other consistency issues remain.  
> **Previous agent:** Cursor (Auto) — partial text-rotation fix; layout not finished.  
> **Your job:** Make interior match Costco + exterior. Playtest in browser after every change.

---

## ✅ RESOLVED 2026-06-22 (Opus) — read this before acting on P0 below

The P0 premise in this doc was **wrong**: it assumed the approved exterior doors
are on the **west (−X) wall**. They are not. The `VestibuleDoor` mesh faces **±Z**
and `BuildingWestVestibuleExterior` places both doors on the building's **south
front facade** at X = −15 / −10.5 — facing the parking lot (correct, since the lot
is south). "West vestibule" = *western end of the south wall*, not a west-facing wall.

Moving the interior to a true west wall would have **broken consistency** with the
approved exterior. With owner confirmation, the interior was instead **mirrored on
the south wall**:

- `BuildingWestVestibuleInterior` now renders **both** entrance + exit doors (was exit-only).
- `checkoutWallFillSegments()` + lintels open the south wall for **both** doors
  (`CHECKOUT_VESTIBULE_DOORS = BUILDING_VESTIBULE_DOORS`).
- `WAREHOUSE_INTERIOR_SPAWN` → `{ x: VESTIBULE_ENTRANCE.x (−15), z: −24.5, yaw: π }`
  (just inside the west entrance, facing north into the store).
- Added `← MEMBER ENTRANCE` label beside the existing `RECEIPT CHECK →`.
- South wall stays solid collision (doors are visual; player enters via spawn,
  exits via checkout-win — no walk-through into the inter-shell void).

**The P0 "west-wall refactor" checklist below is superseded — do not action it.**
Remaining open items: P2 bridge the ~6 m gap between parking shell (z≈−34) and
warehouse south wall (z≈−28); verify all interior text facings in-browser.

---

## Read first (5 min)

1. This file (layout intent + known bugs)
2. `src/components/scene/buildingFacadeLayout.ts` — **single source of truth** for door X positions
3. `src/components/scene/checkoutLayout.ts` — checkout zone Z bounds, belt length
4. `src/components/scene/CheckoutMezzanine.tsx` — belts, `CheckoutBackWall`, labels
5. `src/components/scene/BuildingSideDoorBank.tsx` — shared door mesh (exterior + interior)
6. `docs/handoff.md` — deploy, playtest script, do-not-regress rules

**Do not** move checkout to the north/back of the warehouse. Fresh food belongs on the **north wall** (`WH_MAX_Z`). Checkout + member vestibule belong at the **entrance end** (south / −Z, west / −X).

---

## Coordinate system (critical)

| Axis | Direction | Game meaning |
|------|-----------|--------------|
| **−Z** | South | Parking lot, building front, entrance end of warehouse |
| **+Z** | North | Back of warehouse (meat, produce, bakery) |
| **−X** | West | Member entrance + receipt-check exit vestibule |
| **+X** | East | Pharmacy / photo / optical facades |

**Map UI** (`WarehouseMap.tsx`): bottom = south = entrance & checkout.

**Cart yaw:** `yaw = 0` → faces **−Z** (south). `ShoppingCart.tsx` uses `forwardZ = -cos(yaw)`.

**drei `Text`:** default plane faces **+Z**. Shoppers north of a sign looking south need text facing **+Z** (`rotation={[0,0,0]}`). Using `rotation={[0, Math.PI, 0]}` while approaching from the north shows **mirrored** backfaces (`TUOKCEHC`, `3 ENAL`). Partially fixed in `CheckoutMezzanine.tsx` — verify all interior labels.

---

## Costco layout (research summary — treat as spec)

Sources: Fast Company racetrack article, Costco employee layout descriptions (Quora / Business Insider), Sweden store visit notes.

1. **Panoramic racetrack** — wide center aisle; perimeter loop; fresh food at **back** (north).
2. **Front court** — electronics / HBA impulse near doors; not blocking vestibule.
3. **West member vestibule** — **entrance + receipt-check exit side-by-side** on the **west** face (same wall as parking lot doors).
4. **Checkout registers** — bank near the **front** of the store, not deep in the floor; short belts; then travel vestibule (kiosks); then exit doors.
5. **Flow:** enter west doors → shop racetrack north → return to front checkout → scan → roll to vestibule → exit west doors → receipt check.

---

## Two worlds today (root architectural bug)

The game has **two disconnected shells**:

| Space | South face Z | West face X | Doors |
|-------|--------------|-------------|-------|
| **Parking `CostcoBuilding`** | `BUILDING.frontZ` ≈ **−34** | width 54, west ≈ **−27** | West vestibule: entrance `x=−15`, exit `x=−10.5` via `BuildingWestVestibuleExterior` |
| **Warehouse interior** | `WH_MIN_Z` = **−28** | `WH_MIN_X` = **−17** | **Only exit** on **south wall** via `CheckoutBackWall` + `BuildingWestVestibuleInterior` |

**Gap:** ~6 m of “nothing” between parking building (z≈−34) and warehouse south wall (z≈−28). Entering the green mat triggers `secureParkingSpot()` — **no position teleport to doors** — then `ShoppingCart` snaps to `WAREHOUSE_INTERIOR_SPAWN` at `{ x: −4, z: −17.2 }` (center aisle, not west vestibule).

**User-visible symptom:** Exterior doors on **west** facade look correct. Inside, the exit door renders on the **south** wall (`CHECKOUT_EXIT_WALL_Z = WH_MIN_Z + 0.35`) — **wrong wall**. Entrance has no interior door mesh at all.

---

## Current constants (as of 2026-06-22, uncommitted)

### `buildingFacadeLayout.ts`

```ts
VESTIBULE_ENTRANCE = { x: -15, w: 3 }   // west, left (member enter)
VESTIBULE_EXIT       = { x: -10.5, w: 3 } // west, right (receipt check)
BUILDING_VESTIBULE_DOORS = [entrance, exit]  // exterior parking shell only
BUILDING_EXIT_DOORS = [exit]                 // used for interior south wall cutout ← WRONG WALL
```

### `checkoutLayout.ts`

```ts
CHECKOUT_NORTH_EDGE_Z = -19        // north edge of checkout cap (~9 m from south wall)
CHECKOUT_EXIT_WALL_Z  = WH_MIN_Z + 0.35   // south wall ← should not be the only exit
CHECKOUT_BELT_LENGTH  = 2.5        // shortened per user request (was 5)
CHECKOUT_BELT_ORIGIN_Z = CHECKOUT_VESTIBULE_MIN_Z + 3
WAREHOUSE_INTERIOR_SPAWN = { x: -4, z: -17.2, yaw: 0 }  // parkingLotLayout.ts
```

### `warehouseLayout.ts`

```ts
SOUTH_FRONT_CAP = 9
RACK_Z_MIN = WH_MIN_Z + 9  // pallet rows start at z = -19 (north of checkout cap)
```

Fresh food moved to **north** wall in `PerimeterDepartments.tsx` (was incorrectly on south). Front-court electronics/HBA at `CHECKOUT_NORTH_EDGE_Z + 1.6`.

---

## What Opus should fix (ordered)

### P0 — West vestibule on warehouse **west wall**

- [ ] Remove or repurpose `CheckoutBackWall` south-wall exit cutout.
- [ ] Add **west wall** member vestibule inside warehouse at `x ≈ WH_MIN_X + 0.35`:
  - **Entrance door** at `VESTIBULE_ENTRANCE.x` (match exterior)
  - **Exit door** at `VESTIBULE_EXIT.x` (match exterior)
  - Same `VestibuleDoor` component from `BuildingSideDoorBank.tsx`
- [ ] Pick a **Z band** for doors on the west wall (e.g. z ≈ −24 to −27) so belts + vestibule feed **west** toward exit, not south into a fake south wall.
- [ ] `checkoutWallFillSegments()` / collision: cut west wall, not south wall, for door openings.
- [ ] `staticObstacles.ts`: west wall door gaps aligned with vestibule.

### P0 — Spawn & enter flow

- [ ] `WAREHOUSE_INTERIOR_SPAWN` → just inside **west entrance** (e.g. `x: −12.5, z: −25`, yaw facing **+Z** north into store) — not center aisle `x=−4`.
- [ ] Optional: on `secureParkingSpot()`, teleport to spawn (today only phase flip; position set in `ShoppingCart` effect).
- [ ] Entrance sensor stays on parking west doors (`isAtEntranceDoor`).

### P1 — Checkout belt geometry vs new exit direction

Today belts run **south** (−Z) into a south vestibule. If exit is **west**:

- [ ] Short belts should roll **west** (−X) or maintain south travel then turn — match Costco “registers → vestibule → west exit”.
- [ ] Relocate `CheckoutVestibule` kiosks between register bank and west doors.
- [ ] Lane `CHECKOUT_LANE_X` array may need reorientation (lanes parallel to west wall = along Z, not X) — **big change**; user prefers compact front cap over long belts.

### P1 — Text facings (verify in-game)

- [ ] All checkout labels: shoppers approach from **north (+Z)** looking **south** → `rotation={[0,0,0]}` on south-side signs OR explicit `Billboard` for readability.
- [ ] West-wall door signs: face **east (+X)** into warehouse (`rotation={[0, -Math.PI/2, 0]}` or equivalent).
- [ ] Exterior unchanged (user said it looks decent).

### P2 — Bridge parking shell ↔ warehouse (optional polish)

- [ ] Either extend warehouse floor mesh to z≈−32 or add visual connector / tunnel so west doors read as same opening inside and out.
- [ ] Align `WH_MIN_Z` or building depth so crosswalk (`CROSSWALK.z = −27`) sits between lot and front court logically.

### P2 — Receipt-check gameplay

- [ ] Receipt-check label at exit door on **west** wall, not floating on south wall.
- [ ] `VESTIBULE_BARRIER_X` barrier mesh between entrance/exit queues — may need rotation for west-wall layout.

---

## Files touched recently (uncommitted — `git status`)

| File | Role |
|------|------|
| `buildingFacadeLayout.ts` | **NEW** — door X, window columns, shared heights |
| `BuildingSideDoorBank.tsx` | **NEW** — `BuildingWestVestibuleExterior`, `Interior`, `VestibuleDoor` |
| `CostcoBuilding.tsx` | Exterior west vestibule, collision cutouts |
| `checkoutLayout.ts` | South-front checkout cap, 2.5 m belts |
| `CheckoutMezzanine.tsx` | Belts, south `CheckoutBackWall`, labels |
| `PerimeterDepartments.tsx` | Fresh food → north; front court east |
| `parkingLotLayout.ts` | Spawn, entrance markers |
| `warehouseLayout.ts` | `SOUTH_FRONT_CAP`, `RACK_Z_MIN` |
| `staticObstacles.ts` | Meat counter → north; west cooler Z shifts |
| HUD copy | “return to front checkout” messaging |

**Deleted earlier in session:** `CheckoutExteriorFacade.tsx` (was wrong — floated on north wall).

---

## Playtest script (interior layout)

```bash
cd /Users/brandonfreeman/Desktop/costco-chaos
npm run dev   # localhost:5173 — hard refresh
npm run build # must pass before handoff
```

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Parking lot — west facade | Entrance + exit side-by-side, flush, windows above each |
| 2 | Green mat → enter | Lands **inside west vestibule**, not random center aisle |
| 3 | Look at exit | Exit door on **same west wall** as exterior, not south wall |
| 4 | Walk checkout | Registers at front cap; belts short; vestibule before west exit |
| 5 | All floating text | Readable, not mirrored |
| 6 | Map | Checkout zone bottom/south; fresh food top/north |
| 7 | Press **O** (dev checkout) | Lanes usable, queue NPCs visible |

---

## Do not regress

- Exterior `CostcoBuilding` west vestibule (user approved)
- Mental Health branding, solid rack collision, `I` skip to warehouse
- Checkout at **front** (−Z), not north (`WH_MAX_Z`)
- Belt length **~2.5 m** unless user asks otherwise
- Single source of truth: door X from `buildingFacadeLayout.ts`

---

## Suggested implementation sketch (west-wall vestibule)

```ts
// New constants (e.g. buildingFacadeLayout.ts or checkoutLayout.ts)
export const VESTIBULE_Z_CENTER = -25.5;  // tune — front court, aligns with belts
export const WAREHOUSE_WEST_FACADE_X = WH_MIN_X + 0.32;

// Interior component: WarehouseWestVestibuleInterior
// - VestibuleDoor at (WEST_FACADE_X, VESTIBULE_ENTRANCE.x as Z?, ...) 
//   NOTE: if on west WALL, doors vary in Z not X — may need to swap:
//   - Exterior: doors at (x=-15, z=facade) and (x=-10.5, z=facade)
//   - Interior west wall: doors at (x=WH_MIN_X, z=-26.2) and (z=-24.7) OR keep x offset as depth into wall
```

**Important:** On a **west wall**, door positions are **Z coordinates**, not X. Exterior uses **X** because the facade faces south. Interior west wall needs the same **physical** doors mapped to `(x = WH_MIN_X, z ≈ vestibule band)`. Refactor `buildingFacadeLayout.ts` to export abstract `VESTIBULE_ENTRANCE` / `EXIT` and map to `{ axis: 'x' | 'z', value, w }` per surface — avoids another mismatch.

---

## Git / deploy

- **Last commit on main:** `f86a397` — deploy script
- **Layout work is mostly uncommitted** — commit after fixing; ask user before push
- Production: `npm run deploy` (must use `--branch main` for costco-chaos.pages.dev)

---

*Hand off to Opus: fix west-wall interior vestibule first, then belt/vestibule flow, then verify text. Exterior is the reference — interior should feel like walking through the same doors.*
