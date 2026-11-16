import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { chatApi } from "../../api";
import { socketService } from "../../services/socket.service";
import { ChatMessage } from "../../types";
import { useAuthStore } from "../../stores/authStore";
import { useMatchStore } from "../../stores/matchStore";
import { showAlert } from "../../stores/alertStore";

export const ChatScreen = ({ route, navigation }: any) => {
  const matchId = route.params?.matchId;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const activeMatch = useMatchStore((s) => s.activeMatch);
  const fetchMatch = useMatchStore((s) => s.fetchMatch);

  const partnerId =
    activeMatch?.user1Id === user?.id ? activeMatch?.user2Id : activeMatch?.user1Id;

  // 1. Load initial chat history from MongoDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        const history = await chatApi.getMessages(matchId);
        setMessages(history);
        // Mark existing partner messages as read
        await chatApi.markAsRead(matchId);
      } catch (err: any) {
        console.warn("Failed to load messages:", err);
      } finally {
        setLoading(false);
      }
    };

    if (matchId) {
      loadHistory();
    }
  }, [matchId]);

  // 2. Setup Socket.IO real-time event listeners
  useEffect(() => {
    if (!token || !matchId) return;

    socketService.connect(token);
    socketService.joinMatch(matchId);

    // Incoming message
    socketService.onNewMessage((newMsg: ChatMessage) => {
      setMessages((prev) => [...prev, newMsg]);
      // If we are looking at the chat and message is from partner, mark read
      if (newMsg.receiverId === user?.id) {
        socketService.markAsRead(matchId);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    // Partner typing status
    socketService.onPartnerTyping(({ isTyping }) => {
      setPartnerTyping(isTyping);
    });

    // Partner marked our messages as read
    socketService.onMessagesRead(({ matchId: readMatchId, readAt }) => {
      if (readMatchId === matchId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user?.id ? { ...m, isRead: true, readAt } : m
          )
        );
      }
    });

    // Invariant: Instant match ended handling (Unmatch or 48-hour icebreaker expiry)
    socketService.onMatchEnded(({ reason }) => {
      showAlert({
        type: "info",
        title: "Match Ended",
        message:
          reason === "ICEBREAKER_48H_EXPIRED"
            ? "This match has automatically expired because 48 hours passed without any message. You are now unlocked to find new connections!"
            : "Your connection has ended. As per our zero-trace privacy policy, all chat messages have been permanently deleted.",
        buttonText: "Return to Feed",
        onConfirm: async () => {
          await fetchMatch();
          navigation.navigate("FeedTab");
        },
      });
    });

    return () => {
      socketService.leaveMatch(matchId);
      socketService.removeListeners();
    };
  }, [token, matchId, user?.id]);

  // 3. Typing event dispatcher
  const handleInputChange = (text: string) => {
    setInputMessage(text);

    if (matchId) {
      socketService.startTyping(matchId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(matchId);
      }, 1500);
    }
  };

  // 4. Send message dispatcher
  const handleSend = () => {
    if (!inputMessage.trim() || !partnerId) return;

    const messageText = inputMessage.trim();
    setInputMessage("");

    // Dispatch via socket
    socketService.sendMessage(matchId, partnerId, messageText);
    socketService.stopTyping(matchId);

    // Optimistic message append
    const optimisticMsg: ChatMessage = {
      id: `opt-${Date.now()}`,
      matchId,
      senderId: user?.id || "",
      receiverId: partnerId,
      message: messageText,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={styles.container}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerName}>{activeMatch?.partner?.username || "Match"}</Text>
          <Text style={styles.headerStatus}>
            {partnerTyping ? "typing..." : "1-to-1 encrypted connection"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="shield-checkmark" size={18} color={THEME.colors.success} />
        </View>
      </View>

      {/* Messages List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View
                style={[
                  styles.messageBubbleWrapper,
                  isMe ? styles.myBubbleWrapper : styles.partnerBubbleWrapper,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.partnerBubble,
                  ]}
                >
                  <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                    {item.message}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.timeText, isMe && styles.myTimeText]}>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {isMe && (
                      <Ionicons
                        name={item.isRead ? "checkmark-done" : "checkmark"}
                        size={14}
                        color={item.isRead ? "#38BDF8" : "#E2E8F0"}
                        style={styles.receiptIcon}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Partner Typing Indicator Bar */}
      {partnerTyping && (
        <View style={styles.typingIndicatorBar}>
          <Ionicons name="ellipsis-horizontal" size={16} color={THEME.colors.primary} />
          <Text style={styles.typingText}>{activeMatch?.partner?.username} is typing...</Text>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Send a thoughtful message..."
          placeholderTextColor={THEME.colors.textMuted}
          value={inputMessage}
          onChangeText={handleInputChange}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputMessage.trim() && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!inputMessage.trim()}
        >
          <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  headerStatus: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    padding: 6,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageList: {
    padding: THEME.spacing.md,
    paddingBottom: 16,
  },
  messageBubbleWrapper: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  myBubbleWrapper: {
    alignSelf: "flex-end",
  },
  partnerBubbleWrapper: {
    alignSelf: "flex-start",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
  },
  partnerBubble: {
    backgroundColor: THEME.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  messageText: {
    fontSize: 15,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  myTimeText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  receiptIcon: {
    marginLeft: 2,
  },
  typingIndicatorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 11,
    fontStyle: "italic",
    color: THEME.colors.textSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
