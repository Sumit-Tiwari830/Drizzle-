import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";

interface IcebreakerBannerProps {
  deadline: string; // ISO date string: matchedAt + 48h
  hasIcebreakerBeenSent: boolean;
  onPressAction?: () => void;
}

export const IcebreakerBanner: React.FC<IcebreakerBannerProps> = ({
  deadline,
  hasIcebreakerBeenSent,
  onPressAction,
}) => {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    hours: 48,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(deadline).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (hasIcebreakerBeenSent) {
    return (
      <View style={[styles.container, styles.sentContainer]}>
        <Ionicons name="chatbubbles" size={18} color={THEME.colors.success} />
        <View style={styles.textContainer}>
          <Text style={styles.sentTitle}>Icebreaker Sent!</Text>
          <Text style={styles.sentSubtitle}>48-Hour timer cleared. Focus on getting to know each other.</Text>
        </View>
      </View>
    );
  }

  const isUrgent = timeLeft.hours < 12;

  return (
    <TouchableOpacity
      style={[styles.container, isUrgent ? styles.urgentContainer : styles.normalContainer]}
      onPress={onPressAction}
      activeOpacity={0.85}
    >
      <View style={[styles.iconBox, { backgroundColor: isUrgent ? THEME.colors.danger + "20" : THEME.colors.icebreaker + "20" }]}>
        <Ionicons
          name="timer-outline"
          size={22}
          color={isUrgent ? THEME.colors.danger : THEME.colors.icebreaker}
        />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isUrgent && { color: THEME.colors.danger }]}>
            {timeLeft.isExpired
              ? "Icebreaker Expired!"
              : `Rule 1: ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s Left`}
          </Text>
          <View style={[styles.badge, { backgroundColor: isUrgent ? THEME.colors.danger : THEME.colors.icebreaker }]}>
            <Text style={styles.badgeText}>48H LIMIT</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {timeLeft.isExpired
            ? "Match has auto-dissolved to prevent ghosting deadlock."
            : "Send the first message! Matches without messages dissolve after 48h to prevent ghosting."}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    gap: 12,
  },
  normalContainer: {
    backgroundColor: THEME.colors.icebreaker + "10",
    borderColor: THEME.colors.icebreaker + "40",
  },
  urgentContainer: {
    backgroundColor: THEME.colors.danger + "10",
    borderColor: THEME.colors.danger + "40",
  },
  sentContainer: {
    backgroundColor: THEME.colors.success + "10",
    borderColor: THEME.colors.success + "40",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  sentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.success,
  },
  sentSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
});
