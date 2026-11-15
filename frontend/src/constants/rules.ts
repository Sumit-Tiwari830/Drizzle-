import { AppRule } from "../types";

export const APP_RULES: AppRule[] = [
  {
    id: "exclusive_match",
    title: "1-to-1 Exclusive Match",
    subtitle: "No multi-dating or divided attention",
    description:
      "When you match with someone, both of your profiles are locked (isLocked = true). You cannot browse the feed, send new requests, or receive incoming requests. You focus entirely on one connection at a time.",
    badge: "Exclusive",
    icon: "lock-closed",
    color: "#E11D48",
  },
  {
    id: "icebreaker_48h",
    title: "48-Hour 'First-Message' Icebreaker",
    subtitle: "Rule 1: Say goodbye to ghosting deadlocks",
    description:
      "Once matched, a 48-hour countdown timer begins. If no message is sent within 48 hours, the match automatically dissolves, both profiles are unlocked, and any messages are deleted so nobody gets stuck in limbo.",
    badge: "Rule 1",
    icon: "timer-outline",
    color: "#0284C7",
  },
  {
    id: "request_ttl_48h",
    title: "48-Hour Request Expiry",
    subtitle: "Fast decisions, no endless waiting",
    description:
      "Connect requests expire in exactly 48 hours if unanswered. Furthermore, if a candidate gets matched with someone else before responding to your request, the request is cleanly cancelled.",
    badge: "48H TTL",
    icon: "hourglass-outline",
    color: "#F59E0B",
  },
  {
    id: "daily_quota",
    title: "24-Hour Rolling Quota (10 Requests)",
    subtitle: "Quality over spam swiping",
    description:
      "To encourage thoughtful, intentional dating, users are limited to 10 connect requests per rolling 24-hour period. Send requests to profiles you genuinely resonate with.",
    badge: "10 / Day",
    icon: "sparkles-outline",
    color: "#8B5CF6",
  },
  {
    id: "privacy_shield",
    title: "Anonymity Shield & Mutual Reveal",
    subtitle: "Connect based on substance first",
    description:
      "Profiles initially show avatars and blurred photos with verified stats (bio, interests, age, height). Only when BOTH of you tap 'Request Reveal' are full unmasked real photos and identity unlocked.",
    badge: "Privacy",
    icon: "shield-checkmark-outline",
    color: "#10B981",
  },
  {
    id: "instant_purge",
    title: "Instant Chat Purge on Unmatch",
    subtitle: "Zero residual digital footprints",
    description:
      "If either partner taps 'Unmatch' or the icebreaker timer expires, all chat history is immediately and permanently wiped from the database. Both candidates are unlocked instantly.",
    badge: "Zero-Trace",
    icon: "trash-outline",
    color: "#EF4444",
  },
  {
    id: "verified_only",
    title: "Verified Community Only",
    subtitle: "100% human, zero bots",
    description:
      "Email OTP verification is strictly required. Unverified accounts cannot view the discovery feed or send connect requests. Every profile you encounter is a verified human.",
    badge: "Verified",
    icon: "checkmark-circle-outline",
    color: "#065F46",
  },
];
