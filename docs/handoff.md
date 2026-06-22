# Costco Chaos — Handoff (Transition to Next Tool)

> **Updated:** 2026-06-22 (late session — Opus)  
> **Repo:** `https://github.com/brandonfreemandev/costco-chaos.git`  
> **Local:** `/Users/brandonfreeman/Desktop/costco-chaos`  
> **Active branch:** `cursor/graph-punch-bump-damage` (NOT main — `main` is stale at `4342ea9`)  
> **Last commit:** `ca57e49` — worldLayout.ts coordinate contract (step 1)  
> **Name:** `costco-chaos` only — **`costcore` is dead**  
> **Live:** https://costco-chaos.pages.dev (Cloudflare Pages) — **not yet redeployed** with this session's work (owner is testing on localhost; deploy with `npm run deploy` once approved)

---

## 🔴 ACTIVE WORK — read before anything (2026-06-22 late session)

**Branch reality:** All recent work is on `cursor/graph-punch-bump-damage`, pushed to origin. `main` is behind — do NOT assume main is current. Commit + push after every change (outside tools have wiped uncommitted work twice; never run `git reset/checkout/restore/revert` without asking the owner).

**Coordinate contract now exists:** `src/components/scene/worldLayout.ts` is the bottom-of-graph source of truth for axis meanings (−Z south/entrance, +Z north/back, −X west, +X east), yaw (`YAW_SOUTH=0`, `YAW_NORTH=π`), the world box, and cross-shell anchors (`WAREHOUSE_SOUTH_Z`, `BUILDING_FRONT_Z`, `SHELL_GAP`). **Read it before reasoning about any position.** Doors derive from `VESTIBULE_*` in `buildingFacadeLayout.ts`.

**worldLayout consolidation — IN PROGRESS (step 1 of N done):**
- ✅ Step 1 (commit `ca57e49`): created `worldLayout.ts`; moved world dims there (re-exported from `warehouseLayout` so import sites are untouched); wired `BUILDING_FRONT_Z` + `YAW_*` into `parkingLotLayout`, `WAREHOUSE_SOUTH_Z` + `YAW_SOUTH` into `checkoutLayout`. Behavior-preserving (no value changes).
- ⏳ Remaining (optional, do incrementally + behavior-preserving): migrate more scattered anchors into `worldLayout` (e.g. checkout Z bands, mezzanine bounds derivation, the parking↔warehouse bridge for `SHELL_GAP`). Keep each step a clean build with identical visuals; commit per step.

**This session's shipped fixes (all on the branch, all built clean):**
1. Parking: dashed-line z-fighting (polygonOffset), entrance gauntlet re-anchored to doors + denser, crosswalk fronts the vestibule.
2. Interior vestibule mirrors exterior on the SOUTH wall (both doors); **doors centered** on the south wall (`VESTIBULE_*` x = ∓2.25) to kill the U-turn left/right disorientation — crosswalk/gauntlet/spawn/windows all cascade from those two constants.
3. Checkout: LANE labels billboarded (no mirror), pointless door arrows removed, queue NPCs face the register, sample-kiosk labels billboarded.
4. Front-court impulse displays (ELECTRONICS / HBA) moved flush onto the EAST wall.

**Deferred by owner (revisit later):** assorted small text-element tidy-ups (various signs). Owner chose to push the worldLayout consolidation first.

**Verify-in-browser caveat:** scripted preview camera can't reliably reach interior angles; the owner playtests interior facings. Exterior/parking + spawn centering were verified directly.

---

## 🔴 ACTIVE WORK — Interior vestibule (Opus / next agent)

**Owner (2026-06-22):** Exterior parking-lot facade looks decent. **Interior still broken** — exit door on wrong wall (south instead of west), entrance/exit don't match exterior, other layout issues. Some checkout text mirroring was fixed; door placement was not.

**Read this first:** [`docs/agent-handoff-interior-vestibule.md`](./agent-handoff-interior-vestibule.md)

**TL;DR for the fix:**

1. Costco west member vestibule = **entrance + exit on the west wall** (`−X`), side-by-side — same as `CostcoBuilding` exterior (`buildingFacadeLayout.ts`).
2. Today interior puts the **only** exit on the **south wall** (`CheckoutBackWall` at `WH_MIN_Z`) — **wrong**. No interior entrance door mesh.
3. Parking shell (z≈−34) and warehouse (south wall z=−28) are **disconnected**; spawn is center aisle `{−4, −17.2}` not west doors.
4. Checkout stays at **front** (−Z cap, ~9 m deep, 2.5 m belts) — do **not** move to north/back.
5. Uncommitted layout files — see git status; commit after fix (ask user).

