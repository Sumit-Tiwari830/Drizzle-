export interface CommunityRule {
  id: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
}

export const COMMUNITY_RULES: CommunityRule[] = [
  {
    id: "exclusive_match",
    number: "01",
    title: "1-to-1 Exclusive Connection",
    tagline: "One meaningful conversation at a time",
    description:
      "When you match with someone, you share an exclusive space together. Your discovery feed pauses so you can give each other genuine, undivided attention.",
    icon: "heart-outline",
  },
  {
    id: "icebreaker_48h",
    number: "02",
    title: "The 48-Hour Icebreaker",
    tagline: "Say hello and start the spark",
    description:
      "Once matched, take the initiative! If neither person sends a message within 48 hours, the match gently expires so neither of you is left waiting in limbo.",
    icon: "chatbubble-ellipses-outline",
  },
  {
    id: "request_ttl_48h",
    number: "03",
    title: "Thoughtful & Active Responses",
    tagline: "No endless waiting",
    description:
      "Connection requests remain open for 48 hours. If someone matches with another person in the meantime, requests are automatically closed so you can connect with active people.",
    icon: "hourglass-outline",
  },
  {
    id: "daily_quota",
    number: "04",
    title: "Mindful Matching (10 Invites / Day)",
    tagline: "Intentional dating over mindless swiping",
    description:
      "You receive 10 curated invitations every rolling 24 hours. This keeps our community thoughtful and ensures every invite you send really counts.",
    icon: "sparkles-outline",
  },
  {
    id: "privacy_shield",
    number: "05",
    title: "Personality First, Mutual Reveal",
    tagline: "Connect on substance before appearance",
    description:
      "Profiles initially show verified details, prompts, and masked photos. When you feel a genuine spark, you can both mutually agree to reveal full photos and identities.",
    icon: "shield-checkmark-outline",
  },
  {
    id: "instant_purge",
    number: "06",
    title: "Zero-Trace Privacy",
    tagline: "Clean closures, complete peace of mind",
    description:
      "If a connection isn't a fit, unmatching is clean and respectful. Your entire chat history is permanently removed with zero residual traces for both of you.",
    icon: "lock-closed-outline",
  },
  {
    id: "verified_only",
    number: "07",
    title: "100% Verified Community",
    tagline: "Real humans, zero bots",
    description:
      "Every profile on Drizzle is verified with email OTP authentication. You're always speaking to a verified, real person.",
    icon: "checkmark-circle-outline",
  },
];

// Compatibility alias
export const APP_RULES = COMMUNITY_RULES;
