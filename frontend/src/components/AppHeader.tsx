import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";
import { RulesModal } from "./RulesModal";
import { NotificationBoxModal } from "./NotificationBoxModal";
import { useNotificationStore } from "../stores/notificationStore";

interface AppHeaderProps {
  title?: string;
  quotaRemaining?: number;
  showRulesButton?: boolean;
  showNotificationButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  quotaRemaining,
  showRulesButton = true,
  showNotificationButton = true,
}) => {
  const [rulesVisible, setRulesVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {title && title !== "Drizzle" ? (
          <View style={styles.subpageTitleRow}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.smallIcon}
              resizeMode="contain"
            />
            <Text style={styles.subpageTitle}>{title}</Text>
          </View>
        ) : (
          <Image
            source={require("../../assets/drizzle-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
      </View>

      <View style={styles.actionsRow}>
        {quotaRemaining !== undefined && (
          <View style={styles.quotaPill}>
            <Ionicons name="heart" size={12} color={THEME.colors.primary} />
            <Text style={styles.quotaText}>{quotaRemaining}/10 left</Text>
          </View>
        )}

        {showRulesButton && (
          <TouchableOpacity
            style={styles.rulesButton}
            onPress={() => setRulesVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.rulesButtonText}>Rules</Text>
          </TouchableOpacity>
        )}

        {showNotificationButton && (
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setNotificationsVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} />
      <NotificationBoxModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 110,
    height: 32,
  },
  subpageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
  },
  subpageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quotaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  quotaText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  rulesButton: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  rulesButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: 0.3,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.surface,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
});
