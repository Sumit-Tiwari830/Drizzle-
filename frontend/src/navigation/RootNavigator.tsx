import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { VerifyOtpScreen } from "../screens/auth/VerifyOtpScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { ChatScreen } from "../screens/match/ChatScreen";
import { MainTabs } from "./MainTabs";
import { useAuthStore } from "../stores/authStore";
import { THEME } from "../constants/theme";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background }}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const needsOnboarding = isAuthenticated && (!profile || !profile.username);

  return (
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
        </>
      )}
    </Stack.Navigator>
  );
};
