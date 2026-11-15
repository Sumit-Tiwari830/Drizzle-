import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("🎭 Unit Tests: Privacy & Profile Reveal Protocol", () => {
  const mockProfile = {
    userId: "user-abc-123",
    username: "StarGazer88",
    actualName: "Ananya Sharma",
    avatarUrl: "https://api.dicebear.com/avatar1.svg",
    gender: "female",
    dob: "2001-08-15",
    bio: "Loving tech and coffee",
    interests: ["Reading", "Coffee", "Yoga"],
    city: "Bangalore",
    realPhotos: ["https://cdn.com/real1.jpg", "https://cdn.com/real2.jpg"],
    isPublicReveal: false,
  };

  function sanitizeProfileForViewer(
    profile: typeof mockProfile,
    isMutuallyRevealed: boolean
  ) {
    const isRevealed = profile.isPublicReveal || isMutuallyRevealed;
    return {
      userId: profile.userId,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      gender: profile.gender,
      dob: profile.dob,
      bio: profile.bio,
      interests: profile.interests,
      city: profile.city,
      isRevealed,
      actualName: isRevealed ? profile.actualName : "[HIDDEN - Awaiting Mutual Profile Reveal]",
      realPhotos: isRevealed ? profile.realPhotos : [],
    };
  }

  it("should conceal actualName and realPhotos when neither public nor mutual reveal is granted", () => {
    const sanitized = sanitizeProfileForViewer(mockProfile, false);

    assert.equal(sanitized.username, "StarGazer88");
    assert.equal(sanitized.actualName, "[HIDDEN - Awaiting Mutual Profile Reveal]");
    assert.deepEqual(sanitized.realPhotos, []);
    assert.equal(sanitized.isRevealed, false);
  });

  it("should unlock actualName and realPhotos when mutual reveal condition is met", () => {
    const sanitized = sanitizeProfileForViewer(mockProfile, true);

    assert.equal(sanitized.username, "StarGazer88");
    assert.equal(sanitized.actualName, "Ananya Sharma");
    assert.deepEqual(sanitized.realPhotos, ["https://cdn.com/real1.jpg", "https://cdn.com/real2.jpg"]);
    assert.equal(sanitized.isRevealed, true);
  });

  it("should unlock actualName and realPhotos if user explicitly enabled isPublicReveal", () => {
    const publicProfile = { ...mockProfile, isPublicReveal: true };
    const sanitized = sanitizeProfileForViewer(publicProfile, false);

    assert.equal(sanitized.actualName, "Ananya Sharma");
    assert.deepEqual(sanitized.realPhotos, ["https://cdn.com/real1.jpg", "https://cdn.com/real2.jpg"]);
    assert.equal(sanitized.isRevealed, true);
  });
});
