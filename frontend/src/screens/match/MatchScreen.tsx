import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { IcebreakerBanner } from "../../components/IcebreakerBanner";
import { useMatchStore } from "../../stores/matchStore";
import { useAuthStore } from "../../stores/authStore";

export const MatchScreen = ({ navigation }: any) => {
  const activeMatch = useMatchStore((s) => s.activeMatch);
  const loading = useMatchStore((s) => s.isLoading);
  const fetchMatch = useMatchStore((s) => s.fetchMatch);
  const requestReveal = useMatchStore((s) => s.requestReveal);
  const unmatch = useMatchStore((s) => s.unmatch);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  const handleReveal = async () => {
    try {
      await requestReveal();
      Alert.alert(
        "Reveal Requested",
        "You have requested to mutually reveal real identities. Once your partner accepts, real photos and details will unlock!"
      );
    } catch (err: any) {
      Alert.alert("Reveal Error", err.message || "Failed to send reveal request.");
    }
  };

  const handleUnmatch = () => {
    Alert.alert(
      "End Connection?",
      "Are you sure you want to end this connection? This will close the match for both of you and your private conversation will disappear.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, End Match",
          style: "destructive",
          onPress: async () => {
            try {
              await unmatch();
              Alert.alert("Connection Ended", "You can now discover new connections.");
              navigation.navigate("FeedTab");
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to end connection.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  if (!activeMatch) {
    return (
      <View style={styles.container}>
        <AppHeader title="Current Match" />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="heart-dislike-outline" size={48} color={THEME.colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Active Match</Text>
          <Text style={styles.emptySubtitle}>
            You currently have no 1-to-1 match. Explore profiles in the Discovery Feed or check incoming connect requests!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate("FeedTab")}
          >
            <Text style={styles.exploreButtonText}>Explore Feed</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const partner = activeMatch.partner;
  const isRevealed = partner?.isRevealed ?? false;

  return (
    <View style={styles.container}>
      <AppHeader title="Active Match" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 1. Rule 1: 48-Hour Icebreaker Timer Banner */}
        <IcebreakerBanner
          deadline={activeMatch.icebreakerDeadline}
          hasIcebreakerBeenSent={activeMatch.hasIcebreakerBeenSent}
          onPressAction={() => navigation.navigate("ChatRoom", { matchId: activeMatch.id })}
        />

        {/* 2. Partner Profile Card */}
        <View style={styles.partnerCard}>
          <View style={styles.photoContainer}>
            <Image
              source={{
                uri:
                  partner?.avatarUrl ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
              }}
              style={styles.photo}
            />
            <View style={styles.shieldBadge}>
              <Ionicons
                name={isRevealed ? "checkmark-circle" : "shield-half"}
                size={14}
                color={isRevealed ? THEME.colors.success : THEME.colors.primary}
              />
              <Text
                style={[
                  styles.shieldBadgeText,
                  { color: isRevealed ? THEME.colors.success : THEME.colors.primary },
                ]}
              >
                {isRevealed ? "Mutual Reveal Unlocked" : "Privacy Shield Active"}
              </Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.nameRow}>
              <Text style={styles.partnerName}>{partner?.username}</Text>
              {partner?.age && <Text style={styles.partnerAge}>, {partner.age}</Text>}
            </View>

            <View style={styles.attributesRow}>
              {partner?.height && (
                <View style={styles.chip}>
                  <Ionicons name="resize-outline" size={13} color={THEME.colors.textSecondary} />
                  <Text style={styles.chipText}>{partner.height} cm</Text>
                </View>
              )}
              <View style={styles.chip}>
                <Ionicons name="location-outline" size={13} color={THEME.colors.textSecondary} />
                <Text style={styles.chipText}>{partner?.region || "India"}</Text>
              </View>
              {partner?.lookingFor && (
                <View style={styles.chip}>
                  <Ionicons name="sparkles-outline" size={13} color={THEME.colors.primary} />
                  <Text style={[styles.chipText, { color: THEME.colors.primary }]}>{partner.lookingFor}</Text>
                </View>
              )}
            </View>

            {partner?.bio ? (
              <View style={styles.bioBox}>
                <Text style={styles.bioText}>"{partner.bio}"</Text>
              </View>
            ) : null}

            {/* Quick Action Buttons */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => navigation.navigate("ChatRoom", { matchId: activeMatch.id })}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubbles" size={20} color="#FFF" />
                <Text style={styles.chatButtonText}>Open Live Chat</Text>
              </TouchableOpacity>

              {!isRevealed && (
                <TouchableOpacity
                  style={styles.revealButton}
                  onPress={handleReveal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="eye-outline" size={18} color={THEME.colors.primary} />
                  <Text style={styles.revealButtonText}>Request Reveal</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Unmatch Action */}
            <TouchableOpacity style={styles.unmatchButton} onPress={handleUnmatch}>
              <Ionicons name="close-circle-outline" size={16} color={THEME.colors.textMuted} />
              <Text style={styles.unmatchButtonText}>End Connection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
    marginTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: THEME.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    marginBottom: THEME.spacing.xl,
  },
  exploreButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  partnerCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  photoContainer: {
    width: "100%",
    height: 340,
    position: "relative",
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  shieldBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  shieldBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoSection: {
    padding: THEME.spacing.lg,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  partnerName: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  partnerAge: {
    fontSize: 24,
    fontWeight: "500",
    color: THEME.colors.textSecondary,
  },
  attributesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  bioBox: {
    backgroundColor: THEME.colors.surfaceSecondary,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.lg,
  },
  bioText: {
    fontSize: 14,
    color: THEME.colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 20,
  },
  actionGrid: {
    gap: 10,
    marginBottom: THEME.spacing.md,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
  },
  chatButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.primaryLight,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  revealButtonText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  unmatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  unmatchButtonText: {
    color: THEME.colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
});