---

## Hosting & deploy (current)

Hosted on **Cloudflare Pages**. Static game + spouse-SMS proxy are one project,
same origin (no CORS). Deploy with **one command**:

```bash
npm run deploy      # VITE_BASE=/ npm run build  +  wrangler pages deploy dist
git add -A && git commit -m "..." && git push   # back up to GitHub
```

- **Proxy:** `public/_worker.js` (Cloudflare Pages Function) proxies `/ollama-api/*`
  to ollama.com. Replaces the old InfinityFree `ollama-proxy.php`.
- **Ollama key:** lives only in the Cloudflare `OLLAMA_API_KEY` secret (never in
  repo/chat). Rotate at https://ollama.com/settings/keys. Re-add with
  `npx wrangler pages secret put OLLAMA_API_KEY --project-name costco-chaos`.
- **Base path:** `vite.config.ts` reads `VITE_BASE` (root for Cloudflare,
  `/costco-chaos/` default for local/Apache). Always deploy via `npm run deploy`.
- **Build optimization:** brotli/gzip pre-compression (vite-plugin-compression2);
  Cloudflare also auto-compresses + CDN-caches.
- **InfinityFree is dead** — abandoned (daily bandwidth quota throttled a 3.5MB
  bundle). The old `.htaccess` + `ollama-proxy.php` remain in `public/` only for
  a hypothetical Apache fallback; ignore them.
- See `cheatsheet.md` for the full deploy/recovery command list.

---

## For the next agent / tool (read this first)

**Owner preference:** Play the game. Fix what you see. Don't write long explanations — ship runnable changes.

**Goal:** Make it **funny**, **modern-feeling**, and **complete as a loop** — not a gray box maze with a sidebar. Aim for **1–2 iterations per feature**, not five rounds of "fixed (maybe)".

**Top remaining gaps (ordered by impact):**

1. **Interior vestibule / checkout layout** — west doors must match exterior; see `agent-handoff-interior-vestibule.md`. **Blocking** user acceptance.
2. **Visual polish** — "Feels like the 90s." Procedural boxes + wallpaper shelves + capsule NPCs. User wants browser-shooter-level juice (feedback, lighting, personality) without slideshow FPS.
3. **Damage model** — `mechanics.pseudocode` §1 wants impact = relative-velocity × cartLoad mapped to 1–15 MH. Currently flat ~6/bump. Velocity-scaled damage would add nuance.

**Recently shipped (2026-06-21–22):** Cloudflare hosting migration, comedy SKU rack
labels (width-clipped, 1024px canvas), 24+ bump toasts, spouse SMS interlude,
god mode (G), double-sided ceiling signs, scaled DEAL tags, gap-filler facades.
Humor copy is in good shape now.

**Do not regress:**

- Customer + cart (not employee)
- **Mental Health** (never "compliance" / "integrity")
- Solid rack/wall collision (manual AABB in `staticObstacles.ts` — kinematic cart bypasses Rapier for statics)
- `I` key skips parking → warehouse (`useGameShortcuts.ts`)

---

## 30-second playtest script

```bash
cd /Users/brandonfreeman/Desktop/costco-chaos
npm install   # if needed
npm run dev   # http://localhost:5173 — hard refresh Cmd+Shift+R if stale
npm run build # must pass before handoff
```

| Step | Action | Pass? |
|---|---|---|
| 1 | Start → parking lot | Cart moves WASD |
| 2 | Bump a shopper | Red flash, toast, **MH drops ~6+**, crowd murmur audio, sidebar alert |
| 3 | Press **I** | Teleport to warehouse aisle |
| 4 | Hear HVAC drone | Low 55 Hz hum present in warehouse |
| 5 | Roll cart | Occasional squeak (not constant) |
| 6 | Walk within 9m of NPC | Name tag appears — "Karen · disputing a coupon" style |
| 7 | Roll through **gold floor ring** | Item ticks off list, ding |
| 8 | Hit racks | **Stop** — don't clip through |
| 9 | Sample station | Green ring + [E] when live; NPCs swarm |
| 10 | Checkout — watch queue | NPCs slide forward smoothly (not snap) when register clears |
| 11 | Wait in checkout lane | COUPON DISPUTE event fires periodically, MH drains |

Console: `[MH]` logs on damage. `[Shortcut] I` on skip.

---

## What this game is

Web 3D Costco stress sim. Push cart → survive crowds → collect list → checkout before Mental Health hits 0.

**Stack:** Vite · React 19 · TS · R3F · Rapier · Zustand · Web Audio

