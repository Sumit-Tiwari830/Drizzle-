import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { authApi } from "../../api";
import { useAuthStore } from "../../stores/authStore";

export const VerifyOtpScreen = ({ route, navigation }: any) => {
  const email = route.params?.email || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.verifyOtp(email, otp.trim());
      Alert.alert("Account Verified!", "Your email has been verified. Welcome to Exclusive!");
      // Log the user in with returned tokens
      await login(res.data.accessToken, res.data.user);
    } catch (err: any) {
      Alert.alert("Verification Error", err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendOtp(email);
      setResendCooldown(60);
      Alert.alert("Code Resent", `A fresh 6-digit verification code was sent to ${email}.`);
    } catch (err: any) {
      Alert.alert("Resend Failed", err.message || "Failed to resend OTP.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="key-outline" size={32} color={THEME.colors.primary} />
        </View>

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{"\n"}
          <Text style={styles.emailHighlight}>{email}</Text>
        </Text>

        <View style={styles.otpInputContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor={THEME.colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[styles.verifyButton, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive the email? </Text>
          <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
            <Text style={[styles.resendLink, resendCooldown > 0 && { color: THEME.colors.textMuted }]}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: "center",
    padding: THEME.spacing.lg,
  },
  content: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.xl,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    marginBottom: THEME.spacing.lg,
  },
  emailHighlight: {
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  otpInputContainer: {
    width: "100%",
    marginBottom: THEME.spacing.lg,
  },
  otpInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 10,
    color: THEME.colors.textPrimary,
  },
  verifyButton: {
    width: "100%",
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.sm,
    alignItems: "center",
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resendRow: {
    flexDirection: "row",
    marginTop: THEME.spacing.lg,
  },
  resendLabel: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
});
