import { create } from 'zustand';

/**
 * In-world LLM character encounters (Vitamix Prophet, etc.).
 * A proximity trigger opens one; the shared EncounterOverlay renders it.
 * Each persona fires at most once per run (tracked in `seen`).
 */
interface EncounterStore {
  /** Persona id of the active encounter, or null. */
  active: string | null;
  /** Persona ids already triggered this run (don't re-pester). */
  seen: Set<string>;
  trigger: (personaId: string) => void;
  dismiss: () => void;
  reset: () => void;
}

export const useEncounterStore = create<EncounterStore>((set, get) => ({
  active: null,
  seen: new Set(),

  trigger: (personaId) => {
    const { active, seen } = get();
    if (active || seen.has(personaId)) return;
    set({ active: personaId, seen: new Set(seen).add(personaId) });
  },

  dismiss: () => set({ active: null }),

  reset: () => set({ active: null, seen: new Set() }),
}));
