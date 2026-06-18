# AI Agent Handoff & Context: Costco Chaos

> **Last updated:** 2026-06-18  
> **Repo:** `https://github.com/brandonfreemandev/costco-chaos.git` (branch `main`)  
> **Local path:** `/Users/brandonfreeman/Desktop/costco-chaos`  
> **Package name:** `costco-chaos` (the old name `costcore` is fully retired — do not reintroduce it)

---

## 1. What This Game Is

**Costco Chaos** is a web-based 3D stress-sim parody of shopping at Costco. The player is a **customer with a shopping cart**, not an employee. Stress comes from pushing a heavy cart through dense, chaotic crowds and completing a shopping list before **Mental Health** hits zero.

**Stack:** Vite + React 19 + TypeScript + React Three Fiber + Rapier (`@react-three/rapier`) + Zustand + Web Audio API.

**Run locally:**
```bash
cd /Users/brandonfreeman/Desktop/costco-chaos
npm install   # if needed
npm run dev
npm run build # verify types + production bundle
```

---

## 2. Product Directives (Read Before Coding)

These reflect **confirmed user intent** — they override older planning docs where they conflict.

| Topic | Directive |
|---|---|
| **Player identity** | Customer shopping with a cart. Never frame as employee, shift, portal, HR, compliance, telemetry, etc. |
| **Mental Health** | Always call it **Mental Health** (0–100). Never "Compliance Index", "System Integrity", or similar. |
| **Cart availability** | Cart is available in **both** parking lot (`PARKING`) and warehouse (`SHOPPING`). There is no on-foot pedestrian mode anymore (`PedestrianController` was removed). |
| **UI aesthetic** | **Clean modern collapsible sidebar** (`GameSidebar.tsx`, `App.css`). The 2010s corporate intranet direction in `aesthetic_guidelines.md` is **stale** — do not revert to MS Access-style UI unless the user explicitly asks. |
| **Camera** | First-person from behind the cart handle (`FirstPersonCartCamera.tsx`). Cart handle visible whenever the player has a cart (parking + warehouse). |
| **Controls** | WASD / arrow keys via `useCartInput.ts`. Steering was fixed by negating steer input in cart physics (`ShoppingCart.tsx`). |
| **Naming** | Project is **costco-chaos** everywhere (folder, package, GitHub remote, chat title). |

---

## 3. Game Flow (As Built)

```
MENU → PARKING (cart, parking lot) → SHOPPING (cart, warehouse) → CHECKOUT / END
```

| Phase | What happens |
|---|---|
| `MENU` | `EnterGate.tsx` — "Start Shopping" unlocks audio and starts game |
| `PARKING` | Push cart through parking lot chaos toward building entrance |
| `SHOPPING` | Collect 4 glowing shelf items inside T-shaped warehouse aisles |
| `CHECKOUT` | Phase exists in types but **not implemented** |
| `END` | Nervous breakdown game-over overlay when Mental Health = 0 |

**Entering the warehouse:** `EntranceSensor.tsx` polls every 200ms. Requires crossing the crosswalk (`z <= CROSSWALK.z + 1.5`) AND being inside `ENTRANCE_ZONE` at low speed. Calls `gameStore.secureParkingSpot()` → transitions to `SHOPPING` and teleports cart to `WAREHOUSE_INTERIOR_SPAWN`.

---

## 4. Architecture Map (Implemented)

### State (Zustand)

| Store | File | Purpose |
|---|---|---|
| `gameStore` | `src/stores/gameStore.ts` | Phase machine, audio unlock, nervous breakdown, warehouse entry |
| `playerStore` | `src/stores/playerStore.ts` | Mental health, shopping list, cart physics, zone, item collection |
| `uiStore` | `src/stores/uiStore.ts` | Vision blur on hit, collision toast, sidebar collapse |
| `cartTransformStore` | `src/stores/cartTransformStore.ts` | Player position/yaw/speed — shared by camera, entrance sensor, NPC culling, proximity collision |

### Core Systems

| System | File(s) | Notes |
|---|---|---|
| Cart physics | `src/systems/physicsController.ts`, `ShoppingCart.tsx` | Momentum-based push; mass increases with inventory |
| NPC collision → MH | `handleCollision.ts`, `npcRegistry.ts`, `PlayerNpcProximityCollision.tsx` | **Dual detection** — see §5 |
| NPC crowds | `NPC.tsx`, `CulledNPC.tsx` | Waypoint walkers with chaos behavior; distance culling |
| Spatial audio | `audio/spatialAudioManager.ts` | Cart squeak + impact sounds; requires audio unlock |
| Layout constants | `parkingLotLayout.ts` | Spawn, crosswalk, entrance zone, parked cars, abandoned cart obstacles |

### Scene Components