**Phases:** `MENU` → `PARKING` → `SHOPPING` → `CHECKOUT` (stub) → `END`

---

## Product rules (non-negotiable)

| Rule | Detail |
|---|---|
| Player | Customer with cart — not employee |
| Stress meter | **Mental Health** 0–100 |
| Cart | Always in `PARKING` + `SHOPPING` |
| Collision | Solid shelves/walls — no ghost mode |
| UI | Modern collapsible sidebar — not legacy corporate intranet |
| Humor | Satirical Costco parody — see `aesthetic_guidelines.md` intent |

---

## Architecture (as of this handoff)

### Stores

| Store | File |
|---|---|
| Phase / game over | `src/stores/gameStore.ts` |
| MH, list, cart stats | `src/stores/playerStore.ts` |
| Bump flash, blur, toasts | `src/stores/uiStore.ts` |
| Player x/y/yaw/speed | `src/stores/cartTransformStore.ts` |
| Checkout queue sim | `src/stores/checkoutStore.ts` |

### Movement & collision

| Piece | File | Notes |
|---|---|---|
| Cart drive | `ShoppingCart.tsx` | Kinematic; **manual** AABB slide |
| Static obstacles | `systems/staticObstacles.ts` | Racks, walls, cars, NPC hulls |
| NPC bumps → MH | `systems/npcBumps.ts` | **Primary** — separation-gap touch in cart `useFrame` |
| Damage | `systems/handleCollision.ts` | Min ~6 MH per bump; cooldown per NPC |
| NPC positions | `systems/npcRegistry.ts` | Updated every NPC frame (priority `-1`) |

**Why not Rapier alone:** Cart uses `setTranslation` every frame → Rapier never blocks movement. Statics + NPC blocking are manual. Rapier `onCollisionEnter` is backup only.

### Audio

| File | What it does |
|---|---|
| `src/audio/spatialAudioManager.ts` | All procedural Web Audio — wheel roll, cart squeak, slam, crowd murmur, HVAC drone, corporate ding, item pickup ding |
| `src/audio/storeMusic.ts` | Chord-pad background music, phase-keyed mood (`parking` / `warehouse` / `checkout` / `win`) |
| `src/hooks/useGameAudio.ts` | Keeps music mood in sync with game phase |

**HVAC drone:** starts when `setGamePhase('SHOPPING')` is called — 55 Hz sine + low-pass noise, fades out in parking/checkout, off in menu/end. No separate init needed.

**Cart squeaks:** fire inside `updateCartMotion` — random interval 0.8–3s, only when speed > 0.9 m/s. Pitch randomized ±15%.

**Crowd murmur:** fires automatically inside `playCartSlam` — no separate call needed.

### Scenes

| Component | Role |
|---|---|
| `GameScene.tsx` | Canvas, warehouse IBL (`WarehouseEnvironment`), parking `Environment` |
| `ParkingLot.tsx` | Lot, building, gauntlet NPCs (~14), green door mat |
| `WarehouseAisles.tsx` | Instanced racks, **shelf wallpaper**, fake ceiling lights, floor glow, aisle rings |
| `WarehouseCeilingLights.tsx` | Emissive troffers — **no PointLights** |
| `ShelfWallpaper.tsx` | Canvas texture on racks (no 3D products) |
| `ShoppingCart.tsx` | Player + aisle pickup radius + `applyNpcBumps` |
| `EntranceSensor.tsx` | Door zone only (no crosswalk requirement) |
| `NpcCrowd.tsx` | Distance cull NPC mounts |
| `NPC.tsx` | Box avatars, waypoint chaos, **Billboard name tags** (within 9m) |
| `CheckoutMezzanine.tsx` | Checkout scene — belts, cashiers, queue NPCs with advance animation |

### NPC name tags

Name tags are Billboard Text rendered inside `NPC.tsx`. They appear when the player cart is within `NAME_TAG_RANGE = 9` meters and show `"{First} · {descriptor}"` seeded from the NPC's id hash. Pool: 18 first names × 15 descriptors. No extra components or stores needed.

### Checkout system

| File | Role |
|---|---|
| `src/stores/checkoutStore.ts` | Full queue sim — per-lane timers, price checks, coupon disputes, rush waves, lane close events, `laneAdvanceAnim` |
| `src/systems/checkoutStress.ts` | All satirical copy + drain rate formulas |
| `src/components/scene/CheckoutMezzanine.tsx` | 3D scene — belts, cashiers, queue NPCs sliding on `laneAdvanceAnim` |
| `src/components/hud/CheckoutPanel.tsx` | HUD lane grid — shows SCANNING / PRICE CHECK / COUPON DISPUTE |
| `src/hooks/useCheckoutInput.ts` | Keys 1–6 → `switchToLane` |

