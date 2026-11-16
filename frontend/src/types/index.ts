export interface User {
  id: string;
  email: string;
  isEmailVerified: boolean;
  isVerified?: boolean;
  isLocked: boolean;
  isDeleted?: boolean;
  role: string;
  createdAt: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  isLocked: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  username?: string | null;
  actualName?: string | null;
  gender?: string | null;
  height?: string | number | null;
  region?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  dob?: string | null;
}

export interface Profile {
  userId: string;
  username: string;
  actualName?: string;
  avatarUrl: string;
  photos: string[];
  bio: string;
  gender: string;
  lookingFor: string;
  dob?: string;
  age: number | null;
  height: string | number | null; // e.g., "178 cm" or 178
  region: string;
  isRegionVisible: boolean;
  interests: string[];
  isPublicReveal: boolean;
  city?: string;
  isRevealed?: boolean;
}

export interface CandidateFeedItem {
  userId: string;
  username: string;
  avatarUrl: string;
  gender: string;
  dob?: string;
  age: number | null;
  height: string | number | null;
  region: string; // May be "[HIDDEN - Private]" or the actual region
  isRegionVisible: boolean;
  bio: string;
  interests: string[];
  lookingFor: string;
  city?: string;
  isRevealed: boolean;
  photos?: string[];
  // Hinge-style prompts
  prompts?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface ConnectRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED";
  note?: string;
  createdAt: string;
  expiresAt: string; // 48-Hour TTL
  partnerProfile: CandidateFeedItem;
}

export interface ActiveMatch {
  id: string;
  user1Id: string;
  user2Id: string;
  status: "ACTIVE" | "UNMATCHED";
  matchedAt: string;
  unmatchedAt?: string | null;
  user1RevealAccepted: boolean;
  user2RevealAccepted: boolean;
  partner: CandidateFeedItem;
  // Icebreaker status
  icebreakerDeadline: string; // matchedAt + 48h
  hasIcebreakerBeenSent: boolean;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AppRule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: string; // Ionicons / MaterialIcons name
  color: string;
}

export interface AppNotification {
  _id: string;
  userId: string;
  type: "UNMATCHED" | "MATCHED" | "REQUEST_RECEIVED" | "PROFILE_REVEAL" | "SYSTEM" | "VERIFIED" | "ACCOUNT_STATUS";
  title: string;
  message: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}
