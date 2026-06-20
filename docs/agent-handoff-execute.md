# Costco Chaos — Execute Handoff (Post-Competition)

> **Status:** Build 1 (Surgical Salvage) won CEO playtest. Competition branches and parallel pipelines are retired.  
> **Branch:** `build/1-surgical-salvage` → merge to `main` when Phase D gates pass.  
> **Motto:** One footprint. One graph. One ship.

---

## Read first

1. This file — canonical execute spec for the new architect
2. [`ceo-rebuild-strategy.md`](./ceo-rebuild-strategy.md) — §9–§11 contracts (watchdog, cart, kiosk)
3. [`agent-handoff-fresh-start.md`](./agent-handoff-fresh-start.md) — what failed before (do not repeat)

Historical reference only: [`build-1-agent-handoff.md`](./build-1-agent-handoff.md)

---

## Hard rules

1. **One footprint** — `buildRackVisualChunks()` and `buildRackCollisionObstacles()` share the same carve from `warehouseLayout.ts`. Graph edges reject kiosk core + rack footprint. No phase done until CEO screenshot matches.
2. **No per-NPC id patches** — fix `sample-mid` via graph + `OrbitSample`, not `wh-sample-*` skips.
3. **No `src/world/` or `src/mvp/`** — retired competition code; do not resurrect.
4. **`npm run validate:routes` exit 0** before claiming any phase — then **playtest** (paper gates ≠ ship).
5. **DEV graph overlay** — off on load; toggle with **H** only.
6. **Ask before git commit.**
7. Port **5173** only.

---

## Current baseline (Phase A complete)

| Asset | Location |
|-------|----------|
| Walkability graph | `src/systems/WalkabilityGraph.ts` |
| Graph overlay | `src/components/scene/WalkabilityGraphOverlay.tsx` |
| Ship gates | `scripts/validate-gates.ts` → `npm run validate:routes` |
| Layout authority | `src/components/scene/warehouseLayout.ts` |

**sample-south** kiosk at east aisle `z = rackRowGapCentersZ()[1]` (not south racetrack row) — keeps perimeter loop continuous.

---

## Remaining work (Phases B–D)

### Phase B — NavAgent + FacingConvention

- Create `src/systems/NavAgent.ts` — states: `Patrol`, `Yield`, `Recover`, `OrbitSample`
- Create `src/systems/FacingConvention.ts` — `travelYawFromDirection(dx, dz)` for player + NPC
- Slim `NPC.tsx` to ≤200 lines (registration + `agent.tick(dt)`)
- **Gate:** cart handle toward avatar; no jitter at `sample-mid` in 2 min watch

### Phase C — Graph routes

- Refactor `CulledNPC.tsx` — assign graph edges, ~12 NPCs, one owner per column segment
- Center column must detour around `sample-mid` no-go (2.2m at `x=0`)
- Sample hunters: racetrack X only; `OrbitSample` at ring nodes
- **Gate:** `validate:routes` gate `npc-route-walkability` + strengthened `center-column-sample-mid`

### Phase D — Watchdog v2

- Extend `npcRegistry.ts` telemetry per §9 (`state`, `targetNodeId`, `netDisplacement5s`, `jitterScore`)
- Update `chaosMonitor.ts`; synthetic jitter scenario flags ≤5s
- **Gate:** 60s CEO playtest watchdog clean

---

## CEO playtest script

1. Parking → **WASD** works
2. **I** → warehouse — **no floor track** until **H**
3. Walk perimeter + center — **no steel voids**
4. **[E]** at all 3 samples
5. **T** watchdog — 60s clean
6. **O** checkout
7. 2 min NPC watch — none stuck at `sample-mid`

---

## Validation

```bash
npm run build
npm run validate:routes
npm run launch:dev   # optional prep + dev server
```

Dev shortcuts: **I** warehouse · **O** checkout · **T** watchdog · **H** graph overlay
