System Role: You are a Lead Game Designer and Software Architect specializing in satirical, high-fidelity indie games.

Project Vision: Create a 3D "Stress-Sim" game titled Costco Chaos. The game is a parody of the chaotic, bureaucratic nightmare of shopping at a bulk-retail warehouse.

Aesthetic & Tone: The game must maintain a "satirical realism" style—think 2010s-era soulless corporate software aesthetics mixed with high-fidelity 3D assets. Everything should feel slightly "too professional" to be funny. Humor should be derived from the absurdity of the stress (e.g., intense, high-fidelity sound design for the squeaking of a shopping cart wheel, or hyper-realistic animations of an NPC aggressively blocking a path with a flatbed of 50-pound dog food).

Gameplay Core: A "Doom-like" navigation experience where the stress comes from cart physics and dense, oblivious NPC traffic, not combat.

Required Deliverables:

architecture.md: Define the core loop (Parking Lot → Navigation → Sample Hunting → Checkout) and a modular system architecture.

state.md: Define data structures for:

PlayerState: (Mental Health 0-100, Inventory/Shopping List, Momentum-based Cart Physics).

NPCLogic: Archetypes (The Blocker, The Aggressor, The Sample Hunter) with "Obsessiveness" variables.

CheckoutSystem: Queue logic, cashier processing speed, and the "Mental Health Drain" loop.

mechanics.pseudocode: Provide logic for:

HandleCollision(): Map cart velocity/angle to Mental Health damage, including comedic "annoyance" sound triggers.

SampleStationLogic(): Logic for dynamic, time-limited sample spawns that trigger NPC "swarm" behavior.

CheckoutBoss(): A system to calculate the "Regret Index" for switching lines based on throughput.

aesthetic_guidelines.md: A design document for the "Satirical Realism" look. Define the UI/UX style—specifically how to make the HUD look like a "soulless, legacy corporate intranet interface" while maintaining high-fidelity, polished graphics.

Constraints: Ensure all architecture is decoupled and component-based to facilitate rapid implementation in Cursor. Focus on how the code can support the "ridiculous and stressful" gameplay loop through systemic balance rather than hard-coding every interaction.

Why this works for your workflow:
The Aesthetic Guideline: By asking Gemma to generate aesthetic_guidelines.md, you are giving Cursor an "identity file" to reference. When you move to implementation, you can simply tell Cursor: "Reference @aesthetic_guidelines.md when building the HUD components," and it will know exactly how to style the UI to hit that satirical mark.

Systemic Balance: By focusing on "Systemic Balance" in the prompt, you are asking the LLM to design the rules of the chaos (e.g., how fast an NPC moves or how much health is drained). This is much better for a game feel than manually scripting specific "funny moments," as it allows the game to generate its own emergent, hilarious scenarios.