| Component | Role |
|---|---|
| `GameScene.tsx` | Canvas + Physics wrapper; mounts parking OR warehouse |
| `ParkingLot.tsx` | Ground, building, parked cars, crosswalk, gauntlet NPCs, abandoned cart obstacles |
| `CostcoBuilding.tsx` | Store facade |
| `WarehouseAisles.tsx` | T-aisles, shelf colliders, warehouse NPCs |
| `ShelfProducts.tsx` | Glowing collectibles + decoy shelf clutter |
| `ShoppingCart.tsx` | Player rigid body + cart physics (PARKING + SHOPPING) |
| `FirstPersonCartCamera.tsx` | FP camera + visible cart handle |
| `PlayerNpcProximityCollision.tsx` | Frame-based NPC bump detection (**primary collision path**) |

### HUD

| Component | Role |
|---|---|
| `GameSidebar.tsx` | Collapsible left sidebar — Mental Health, objective, shopping list, cart stats |
| `MentalHealthGauge.tsx` | Mental Health bar (replaced old `ComplianceGauge.tsx`) |
| `ShoppingListGrid.tsx` | 4-item quest list with SKU column |
| `GameHud.tsx` | Viewport-level toasts/overlays |
| `EnterGate.tsx` | Main menu / start screen |

---

## 5. Critical Implementation Detail: NPC Collisions

**Problem that was fixed:** Rapier `onCollisionEnter` on the player cart was **unreliable** against `kinematicVelocity` NPC bodies. Bumps often did not register and Mental Health did not drop.

**Solution (keep both layers):**

1. **Primary — proximity detection** (`PlayerNpcProximityCollision.tsx`): Every frame, compares player position (from `cartTransformStore`) against all NPC runtime positions (from `npcRegistry.ts`). Within `BUMP_RADIUS` (1.25m), calls `tryNpcProximityBump()` with per-NPC cooldown (~420ms).

2. **Secondary — Rapier events** (`ShoppingCart.tsx` `onCollisionEnter`): Still calls `tryHandlePlayerNpcCollision()` as a backup.

**NPC registry** (`npcRegistry.ts`):
- `registerNpc(handle, meta)` — on NPC spawn
- `updateNpcRuntime(handle, meta, x, z, speed)` — updated every frame in `NPC.tsx`
- `getActiveNpcRuntimes()` — used by proximity collision

**Damage formula** (`handleCollision.ts`):
- Impact from relative + combined speed × `cartLoad`
- Maps to 3–16 MH damage
- Triggers vision blur, cart slam audio, game over at 0

**When tuning collisions:** Adjust `BUMP_RADIUS`, cooldown in `tryNpcProximityBump`, or damage range in `handleNpcCollision` — not just Rapier collision groups.

---

## 6. Parking Lot & NPC Behavior (Recent Changes)

### Spawn & approach
- **Player spawn:** `{ x: 0, z: -8 }` — near crosswalk, short approach to entrance
- **Abandoned cart obstacles:** `APPROACH_CART_OBSTACLES` in `parkingLotLayout.ts` — static colliders on main drive
- **Crosswalk:** `z: -27` | **Entrance zone:** `z: -33.5 to -36.5`

### Chaotic crowds (not military marches)
`generateGauntletNPCs()` in `CulledNPC.tsx` produces:
- Diagonal / zigzag waypoints (3+ points)
- Random speeds, cart loads, archetypes
- Per-NPC `chaos` value (0.35–0.95)

`NPC.tsx` movement adds:
- Random pauses (400–2600ms)
- Speed jitter via sine waves
- Lateral wobble perpendicular to path
- Variable arrive threshold

Gauntlet NPCs use `alwaysActiveInGauntlet={config.id.startsWith('gauntlet-')}` so they stay active in parking lot regardless of distance.

---

## 7. Shopping List (Quest Items)

Defined in `playerStore.ts` — 4 items with world positions on warehouse shelves:

| Item | Position (approx) | Aisle |
|---|---|---|
| Chicken Breast 12lb x4 | `(-2.6, 1.1, -18)` | Meat |
| Muffin Assortment 24ct | `(2.6, 0.95, -10)` | Bakery |
| 65" LED Display Bundle | `(-2.6, 1.5, 4)` | Electronics |
| Bath Tissue 30-Roll Pallet | `(2.6, 1.35, 14)` | Bulk Paper |

Collectibles glow and auto-pickup on proximity (`ShelfProducts.tsx`).

---

## 8. Git History & Uncommitted Work

### Committed (on `origin/main`)
```
ce44822 Add collapsible sidebar HUD, glowing collectibles, and culled NPC crowds.
1a0ccd2 Add first-person Costco lot with collidable parking and warehouse entry.
01ae898 Add web prototype scaffold and Parking Lot Gauntlet Phase 1.
```

