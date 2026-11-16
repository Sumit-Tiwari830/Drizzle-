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
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { THEME } from "../../constants/theme";
import { AppHeader } from "../../components/AppHeader";
import { RulesModal } from "../../components/RulesModal";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { NotificationBoxModal } from "../../components/NotificationBoxModal";
import { profileApi } from "../../api";
import { useAuthStore } from "../../stores/authStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { showAlert } from "../../stores/alertStore";

export const ProfileScreen = ({ navigation }: any) => {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [rulesVisible, setRulesVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Confirmation Modals State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Edit Profile Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHeight, setEditHeight] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editLookingFor, setEditLookingFor] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const isRegionVisible = profile?.isRegionVisible ?? true;
  const isPublicReveal = profile?.isPublicReveal ?? false;

  const handleOpenEditModal = () => {
    setEditUsername(profile?.username || "");
    setEditBio(profile?.bio || "");
    setEditHeight(profile?.height != null ? String(profile.height) : "");
    setEditRegion(profile?.region || "");
    setEditLookingFor(profile?.lookingFor || "Long-term relationship");
    setEditInterests((profile?.interests || []).join(", "));
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim() || editUsername.trim().length < 3) {
      showAlert({
        type: "warning",
        title: "Invalid Username",
        message: "Username must be at least 3 characters long.",
        buttonText: "Got It",
      });
      return;
    }

    try {
      setSavingProfile(true);
      const parsedInterests = editInterests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      await profileApi.updateProfile({
        username: editUsername.trim(),
        bio: editBio.trim() || undefined,
        height: editHeight.trim() || undefined,
        region: editRegion.trim() || undefined,
        lookingFor: editLookingFor.trim() || undefined,
        interests: parsedInterests,
      });

      await refreshProfile();
      setEditModalVisible(false);
      showAlert({
        type: "success",
        title: "Profile Updated! 🎉",
        message: "Your profile details have been saved successfully.",
        buttonText: "Great",
      });
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update profile details.",
        buttonText: "Dismiss",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggleRegion = async (value: boolean) => {
    try {
      await profileApi.updateProfile({ isRegionVisible: value });
      await refreshProfile();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Update Error",
        message: err.message || "Failed to update region visibility.",
      });
    }
  };

  const handleTogglePublicReveal = async (value: boolean) => {
    try {
      await profileApi.updateProfile({ isPublicReveal: value });
      await refreshProfile();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Update Error",
        message: err.message || "Failed to update reveal setting.",
      });
    }
  };

  const handleAddPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({
        type: "warning",
        title: "Permission Required",
        message: "Please allow photo library access to upload photos.",
      });
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
        showAlert({
          type: "success",
          title: "Photo Uploaded! 📸",
          message: "Your photo was successfully uploaded to Cloudinary.",
        });
      } catch (err: any) {
        showAlert({
          type: "error",
          title: "Upload Failed",
          message: err.message || "Failed to upload photo.",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      setModalLoading(true);
      await profileApi.deletePhoto(photoToDelete);
      await refreshProfile();
      setPhotoToDelete(null);
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Delete Error",
        message: err.message || "Failed to delete photo.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmLogout = async () => {
    try {
      setModalLoading(true);
      await logout();
      setShowLogoutModal(false);
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Sign Out Error",
        message: err.message || "Failed to sign out.",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    try {
      setModalLoading(true);
      await profileApi.deleteAccount();
      await logout();
      setShowDeleteAccountModal(false);
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Delete Error",
        message: err.message || "Failed to delete account.",
      });
    } finally {
      setModalLoading(false);
    }
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

          {/* Verified Badge */}
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={13} color={THEME.colors.primaryDark} />
            <Text style={styles.verifiedBadgeText}>
              {profile?.gender ? `${profile.gender.toUpperCase()} • Verified Identity` : "Verified Identity"}
            </Text>
          </View>

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

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={16} color={THEME.colors.primary} />
            <Text style={styles.editProfileButtonText}>Edit Profile Details</Text>
          </TouchableOpacity>
        </View>

        {/* Bio & Interests Preview */}
        {(profile?.bio || (profile?.interests && profile.interests.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>About You</Text>
            {profile?.bio && <Text style={styles.bioText}>{profile.bio}</Text>}
            {profile?.interests && profile.interests.length > 0 && (
              <View style={styles.chipRow}>
                {profile.interests.map((tag, idx) => (
                  <View key={idx} style={styles.interestChip}>
                    <Text style={styles.interestChipText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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
                    onPress={() => setPhotoToDelete(photoUrl)}
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

        {/* Notification Box Link */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setNotificationsVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.primary} />
            <Text style={styles.menuTitle}>Notification Box</Text>
          </View>
          <View style={styles.menuRight}>
            {unreadCount > 0 && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{unreadCount}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
          </View>
        </TouchableOpacity>

        {/* App Rules Link */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => setRulesVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.menuLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={THEME.colors.primaryDark} />
            <Text style={styles.menuTitle}>Platform Rules</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
        </TouchableOpacity>

        {/* Sign Out Button (Custom Modal for 100% Web Parity) */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={THEME.colors.textSecondary} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Danger Zone: Delete Account */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerDesc}>
            Permanently delete your profile and account. If you are currently matched, your match will be dissolved and your partner will be unlocked.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={() => setShowDeleteAccountModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color={THEME.colors.danger} />
            <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Rules Modal */}
      <RulesModal visible={rulesVisible} onClose={() => setRulesVisible(false)} />

      {/* Notification Box Modal */}
      <NotificationBoxModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />

      {/* Sign Out Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title="Sign Out"
        message="Are you sure you want to sign out of Drizzle?"
        confirmText="Sign Out"
        cancelText="Stay Logged In"
        isDestructive={true}
        icon="log-out-outline"
        loading={modalLoading}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteAccountModal}
        title="Delete Account?"
        message="Are you sure you want to permanently delete your account? This will immediately end any active connection, unlock your partner, and erase your profile. This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Cancel"
        isDestructive={true}
        icon="trash-outline"
        loading={modalLoading}
        onConfirm={handleConfirmDeleteAccount}
        onCancel={() => setShowDeleteAccountModal(false)}
      />

      {/* Delete Photo Confirmation Modal */}
      <ConfirmationModal
        visible={!!photoToDelete}
        title="Delete Photo"
        message="Are you sure you want to remove this photo from your gallery?"
        confirmText="Delete"
        cancelText="Keep Photo"
        isDestructive={true}
        icon="trash-outline"
        loading={modalLoading}
        onConfirm={handleConfirmDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.editModalContainer}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color={THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editModalContent}>
            {/* Verified Immutable Identity Box */}
            <View style={styles.immutableBox}>
              <View style={styles.immutableHeader}>
                <Ionicons name="lock-closed" size={15} color={THEME.colors.primaryDark} />
                <Text style={styles.immutableTitle}>Verified & Master-Protected Identity</Text>
              </View>
              <Text style={styles.immutableSubtitle}>
                Your email, actual name, and official gender are verified by admin / master records and cannot be altered.
              </Text>
              <View style={styles.immutableRow}>
                <Text style={styles.immutableField}>Email:</Text>
                <Text style={styles.immutableValue}>{user?.email}</Text>
              </View>
              <View style={styles.immutableRow}>
                <Text style={styles.immutableField}>Actual Name:</Text>
                <Text style={styles.immutableValue}>{profile?.actualName || "Verified Record"}</Text>
              </View>
              <View style={styles.immutableRow}>
                <Text style={styles.immutableField}>Official Gender:</Text>
                <Text style={styles.immutableValue}>{(profile?.gender || "Verified").toUpperCase()}</Text>
              </View>
            </View>

            {/* Editable Handle (Pseudonym) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Username (Pseudonym)</Text>
              <TextInput
                style={styles.textInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Choose your handle..."
                placeholderTextColor={THEME.colors.textMuted}
                autoCapitalize="none"
              />
              <Text style={styles.inputHelp}>
                You can change your username handle at any time.
              </Text>
            </View>

            {/* Editable Height */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.textInput}
                value={editHeight}
                onChangeText={setEditHeight}
                placeholder="e.g. 175"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Editable Region */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Region / State</Text>
              <TextInput
                style={styles.textInput}
                value={editRegion}
                onChangeText={setEditRegion}
                placeholder="e.g. Mumbai, Delhi NCR"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            {/* Editable Looking For */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Looking For</Text>
              <TextInput
                style={styles.textInput}
                value={editLookingFor}
                onChangeText={setEditLookingFor}
                placeholder="e.g. Long-term relationship, Meaningful connection"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            {/* Editable Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>About You (Bio)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Share your hobbies, lifestyle, and passions..."
                placeholderTextColor={THEME.colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Editable Interests */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Interests (Comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                value={editInterests}
                onChangeText={setEditInterests}
                placeholder="Coffee, Hiking, Tech, Art"
                placeholderTextColor={THEME.colors.textMuted}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveProfileButton}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              {savingProfile ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveProfileButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.primaryLight + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    marginTop: 6,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
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
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: THEME.spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.primaryLight,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  editProfileButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primary,
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
  bioText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  interestChip: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  interestChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
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
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPhotoText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    fontStyle: "italic",
    paddingVertical: 12,
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
    fontSize: 15,
    fontWeight: "600",
    color: THEME.colors.textPrimary,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuBadge: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.surface,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.colors.textSecondary,
  },
  dangerZone: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.danger + "40",
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: THEME.colors.danger,
    marginBottom: 4,
  },
  dangerDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginBottom: 12,
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.danger + "15",
    paddingVertical: 11,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.danger + "40",
  },
  deleteAccountButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.danger,
  },
  // Edit Profile Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  editModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  editModalContent: {
    padding: THEME.spacing.lg,
    paddingBottom: 50,
  },
  immutableBox: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  immutableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  immutableTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
  },
  immutableSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  immutableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  immutableField: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  immutableValue: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  inputHelp: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  saveProfileButton: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: THEME.spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveProfileButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
