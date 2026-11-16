import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";
import { useNotificationStore } from "../stores/notificationStore";
import { showAlert } from "../stores/alertStore";
import { AppNotification } from "../types";

interface NotificationBoxModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationBoxModal: React.FC<NotificationBoxModalProps> = ({
  visible,
  onClose,
}) => {
  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);

  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "unread") {
      return !item.isRead;
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MATCHED":
        return { name: "heart" as const, color: THEME.colors.primary, bg: THEME.colors.primaryLight + "30" };
      case "REQUEST_RECEIVED":
        return { name: "paper-plane" as const, color: THEME.colors.secondary, bg: THEME.colors.secondaryLight + "40" };
      case "UNMATCHED":
        return { name: "heart-dislike" as const, color: THEME.colors.danger, bg: THEME.colors.danger + "15" };
      case "PROFILE_REVEAL":
        return { name: "eye" as const, color: THEME.colors.cyan, bg: THEME.colors.cyanLight + "40" };
      case "VERIFIED":
        return { name: "checkmark-circle" as const, color: THEME.colors.success, bg: THEME.colors.success + "20" };
      case "ACCOUNT_STATUS":
        return { name: "alert-circle" as const, color: THEME.colors.danger, bg: THEME.colors.danger + "15" };
      default:
        return { name: "notifications" as const, color: THEME.colors.warning, bg: THEME.colors.warning + "20" };
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const iconConfig = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
        onPress={() => {
          if (!item.isRead) {
            markAsRead(item._id);
          }
          if (item.type === "VERIFIED") {
            showAlert({
              type: "success",
              title: item.title || "Account Verified! ✅",
              message: item.message || "Your profile credentials have been officially verified by Drizzle Administration.",
              buttonText: "OK, Awesome!",
            });
          }
        }}
        activeOpacity={0.8}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
          <Ionicons name={iconConfig.name} size={18} color={iconConfig.color} />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.itemTitle, !item.isRead && styles.unreadItemTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.createdAt)}</Text>
          </View>

          <Text style={styles.itemMessage} numberOfLines={3}>
            {item.message}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {!item.isRead && <View style={styles.unreadDot} />}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteNotification(item._id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={14} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.bellIconCircle}>
              <Ionicons name="notifications" size={18} color={THEME.colors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Notification Box</Text>
              <Text style={styles.headerSubtitle}>
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "All updates caught up"}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={markAllAsRead}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={14} color={THEME.colors.primary} />
                <Text style={styles.markAllText}>Mark read</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "all" && styles.activeFilterPill]}
            onPress={() => setActiveFilter("all")}
          >
            <Text style={[styles.filterPillText, activeFilter === "all" && styles.activeFilterPillText]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === "unread" && styles.activeFilterPill]}
            onPress={() => setActiveFilter("unread")}
          >
            <Text style={[styles.filterPillText, activeFilter === "unread" && styles.activeFilterPillText]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications List */}
        {isLoading && notifications.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={THEME.colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="notifications-outline" size={40} color={THEME.colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeFilter === "unread" ? "No unread notifications" : "Your notification box is quiet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter === "unread"
                    ? "You've read all your recent notifications."
                    : "When you receive new connect requests, match updates, or system announcements, they will appear here."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 14,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bellIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primaryLight + "30",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  activeFilterPill: {
    backgroundColor: THEME.colors.primaryDark,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  activeFilterPillText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "flex-start",
  },
  unreadCard: {
    backgroundColor: "#FFFDF9",
    borderColor: THEME.colors.primary + "30",
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    marginRight: 8,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  unreadItemTitle: {
    color: THEME.colors.primaryDark,
    fontWeight: "800",
  },
  timeText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  itemMessage: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  cardActions: {
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: THEME.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
});
