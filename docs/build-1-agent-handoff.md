# Build 1 — Surgical Salvage (archived)

> **Superseded by [`agent-handoff-execute.md`](./agent-handoff-execute.md)** — use that file for all new agent work.  
> Competition docs and parallel build branches (`build/2`, `build/3`, `build/4`) have been removed.

> **Route:** Plan 1 — Surgical Salvage  
> **Motto:** Fix the engine, keep the paint.

---

## System prompt

You are implementing **Plan 1 — Surgical Salvage** for Costco Chaos on branch `build/1-surgical-salvage`.

**Canonical spec:** [`agent-handoff-execute.md`](./agent-handoff-execute.md)

### Authority and docs

- `docs/agent-handoff-execute.md` — execute spec (read first)
- `docs/ceo-rebuild-strategy.md` — §7.1, §9–§11
- `docs/agent-handoff-fresh-start.md` — post-mortem

### Hard rules (violations = failed build)

1. **No per-NPC id patches.** Never special-case `wh-quest-3`, `wh-sample-*`, etc. Fix the system.
2. **No new raw waypoint coordinates** without `npm run validate:routes` passing.
3. **No merge / no "done"** until watchdog synthetic jitter scenario flags within 5s.
4. **Do not touch** parking lot, checkout overlay, or rack visual chunk builders unless a bug forces it.
5. **Ask before git commit.** User prefers explicit approval.
6. Dev server: port **5173 only** (`vite` strictPort if needed).
7. Mental Health gauge — never "compliance." Player is a **customer with cart**, never employee.
8. **No `src/world/` or `src/mvp/`** — retired.

---

## Objectives (in order)

1. Eliminate failure modes **F1–F3** (sample kiosk jitter, watchdog false negative, cart backwards) without rewriting parking or rack rendering.
2. Freeze warehouse NPC count at **~12**; no new routes until graph validator passes.
3. Replace imperative `NPC.tsx` motion (~580 lines) with graph-based **NavAgent** state machine.

---

## Deliverables

| Deliverable | Location | Acceptance |
|-------------|----------|------------|
| `WalkabilityGraph.ts` | `src/systems/` | Built **only** from `warehouseLayout.ts` helpers |
| `NavAgent.ts` | `src/systems/` | States: `Patrol`, `Yield`, `Recover`, `OrbitSample` |
| `FacingConvention.ts` | `src/systems/` | Shared `travelYawFromDirection(dx, dz)` |
| Kiosk no-go volumes | graph + obstacles | 2.2m radius; edges never pass through core |
| Watchdog v2 | `chaosMonitor.ts` + registry | Agent telemetry contract |
| Route validator | `npm run validate:routes` | Exits 0 |
| DEV graph overlay | `WalkabilityGraphOverlay.tsx` | **H** toggle only; off on load |

---

*(Remaining sections unchanged — see full history in git. Execute handoff has phased gates.)*
