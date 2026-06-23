# Costco Chaos — Handoff (Cursor / next agent)

> **Updated:** 2026-06-22 (Cursor session — consolidated state)  
> **Repo:** `https://github.com/brandonfreemandev/costco-chaos.git`  
> **Local:** `/Users/brandonfreeman/Desktop/costco-chaos`  
> **Branch:** `main` only — work here; old `cursor/*` branches deleted (merged 2026-06-22)  
> **Last commit:** `c77a583` — Fix center-rack department layout: TVs to the front, grocery stays east  
> **Working tree:** clean, pushed to `origin/main`  
> **Live:** https://costco-chaos.pages.dev — **may lag `main`** until owner runs `npm run deploy`

---

## 🔴 ACTIVE WORK — read this first (Cursor)

### Owner preference

Play the game on localhost. Fix what you see. Small diffs. **Commit + push after each working change** (uncommitted work was lost twice when bouncing between Claude Code and Cursor). Ask before `git reset` / `checkout --` / `restore` / `revert`. Ask before deploy.

### P0 — Two more LLM interludes (owner request, 2026-06-22)

**Need at least 2 more pieces similar to the spousal SMS** — same vibe: interrupts shopping, funny, optional MH / list consequences, uses Ollama proxy.

**What exists today (pattern to copy):**

| Type | Trigger | UI | LLM | Files |
|------|---------|-----|-----|-------|
| **Spouse SMS** | Auto 45s into `SHOPPING` (`App.tsx` `PHONE_TRIGGER_MS`); dev **P** | `PhoneInterlude.tsx` — iMessage-style overlay | `spouseChat.ts` — asks for sparkling water + nuts; agree → bonus list + MH | `gameStore.showPhoneInterlude` |
| **Vitamix Prophet** | Proximity to booth (`VitamixBooth.tsx`, radius 4.2m, center court z≈−2); once per run | `EncounterOverlay.tsx` — shared chat chrome | `personaChat.ts` → `PERSONAS['vitamix-prophet']` | `encounterStore.ts` |

**How to add another interlude (checklist):**

1. **Persona** — add entry to `PERSONAS` in `personaChat.ts` (id, name, role, avatar, opening, systemPrompt).
2. **3D trigger** — new booth/NPC component with `useFrame` proximity → `useEncounterStore.getState().trigger(personaId)` (see `VitamixBooth.tsx`).
3. **Optional game hooks** — `EncounterOverlay.tsx` already drains MH while pitching; spouse pattern uses `addBonusItem` + `restoreMentalHealth` on agree. Pick one or invent new stakes.
4. **Optional timer** — copy `App.tsx` spouse timer for a second timed interrupt, or use phase/checkout triggers.
5. **Dev shortcut** — add key in `useGameShortcuts.ts` if useful for testing.
6. **Styling** — reuse `.phone-interlude-overlay` / `.encounter-overlay` classes in `App.css`.

**Suggested encounter ideas (not implemented — pick or invent):**

- **Executive membership rep** — intercepts in front court; pitches $120 card while you're already stressed.
- **Sample lady guilt trip** — stronger than kiosk [E]; LLM argues you skipped her table.
- **Receipt-check greeter** — fires near exit vestibule if you still have unchecked bonus items.
- **Kirkland Signature sommelier** — wine wall; refuses to let you leave without “just a case.”

**Model / proxy:** `gemma4:31b-cloud` via same-origin `/ollama-api` (`public/_worker.js`). Local dev needs Cloudflare proxy or `VITE_CHAT_PROXY_URL`. `checkProxySignal()` in spouse/persona chat.

### P1 — worldLayout consolidation (incremental, optional)

- ✅ **Step 1** (`ca57e49`): `src/components/scene/worldLayout.ts` — axis contract, `YAW_SOUTH`/`YAW_NORTH`, `WH_*` box, `WAREHOUSE_SOUTH_Z`, `BUILDING_FRONT_Z`, `SHELL_GAP`.
- ⏳ **Steps 2+:** migrate more anchors from `checkoutLayout.ts` / `parkingLotLayout.ts` into `worldLayout.ts`. **Behavior-preserving only** — one commit per step, `npm run build` clean.

### P2 — Polish backlog

- Assorted **sign/text facings** — owner deferred; use `<Billboard>` for free-standing labels (lane labels + sample kiosks already billboarded).
- **`SHELL_GAP` (~6 m)** — visual bridge between parking shell (z≈−34) and warehouse south wall (z≈−28); doors are visual-only inside (spawn teleport).
- **Velocity-scaled bump damage** — `mechanics.pseudocode` §1; flat ~6 MH today.
- **Camera punch on bump** — `FirstPersonCartCamera.tsx`.
- **Deploy** — `npm run deploy` when owner approves (`--branch main` for production).

---

## ✅ Shipped on `main` (2026-06-21 → 22) — do not regress

### Layout & coordinates

- **`worldLayout.ts`** — read before touching any position. **−Z = south/entrance**, **+Z = north/back (fresh food)**.
- **Doors centered on south wall:** `VESTIBULE_ENTRANCE.x = −2.25`, `VESTIBULE_EXIT.x = +2.25` (`buildingFacadeLayout.ts`). “West vestibule” = western end of the **south** facade, not a west-facing wall. Exterior + interior both use south wall.
- **Interior** — `BuildingWestVestibuleInterior` renders **both** entrance + exit; `CheckoutBackWall` cuts south wall for both doors.
- **Spawn** — `WAREHOUSE_INTERIOR_SPAWN = { x: VESTIBULE_ENTRANCE.x, z: −26, yaw: YAW_NORTH }` (face into store).
- **Checkout** — front cap only (`CHECKOUT_NORTH_EDGE_Z = −19`), belts **2.5 m**, fresh food on **north** wall, electronics/HBA on **east** wall.
- **Parking** — crosswalk centered on vestibule; gauntlet re-anchored; dashed-line z-fighting fixed.

