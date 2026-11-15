import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { THEME } from "../../constants/theme";
import { profileApi } from "../../api";
import { useAuthStore } from "../../stores/authStore";

export const OnboardingScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState("");
  const [dob, setDob] = useState("2000-01-01"); // YYYY-MM-DD
  const [height, setHeight] = useState("175");
  const [region, setRegion] = useState("");
  const [isRegionVisible, setIsRegionVisible] = useState(true);
  const [gender, setGender] = useState("FEMALE");
  const [lookingFor, setLookingFor] = useState("SERIOUS_RELATIONSHIP");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("Coffee, Travel, Reading, Tech");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  // Derive age from dob in real time
  const calculateAge = (dobString: string): number => {
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 24;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow gallery access to upload your avatar.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!username.trim() || !region.trim()) {
      Alert.alert("Missing Information", "Please enter a username and your region/location.");
      return;
    }

    try {
      setLoading(true);

      // 1. Upload Avatar if selected
      let uploadedAvatarUrl = avatarUri;
      if (avatarUri && !avatarUri.startsWith("http")) {
        const formData = new FormData();
        const filename = avatarUri.split("/").pop() || "avatar.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("avatar", {
          uri: avatarUri,
          name: filename,
          type,
        } as any);

        const uploadRes = await profileApi.uploadAvatar(formData);
        uploadedAvatarUrl = uploadRes.avatarUrl;
      }

      // 2. Save Profile Details
      const interestList = interests
        .split(",")
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const cleanHeight = height.trim().endsWith("cm") ? height.trim() : `${height.trim()} cm`;

      await profileApi.updateProfile({
        username: username.trim(),
        dob: dob.trim(),
        height: cleanHeight,
        region: region.trim(),
        isRegionVisible,
        gender,
        lookingFor,
        bio: bio.trim(),
        interests: interestList,
        avatarUrl: uploadedAvatarUrl || undefined,
      });

      await refreshProfile();
      Alert.alert("Profile Created!", "Welcome! Your exclusive dating journey begins now.");
    } catch (err: any) {
      Alert.alert("Failed to Save Profile", err.message || "An error occurred while saving profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Craft Your Profile</Text>
        <Text style={styles.subtitle}>
          Your height and age are always verified. You decide if your region is public or private.
        </Text>
      </View>

      {/* Avatar Picker */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="camera-outline" size={32} color={THEME.colors.primary} />
              <Text style={styles.avatarPlaceholderText}>Upload Photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Protected by Anonymity Shield until mutual reveal</Text>
      </View>

      {/* Inputs */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Username</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maya_Creative"
          placeholderTextColor={THEME.colors.textMuted}
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2000-05-15"
            placeholderTextColor={THEME.colors.textMuted}
            value={dob}
            onChangeText={setDob}
          />
          <Text style={styles.derivedText}>Derived Age: {calculateAge(dob)} years</Text>
        </View>

        <View style={[styles.inputGroup, { width: 110, marginLeft: 12 }]}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="175"
            keyboardType="number-pad"
            placeholderTextColor={THEME.colors.textMuted}
            value={height}
            onChangeText={setHeight}
          />
        </View>
      </View>

      {/* Region + Privacy Toggle */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Region / State</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. South Delhi / Bangalore"
          placeholderTextColor={THEME.colors.textMuted}
          value={region}
          onChangeText={setRegion}
        />
        <View style={styles.privacyToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Display Region on Profile</Text>
            <Text style={styles.toggleDesc}>
              {isRegionVisible
                ? "Visible to potential matches in feed"
                : "Hidden as '[HIDDEN - Private]' until mutual reveal"}
            </Text>
          </View>
          <Switch
            value={isRegionVisible}
            onValueChange={setIsRegionVisible}
            trackColor={{ false: THEME.colors.border, true: THEME.colors.primaryLight }}
            thumbColor={isRegionVisible ? THEME.colors.primary : "#f4f3f4"}
          />
        </View>
      </View>

      {/* Bio */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>About You (Bio)</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Share your passions, what excites you, or what makes you laugh..."
          placeholderTextColor={THEME.colors.textMuted}
          multiline
          numberOfLines={3}
          value={bio}
          onChangeText={setBio}
        />
      </View>

      {/* Interests */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Interests (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="Coffee, Books, Indie Music, Hiking"
          placeholderTextColor={THEME.colors.textMuted}
          value={interests}
          onChangeText={setInterests}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.7 }]}
        onPress={handleSaveProfile}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Complete Setup & Enter</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: THEME.spacing.lg,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 11,
    fontWeight: "600",
    color: THEME.colors.primary,
    marginTop: 4,
  },
  avatarHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
  },
  derivedText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  privacyToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.colors.surfaceSecondary,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 8,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 14,
    borderRadius: THEME.borderRadius.md,
    alignItems: "center",
    marginTop: THEME.spacing.md,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