**Checkout events (per `startTransaction`):**
- 18% → price check (4–10s delay)
- 12% → **coupon dispute** (3× base delay, ~9–18s) ← new
- 70% → normal scan

**Queue advance animation:** `laneAdvanceAnim[laneId]` ticks 0→1 over 0.65s when a customer clears. `CheckoutMezzanine` offsets each NPC's Z by `(1 - anim) * QUEUE_SLOT_SPACING`.

### HUD

| Component | Role |
|---|---|
| `GameSidebar.tsx` | MH, list, stats, game over |
| `MentalHealthGauge.tsx` | Bar — shakes on hit |
| `BumpFlash.tsx` | Red vignette + center toast |
| `GameHud.tsx` | Bottom objective banners |
| `EnterGate.tsx` | Title screen |
| `CheckoutPanel.tsx` | Lane grid, stress drain, last event |

### Layout constants

| File | Contents |
|---|---|
| `buildingFacadeLayout.ts` | **West vestibule door X** — entrance `−15`, exit `−10.5`, shared door heights, clerestory windows |
| `BuildingSideDoorBank.tsx` | `VestibuleDoor`, `BuildingWestVestibuleExterior` (parking), `BuildingWestVestibuleInterior` (warehouse — **currently on south wall, wrong**) |
| `parkingLotLayout.ts` | `BUILDING.frontZ −34`, `PLAYER_SPAWN {0,18}`, `WAREHOUSE_INTERIOR_SPAWN {−4, −17.2}` |
| `warehouseLayout.ts` | Racetrack; `WH_MIN_Z −28` (south/front); `SOUTH_FRONT_CAP 9`; fresh food on **north** wall |
| `checkoutLayout.ts` | Front checkout cap `CHECKOUT_NORTH_EDGE_Z −19`; belts **2.5 m**; south-wall exit wall (**needs move to west**) |

---

## Shopping list (current)

4 items in `playerStore.ts`. **No 3D products** — collect by rolling through **gold rings** on floor (`WarehouseAisles` `AisleMarkers`, pickup in `ShoppingCart`).

| Item | worldPosition (x, z) |
|---|---|
| Chicken Breast | -11, -23 |
| Muffins | -6.5, 8 |
| TV bundle | 6.5, -5 |
| Bath tissue | 11.5, -19 |

**Win flow:** All collected → enter checkout lanes north of front court → queue drains → cashier scans → win overlay.

---

## Request tracker (user asks vs shipped)

| Request | Status | Notes |
|---|---|---|
| Customer + Mental Health rebrand | ✅ | |
| Solid shelf collision | ✅ | Manual AABB; took many iterations |
| Performance in warehouse | ⚠️ | Better (no point lights, instancing) — user still wants more "wow" |
| Warehouse maze / tall store | ⚠️ | Layout exists; visuals still primitive |
| NPC chaos, fewer instances | ✅ | ~14 parking, ~5 warehouse, faster movement |
| Skip parking (`I`) | ✅ | |
| Entrance at front doors | ✅ | Green mat + door zone |
| Shelf products → wallpaper | ✅ | |
| MH drops on shopper bump | ✅ | Fixed via `npcBumps.ts` (verify in runtime) |
| **Sample kiosks / MH restore** | ✅ | 3 kiosks, [E] when live, +18 MH, NPC swarm |
| **NPC name tags** | ✅ | Billboard Text, 9m range, seeded per NPC — commit `1faf180` |
| **Audio — HVAC / squeaks / stingers** | ✅ | HVAC drone, cart squeaks, crowd murmur on bump — commit `1faf180` |
| **Checkout depth** | ✅ | Coupon disputes (3× delay), queue advance animation — commit `1faf180` |
| **Humor / satire in UI + world** | ⚠️ | Name tags + bump lines shipped; shelf labels, SKU copy, more toasts still missing |
| **Feel modern / compelling** | ❌ | User: "still 90s" — visual juice is the top remaining gap |

---

## Visual juice — next priority (without killing FPS)

Already in repo:
- Fake lights: emissive troffers + floor glow + drei `Lightformer` IBL (`WarehouseEnvironment.tsx`)
- ACES tone mapping in `GameScene.tsx`
- NPC name tags (Billboard Text in `NPC.tsx`)

**Next steps (high impact / low cost):**

