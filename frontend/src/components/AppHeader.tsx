import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";
import { RulesModal } from "./RulesModal";

interface AppHeaderProps {
  title?: string;
  quotaRemaining?: number;
  showRulesButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = "Exclusive",
  quotaRemaining,
  showRulesButton = true,
}) => {
  const [rulesVisible, setRulesVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Ionicons name="heart" size={22} color={THEME.colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.actionsRow}>
        {quotaRemaining !== undefined && (
          <View style={styles.quotaPill}>
            <Ionicons name="sparkles" size={13} color={THEME.colors.purple} />
            <Text style={styles.quotaText}>{quotaRemaining}/10</Text>
          </View>
        )}

        {showRulesButton && (
          <TouchableOpacity
            style={styles.rulesButton}
            onPress={() => setRulesVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-outline" size={15} color={THEME.colors.primary} />
            <Text style={styles.rulesButtonText}>Rules</Text>
          </TouchableOpacity>
        )}
      </View>

      <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quotaPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.purple + "15",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  quotaText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.purple,
  },
  rulesButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  rulesButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
});
