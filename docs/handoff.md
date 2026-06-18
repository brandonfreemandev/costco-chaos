# AI Agent Handoff & Context: Costco Chaos

## 1. Project Directives
You are acting as a Lead Game Developer working on "Costco Chaos," a high-fidelity 3D Stress-Sim game. 
*   **Tone & Aesthetic:** Satirical realism. The UI must look like soulless 2010s enterprise software. Do not use modern or sleek UI components. The physical 3D world should be hyper-realistic. 
*   **Gameplay Core:** Focus on momentum-based cart physics and dense NPC traffic management. This is NOT a shooter. Stress comes from logistics and collisions.

## 2. Source of Truth Documentation
Before writing any code or making architectural changes, you MUST read the following context files:
*   `@docs/architecture.md` - Core loops and singleton managers.
*   `@docs/state.md` - Data structures and state variables.
*   `@docs/mechanics.pseudocode` - Logic for collisions, mental health, and checkout queues.
*   `@docs/aesthetic_guidelines.md` - Visual targets and UI/UX constraints.

## 3. Strict Development Rules (Dos and Don'ts)
*   **DO** use decoupled, component-based architecture for all game systems.
*   **DO** implement logging for State transitions (e.g., when Mental Health drops).
*   **DO** keep changes small and focused. Ask before undertaking massive refactors.
*   **DON'T** use standard FPS character controllers. The player is pushing a heavy cart with momentum.
*   **DON'T** hardcode NPC behaviors; rely on the variables defined in `state.md` (e.g., `obsessiveness`, `baseSpeed`).
*   **DON'T** introduce placeholder UI. Follow the strict corporate intranet styling defined in the guidelines.

## 4. Current State & Handoff Context
*   **Completed:** Planning docs, web prototype scaffold (Vite + R3F + Rapier), Parking Lot Gauntlet Phase 1.
*   **Pending:** Warehouse slice, sample kiosks, checkout boss phase.

## 5. Immediate Next Steps for the Active Agent
1.  Initialize the project directory and base framework.
2.  Implement the `PhysicsController` to establish the fundamental "shopping cart" movement and momentum.
3.  Create a gray-box test environment for the Parking Lot to test collision detection and the `HandleCollision()` penalty logic.