- Subtle **camera punch** on bump (position offset in `FirstPersonCartCamera.tsx`) — 1 frame spike, lerp to zero
- Cross-aisle **signs** (drei `Text` or canvas sprites) — "BAKERY", "SAMPLES", "TIRE CENTER →"
- Optional: `@react-three/postprocessing` bloom **emissive only** — test FPS first; only target troffers + sample kiosk rings
- Rotating **shelf label copy** — absurd Costco bulk names on `ShelfWallpaper.tsx` canvas
- **Do not** add 35 `PointLight`s again

---

## Remaining humor quick wins

- Rename list items / SKUs to absurd Costco bulk (`"Emergency Cheese 48lb"`, SKU `000001`) — in `playerStore.ts`
- More bump toast variants in `uiStore.ts` / `handleCollision.ts` — `"Sample lady judged your cart"`, `"Cart karma"`, `"Executive member energy"`
- `EnterGate` / sidebar objective: more deadpan corporate passive-aggressive copy
- Game over: `"Your membership has been emotionally cancelled."`

---

## Damage model gap (mechanics.pseudocode §1)

Spec: `damage = mapValue(relativeVelocity × cartLoad, MIN_IMPACT, MAX_IMPACT, 1, 15)`

Current: flat ~6 per bump in `handleCollision.ts`. `cartLoad` constant is unused. Adding velocity scaling would make fast-moving NPCs feel scarier and slow grazes feel minor.

Files to touch: `systems/handleCollision.ts`, `systems/npcBumps.ts` (to pass relative velocity).

---

## Git state

**Last commit:** `f86a397` — Deploy wrangler uploads to production main branch  
**Branch:** `main` — **uncommitted** vestibule/checkout layout work (see `git status`).  
**New files:** `buildingFacadeLayout.ts`, `BuildingSideDoorBank.tsx`

**Before pushing:** `git status`, `npm run build`, ask user before commit.

> ⚠️ **Uncommitted work is fragile here.** Twice this project lost hours of
> uncommitted changes to outside tools running `git reset`/`checkout` (the user
> bounces between Claude Code and Cursor). Commit + push after each working
> change. Never run a destructive git command (`reset`, `checkout --`,
> `restore`, `revert`) without asking the user first.

**Deleted / renamed (historical):** `ComplianceGauge`, `PedestrianController`, `ParkingSpotSensor`, `PlayerNpcProximityCollision`, `cartSlideMovement`, decoy product culling

---

## Docs map

| Doc | Trust level |
|---|---|
| **This file** | Source of truth for transition |
| **`agent-handoff-interior-vestibule.md`** | **Current P0** — interior door/checkout layout for Opus |
| `mechanics.pseudocode` | Sample + checkout design intent — §1 (damage) partially implemented, §2 (samples) fully done, §3 (checkout) fully done |
| `architecture.md` | Partially stale |
| `aesthetic_guidelines.md` | Tone target good; UI section describes current sidebar |
| `costco-chaos-gemini-generated-starting-prompt.md` | Original vision — use for humor/tone inspiration |
| `cheatsheet.md` | Run / deploy / Cloudflare recovery commands + in-game shortcuts |

---

## Suggested priority for next tool (ordered)

1. **Interior west vestibule** — `agent-handoff-interior-vestibule.md`; match exterior doors; fix spawn.
2. **Playtest** — 30s script + interior script in vestibule handoff.
3. **Camera punch on bump** — `FirstPersonCartCamera.tsx`.
4. **Velocity-scaled damage** — `handleCollision.ts` + `npcBumps.ts`.
5. **Commit + push + `npm run deploy`** — layout work is uncommitted; ask user before commit.

---

## Dev rules

**DO:** Small diffs · playtest every change · keep MH bump logic in `npcBumps.ts` · log `[MH]` / `[GameManager]` · match Zustand/R3F patterns

**DON'T:** Reintroduce `costcore` · employee/compliance framing · ghost collision · 35 point lights · long agent essays instead of shipping · commit without user ask

---

## Collision groups

```typescript
// src/types/state.ts
COLLISION_GROUP = { PLAYER: 0, NPC: 1, STATIC: 2 }
```

---

## Controls

| Key | Action |
|---|---|
| W / ↑ | Forward |
| S / ↓ | Reverse |
| A / D | Steer |
| **E** | Take sample (when kiosk live + in green ring) |
| **I** | Skip to warehouse (parking only) |
| **O** | Test checkout queue (shopping phase) |
| **G** | God mode — remove all NPCs (toggle) |
| **P** | Trigger spouse SMS interlude |
| **1–6** | Switch checkout lane (CHECKOUT phase only) |

---

*Handoff complete. Next owner: run `npm run dev`, bump a shopper (confirm crowd murmur audio + name tag), walk into warehouse (confirm HVAC hum), reach checkout (confirm coupon dispute events + smooth queue animation).*