### Uncommitted local changes (as of 2026-06-18)
A large batch of work from the latest session is **not yet committed**, including:
- Mental Health rebrand (`MentalHealthGauge`, removed `ComplianceGauge`)
- Customer-facing copy (EnterGate, GameSidebar, uiStore, index.html)
- Cart in parking lot (`ShoppingCart` PARKING phase, removed `PedestrianController`)
- Proximity collision system (`PlayerNpcProximityCollision`, `npcRegistry` runtime tracking)
- Chaotic NPC generation + movement
- Closer spawn + abandoned cart obstacles
- Renamed doc: `docs/costco-chaos-gemini-generated-starting-prompt.md`

**First action for new agent:** Run `git status` and `git diff` to see full delta. User has not asked to commit yet — ask before committing.

---

## 9. Known Issues & Gaps

| Area | Status |
|---|---|
| **Checkout phase** | Not implemented — types exist, no gameplay |
| **Sample kiosks / MH restore** | Not implemented |
| **Win condition** | Collect all items → nothing happens yet (no checkout trigger) |
| **`ParkingSpotSensor.tsx`** | Deleted — entrance is now `EntranceSensor.tsx` (crosswalk + door zone, not a parking stall) |
| **`secureParkingSpot` naming** | Misleading legacy name — actually means "entered warehouse". Consider renaming to `enterWarehouse` in a future cleanup. |
| **`aesthetic_guidelines.md`** | Partially outdated (corporate UI section). Current UI is modern sidebar. |
| **`architecture.md`** | Still describes "secure a parking spot" — should say "reach entrance" |
| **Empty `costcore` folder** | May exist on Desktop as a Cursor/vite cache stub from pre-rename. Safe to delete if empty. |

---

## 10. Immediate Next Steps (Suggested Priority)

1. **Verify uncommitted changes** — `npm run build`, playtest bumps (MH should drop), playtest entrance transition, playtest item pickup.
2. **Commit the session work** — if user approves; message should reflect customer framing, MH collisions, chaotic NPCs, costco-chaos rename.
3. **Win flow** — when all 4 items collected, transition to `CHECKOUT` or show success state.
4. **Checkout phase** — queue survival, continuous MH drain (see `mechanics.pseudocode`).
5. **Sample kiosks** — optional MH restore with crowd swarm risk.
6. **Doc cleanup** — align `architecture.md` and `aesthetic_guidelines.md` with current implementation.
7. **Rename `secureParkingSpot`** → `enterWarehouse` (low priority refactor).

---

## 11. Source of Truth Docs

Read these before major changes:

| Doc | Contents |
|---|---|
| `docs/architecture.md` | Planned loops and managers (partially stale — see §9) |
| `docs/state.md` | Data structures and enums |
| `docs/mechanics.pseudocode` | Collision, MH, checkout logic sketches |
| `docs/aesthetic_guidelines.md` | Tone/visual targets (UI section stale — see §2) |
| `docs/costco-chaos-gemini-generated-starting-prompt.md` | Original Gemini planning prompt |

---

## 12. Development Rules

**DO:**
- Keep changes small and focused
- Log state transitions (pattern established in `gameStore.ts`, `playerStore.ts`)
- Match existing conventions (Zustand stores, R3F components, Rapier interaction groups)
- Preserve customer framing and "Mental Health" naming
- Use `cartTransformStore` as the single source for player world position

**DON'T:**
- Reintroduce `costcore` naming
- Revert to employee/portal/compliance language
- Use standard FPS character controllers — cart momentum physics only
- Rely solely on Rapier `onCollisionEnter` for NPC→player MH damage
- Hardcode NPC lanes in perfect grids — crowds should feel chaotic
- Commit or push without user asking

---

## 13. Collision Groups Reference

From `types/state.ts`:
```typescript
COLLISION_GROUP = { PLAYER: 0, NPC: 1, STATIC: 2 }
```
Player collides with NPC + STATIC. NPCs collide with PLAYER + STATIC. Static (cars, shelves, abandoned carts) collides with PLAYER + NPC.

---

## 14. Session Changelog (2026-06-18)

Summary of what the previous agent accomplished in the last working session:

1. **Shortened parking approach** — spawn moved from `z: 32` to `z: -8`; added `APPROACH_CART_OBSTACLES` static abandoned carts on main drive.
2. **Fixed MH damage on NPC bumps** — added proximity-based collision system; improved damage formula for low-speed bumps.
3. **Customer perspective** — removed employee copy; cart from start; deleted pedestrian-only mode.
4. **Chaotic NPC traffic** — rewrote gauntlet generation and NPC movement (pauses, jitter, wobble, zigzag paths).
5. **Renamed project to costco-chaos** — folder, package, doc filename, chat title; removed all `costcore` references.
6. **Mental Health UI** — `ComplianceGauge` → `MentalHealthGauge`; updated sidebar, game over, collision toasts.
7. **Build verified** — `npm run build` passes.

---

*End of handoff. When in doubt, playtest with `npm run dev` and read the files listed in §4 before changing architecture.*
