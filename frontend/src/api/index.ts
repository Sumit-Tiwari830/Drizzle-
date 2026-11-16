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
    const res = await apiClient.post("/requests/send", { receiverId, note });
    return res.data;
  },
};

// ==========================================
// 3. Connect Requests & 48H TTL
// ==========================================
export const requestsApi = {
  getReceived: async (): Promise<ConnectRequest[]> => {
    const res = await apiClient.get("/requests/my-requests");
    return res.data.data?.received || [];
  },

  getSent: async (): Promise<ConnectRequest[]> => {
    const res = await apiClient.get("/requests/my-requests");
    return res.data.data?.sent || [];
  },

  accept: async (requestId: string) => {
    const res = await apiClient.post(`/requests/${requestId}/respond`, { action: "ACCEPT" });
    return res.data;
  },

  reject: async (requestId: string) => {
    const res = await apiClient.post(`/requests/${requestId}/respond`, { action: "REJECT" });
    return res.data;
  },
};

// ==========================================
// 4. 1-to-1 Match & 48H Icebreaker
// ==========================================
export const matchApi = {
  getMyMatch: async (): Promise<ActiveMatch | null> => {
    const res = await apiClient.get("/matches/my-match");
    return res.data.data;
  },

  requestReveal: async (matchId: string) => {
    const res = await apiClient.post(`/matches/${matchId}/reveal-request`);
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
    const res = await apiClient.get(`/chat/messages/${matchId}`);
    return res.data.data;
  },

  markAsRead: async (matchId: string) => {
    const res = await apiClient.put(`/chat/messages/${matchId}/read`);
    return res.data;
  },
};

// ==========================================
// 6. Profile & Cloudinary Uploads
// ==========================================
export const profileApi = {
  getMyProfile: async (): Promise<Profile> => {
    const res = await apiClient.get("/profiles/me");
    return res.data.data;
  },

  updateProfile: async (data: Partial<Profile>) => {
    const res = await apiClient.put("/profiles/me", data);
    return res.data.data;
  },

  uploadAvatar: async (formData: FormData) => {
    const res = await apiClient.post("/profiles/upload-avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  uploadPhoto: async (formData: FormData) => {
    const res = await apiClient.post("/profiles/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  deletePhoto: async (photoUrl: string) => {
    const res = await apiClient.delete("/profiles/photos", { data: { photoUrl } });
    return res.data;
  },

  deleteAccount: async () => {
    const res = await apiClient.delete("/profiles/me");
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

// ==========================================
// 8. Admin Management
// ==========================================
export const adminApi = {
  getAllUsers: async (search?: string, filter?: string) => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (filter && filter !== "ALL") params.filter = filter;
    const res = await apiClient.get("/admin/users", { params });
    return res.data.data;
  },
  uploadMasterSheet: async (formData: FormData) => {
    const res = await apiClient.post("/admin/upload-master-sheet", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },
  verifyUser: async (userId: string) => {
    const res = await apiClient.post(`/admin/verify-user/${userId}`);
    return res.data;
  },
  unverifyUser: async (userId: string) => {
    const res = await apiClient.post(`/admin/unverify-user/${userId}`);
    return res.data;
  },
  blockUser: async (userId: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/block`);
    return res.data;
  },
  unblockUser: async (userId: string) => {
    const res = await apiClient.patch(`/admin/users/${userId}/unblock`);
    return res.data;
  },
  removeUser: async (userId: string) => {
    const res = await apiClient.delete(`/admin/users/${userId}`);
    return res.data;
  },
};

// ==========================================
// 9. Notification Box
// ==========================================
export const notificationApi = {
  getNotifications: async (page: number = 1, limit: number = 20) => {
    const res = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
    return res.data.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await apiClient.get("/notifications/unread-count");
    return res.data.data.unreadCount;
  },

  markAsRead: async (id: string) => {
    const res = await apiClient.put(`/notifications/${id}/read`);
    return res.data.data;
  },

  markAllAsRead: async () => {
    const res = await apiClient.put("/notifications/mark-all-read");
    return res.data;
  },

  deleteNotification: async (id: string) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res.data;
  },
};
