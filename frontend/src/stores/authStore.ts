import { create } from "zustand";
import { storage } from "../utils/storage";
import { User, Profile } from "../types";
import { authApi, profileApi } from "../api";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User) => void;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (token: string, user: User) => {
    if (!token || token === "undefined" || token === "null") {
      console.warn("Attempted to login with invalid token:", token);
      return;
    }
    await storage.setItemAsync("accessToken", token);
    set({ accessToken: token, user, isAuthenticated: true });
    // Fetch user profile immediately
    try {
      const profile = await profileApi.getMyProfile();
      set({ profile });
    } catch (e) {
      console.warn("Profile not yet configured, needs onboarding:", e);
    }
  },

  logout: async () => {
    await storage.deleteItemAsync("accessToken");
    set({ user: null, profile: null, accessToken: null, isAuthenticated: false });
  },

  checkSession: async () => {
    try {
      set({ isLoading: true });
      const token = await storage.getItemAsync("accessToken");
      if (token && token !== "undefined" && token !== "null" && token.trim().length > 10) {
        set({ accessToken: token, isAuthenticated: true });
        const profile = await profileApi.getMyProfile();
        set({ profile });
      } else {
        await storage.deleteItemAsync("accessToken");
        set({ user: null, profile: null, accessToken: null, isAuthenticated: false });
      }
    } catch (err) {
      console.warn("Session check error / unauthenticated:", err);
      await storage.deleteItemAsync("accessToken");
      set({ user: null, profile: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    try {
      const profile = await profileApi.getMyProfile();
      set({ profile });
    } catch (err) {
      console.warn("Error refreshing profile:", err);
    }
  },

  setUser: (user: User) => set({ user }),
  setProfile: (profile: Profile) => set({ profile }),
}));
