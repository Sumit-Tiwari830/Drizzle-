import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { THEME } from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { RulesModal } from "../../components/RulesModal";
import { profileApi } from "../../api";
import { useAuthStore } from "../../stores/authStore";

export const ProfileScreen = ({ navigation }: any) => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const [rulesVisible, setRulesVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isRegionVisible = profile?.isRegionVisible ?? true;
  const isPublicReveal = profile?.isPublicReveal ?? false;

  const handleToggleRegion = async (value: boolean) => {
    try {
      await profileApi.updateProfile({ isRegionVisible: value });
      await refreshProfile();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update region visibility.");
    }
  };

  const handleTogglePublicReveal = async (value: boolean) => {
    try {
      await profileApi.updateProfile({ isPublicReveal: value });
      await refreshProfile();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update reveal setting.");
    }
  };

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow gallery access to upload photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      try {
        setUploading(true);
        const uri = result.assets[0].uri;
        const filename = uri.split("/").pop() || "photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        const formData = new FormData();
        formData.append("photo", { uri, name: filename, type } as any);

        await profileApi.uploadPhoto(formData);
        await refreshProfile();
        Alert.alert("Photo Uploaded", "Your photo was successfully uploaded to Cloudinary.");
      } catch (err: any) {
        Alert.alert("Upload Failed", err.message || "Failed to upload photo.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeletePhoto = (photoUrl: string) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await profileApi.deletePhoto(photoUrl);
            await refreshProfile();
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to delete photo.");
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="My Profile" showRulesButton={false} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri:
                profile?.avatarUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{profile?.username || "You"}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Age</Text>
              <Text style={styles.statValue}>{profile?.age || "—"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Height</Text>
              <Text style={styles.statValue}>{profile?.height ? `${profile.height} cm` : "—"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Region</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {profile?.region || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy & Visibility Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Privacy & Profile Settings</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Display Region on Profile</Text>
              <Text style={styles.settingSubtitle}>
                {isRegionVisible
                  ? "Your region is shown to potential matches"
                  : "Hidden as '[HIDDEN - Private]' in the discovery feed"}
              </Text>
            </View>
            <Switch
              value={isRegionVisible}
              onValueChange={handleToggleRegion}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={isRegionVisible ? THEME.colors.primary : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Public Profile Reveal</Text>
              <Text style={styles.settingSubtitle}>
                {isPublicReveal
                  ? "Real photos and identity are visible without requiring mutual consent"
                  : "Photos protected by Anonymity Shield until both parties agree to reveal"}
              </Text>
            </View>
            <Switch
              value={isPublicReveal}
              onValueChange={handleTogglePublicReveal}
              trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
              thumbColor={isPublicReveal ? THEME.colors.primary : "#f4f3f4"}
            />
          </View>
        </View>

        {/* Cloudinary Photo Gallery */}
        <View style={styles.section}>
          <View style={styles.galleryHeaderRow}>
            <Text style={styles.sectionHeader}>Photo Gallery</Text>
            <TouchableOpacity onPress={handleAddPhoto} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Text style={styles.addPhotoLink}>+ Add Photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.photoGrid}>
            {profile?.photos && profile.photos.length > 0 ? (
              profile.photos.map((photoUrl, idx) => (
                <View key={idx} style={styles.photoItem}>
                  <Image source={{ uri: photoUrl }} style={styles.galleryImg} />
                  <TouchableOpacity
                    style={styles.deletePhotoBadge}
                    onPress={() => handleDeletePhoto(photoUrl)}
                  >
                    <Ionicons name="trash" size={14} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyPhotoText}>
                No photos uploaded yet. Tap "+ Add Photo" to showcase your lifestyle!
              </Text>
            )}
          </View>
        </View>

        {/* App Rules & Guidelines Link */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setRulesVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="book-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.menuTitle}>Review App Rules & Invariants</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={THEME.colors.danger} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    alignItems: "center",
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  username: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  emailText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    width: "100%",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: "600",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: THEME.colors.border,
  },
  section: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
    marginBottom: THEME.spacing.sm,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  galleryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addPhotoLink: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primary,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  photoItem: {
    width: 95,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  galleryImg: {
    width: "100%",
    height: "100%",
  },
  deletePhotoBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    padding: 4,
    borderRadius: 12,
  },
  emptyPhotoText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.danger + "10",
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.danger + "20",
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.danger,
  },
});
