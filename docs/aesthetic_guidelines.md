# Aesthetic & Tone: "Satirical Realism"

## The Visual Target
The game operates on a dissonance between high-fidelity 3D assets and deeply cynical, bureaucratic UI design. The physical world should look expensive, while the interface looks like legacy software that management refuses to update.

*   **Environment:** High-res PBR textures. The concrete floor should have hyper-realistic reflections from the harsh fluorescent lighting. The sheer scale of the pallets should feel physically oppressive.
*   **Animations:** Exaggerated, but grounded. An NPC shouldn't just turn; they should struggle to pivot a 300-pound flatbed of bottled water, creating mechanical tension.

## The HUD & UI Design (Current Implementation)
The live game uses a **clean modern collapsible sidebar** (`GameSidebar.tsx`) — dark slate panel, Mental Health bar, shopping list grid, cart stats. This replaced an earlier corporate-intranet concept.

## The HUD & UI Design (Original Concept — Partially Stale)
The original vision called for 2010s-era enterprise software aesthetics. **Do not implement this unless the user explicitly asks to revert.**

*   **Color Palette:** Gray bevels, harsh #0000FF hyperlinks, muted beige backgrounds for inventory panes.
*   **Typography:** Strict use of Arial, Tahoma, or Verdana. No anti-aliasing on small text.
*   **Mental Health Meter:** A clean progress bar (green to yellow to critical red) labeled "Mental Health" — drops when other shoppers bump your cart.
*   **Shopping List:** Rendered as a dense, unreadable datagrid. Checking off an item should trigger a highly compressed, corporate "ding" sound effect.

## Sound Design
*   **Ambient:** The constant, oppressive drone of HVAC systems. 
*   **Foley:** Pristine audio capture of physical struggle. Squeaking wheels must loop irregularly to maximize psychological irritation.