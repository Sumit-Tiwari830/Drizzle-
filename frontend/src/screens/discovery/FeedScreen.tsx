import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { HingeCard } from "../../components/HingeCard";
import { discoveryApi } from "../../api";
import { CandidateFeedItem } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { useMatchStore } from "../../stores/matchStore";

export const FeedScreen = ({ navigation }: any) => {
  const [candidates, setCandidates] = useState<CandidateFeedItem[]>([]);
  const [quotaRemaining, setQuotaRemaining] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = useAuthStore((s) => s.user);
  const activeMatch = useMatchStore((s) => s.activeMatch);
  const fetchMatch = useMatchStore((s) => s.fetchMatch);

  const loadFeed = useCallback(async () => {
    try {
      // Also check if user has an active match
      const currentMatch = await fetchMatch();
      if (currentMatch) {
        setLoading(false);
        return;
      }

      const data = await discoveryApi.getFeed();
      setCandidates(data.candidates);
      setQuotaRemaining(data.quota?.remaining ?? 10);
    } catch (err: any) {
      console.warn("Failed to load feed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchMatch]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRequestSent = async (receiverId: string, note?: string) => {
    await discoveryApi.sendRequest(receiverId, note);
    Alert.alert(
      "Connect Request Sent! 💌",
      "Your request has been dispatched with a 48-hour response window. You will be notified when they respond."
    );
    // Decrement local quota
    setQuotaRemaining((prev) => Math.max(0, prev - 1));
    // Remove candidate from current feed view
    setCandidates((prev) => prev.filter((c) => c.userId !== receiverId));
  };

  // If user is locked in an exclusive match, display Lock Screen
  if (activeMatch || user?.isLocked) {
    return (
      <View style={styles.container}>
        <AppHeader quotaRemaining={quotaRemaining} />
        <View style={styles.lockedContainer}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="heart" size={44} color={THEME.colors.primary} />
          </View>
          <Text style={styles.lockedTitle}>Exclusive Connection Active</Text>
          <Text style={styles.lockedSubtitle}>
            You are currently connected with your match. Discover is paused so you can give each other genuine, undivided attention.
          </Text>

          <TouchableOpacity
            style={styles.goToMatchButton}
            onPress={() => navigation.navigate("MatchTab")}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubbles" size={18} color="#FFF" />
            <Text style={styles.goToMatchButtonText}>Open Conversation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader quotaRemaining={quotaRemaining} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Curating verified profiles...</Text>
        </View>
      ) : candidates.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="sparkles-outline" size={48} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>You're All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>
            No more profiles in your region right now. Check your Requests tab or check back soon.
          </Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadFeed}>
            <Text style={styles.refreshButtonText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.userId}
          renderItem={({ item }) => (
            <HingeCard
              candidate={item}
              remainingQuota={quotaRemaining}
              onRequestSent={handleRequestSent}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFeed();
              }}
              tintColor={THEME.colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: "600",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  refreshButton: {
    marginTop: 16,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.full,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },
  lockIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: THEME.spacing.lg,
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
    marginBottom: THEME.spacing.xl,
  },
  goToMatchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
  },
  goToMatchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