### Checkout / UI fixes

- Lane labels **billboarded** (no mirror).
- Queue NPCs face register.
- Sample-kiosk labels billboarded.
- Center-rack TVs moved to front (`c77a583`).

### Interludes

- Spouse SMS (timed + **P**).
- Vitamix Prophet booth + `EncounterOverlay` (`ae54ee8`).

### Repo hygiene

- All work on **`main`**; feature branches merged and deleted (`0831af8`).

---

## Coordinate cheat sheet

| Constant | Value | Meaning |
|----------|-------|---------|
| `BUILDING_FRONT_Z` | −34 | Parking-shell south facade |
| `WAREHOUSE_SOUTH_Z` / `WH_MIN_Z` | −28 | Warehouse entrance/exit wall |
| `SHELL_GAP` | 6 | Empty Z between shells (teleport, not walk) |
| `CHECKOUT_NORTH_EDGE_Z` | −19 | North edge of checkout cap |
| `VESTIBULE_*` | x = ∓2.25 | Door pair on south wall |
| Cart `yaw = 0` | faces −Z | South / toward doors |
| Cart `yaw = π` (`YAW_NORTH`) | faces +Z | Into store |

**drei Text:** default faces +Z. Wrong rotation → mirrored backface. Use `<Billboard>` for signs viewed from many angles.

---

## Key files (layout)

| File | Role |
|------|------|
| `worldLayout.ts` | **Bottom of graph** — axis contract, yaw names, shell anchors |
| `buildingFacadeLayout.ts` | Door X, window columns, `doorWallFillSegments()` |
| `BuildingSideDoorBank.tsx` | `VestibuleDoor`, exterior + interior vestibule |
| `parkingLotLayout.ts` | Lot, building, spawn, crosswalk, entrance zone |
| `checkoutLayout.ts` | Checkout Z bands, belts, lanes |
| `CheckoutMezzanine.tsx` | Belts, `CheckoutBackWall`, queue visuals |
| `PerimeterDepartments.tsx` | North = fresh food; east = front impulse |

Stale detail / historical notes: `docs/agent-handoff-interior-vestibule.md` (P0 west-wall refactor was **superseded** — see RESOLVED block at top of that file).

---

## LLM / interlude architecture

```
App.tsx
  ├─ PhoneInterlude (spouse)     ← gameStore.showPhoneInterlude
  └─ EncounterOverlay            ← encounterStore.active → PERSONAS[id]

services/
  ├─ spouseChat.ts               ← spouse system prompt, sendSpouseMessage
  └─ personaChat.ts              ← PERSONAS registry, sendPersonaMessage

stores/
  ├─ gameStore.ts                ← triggerPhoneInterlude, dismissPhoneInterlude
  └─ encounterStore.ts         ← trigger(id), dismiss(), seen Set (once per run)

scene/
  └─ VitamixBooth.tsx            ← proximity → encounterStore.trigger('vitamix-prophet')
```

Proxy: `public/_worker.js` → `OLLAMA_API_KEY` secret on Cloudflare Pages.

---

## Hosting & deploy

```bash
npm run dev      # localhost:5173
npm run build    # must pass
npm run deploy   # production — uses --branch main
git add -A && git commit -m "..." && git push origin main
```

See `cheatsheet.md` for Ollama secret / recovery commands.

---

## 30-second playtest

| Step | Action |
|------|--------|
| 1 | Parking lot — centered doors, green mat |
| 2 | **I** → warehouse spawn just inside entrance, facing north |
| 3 | South wall shows entrance + exit doors (interior) |
| 4 | ~45s or **P** → spouse SMS; needs API for LLM replies |
| 5 | Roll to Vitamix booth (center court) → Prophet overlay |
| 6 | Collect 4 list rings → checkout south front |
| 7 | Bump NPC → MH drop + murmur |

---

## Product rules (non-negotiable)

- Customer + cart (not employee)
- **Mental Health** (never “compliance”)
- Solid rack/wall collision (`staticObstacles.ts`)
- Checkout at **front** (−Z), not north back
- Belt length ~**2.5 m**
- `I` = skip parking → warehouse

---

## Controls

| Key | Action |
|-----|--------|
| W/S/A/D | Drive |
| **I** | Skip to warehouse (parking) |
| **O** | Test checkout |
| **P** | Trigger spouse SMS |
| **G** | God mode (toggle NPCs) |
| **E** | Sample kiosk |
| **1–6** | Checkout lane |
| **T** | Watchdog toggle |

---

## Suggested priority (Cursor)

1. **Two new interludes** — persona + trigger + test with **P** or proximity (P0).
2. Playtest layout on localhost; fix only if owner reports breakage.
3. worldLayout step 2 (optional, behavior-preserving).
4. Deploy when owner says go.

---

## Git state

```
Branch: main @ c77a583 (synced with origin/main)
Working tree: clean
```

Recent commits:

- `c77a583` — TVs to front rack layout
- `ae54ee8` — Vitamix Prophet encounter
- `0831af8` — branches consolidated onto main
- `ca57e49` — worldLayout.ts step 1

---

## Docs map

| Doc | Use |
|-----|-----|
| **This file** | Primary handoff for Cursor |
| `agent-handoff-interior-vestibule.md` | Historical; read RESOLVED section only |
| `agent-handoff-fresh-start.md` | NPC patrol / rack collision lessons |
| `mechanics.pseudocode` | Sample + checkout + damage intent |
| `cheatsheet.md` | Commands + shortcuts |

---

*Next owner: implement 2+ new LLM interludes using spouse + Vitamix patterns; playtest; commit on `main`.*
