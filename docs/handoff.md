# Costco Chaos — Handoff (Transition to Next Tool)

> **Updated:** 2026-06-18  
> **Repo:** `https://github.com/brandonfreemandev/costco-chaos.git`  
> **Local:** `/Users/brandonfreeman/Desktop/costco-chaos`  
> **Active branch:** `cursor/customer-mh-proximity-collision` (large **uncommitted** delta — see §8)  
> **Name:** `costco-chaos` only — **`costcore` is dead**

---

## For the next agent / tool (read this first)

**Owner preference:** Play the game. Fix what you see. Don’t write long explanations — ship runnable changes.

**Goal:** Make it **funny**, **modern-feeling**, and **complete as a loop** — not a gray box maze with a sidebar. Aim for **1–2 iterations per feature**, not five rounds of “fixed (maybe)”.

**Top 3 user-visible gaps (still missing after many Cursor sessions):**

1. **Sample stations** — MH restore + NPC swarm (`mechanics.pseudocode` §2). Archetype `SAMPLE_HUNTER` exists; **zero kiosk geometry, zero restore logic, zero swarm**.
2. **Humor / tone** — Reads like a tech demo. No satirical copy, no absurd Costco parody moments, no audio stingers beyond cart squeak/slam.
3. **Visual polish** — “Feels like the 90s.” Procedural boxes + wallpaper shelves + capsule NPCs. User wants browser-shooter-level juice (feedback, lighting, personality) without slideshow FPS.

**Do not regress:**

- Customer + cart (not employee)
- **Mental Health** (never “compliance” / “integrity”)
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
| 2 | Bump a shopper | Red flash, toast, **MH drops ~6+**, sidebar alert |
| 3 | Press **I** | Teleport to warehouse aisle |
| 4 | Roll through **gold floor ring** | Item ticks off list, ding |
| 5 | Hit racks | **Stop** — don’t clip through |
| 6 | Sample station | **PASS** — green ring + [E] when live; NPCs swarm |

Console: `[MH]` logs on damage. `[Shortcut] I` on skip.

---

## What this game is

Web 3D Costco stress sim. Push cart → survive crowds → collect list → (checkout TBD) before Mental Health hits 0.

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
| Humor | Satirical Costco parody — see `aesthetic_guidelines.md` intent; **under-delivered in code** |

---

## Architecture (as of this handoff)

### Stores

| Store | File |
|---|---|
| Phase / game over | `src/stores/gameStore.ts` |
| MH, list, cart stats | `src/stores/playerStore.ts` |
| Bump flash, blur, toasts | `src/stores/uiStore.ts` |
| Player x/y/yaw/speed | `src/stores/cartTransformStore.ts` |

### Movement & collision

| Piece | File | Notes |
|---|---|---|
| Cart drive | `ShoppingCart.tsx` | Kinematic; **manual** AABB slide |
| Static obstacles | `systems/staticObstacles.ts` | Racks, walls, cars, NPC hulls |
| NPC bumps → MH | `systems/npcBumps.ts` | **Primary** — separation-gap touch in cart `useFrame` |
| Damage | `systems/handleCollision.ts` | Min ~6 MH per bump; cooldown per NPC |
| NPC positions | `systems/npcRegistry.ts` | Updated every NPC frame (priority `-1`) |

**Why not Rapier alone:** Cart uses `setTranslation` every frame → Rapier never blocks movement. Statics + NPC blocking are manual. Rapier `onCollisionEnter` is backup only.

**Past bug (fixed):** Strict AABB overlap never fired when hulls stopped 0.05m apart. Now uses gap ≤ slack in `npcBumps.ts`.

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
| `NPC.tsx` | Box avatars, waypoint chaos |

### HUD

| Component | Role |
|---|---|
| `GameSidebar.tsx` | MH, list, stats, game over |
| `MentalHealthGauge.tsx` | Bar — shakes on hit |
| `BumpFlash.tsx` | Red vignette + center toast |
| `GameHud.tsx` | Bottom objective banners |
| `EnterGate.tsx` | Title screen |

### Layout constants

| File | Contents |
|---|---|
| `parkingLotLayout.ts` | `PLAYER_SPAWN {0,18}`, door `ENTRANCE_ZONE`, `WAREHOUSE_INTERIOR_SPAWN {-7.5,23}` |
| `warehouseLayout.ts` | 6 aisles, rack spines, maze blocks, cross-aisles |

---

## Shopping list (current)

4 items in `playerStore.ts`. **No 3D products** — collect by rolling through **gold rings** on floor (`WarehouseAisles` `AisleMarkers`, pickup in `ShoppingCart`).

| Item | worldPosition (x, z) |
|---|---|
| Chicken Breast | -11, -23 |
| Muffins | -6.5, 8 |
| TV bundle | 6.5, -5 |
| Bath tissue | 11.5, -19 |

**Win flow:** All collected → **nothing happens** (no checkout trigger).

