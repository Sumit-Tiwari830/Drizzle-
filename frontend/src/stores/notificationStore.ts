import { create } from "zustand";
import { AppNotification } from "../types";
import { notificationApi } from "../api";

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  page: number;
  totalPages: number;
  fetchNotifications: (page?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: AppNotification) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  page: 1,
  totalPages: 1,

  fetchNotifications: async (page = 1) => {
    try {
      set({ isLoading: true });
      const data = await notificationApi.getNotifications(page, 20);
      set({
        notifications: page === 1 ? data.notifications : [...get().notifications, ...data.notifications],
        unreadCount: data.unreadCount ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
      });
    } catch (err) {
      console.warn("[NotificationStore] Failed to fetch notifications:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (err) {
      console.warn("[NotificationStore] Failed to fetch unread count:", err);
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      set({
        notifications: get().notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1),
      });
    } catch (err) {
      console.warn("[NotificationStore] Failed to mark as read:", err);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllAsRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch (err) {
      console.warn("[NotificationStore] Failed to mark all as read:", err);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      const target = get().notifications.find((n) => n._id === id);
      await notificationApi.deleteNotification(id);
      set({
        notifications: get().notifications.filter((n) => n._id !== id),
        unreadCount: target && !target.isRead ? Math.max(0, get().unreadCount - 1) : get().unreadCount,
      });
    } catch (err) {
      console.warn("[NotificationStore] Failed to delete notification:", err);
    }
  },

  addNotification: (notification: AppNotification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
