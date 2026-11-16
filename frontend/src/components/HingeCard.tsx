import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CandidateFeedItem } from "../types";
import { THEME } from "../constants/theme";

interface HingeCardProps {
  candidate: CandidateFeedItem;
  remainingQuota: number;
  onRequestSent: (receiverId: string, note?: string) => Promise<void>;
}

export const HingeCard: React.FC<HingeCardProps> = ({
  candidate,
  remainingQuota,
  onRequestSent,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Default Hinge prompts if backend didn't provide custom ones
  const prompts = candidate.prompts || [
    {
      question: "My simple pleasures...",
      answer: candidate.bio || "Finding cozy local coffee spots and deep conversations under city lights.",
    },
    {
      question: "The best way to ask me out...",
      answer: "Suggest a place with good dessert, great ambiance, and no awkward small talk.",
    },
    {
      question: "A non-negotiable for me...",
      answer: "Honesty and direct communication. No endless ghosting games.",
    },
  ];

  const handleOpenConnect = (promptContext?: string) => {
    if (remainingQuota <= 0) {
      Alert.alert(
        "Daily Limit Reached",
        "You have used your 10 daily connect requests. Your quota resets on a rolling 24-hour window to keep dating intentional."
      );
      return;
    }
    setSelectedPrompt(promptContext || null);
    setModalVisible(true);
  };

  const handleSend = async () => {
    try {
      setSubmitting(true);
      const combinedNote = selectedPrompt ? `[Replying to: "${selectedPrompt}"] ${note}` : note;
      await onRequestSent(candidate.userId, combinedNote.trim() || undefined);
      setModalVisible(false);
      setNote("");
    } catch (err: any) {
      Alert.alert("Unable to Send Request", err.message || "Failed to send request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header Profile Identity */}
      <View style={styles.headerSection}>
        <View style={styles.nameRow}>
          <Text style={styles.username}>{candidate.username}</Text>
          {candidate.age && <Text style={styles.age}>, {candidate.age}</Text>}
        </View>

        {/* Privacy Shield Pill */}
        <View
          style={[
            styles.shieldPill,
            { backgroundColor: candidate.isRevealed ? THEME.colors.success + "15" : THEME.colors.primaryLight },
          ]}
        >
          <Ionicons
            name={candidate.isRevealed ? "checkmark-circle" : "shield-half"}
            size={14}
            color={candidate.isRevealed ? THEME.colors.success : THEME.colors.primary}
          />
          <Text
            style={[
              styles.shieldText,
              { color: candidate.isRevealed ? THEME.colors.success : THEME.colors.primary },
            ]}
          >
            {candidate.isRevealed ? "Identity Unlocked" : "Shielded Profile"}
          </Text>
        </View>
      </View>

      {/* 2. Photo Section */}
      <View style={styles.photoContainer}>
        <Image
          source={{
            uri:
              candidate.avatarUrl ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
          }}
          style={styles.photo}
          resizeMode="cover"
        />
        {!candidate.isRevealed && (
          <View style={styles.photoMaskOverlay}>
            <View style={styles.anonymityBadge}>
              <Ionicons name="eye-off-outline" size={14} color="#FFF" />
              <Text style={styles.anonymityText}>Mutual reveal unlocks real photos</Text>
            </View>
          </View>
        )}
        <TouchableOpacity
          style={styles.floatingLikeButton}
          onPress={() => handleOpenConnect("Main Photo")}
          activeOpacity={0.8}
        >
          <Ionicons name="heart" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* 3. Verified Attribute Chips (Height, Region, Gender) */}
      <View style={styles.attributesRow}>
        {candidate.height ? (
          <View style={styles.attributeChip}>
            <Ionicons name="resize-outline" size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.attributeText}>{candidate.height} cm</Text>
          </View>
        ) : null}

        <View style={styles.attributeChip}>
          <Ionicons name="location-outline" size={14} color={THEME.colors.textSecondary} />
          <Text style={styles.attributeText}>{candidate.region}</Text>
        </View>

        {candidate.gender ? (
          <View style={styles.attributeChip}>
            <Ionicons name="person-outline" size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.attributeText}>{candidate.gender}</Text>
          </View>
        ) : null}

        {candidate.lookingFor ? (
          <View style={styles.attributeChip}>
            <Ionicons name="sparkles-outline" size={14} color={THEME.colors.primary} />
            <Text style={[styles.attributeText, { color: THEME.colors.primary }]}>{candidate.lookingFor}</Text>
          </View>
        ) : null}
      </View>

      {/* 4. Hinge Prompts with Inline Like Buttons */}
      {prompts.map((p, idx) => (
        <View key={idx} style={styles.promptCard}>
          <View style={styles.promptHeader}>
            <Text style={styles.promptQuestion}>{p.question}</Text>
            <TouchableOpacity
              style={styles.promptLikeButton}
              onPress={() => handleOpenConnect(p.question)}
              activeOpacity={0.8}
            >
              <Ionicons name="heart-outline" size={20} color={THEME.colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.promptAnswer}>{p.answer}</Text>
        </View>
      ))}

      {/* 5. Interests / Vibe Section */}
      {candidate.interests && candidate.interests.length > 0 && (
        <View style={styles.interestsContainer}>
          <Text style={styles.sectionTitle}>Interests & Lifestyle</Text>
          <View style={styles.interestsRow}>
            {candidate.interests.map((interest, i) => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestTagText}>#{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 6. Bottom Sticky Send Request Banner */}
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => handleOpenConnect()}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={17} color="#FFF" />
        <Text style={styles.connectButtonText}>Send Connection Request</Text>
      </TouchableOpacity>

      {/* 7. Connect Note Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect with {candidate.username}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedPrompt && (
              <View style={styles.replyContextBox}>
                <Text style={styles.replyContextLabel}>Replying to prompt:</Text>
                <Text style={styles.replyContextText}>"{selectedPrompt}"</Text>
              </View>
            )}

            <TextInput
              style={styles.noteInput}
              placeholder="Add a thoughtful first message / icebreaker (optional)..."
              placeholderTextColor={THEME.colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={280}
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.ruleNotice}>
              <Ionicons name="time-outline" size={14} color={THEME.colors.primaryDark} />
              <Text style={styles.ruleNoticeText}>
                Invitations remain open for 48 hours. Uses 1 of your {remainingQuota} invites today.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalSendButton, submitting && { opacity: 0.7 }]}
              onPress={handleSend}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.modalSendButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  username: {
    fontSize: 24,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  age: {
    fontSize: 22,
    fontWeight: "500",
    color: THEME.colors.textSecondary,
  },
  shieldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  shieldText: {
    fontSize: 11,
    fontWeight: "700",
  },
  photoContainer: {
    position: "relative",
    width: "100%",
    height: 380,
    borderRadius: THEME.borderRadius.md,
    overflow: "hidden",
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoMaskOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
  },
  anonymityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  anonymityText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  floatingLikeButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  attributesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  attributeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
  },
  attributeText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  promptCard: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  promptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  promptLikeButton: {
    padding: 4,
  },
  promptAnswer: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.textPrimary,
    lineHeight: 22,
  },
  interestsContainer: {
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  interestsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  interestTag: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  connectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    marginTop: THEME.spacing.xs,
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: THEME.spacing.lg,
  },
  modalContainer: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  replyContextBox: {
    backgroundColor: THEME.colors.surfaceSecondary,
    padding: 10,
    borderRadius: 8,
    marginBottom: THEME.spacing.sm,
  },
  replyContextLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  replyContextText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 2,
  },
  noteInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: THEME.colors.textPrimary,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: THEME.spacing.sm,
  },
  ruleNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.colors.warning + "15",
    padding: 8,
    borderRadius: 8,
    marginBottom: THEME.spacing.md,
  },
  ruleNoticeText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  modalSendButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
  },
  modalSendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
