# Build Competition Charter

> **Architect:** Planning agent (CTO candidate)  
> **CEO:** Brandon  
> **Status:** Three builds in parallel — isolation rules **mandatory**  
> **Strategy reference:** [`ceo-rebuild-strategy.md`](./ceo-rebuild-strategy.md)  
> **CEO directive:** Items under §10 *Architect's move* are the Architect's responsibility — not deferred to the CEO.

---

## 1. Purpose

Three implementation agents compete on parallel routes. **One winner merges to `main`.** The other two branches are archived, not blended.

This charter prevents cross-contamination so the CEO can judge route quality fairly. Violations invalidate a build's eligibility regardless of feature completeness.

---

## 2. Branches (hard isolation)

| Build | Branch | Handoff doc |
|-------|--------|-------------|
| Build 1 — Surgical Salvage | `build/1-surgical-salvage` | [`build-1-agent-handoff.md`](./build-1-agent-handoff.md) |
| Build 2 — Greenfield Core | `build/2-greenfield-core` | [`build-2-agent-handoff.md`](./build-2-agent-handoff.md) |
| Build 3 — Scope-Down MVP | `build/3-scope-mvp` | [`build-3-agent-handoff.md`](./build-3-agent-handoff.md) |

### Rules

1. Each agent works **only** on its assigned branch.
2. **No cherry-picks** from sibling build branches during the competition.
3. **No shared WIP** on one branch containing another build's code paths.
4. **No merges** to `main` until CEO declares winner.
5. **Ask CEO before any commit** on any build branch.

### Tree hygiene (Architect-maintained)

Each build branch carries:

1. **Identical competition baseline** — shared docs + pre-competition shared WIP (no sibling territory).
2. **One territory commit** — only that build's paths from §3.

Build agents must not check out sibling branches or copy sibling territory files. Report contamination to the Architect immediately.

---

## 3. File ownership matrix

Shared files require **minimal diffs** and **build-specific feature flags** only when unavoidable. Prefer adapters over editing shared files.

### Build 1 territory

| Path | Owner |
|------|-------|
| `src/systems/WalkabilityGraph.ts` | Build 1 |
| `src/systems/NavAgent.ts` | Build 1 |
| `src/systems/FacingConvention.ts` | Build 1 (Build 2/3: use own copy under their tree if needed) |
| `src/components/scene/WalkabilityGraphOverlay.tsx` | Build 1 |
| `scripts/validate-routes.ts` | Build 1 (Build 2/3: own script or namespaced command) |
| Heavy edits: `NPC.tsx`, `CulledNPC.tsx`, `chaosMonitor.ts`, `npcRegistry.ts` | Build 1 |

**Build 1 must not create:** `src/world/`, `src/mvp/`

### Build 2 territory

| Path | Owner |
|------|-------|
| `src/world/**` | Build 2 |
| `docs/architecture-v2/**` | Build 2 |
| `scripts/validate-routes.ts` | Build 2 (or `validate:routes:world`) |
| `scripts/watchdog-scenarios.ts` | Build 2 |

**Build 2 must not create:** `src/mvp/`  
**Build 2 must not extend:** legacy `warehouseLayout.ts` as dual source of truth after Phase A seed

### Build 3 territory

| Path | Owner |
|------|-------|
| `src/mvp/**` | Build 3 |
| `docs/phase2-expansion.md` | Build 3 |
| `scripts/validate-routes-mvp.ts` | Build 3 (preferred name to avoid script collision) |

**Build 3 must not create:** `src/world/`  
**Build 3 must not implement:** full maze NPC generation, 12-NPC routes, column patrol at ±7.5

### Shared — port only, coordinate before editing

| Path | Policy |
|------|--------|
| `GameScene.tsx` | Each build uses **one** warehouse path: legacy (B1), `src/world` (B2), `src/mvp` (B3). Flag: `VITE_BUILD_ROUTE=1\|2\|3` or separate scene component — **never all three wired at once**. |
| `App.tsx`, stores, HUD | Light wiring only; no navigation logic |
| `ParkingLot.tsx`, `parkingLotLayout.ts` | Identical port across builds — first agent to touch notifies Architect |
| `ShopperAvatar.tsx`, `ShoppingCart.tsx` | Facing convention via each build's own helper or shared module agreed post-competition |
| `package.json` scripts | Namespaced: `validate:routes:1`, `validate:routes:2`, `validate:routes:3` if multiple validators exist |

---

## 4. Runtime isolation (dev server)

Only **one** warehouse implementation active per running dev server.

Recommended env in each agent's local `.env.local` (gitignored):

```bash
# Build 1
VITE_BUILD_ROUTE=1

# Build 2
VITE_BUILD_ROUTE=2

# Build 3
VITE_BUILD_ROUTE=3
```

`GameScene` (or CEO-designated gate) reads `import.meta.env.VITE_BUILD_ROUTE` and mounts exactly one warehouse subsystem. Default during competition: **unset = legacy tree** until an agent wires its flag.

