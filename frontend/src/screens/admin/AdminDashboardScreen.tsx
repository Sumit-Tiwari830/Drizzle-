import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../constants/theme";
import { adminApi } from "../../api";
import { AdminUserItem } from "../../types";
import { showAlert } from "../../stores/alertStore";
import { ConfirmationModal } from "../../components/ConfirmationModal";
import { useAuthStore } from "../../stores/authStore";

export const AdminDashboardScreen = ({ navigation }: any) => {
  const currentUser = useAuthStore((s) => s.user);
  const isCurrentUserMasterAdmin = currentUser?.email?.trim().toLowerCase() === "kiransumit2231@gmail.com";

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNVERIFIED" | "VERIFIED" | "LOCKED" | "BLOCKED">("ALL");

  // Confirmation Modal states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmButtonText, setConfirmButtonText] = useState("Confirm");
  const [confirmIsDestructive, setConfirmIsDestructive] = useState(false);
  const [confirmIcon, setConfirmIcon] = useState<keyof typeof Ionicons.glyphMap | undefined>(undefined);

  // Excel Upload Modal states
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllUsers();
      setUsers(data || []);
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Failed to Load Users",
        message: err.message || "Could not retrieve user directory. Please ensure admin privileges.",
        buttonText: "Retry",
        onConfirm: fetchUsers,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Tab Filter
      if (activeFilter === "UNVERIFIED" && (u.isVerified || u.isDeleted)) return false;
      if (activeFilter === "VERIFIED" && (!u.isVerified || u.isDeleted)) return false;
      if (activeFilter === "LOCKED" && (!u.isLocked || u.isDeleted)) return false;
      if (activeFilter === "BLOCKED" && !u.isDeleted) return false;

      // 2. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchUsername = u.username?.toLowerCase().includes(q);
      const matchActual = u.actualName?.toLowerCase().includes(q);
      const matchRegion = u.region?.toLowerCase().includes(q);
      return matchEmail || matchUsername || matchActual || matchRegion;
    });
  }, [users, activeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const verified = users.filter((u) => u.isVerified && !u.isDeleted).length;
    const locked = users.filter((u) => u.isLocked && !u.isDeleted).length;
    const blocked = users.filter((u) => u.isDeleted).length;
    const unverified = users.filter((u) => !u.isVerified && !u.isDeleted).length;
    return { total, verified, locked, blocked, unverified };
  }, [users]);

  // Actions
  const handleVerify = async (user: AdminUserItem) => {
    try {
      await adminApi.verifyUser(user.id);
      showAlert({
        type: "success",
        title: "User Verified! 🌟",
        message: `${user.username || user.email} has been verified and added to the official Master Directory. A verification notification was dispatched.`,
        buttonText: "OK",
      });
      fetchUsers();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Verification Failed",
        message: err.message || "Failed to verify user.",
        buttonText: "Dismiss",
      });
    }
  };

  const handleUnverify = async (user: AdminUserItem) => {
    try {
      await adminApi.unverifyUser(user.id);
      showAlert({
        type: "warning",
        title: "Verification Revoked",
        message: `Official verification was removed for ${user.username || user.email}.`,
        buttonText: "OK",
      });
      fetchUsers();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Action Failed",
        message: err.message || "Failed to revoke verification.",
        buttonText: "Dismiss",
      });
    }
  };

  const promptBlock = (user: AdminUserItem) => {
    setConfirmTitle("Block & Deactivate User?");
    setConfirmMessage(
      `Are you sure you want to block ${user.username || user.email}? If they are in an active 1-to-1 match, their partner will be released and chat history dissolved.`
    );
    setConfirmButtonText("Block User");
    setConfirmIsDestructive(true);
    setConfirmIcon("ban");
    setConfirmAction(() => async () => {
      try {
        await adminApi.blockUser(user.id);
        showAlert({
          type: "warning",
          title: "User Blocked",
          message: `${user.email} has been deactivated. Any active matches were safely dissolved.`,
          buttonText: "Got It",
        });
        fetchUsers();
      } catch (err: any) {
        showAlert({
          type: "error",
          title: "Block Failed",
          message: err.message || "Failed to block user.",
          buttonText: "Dismiss",
        });
      }
    });
    setConfirmModalVisible(true);
  };

  const handleUnblock = async (user: AdminUserItem) => {
    try {
      await adminApi.unblockUser(user.id);
      showAlert({
        type: "success",
        title: "User Reactivated! ✅",
        message: `${user.email} has been restored to active status.`,
        buttonText: "OK",
      });
      fetchUsers();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Reactivation Failed",
        message: err.message || "Failed to reactivate user.",
        buttonText: "Dismiss",
      });
    }
  };

  const promptDelete = (user: AdminUserItem) => {
    setConfirmTitle("Permanently Delete User?");
    setConfirmMessage(
      `Are you sure you want to permanently purge ${user.username || user.email}? This will erase their profile, matches, messages, and device tokens forever. Note: Official master records remain preserved.`
    );
    setConfirmButtonText("Delete Forever");
    setConfirmIsDestructive(true);
    setConfirmIcon("trash");
    setConfirmAction(() => async () => {
      try {
        await adminApi.removeUser(user.id);
        showAlert({
          type: "success",
          title: "User Permanently Deleted",
          message: `${user.email} has been removed from the platform.`,
          buttonText: "OK",
        });
        fetchUsers();
      } catch (err: any) {
        showAlert({
          type: "error",
          title: "Deletion Failed",
          message: err.message || "Failed to delete user.",
          buttonText: "Dismiss",
        });
      }
    });
    setConfirmModalVisible(true);
  };

  // Master Admin Promotion & Demotion
  const promptPromoteAdmin = (user: AdminUserItem) => {
    setConfirmTitle("Appoint Administrator?");
    setConfirmMessage(
      `Are you sure you want to promote ${user.username || user.email} to an Administrator? They will be granted full access to user management, verification, and safety controls.`
    );
    setConfirmButtonText("Promote to Admin");
    setConfirmIsDestructive(false);
    setConfirmIcon("shield-checkmark");
    setConfirmAction(() => async () => {
      try {
        await adminApi.promoteAdmin(user.id);
        showAlert({
          type: "success",
          title: "Administrator Appointed! 🛡️",
          message: `${user.username || user.email} is now an Administrator. An in-app notification was dispatched to their account.`,
          buttonText: "OK",
        });
        fetchUsers();
      } catch (err: any) {
        showAlert({
          type: "error",
          title: "Promotion Failed",
          message: err.message || "Failed to promote user to administrator.",
          buttonText: "Dismiss",
        });
      }
    });
    setConfirmModalVisible(true);
  };

  const promptDemoteAdmin = (user: AdminUserItem) => {
    setConfirmTitle("Revoke Administrator Privileges?");
    setConfirmMessage(
      `Are you sure you want to demote ${user.username || user.email} back to a regular user? Their Admin Console access will be revoked immediately.`
    );
    setConfirmButtonText("Revoke Admin Rights");
    setConfirmIsDestructive(true);
    setConfirmIcon("close-circle");
    setConfirmAction(() => async () => {
      try {
        await adminApi.demoteAdmin(user.id);
        showAlert({
          type: "warning",
          title: "Admin Privileges Revoked",
          message: `${user.username || user.email} has been demoted to a regular user.`,
          buttonText: "OK",
        });
        fetchUsers();
      } catch (err: any) {
        showAlert({
          type: "error",
          title: "Action Failed",
          message: err.message || "Failed to revoke administrator privileges.",
          buttonText: "Dismiss",
        });
      }
    });
    setConfirmModalVisible(true);
  };

  // Excel / CSV File Selection
  const handleSelectFile = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx,.xls,.csv";
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          setSelectedFile(file);
          setSelectedFileName(file.name);
        }
      };
      input.click();
    } else {
      showAlert({
        type: "info",
        title: "File Selection",
        message: "Please open Drizzle in your browser to upload Excel or CSV sheets directly.",
        buttonText: "OK",
      });
    }
  };

  const handleUploadMasterSheet = async () => {
    if (!selectedFile) {
      showAlert({
        type: "warning",
        title: "No File Selected",
        message: "Please select an Excel (.xlsx/.xls) or CSV (.csv) file first.",
        buttonText: "Got It",
      });
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await adminApi.uploadMasterSheet(formData);
      setUploadModalVisible(false);
      setSelectedFile(null);
      setSelectedFileName(null);

      showAlert({
        type: "success",
        title: "Master Directory Updated! 📊",
        message: `Successfully processed ${res.data?.total || 0} rows.\nInserted: ${res.data?.inserted || 0} new records.\nUpdated: ${res.data?.updated || 0} records.\nAll matching registered users were verified automatically!`,
        buttonText: "Awesome!",
      });

      fetchUsers();
    } catch (err: any) {
      showAlert({
        type: "error",
        title: "Upload Failed",
        message: err.message || "Failed to upload and parse Excel sheet. Ensure headers include Email, Actual Name, and Gender.",
        buttonText: "Dismiss",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const renderUserCard = ({ item }: { item: AdminUserItem }) => {
    const isSelf = item.id === currentUser?.id;
    const isVerified = item.isVerified && !item.isDeleted;
    const isBlocked = item.isDeleted;
    const isLocked = item.isLocked && !item.isDeleted;
    const isTargetMasterAdmin =
      item.email?.trim().toLowerCase() === "kiransumit2231@gmail.com" || item.role === "MASTER_ADMIN";
    const isTargetAdmin = item.role === "ADMIN";

    return (
      <View style={[styles.card, isBlocked && styles.cardBlocked, isTargetMasterAdmin && styles.cardMasterAdmin]}>
        {/* Top Header */}
        <View style={styles.cardHeader}>
          <View style={styles.userInfoLeft}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: isTargetMasterAdmin ? "#FEF3C7" : THEME.colors.primaryLight + "30" }]}>
                <Text style={[styles.avatarInitial, isTargetMasterAdmin && { color: "#D97706" }]}>
                  {isTargetMasterAdmin ? "👑" : (item.username || item.email || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.nameBlock}>
              <View style={styles.usernameRow}>
                <Text style={styles.usernameText} numberOfLines={1}>
                  {item.username || "Pending Onboarding"}
                </Text>
                {isTargetMasterAdmin ? (
                  <View style={styles.masterAdminBadge}>
                    <Ionicons name="sparkles" size={10} color="#92400E" />
                    <Text style={styles.masterAdminBadgeText}>MASTER ADMIN</Text>
                  </View>
                ) : isTargetAdmin ? (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.emailText} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
          </View>

          {/* Verification Badge */}
          <View style={styles.badgeContainer}>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={THEME.colors.success} />
                <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
              </View>
            ) : isBlocked ? (
              <View style={styles.blockedBadge}>
                <Ionicons name="ban" size={14} color={THEME.colors.danger} />
                <Text style={styles.blockedBadgeText}>BLOCKED</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Ionicons name="alert-circle" size={14} color={THEME.colors.warning} />
                <Text style={styles.unverifiedBadgeText}>UNVERIFIED</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Official Name</Text>
            <Text style={styles.detailValue}>{item.actualName || "Not Provided"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Official Gender</Text>
            <Text style={styles.detailValue}>{item.gender ? item.gender.toUpperCase() : "Unknown"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Region / State</Text>
            <Text style={styles.detailValue}>{item.region || "Private"}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Match Status</Text>
            <Text style={[styles.detailValue, isLocked && { color: THEME.colors.primary, fontWeight: "700" }]}>
              {isTargetMasterAdmin ? "Excluded (Admin Only)" : isLocked ? "In 1-to-1 Match 🔒" : "Available 🔓"}
            </Text>
          </View>
        </View>

        {/* Action Buttons Row */}
        {!isSelf && (
          <View style={styles.actionsRow}>
            {isTargetMasterAdmin ? (
              <View style={styles.masterProtectedWrap}>
                <Ionicons name="shield-checkmark" size={14} color="#D97706" />
                <Text style={styles.masterProtectedText}>Master Admin (Root Authority)</Text>
              </View>
            ) : (
              <>
                {/* Master Admin: Promote / Demote Admin */}
                {isCurrentUserMasterAdmin && (
                  <>
                    {!isTargetAdmin ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.makeAdminBtn]}
                        onPress={() => promptPromoteAdmin(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="shield-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.makeAdminBtnText}>Make Admin</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.removeAdminBtn]}
                        onPress={() => promptDemoteAdmin(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={15} color={THEME.colors.danger} />
                        <Text style={styles.removeAdminBtnText}>Remove Admin</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Verify / Unverify */}
                {!isBlocked && (
                  <>
                    {!item.isVerified ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.verifyBtn]}
                        onPress={() => handleVerify(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.unverifyBtn]}
                        onPress={() => handleUnverify(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={THEME.colors.textMuted} />
                        <Text style={styles.unverifyBtnText}>Revoke</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Block / Unblock (Only Master Admin or non-admin target) */}
                {(!isTargetAdmin || isCurrentUserMasterAdmin) && (
                  <>
                    {!isBlocked ? (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.blockBtn]}
                        onPress={() => promptBlock(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="ban-outline" size={16} color={THEME.colors.danger} />
                        <Text style={styles.blockBtnText}>Block</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.unblockBtn]}
                        onPress={() => handleUnblock(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="shield-checkmark-outline" size={16} color={THEME.colors.success} />
                        <Text style={styles.unblockBtnText}>Unblock</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Permanent Delete (Only Master Admin or non-admin target) */}
                {(!isTargetAdmin || isCurrentUserMasterAdmin) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => promptDelete(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <View style={styles.titleRow}>
              <Ionicons name="shield-checkmark" size={20} color={THEME.colors.primary} />
              <Text style={styles.headerTitle}>Admin Console</Text>
            </View>
            <Text style={styles.headerSubtitle}>User Management & Verification Control</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.uploadMasterBtn}
          onPress={() => setUploadModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
          <Text style={styles.uploadMasterBtnText}>Upload Excel</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statBox, { borderColor: THEME.colors.success + "40" }]}>
          <Text style={[styles.statValue, { color: THEME.colors.success }]}>{stats.verified}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={[styles.statBox, { borderColor: THEME.colors.warning + "40" }]}>
          <Text style={[styles.statValue, { color: THEME.colors.warning }]}>{stats.unverified}</Text>
          <Text style={styles.statLabel}>Unverified</Text>
        </View>
        <View style={[styles.statBox, { borderColor: THEME.colors.primary + "40" }]}>
          <Text style={[styles.statValue, { color: THEME.colors.primary }]}>{stats.locked}</Text>
          <Text style={styles.statLabel}>In Match</Text>
        </View>
        <View style={[styles.statBox, { borderColor: THEME.colors.danger + "40" }]}>
          <Text style={[styles.statValue, { color: THEME.colors.danger }]}>{stats.blocked}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
      </View>

      {/* Search & Action Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search email, username, actual name..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers} activeOpacity={0.8}>
          <Ionicons name="refresh" size={18} color={THEME.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(["ALL", "UNVERIFIED", "VERIFIED", "LOCKED", "BLOCKED"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {filter === "ALL"
                  ? "All"
                  : filter === "UNVERIFIED"
                  ? "Unverified"
                  : filter === "VERIFIED"
                  ? "Verified"
                  : filter === "LOCKED"
                  ? "In Match"
                  : "Blocked"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User Cards List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading user directory...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No accounts matched "${searchQuery}". Try a different keyword.`
                  : "There are currently no users in this filter category."}
              </Text>
            </View>
          }
        />
      )}

      {/* Excel / Master Sheet Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="cloud-upload" size={24} color={THEME.colors.primary} />
                <Text style={styles.modalTitle}>Upload Master Directory</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Upload an official Excel (.xlsx, .xls) or CSV sheet to populate the Master Directory. Registered users matching the sheet will be automatically marked as verified and receive an in-app verification notification.
            </Text>

            <View style={styles.columnGuideBox}>
              <Text style={styles.columnGuideTitle}>Supported Columns:</Text>
              <Text style={styles.columnGuideItem}>• <Text style={{ fontWeight: "700" }}>Email</Text> (required): Student or member official email</Text>
              <Text style={styles.columnGuideItem}>• <Text style={{ fontWeight: "700" }}>Actual Name</Text> (required): Legal verified name</Text>
              <Text style={styles.columnGuideItem}>• <Text style={{ fontWeight: "700" }}>Official Gender</Text> (required): male or female</Text>
              <Text style={styles.columnGuideItem}>• <Text style={{ fontWeight: "700" }}>Department / Batch</Text> (optional): e.g. CSE 2024</Text>
            </View>

            {/* Selected File Box */}
            <TouchableOpacity style={styles.filePickerButton} onPress={handleSelectFile} activeOpacity={0.8}>
              <Ionicons name="document-attach" size={24} color={THEME.colors.primary} />
              <Text style={styles.filePickerText}>
                {selectedFileName ? selectedFileName : "Choose Excel or CSV File (.xlsx, .csv)"}
              </Text>
            </TouchableOpacity>

            {/* Upload Button */}
            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setUploadModalVisible(false)}
                disabled={isUploading}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmUploadBtn, (!selectedFile || isUploading) && { opacity: 0.6 }]}
                onPress={handleUploadMasterSheet}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-done" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmUploadBtnText}>Process & Verify</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={confirmButtonText}
        isDestructive={confirmIsDestructive}
        icon={confirmIcon}
        onCancel={() => setConfirmModalVisible(false)}
        onConfirm={async () => {
          setConfirmModalVisible(false);
          if (confirmAction) {
            await confirmAction();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: THEME.spacing.md,
    paddingTop: Platform.OS === "ios" ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  uploadMasterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  uploadMasterBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: THEME.colors.surface,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: "row",
    paddingHorizontal: THEME.spacing.md,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textPrimary,
    padding: 0,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  filterTabsRow: {
    flexDirection: "row",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterTabActive: {
    backgroundColor: THEME.colors.primaryDark,
    borderColor: THEME.colors.primaryDark,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  filterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: 32,
    paddingTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardBlocked: {
    backgroundColor: "#FEF2F2",
    borderColor: THEME.colors.danger + "40",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.colors.primary,
  },
  nameBlock: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  usernameText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  adminBadge: {
    backgroundColor: THEME.colors.secondaryLight + "40",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: THEME.colors.secondary,
  },
  emailText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  badgeContainer: {
    marginLeft: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.success + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.colors.success,
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.warning + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  unverifiedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.colors.warning,
  },
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: THEME.colors.danger + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  blockedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: THEME.colors.danger,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.borderRadius.sm,
    padding: 8,
    marginBottom: 10,
  },
  detailItem: {
    width: "50%",
    paddingVertical: 3,
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  verifyBtn: {
    backgroundColor: THEME.colors.success,
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  unverifyBtn: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  unverifyBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  blockBtn: {
    backgroundColor: THEME.colors.danger + "15",
    borderWidth: 1,
    borderColor: THEME.colors.danger + "30",
  },
  blockBtnText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  unblockBtn: {
    backgroundColor: THEME.colors.success + "15",
    borderWidth: 1,
    borderColor: THEME.colors.success + "30",
  },
  unblockBtnText: {
    color: THEME.colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 8,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  uploadModalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  modalDescription: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  columnGuideBox: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16,
  },
  columnGuideTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  columnGuideItem: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  filePickerButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: THEME.colors.primaryLight,
    borderRadius: THEME.borderRadius.md,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.primaryLight + "15",
    marginBottom: 18,
  },
  filePickerText: {
    fontSize: 12,
    fontWeight: "700",
    color: THEME.colors.primaryDark,
    textAlign: "center",
  },
  modalActionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: THEME.colors.textSecondary,
  },
  confirmUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primaryDark,
  },
  confirmUploadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardMasterAdmin: {
    borderColor: "#F59E0B",
    borderWidth: 1.5,
    backgroundColor: "#FFFBEB",
  },
  masterAdminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  masterAdminBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#92400E",
  },
  masterProtectedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  masterProtectedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
  makeAdminBtn: {
    backgroundColor: THEME.colors.secondary,
  },
  makeAdminBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  removeAdminBtn: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.danger + "40",
  },
  removeAdminBtnText: {
    color: THEME.colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
});
