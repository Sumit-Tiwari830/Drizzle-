import { create } from "zustand";
import { ActiveMatch } from "../types";
import { matchApi } from "../api";

interface MatchState {
  activeMatch: ActiveMatch | null;
  isLoading: boolean;
  fetchMatch: () => Promise<ActiveMatch | null>;
  requestReveal: () => Promise<void>;
  unmatch: () => Promise<void>;
  setActiveMatch: (match: ActiveMatch | null) => void;
}

export const useMatchStore = create<MatchState>((set, get) => ({
  activeMatch: null,
  isLoading: false,

  fetchMatch: async () => {
    try {
      set({ isLoading: true });
      const match = await matchApi.getMyMatch();
      set({ activeMatch: match });
      return match;
    } catch (err) {
      console.warn("Error fetching current match:", err);
      set({ activeMatch: null });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  requestReveal: async () => {
    const { activeMatch } = get();
    if (!activeMatch) return;
    await matchApi.requestReveal(activeMatch.id);
    await get().fetchMatch();
  },

  unmatch: async () => {
    const { activeMatch } = get();
    if (!activeMatch) return;
    await matchApi.unmatch(activeMatch.id);
    set({ activeMatch: null });
  },

  setActiveMatch: (match: ActiveMatch | null) => set({ activeMatch: match }),
}));
