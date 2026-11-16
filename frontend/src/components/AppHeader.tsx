import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";
import { RulesModal } from "./RulesModal";

interface AppHeaderProps {
  title?: string;
  quotaRemaining?: number;
  showRulesButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  quotaRemaining,
  showRulesButton = true,
}) => {
  const [rulesVisible, setRulesVisible] = useState(false);

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
            <Ionicons name="sparkles" size={13} color={THEME.colors.secondary} />
            <Text style={styles.quotaText}>{quotaRemaining}/10 left</Text>
          </View>
        )}

        {showRulesButton && (
          <TouchableOpacity
            style={styles.rulesButton}
            onPress={() => setRulesVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles-outline" size={14} color={THEME.colors.primaryDark} />
            <Text style={styles.rulesButtonText}>Principles</Text>
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
    backgroundColor: THEME.colors.secondaryLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  quotaText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.secondary,
  },
  rulesButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.full,
    gap: 4,
  },
  rulesButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
});
