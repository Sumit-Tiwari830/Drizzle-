import axios from "axios";
import { Platform } from "react-native";
import { storage } from "../utils/storage";

// In development:
// Android Emulator uses 10.0.2.2 to access host machine
// iOS Simulator uses localhost
// Physical device uses your local LAN IP (e.g., 192.168.x.x)
const getBaseUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api/v1";
  }
  return "http://localhost:5000/api/v1";
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Attach JWT access token to every outgoing request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItemAsync("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Error reading access token:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified error interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response ? error.response.status : null;
    const data = error.response ? error.response.data : null;

    if (status === 401) {
      // Token expired or invalid -> Clear local token
      await storage.deleteItemAsync("accessToken");
    }

    // Enhance error with clean backend message
    const message = data?.message || error.message || "An unexpected network error occurred";
    return Promise.reject(new Error(message));
  }
);