Port remains **5173** — agents do not run three servers simultaneously on one machine unless using separate worktrees and ports (5173 / 5174 / 5175) with CEO approval.

---

## 5. Evaluation rubric (CEO judges winner)

Weighted scoring — same criteria as [`ceo-rebuild-strategy.md` §5](./ceo-rebuild-strategy.md), plus **eligibility gates** (fail any = disqualified):

### Eligibility gates (all required)

| Gate | Test |
|------|------|
| Isolation | No sibling-territory files committed on branch |
| Routes | `validate:routes*` exits 0 for that build's NPC count |
| Watchdog | Synthetic jitter flags within 5s |
| Stuck NPC | No kiosk jitter after 10 min idle (or 10 min for MVP) |
| Loop | PARKING → SHOPPING → CHECKOUT completable |

### Scored criteria (1–5 each)

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Time to shippable loop | 30% | CEO sign-off timestamp |
| Revision-nightmare risk | 25% | Architect assesses maintainability post-handoff |
| Costco maze authenticity | 20% | Build 3 capped at 3 for this criterion by design |
| Long-term maintainability | 15% | Docs, single contract, agent can extend |
| Humor / juice ceiling | 10% | Subjective playtest |

**Build 2 prediction:** wins on risk + maintainability + maze; may trail Build 3 on raw speed — acceptable if gates pass first.

---

## 6. Architect responsibilities (pre-CTO)

- Maintain this charter and resolve territory disputes.
- Referee eligibility gates before CEO playtest.
- **Does not implement** competition builds — planning and judgment only.
- Produces winner recommendation memo for CEO.
- If Build 2 wins: transition to CTO role, spawn new architect + 3 implementation agents under new structure.

---

## 7. Agent reporting format

After each phase gate, agents post:

```text
Build [N] — Phase [X] gate
Branch: build/[N]-...
Files touched: [list]
Territory violations: none | [describe]
validate:routes*: pass | fail
Watchdog 10min: pass | fail | not yet run
Blockers: ...
```

---

## 8. Winner merge protocol

1. CEO declares winner (Build 1, 2, or 3).
2. Winner branch gets final playtest on clean checkout.
3. Single PR to `main` — **winner branch only**.
4. Loser branches tagged `archive/build-N-YYYY-MM-DD` — not deleted for reference.
5. Architect (or new CTO) writes post-mortem: what winner had that others lacked.

---

## 9. Quick reference — scope boundaries

| | Build 1 | Build 2 | Build 3 |
|---|---------|---------|---------|
| Layout source | `warehouseLayout.ts` | `layout.costco.json` | `mvpLayout.ts` |
| NPC count | ~12 | 12 | 4 |
| Walkable space | Full maze | Full maze | Racetrack only |
| New code root | `src/systems/` graph | `src/world/` | `src/mvp/` |
| Docs output | — | `architecture-v2/` | `phase2-expansion.md` |

---

## 10. Architect's move (CEO-authorized)

The CEO has directed the following as **Architect-owned actions** — not CEO homework.

### 10.1 Mandatory agent onboarding (Architect enforces)

Every build agent **must read in order** before writing code:

1. [`build-competition-charter.md`](./build-competition-charter.md) — this file, especially §3 territory matrix
2. Their route handoff: `build-[N]-agent-handoff.md`
3. [`ceo-rebuild-strategy.md`](./ceo-rebuild-strategy.md) — route section + §9–§11 contracts

First agent message must confirm: branch name, `VITE_BUILD_ROUTE` value, and territory paths they will touch.

### 10.2 Branch hygiene split (Architect executes)

The Architect splits contaminated working trees so each branch contains:

| Branch | Territory commit includes |
|--------|---------------------------|
| `build/1-surgical-salvage` | `src/systems/WalkabilityGraph.ts`, `WalkabilityGraphOverlay.tsx`, `scripts/validate-walkability-graph.ts` |
| `build/2-greenfield-core` | `src/world/**`, `docs/architecture-v2/**`, `scripts/validate-world.ts` |
| `build/3-scope-mvp` | `src/mvp/**`, `scripts/validate-mvp-phase-a.ts`, `validate:mvp` script |

**Excluded from every branch:** sibling territory paths above.

**Included on all branches (baseline):** competition docs, `agent-handoff-fresh-start.md`, shared chaos-test dev tooling where neutral.

### 10.3 Runtime env templates (Architect provides)

Copy to `.env.local` (gitignored) on each checkout:

| Build | `.env.local` |
|-------|--------------|
| 1 | `VITE_BUILD_ROUTE=1` |
| 2 | `VITE_BUILD_ROUTE=2` |
| 3 | `VITE_BUILD_ROUTE=3` |

Templates live in [`env/build-1.env.example`](./env/build-1.env.example) (and `-2`, `-3`).

### 10.4 Architect does not implement route code

During the competition the Architect maintains charter, hygiene, eligibility gates, and the winner recommendation — **no feature commits on build branches**.

---

*Architect agent — competition integrity is non-negotiable. Fair lanes produce a verdict the firm can trust.*
