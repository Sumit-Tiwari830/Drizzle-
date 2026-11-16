import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { VerifyOtpScreen } from "../screens/auth/VerifyOtpScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { ChatScreen } from "../screens/match/ChatScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";
import { MainTabs } from "./MainTabs";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { socketService } from "../services/socket.service";
import { storage } from "../utils/storage";
import { GlobalAlertModal } from "../components/GlobalAlertModal";
import { showAlert } from "../stores/alertStore";
import { THEME } from "../constants/theme";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      storage.getItemAsync("token").then((token) => {
        if (token && token !== "undefined" && token !== "null") {
          socketService.connect(token);
          socketService.joinUserRoom(user.id);
          socketService.onNewNotification((notif) => {
            useNotificationStore.getState().addNotification(notif);

            // In-app popups for administrative actions
            if (notif.type === "VERIFIED") {
              showAlert({
                type: "success",
                title: notif.title || "Account Verified! 🌟",
                message: notif.message || "Your profile credentials have been officially verified by Drizzle Administration.",
                buttonText: "Awesome!",
              });
              refreshProfile();
            } else if (notif.type === "ACCOUNT_STATUS" && notif.metadata?.isDeleted) {
              showAlert({
                type: "error",
                title: notif.title || "Account Suspended 🚫",
                message: notif.message || "Your account has been deactivated by Drizzle Administration.",
                buttonText: "OK",
                onConfirm: () => {
                  logout();
                },
              });
            } else if (notif.title?.includes("Admin Privileges Granted")) {
              showAlert({
                type: "success",
                title: notif.title || "Administrator Appointed! 🛡️",
                message: notif.message || "You have been appointed as an Administrator by Master Admin.",
                buttonText: "Got It",
              });
              checkSession();
            } else if (notif.title?.includes("Admin Privileges Revoked")) {
              showAlert({
                type: "warning",
                title: notif.title || "Admin Privileges Revoked",
                message: notif.message || "Your Administrator privileges have been revoked by Master Admin.",
                buttonText: "OK",
              });
              checkSession();
            }
          });
        }
      });
    }
  }, [isAuthenticated, user?.id, refreshProfile, logout]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const needsOnboarding = isAuthenticated && (!profile || !profile.username);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Public Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          </>
        ) : needsOnboarding ? (
          // First-Time Profile Onboarding Stack
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          // Authenticated App Stack
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="ChatRoom"
              component={ChatScreen}
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="AdminDashboard"
              component={AdminDashboardScreen}
              options={{ presentation: "card" }}
            />
          </>
        )}
      </Stack.Navigator>
      <GlobalAlertModal />
    </View>
  );
};
