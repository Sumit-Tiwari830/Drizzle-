import { apiClient } from "./client";
import { User, Profile, CandidateFeedItem, ConnectRequest, ActiveMatch, ChatMessage } from "../types";

// ==========================================
// 1. Authentication & OTP
// ==========================================
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiClient.post("/auth/login", { email, password });
    return res.data;
  },

  register: async (email: string, password: string) => {
    const res = await apiClient.post("/auth/register", { email, password });
    return res.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const res = await apiClient.post("/auth/verify-otp", { email, otp });
    return res.data;
  },

  resendOtp: async (email: string) => {
    const res = await apiClient.post("/auth/resend-otp", { email });
    return res.data;
  },
};

// ==========================================
// 2. Discovery Feed & Interaction
// ==========================================
export const discoveryApi = {
  getFeed: async (): Promise<{ candidates: CandidateFeedItem[]; quota: { used: number; remaining: number } }> => {
    const res = await apiClient.get("/discovery");
    return res.data.data;
  },

  sendRequest: async (receiverId: string, note?: string) => {
    const res = await apiClient.post("/requests", { receiverId, note });
    return res.data;
  },
};

// ==========================================
// 3. Connect Requests & 48H TTL
// ==========================================
export const requestsApi = {
  getReceived: async (): Promise<ConnectRequest[]> => {
    const res = await apiClient.get("/requests/received");
    return res.data.data;
  },

  getSent: async (): Promise<ConnectRequest[]> => {
    const res = await apiClient.get("/requests/sent");
    return res.data.data;
  },

  accept: async (requestId: string) => {
    const res = await apiClient.post(`/requests/${requestId}/accept`);
    return res.data;
  },

  reject: async (requestId: string) => {
    const res = await apiClient.post(`/requests/${requestId}/reject`);
    return res.data;
  },
};

// ==========================================
// 4. 1-to-1 Match & 48H Icebreaker
// ==========================================
export const matchApi = {
  getMyMatch: async (): Promise<ActiveMatch | null> => {
    const res = await apiClient.get("/matches/current");
    return res.data.data;
  },

  requestReveal: async (matchId: string) => {
    const res = await apiClient.post(`/matches/${matchId}/reveal`);
    return res.data;
  },

  unmatch: async (matchId: string) => {
    const res = await apiClient.post(`/matches/${matchId}/unmatch`);
    return res.data;
  },
};

// ==========================================
// 5. Chat History
// ==========================================
export const chatApi = {
  getMessages: async (matchId: string): Promise<ChatMessage[]> => {
    const res = await apiClient.get(`/chat/${matchId}/messages`);
    return res.data.data;
  },

  markAsRead: async (matchId: string) => {
    const res = await apiClient.post(`/chat/${matchId}/read`);
    return res.data;
  },
};

// ==========================================
// 6. Profile & Cloudinary Uploads
// ==========================================
export const profileApi = {
  getMyProfile: async (): Promise<Profile> => {
    const res = await apiClient.get("/profile");
    return res.data.data;
  },

  updateProfile: async (data: Partial<Profile>) => {
    const res = await apiClient.put("/profile", data);
    return res.data.data;
  },

  uploadAvatar: async (formData: FormData) => {
    const res = await apiClient.post("/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  uploadPhoto: async (formData: FormData) => {
    const res = await apiClient.post("/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  deletePhoto: async (photoUrl: string) => {
    const res = await apiClient.delete("/photos", { data: { photoUrl } });
    return res.data;
  },
};

// ==========================================
// 7. Device Push Token Registration
// ==========================================
export const pushApi = {
  registerToken: async (token: string, platform: "android" | "ios" | "web") => {
    const res = await apiClient.post("/notifications/device-token", { token, platform });
    return res.data;
  },

  removeToken: async (token: string) => {
    const res = await apiClient.delete("/notifications/device-token", { data: { token } });
    return res.data;
  },
};
