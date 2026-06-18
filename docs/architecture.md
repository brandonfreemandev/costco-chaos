# System Architecture: Costco Chaos

## Core Gameplay Loop
1. **The Gauntlet (Parking Lot):** Navigate momentum-based cart physics to secure a parking spot while avoiding aggressive NPC vehicles and pedestrians.
2. **The Fulfillment (Warehouse):** Traverse the store layout to collect randomized list items. Manage Mental Health (MH) against collision penalties.
3. **The Oasis (Sample Kiosks):** Optional high-risk/high-reward diversions to restore MH.
4. **The Purgatory (Checkout):** A lane-management survival phase where MH drains continuously until the transaction completes.

## Technical Architecture (Component-Based)
The project utilizes a decoupled architecture to separate rendering from game logic.

*   **GameManager (Singleton):** Orchestrates state transitions (Start -> Parking -> Shopping -> Checkout -> Game Over/Win).
*   **PhysicsController (Vehicle-Lite):** Handles player and NPC movement. Uses a custom mass/momentum model rather than a standard character controller to simulate the heavy, drifting nature of a loaded shopping cart.
*   **Spatial Audio Manager:** Crucial for the "stress-sim" aspect. Prioritizes pristine, high-fidelity audio with sharp transients for cart impacts and spatialized squeaking wheels to elevate anxiety.
*   **AIManager (Navigation Mesh):** Manages NPC pathfinding, dynamic obstacle avoidance, and "Swarm" event triggers for sample kiosks.
*   **InventoryTracker:** A quest-system variant that listens for collider overlaps in designated product zones.