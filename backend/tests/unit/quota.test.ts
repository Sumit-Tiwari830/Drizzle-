import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("⏳ Unit Tests: 24-Hour Rolling Request Quota", () => {
  function evaluateQuota(
    requestTimestamps: Date[],
    currentTime: Date,
    maxLimit: number = 10
  ): { allowed: boolean; remaining: number } {
    const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

    const validRequestsInWindow = requestTimestamps.filter(
      (ts) => ts.getTime() >= twentyFourHoursAgo.getTime()
    );

    const count = validRequestsInWindow.length;
    const allowed = count < maxLimit;
    const remaining = Math.max(0, maxLimit - count);

    return { allowed, remaining };
  }

  it("should allow request if user has made less than 10 requests in 24 hours", () => {
    const now = new Date();
    // 5 requests made in the last few hours
    const pastRequests = [
      new Date(now.getTime() - 2 * 60 * 60 * 1000),
      new Date(now.getTime() - 5 * 60 * 60 * 1000),
      new Date(now.getTime() - 10 * 60 * 60 * 1000),
      new Date(now.getTime() - 18 * 60 * 60 * 1000),
      new Date(now.getTime() - 22 * 60 * 60 * 1000),
    ];

    const result = evaluateQuota(pastRequests, now, 10);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 5);
  });

  it("should block 11th request when user reaches 10 requests in 24 hours", () => {
    const now = new Date();
    // 10 requests made in the last 12 hours
    const pastRequests = Array.from({ length: 10 }, (_, i) =>
      new Date(now.getTime() - (i + 1) * 60 * 60 * 1000)
    );

    const result = evaluateQuota(pastRequests, now, 10);
    assert.equal(result.allowed, false);
    assert.equal(result.remaining, 0);
  });

  it("should ignore requests older than 24 hours in the rolling window", () => {
    const now = new Date();
    // 8 requests from yesterday (> 24 hours ago) and 3 requests from today (< 24h)
    const pastRequests = [
      ...Array.from({ length: 8 }, (_, i) => new Date(now.getTime() - (26 + i) * 60 * 60 * 1000)),
      new Date(now.getTime() - 2 * 60 * 60 * 1000),
      new Date(now.getTime() - 4 * 60 * 60 * 1000),
      new Date(now.getTime() - 6 * 60 * 60 * 1000),
    ];

    const result = evaluateQuota(pastRequests, now, 10);
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 7); // Only 3 are within the window
  });
});
