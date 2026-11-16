import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../constants/theme";
import { useAlertStore } from "../stores/alertStore";

export const GlobalAlertModal: React.FC = () => {
  const isOpen = useAlertStore((s) => s.isOpen);
  const config = useAlertStore((s) => s.config);
  const hideAlert = useAlertStore((s) => s.hideAlert);

  if (!isOpen || !config) return null;

  const type = config.type || "info";

  const getTypeStyle = () => {
    switch (type) {
      case "error":
        return {
          icon: "close-circle" as const,
          color: THEME.colors.danger,
          bg: THEME.colors.danger + "15",
          btnColor: THEME.colors.danger,
          defaultBtnText: "Dismiss",
        };
      case "success":
        return {
          icon: "checkmark-circle" as const,
          color: THEME.colors.success,
          bg: THEME.colors.success + "15",
          btnColor: THEME.colors.success,
          defaultBtnText: "Continue",
        };
      case "warning":
        return {
          icon: "alert-circle" as const,
          color: THEME.colors.warning,
          bg: THEME.colors.warning + "20",
          btnColor: THEME.colors.warning,
          defaultBtnText: "Understood",
        };
      default:
        return {
          icon: "information-circle" as const,
          color: THEME.colors.secondary,
          bg: THEME.colors.secondaryLight + "50",
          btnColor: THEME.colors.primary,
          defaultBtnText: "Okay",
        };
    }
  };

  const currentType = getTypeStyle();
  const buttonText = config.buttonText || currentType.defaultBtnText;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={hideAlert}
    >
      <TouchableWithoutFeedback onPress={hideAlert}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Type Accent Icon */}
              <View style={[styles.iconCircle, { backgroundColor: currentType.bg }]}>
                <Ionicons name={currentType.icon} size={32} color={currentType.color} />
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.message}>{config.message}</Text>

              {/* Primary Action Button */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: currentType.btnColor }]}
                onPress={hideAlert}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.lg,
    zIndex: 99999,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: THEME.spacing.xl,
  },
  button: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
