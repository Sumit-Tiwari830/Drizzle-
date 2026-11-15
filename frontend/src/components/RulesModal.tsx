import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_RULES } from "../constants/rules";
import { THEME } from "../constants/theme";

interface RulesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={24} color={THEME.colors.primary} />
            <Text style={styles.headerTitle}>App Rules & Etiquette</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerSubtitle}>
          Our platform is intentionally built for meaningful, exclusive connections. Please review how our 1-to-1 matching and privacy rules work.
        </Text>

        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
          {APP_RULES.map((rule, idx) => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleTopRow}>
                <View style={[styles.iconWrapper, { backgroundColor: rule.color + "15" }]}>
                  <Ionicons name={rule.icon as any} size={22} color={rule.color} />
                </View>
                <View style={styles.titleContainer}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.ruleNumber}>0{idx + 1}</Text>
                    <View style={[styles.badge, { backgroundColor: rule.color + "20" }]}>
                      <Text style={[styles.badgeText, { color: rule.color }]}>{rule.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.ruleTitle}>{rule.title}</Text>
                </View>
              </View>

              <Text style={styles.ruleSubtitle}>{rule.subtitle}</Text>
              <Text style={styles.ruleDescription}>{rule.description}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.acknowledgeButton} onPress={onClose}>
            <Text style={styles.acknowledgeButtonText}>I Understand & Agree</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    lineHeight: 18,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    padding: THEME.spacing.md,
    gap: THEME.spacing.md,
    paddingBottom: 40,
  },
  ruleCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ruleTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  ruleNumber: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.colors.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  ruleSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
  },
  acknowledgeButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    marginTop: THEME.spacing.sm,
  },
  acknowledgeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
