import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COMMUNITY_RULES } from "../constants/rules";
import { THEME } from "../constants/theme";

interface RulesModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Text style={styles.navTitle}>Community Principles</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
          {/* Header Intro Banner */}
          <View style={styles.introSection}>
            <Text style={styles.introHeadline}>Dating designed to be intentional.</Text>
            <Text style={styles.introBody}>
              Drizzle is built around genuine respect and undivided attention. Here is how our community thrives together.
            </Text>
          </View>

          {/* Clean, Linear Rules List (In-line layout, zero bulky cards) */}
          <View style={styles.linearContainer}>
            {COMMUNITY_RULES.map((rule, idx) => {
              const isLast = idx === COMMUNITY_RULES.length - 1;
              return (
                <View
                  key={rule.id}
                  style={[styles.ruleRow, isLast && styles.ruleRowLast]}
                >
                  {/* Left: Refined Number Badge */}
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{rule.number}</Text>
                  </View>

                  {/* Right: Inline Title, Tagline & Description */}
                  <View style={styles.ruleBody}>
                    <View style={styles.titleLine}>
                      <Text style={styles.ruleTitle}>{rule.title}</Text>
                    </View>
                    <Text style={styles.ruleTagline}>{rule.tagline}</Text>
                    <Text style={styles.ruleDescription}>{rule.description}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.agreeButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.agreeButtonText}>I Understand & Agree</Text>
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
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.lg,
    paddingBottom: 40,
  },
  introSection: {
    marginBottom: THEME.spacing.lg,
  },
  introHeadline: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  introBody: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  linearContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#261338",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: THEME.spacing.lg,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.border,
    gap: 12,
  },
  ruleRowLast: {
    borderBottomWidth: 0,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  numberText: {
    fontSize: 12,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  ruleBody: {
    flex: 1,
  },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  ruleTagline: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 2,
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  agreeButton: {
    backgroundColor: THEME.colors.primaryDark,
    paddingVertical: 15,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    shadowColor: THEME.colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  agreeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