---

## Request tracker (user asks vs shipped)

| Request | Status | Notes |
|---|---|---|
| Customer + Mental Health rebrand | ✅ | |
| Solid shelf collision | ✅ | Manual AABB; took many iterations |
| Performance in warehouse | ⚠️ | Better (no point lights, instancing) — user still wants more “wow” |
| Warehouse maze / tall store | ⚠️ | Layout exists; visuals still primitive |
| NPC chaos, fewer instances | ✅ | ~14 parking, ~5 warehouse, faster movement |
| Skip parking (`I`) | ✅ | |
| Entrance at front doors | ✅ | Green mat + door zone |
| Shelf products → wallpaper | ✅ | |
| MH drops on shopper bump | ✅ | Fixed via `npcBumps.ts` (verify in runtime) |
| **Sample kiosks / MH restore** | ✅ | 3 kiosks, [E] when live, +18 MH, NPC swarm |
| **Humor / satire in UI + world** | ⚠️ | Bump lines, enter gate, win/lose copy — more needed |
| **Checkout phase** | ⚠️ | 12s queue drain → win overlay (prototype) |
| **Feel modern / compelling** | ❌ | User: “still 90s” |

---

## Sample stations — spec to implement (copy from `mechanics.pseudocode`)

**Minimum viable (one shot):**

1. 2–3 kiosk props on cross-aisles (`CROSS_AISLES_Z` in `warehouseLayout.ts`).
2. Player within ~2m + press **E** (or auto) → `restoreMentalHealth(15)` + funny toast.
3. Spawn timer 45–90s; when active, nearby NPCs with high obsessiveness path toward kiosk (`TARGETING_SAMPLE`).
4. Risk: swarm = more bumps while you linger.

**Files to add:** `SampleKiosk.tsx`, `systems/sampleStations.ts`, hook input in `useCartInput.ts` or proximity in `ShoppingCart`.

---

## Humor — quick wins for next tool

- Rename list items / SKUs to absurd Costco bulk (`"Emergency Cheese 48lb"`, SKU `000001`).
- Bump toasts: rotate lines (`"Sample lady judged your cart"`, `"Cart karma"`, `"Executive member energy"`).
- `EnterGate` / sidebar objective: deadpan corporate passive-aggressive copy.
- Sample station: `"Free sample. Unlimited regret."`
- Game over: `"Your membership has been emotionally cancelled."`
- Optional: short `.mp3` or synthesized Web Audio stingers (ding, crowd gasp) — `spatialAudioManager.ts` already exists.

---

## Visual juice — without killing FPS

Already in repo:

- Fake lights: emissive troffers + floor glow + drei `Lightformer` IBL (`WarehouseEnvironment.tsx`)
- ACES tone mapping in `GameScene.tsx`

**Next steps (high impact / low cost):**

- Cross-aisle **signs** (drei `Text` or canvas sprites) — “BAKERY”, “SAMPLES”
- NPC shirt colors + **name tags** above heads (funny names)
- Subtle camera punch on bump (offset in `FirstPersonCartCamera.tsx`)
- Optional: `@react-three/postprocessing` bloom **emissive only** — test FPS first
- **Do not** add 35 `PointLight`s again

Reference patterns: baked lightmaps, instancing, IBL — see Codrops R3F perf articles; archviz forums recommend fake emissive + lightmaps over dynamic lights.

---

## Git state

**Last commit:** `2e11c4d` — spawn + vite port  
**Branch:** `cursor/customer-mh-proximity-collision`  
**Uncommitted:** ~30+ files (warehouse rewrite, collision, lighting, bumps, wallpaper, shortcuts, deleted `PlayerNpcProximityCollision.tsx`)

**Before pushing:** `git status`, `npm run build`, ask user before commit.

**Deleted / renamed:** `ComplianceGauge`, `PedestrianController`, `ParkingSpotSensor`, `PlayerNpcProximityCollision`, `cartSlideMovement`, decoy product culling

---

## Docs map

| Doc | Trust level |
|---|---|
| **This file** | Source of truth for transition |
| `mechanics.pseudocode` | Sample + checkout **design intent** — not implemented |
| `architecture.md` | Partially stale |
| `aesthetic_guidelines.md` | Tone target good; UI section describes current sidebar |
| `costco-chaos-gemini-generated-starting-prompt.md` | Original vision — sample hunting, checkout boss |
| `cheatsheet.md` | Port 5173 / kill stale vite |

---

## Suggested priority for next tool (ordered)

1. **Playtest** — 30s script above.
2. **More humor** — NPC name tags, rotating shelf labels, audio stingers.
3. **Checkout depth** — visible queue, moving NPCs in line.
4. **Visual punch** — selective bloom on emissive samples/troffers only.
5. **Commit** — if user asks.

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

---

*Handoff complete. Next owner: switch back to Cursor, run `npm run dev`, bump a shopper, confirm MH moves, then build sample kiosks.*
