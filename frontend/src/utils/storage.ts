import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const memoryStorage = new Map<string, string>();

export const storage = {
  async getItemAsync(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch (e) {
        return memoryStorage.get(key) || null;
      }
      return memoryStorage.get(key) || null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn(`[storage] Error reading key ${key} from SecureStore:`, err);
      return null;
    }
  },

  async setItemAsync(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch (e) {
        memoryStorage.set(key, value);
        return;
      }
      memoryStorage.set(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.warn(`[storage] Error setting key ${key} in SecureStore:`, err);
    }
  },

  async deleteItemAsync(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      } catch (e) {
        memoryStorage.delete(key);
        return;
      }
      memoryStorage.delete(key);
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn(`[storage] Error deleting key ${key} from SecureStore:`, err);
    }
  },
};
