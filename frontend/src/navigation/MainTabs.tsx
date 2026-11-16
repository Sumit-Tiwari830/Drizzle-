import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { FeedScreen } from "../screens/discovery/FeedScreen";
import { RequestsScreen } from "../screens/requests/RequestsScreen";
import { MatchScreen } from "../screens/match/MatchScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { THEME } from "../constants/theme";
import { useMatchStore } from "../stores/matchStore";

const Tab = createBottomTabNavigator();

export const MainTabs = () => {
  const activeMatch = useMatchStore((s) => s.activeMatch);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
        },
      }}
    >
      <Tab.Screen
        name="FeedTab"
        component={FeedScreen}
        options={{
          tabBarLabel: "Discover",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="RequestsTab"
        component={RequestsScreen}
        options={{
          tabBarLabel: "Requests",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paper-plane" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="MatchTab"
        component={MatchScreen}
        options={{
          tabBarLabel: "Match",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={activeMatch ? "heart" : "heart-outline"}
              size={size}
              color={activeMatch ? THEME.colors.primary : color}
            />
          ),
          tabBarBadge: activeMatch ? "1" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: THEME.colors.primary,
            color: "#FFF",
            fontSize: 10,
          },
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
