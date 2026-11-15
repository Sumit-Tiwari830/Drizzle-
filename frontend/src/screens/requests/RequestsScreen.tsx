import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { requestsApi } from "../../api";
import { ConnectRequest } from "../../types";
import { useMatchStore } from "../../stores/matchStore";

export const RequestsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const [receivedRequests, setReceivedRequests] = useState<ConnectRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchMatch = useMatchStore((s) => s.fetchMatch);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [received, sent] = await Promise.all([
        requestsApi.getReceived(),
        requestsApi.getSent(),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (err: any) {
      console.warn("Failed to load requests:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (request: ConnectRequest) => {
    try {
      await requestsApi.accept(request.id);
      Alert.alert("It's a Match! 🎉", "You are now in an exclusive 1-to-1 match. Say hello before the 48-hour icebreaker expires!");
      await fetchMatch();
      navigation.navigate("MatchTab");
    } catch (err: any) {
      // Backend returns clear message when already cancelled / matched
      Alert.alert("Unable to Accept", err.message || "Request is no longer active.");
      // Refresh requests list to remove stale item
      loadRequests();
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await requestsApi.reject(requestId);
      setReceivedRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject request.");
    }
  };

  const formatTtl = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  };

  const currentList = activeTab === "received" ? receivedRequests : sentRequests;

  return (
    <View style={styles.container}>
      <AppHeader title="Requests" />

      {/* Tabs Switcher */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "received" && styles.activeTabButton]}
          onPress={() => setActiveTab("received")}
        >
          <Text style={[styles.tabText, activeTab === "received" && styles.activeTabText]}>
            Received ({receivedRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "sent" && styles.activeTabButton]}
          onPress={() => setActiveTab("sent")}
        >
          <Text style={[styles.tabText, activeTab === "sent" && styles.activeTabText]}>
            Sent ({sentRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="mail-open-outline" size={48} color={THEME.colors.textMuted} />
          <Text style={styles.emptyTitle}>
            No {activeTab === "received" ? "Received" : "Sent"} Requests
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === "received"
              ? "When someone likes your profile, their 48-hour request will show up here."
              : "Profiles you connect with will appear here until they accept or the 48h timer expires."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const profile = item.partnerProfile;
            return (
              <View style={styles.requestCard}>
                <View style={styles.cardHeader}>
                  <Image
                    source={{
                      uri:
                        profile?.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
                    }}
                    style={styles.avatar}
                  />
                  <View style={styles.headerInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>{profile?.username || "Candidate"}</Text>
                      {profile?.age && <Text style={styles.age}>, {profile.age}</Text>}
                    </View>
                    <Text style={styles.statsText}>
                      {profile?.height ? `${profile.height} cm • ` : ""}
                      {profile?.region || "India"}
                    </Text>
                  </View>

                  <View style={styles.ttlBadge}>
                    <Ionicons name="hourglass-outline" size={12} color={THEME.colors.warning} />
                    <Text style={styles.ttlText}>{formatTtl(item.expiresAt)}</Text>
                  </View>
                </View>

                {item.note ? (
                  <View style={styles.noteBox}>
                    <Ionicons name="chatbubble-ellipses-outline" size={14} color={THEME.colors.primary} />
                    <Text style={styles.noteText}>{item.note}</Text>
                  </View>
                ) : null}

                {profile?.bio ? (
                  <Text style={styles.bioText} numberOfLines={2}>
                    "{profile.bio}"
                  </Text>
                ) : null}

                {activeTab === "received" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleReject(item.id)}
                    >
                      <Ionicons name="close" size={18} color={THEME.colors.textSecondary} />
                      <Text style={styles.rejectButtonText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAccept(item)}
                    >
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                      <Text style={styles.acceptButtonText}>Accept & Match</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {activeTab === "sent" && (
                  <View style={styles.sentStatusRow}>
                    <Ionicons name="time-outline" size={14} color={THEME.colors.textMuted} />
                    <Text style={styles.sentStatusText}>
                      Status: {item.status} • Awaiting candidate response
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRequests();
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: THEME.colors.surfaceSecondary,
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: THEME.borderRadius.sm - 2,
  },
  activeTabButton: {
    backgroundColor: THEME.colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textMuted,
  },
  activeTabText: {
    color: THEME.colors.textPrimary,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: THEME.spacing.md,
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  requestCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  age: {
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  statsText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  ttlBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.warning + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  ttlText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.warning,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  noteText: {
    fontSize: 13,
    color: THEME.colors.primaryDark,
    fontWeight: "600",
    flex: 1,
  },
  bioText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontStyle: "italic",
    marginTop: 8,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.textSecondary,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  sentStatusText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});
