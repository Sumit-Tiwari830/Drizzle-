import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, comparePassword } from "../../src/utils/hash.ts";
import { generateToken, verifyToken } from "../../src/utils/jwt.ts";

describe("🔐 Unit Tests: Authentication & Cryptography", () => {
  it("should securely hash passwords and verify matching passwords", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hashed = await hashPassword(rawPassword);

    assert.notEqual(hashed, rawPassword);
    assert.ok(hashed.length > 20);

    const isMatch = await comparePassword(rawPassword, hashed);
    assert.equal(isMatch, true);

    const isWrongMatch = await comparePassword("WrongPassword123!", hashed);
    assert.equal(isWrongMatch, false);
  });

  it("should sign and verify valid JWT tokens", () => {
    const payload = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      email: "testuser@datingapp.com",
      role: "USER",
    };

    const token = generateToken(payload);
    assert.ok(typeof token === "string");
    assert.ok(token.split(".").length === 3);

    const decoded = verifyToken(token);
    assert.equal(decoded.id, payload.id);
    assert.equal(decoded.email, payload.email);
    assert.equal(decoded.role, payload.role);
  });

  it("should reject tampered or corrupted JWT tokens", () => {
    const token = generateToken({
      id: "user-123",
      email: "user@test.com",
      role: "USER",
    });

    const tampered = token.slice(0, -5) + "abcde";
    assert.throws(() => verifyToken(tampered));
  });
});
