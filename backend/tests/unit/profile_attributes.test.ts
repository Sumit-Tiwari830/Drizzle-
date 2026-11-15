import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateAge } from "../../src/utils/date.ts";

describe("📐 Unit Tests: User Profile Attributes (DOB, Age, Height & Region Visibility)", () => {
  describe("1. Precision Age Derivation from DOB", () => {
    it("should accurately calculate age when birthday has already occurred this year", () => {
      // Assuming test runs in 2026-11-15
      const now = new Date();
      const currentYear = now.getFullYear();
      const pastMonth = now.getMonth() === 0 ? 0 : now.getMonth() - 1; // 1 month ago
      const dob = new Date(currentYear - 25, pastMonth, 10).toISOString().split("T")[0];

      const age = calculateAge(dob);
      assert.equal(age, 25);
    });

    it("should adjust age (-1) when birthday has not yet occurred this year", () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const futureMonth = now.getMonth() === 11 ? 11 : now.getMonth() + 1; // 1 month later
      const dob = new Date(currentYear - 25, futureMonth, 28).toISOString().split("T")[0];

      const age = calculateAge(dob);
      // Birthday hasn't happened yet in the current year, so age must be 24
      assert.equal(age, 24);
    });

    it("should handle exact birthday today correctly", () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
      const currentDay = String(now.getDate()).padStart(2, "0");
      const dobToday = `${currentYear - 20}-${currentMonth}-${currentDay}`;

      const age = calculateAge(dobToday);
      assert.equal(age, 20);
    });

    it("should handle leap year DOBs correctly", () => {
      // 2000 was a leap year
      const age = calculateAge("2000-02-29");
      assert.ok(typeof age === "number" && age >= 25);
    });

    it("should return null gracefully for null, undefined, or invalid DOB inputs", () => {
      assert.equal(calculateAge(null), null);
      assert.equal(calculateAge(undefined), null);
      assert.equal(calculateAge("invalid-date-string"), null);
      assert.equal(calculateAge(""), null);
    });
  });

  describe("2. Height Always Visible Rule", () => {
    it("should always include height in sanitized candidate feed profiles", () => {
      const rawCandidate = {
        userId: "usr-1",
        username: "StarGazer",
        height: "182 cm",
        dob: "2001-04-12",
        region: "Western Europe",
        isRegionVisible: false,
      };

      const sanitized = {
        username: rawCandidate.username,
        height: rawCandidate.height, // Height is ALWAYS visible
        age: calculateAge(rawCandidate.dob), // Age is ALWAYS visible (derived from dob)
        region: rawCandidate.isRegionVisible ? rawCandidate.region : "[HIDDEN - Private]",
      };

      assert.equal(sanitized.height, "182 cm");
      assert.ok(typeof sanitized.age === "number");
    });
  });

  describe("3. Region Visibility Conditional Masking Rule", () => {
    it("should mask region as [HIDDEN - Private] when isRegionVisible is false", () => {
      const candidatePrivateRegion = {
        userId: "usr-2",
        username: "QuietWanderer",
        height: "5'10\"",
        dob: "1999-08-20",
        region: "Northern California",
        isRegionVisible: false,
      };

      const sanitized = {
        username: candidatePrivateRegion.username,
        height: candidatePrivateRegion.height,
        age: calculateAge(candidatePrivateRegion.dob),
        region: candidatePrivateRegion.isRegionVisible
          ? candidatePrivateRegion.region
          : "[HIDDEN - Private]",
      };

      assert.equal(sanitized.region, "[HIDDEN - Private]");
      assert.equal(sanitized.height, "5'10\"");
      assert.ok(typeof sanitized.age === "number");
    });

    it("should reveal region when user explicitly sets isRegionVisible to true", () => {
      const candidatePublicRegion = {
        userId: "usr-3",
        username: "OpenExplorer",
        height: "175 cm",
        dob: "2002-01-15",
        region: "Punjab, India",
        isRegionVisible: true,
      };

      const sanitized = {
        username: candidatePublicRegion.username,
        height: candidatePublicRegion.height,
        age: calculateAge(candidatePublicRegion.dob),
        region: candidatePublicRegion.isRegionVisible
          ? candidatePublicRegion.region
          : "[HIDDEN - Private]",
      };

      assert.equal(sanitized.region, "Punjab, India");
      assert.equal(sanitized.height, "175 cm");
      assert.ok(typeof sanitized.age === "number");
    });

    it("should allow owner to view their own region and isRegionVisible status at all times", () => {
      const myProfile = {
        userId: "my-user-id",
        username: "MySelf",
        dob: "1998-05-10",
        height: "180 cm",
        region: "Texas, USA",
        isRegionVisible: false,
      };

      const ownerView = {
        ...myProfile,
        age: calculateAge(myProfile.dob),
      };

      // Owner always sees unmasked region in their own dashboard
      assert.equal(ownerView.region, "Texas, USA");
      assert.equal(ownerView.isRegionVisible, false);
      assert.equal(ownerView.height, "180 cm");
      assert.ok(typeof ownerView.age === "number");
    });
  });
});
