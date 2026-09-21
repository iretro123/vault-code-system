import { describe, expect, it } from "vitest";
import { authErrorMessage } from "../lib/authErrorMessage";

const RETRY = "We couldn't reach the sign-in service. Please wait a moment and try again.";

describe("authErrorMessage", () => {
  it("replaces empty or JSON-shaped messages", () => {
    expect(authErrorMessage({ message: "{}" })).toBe(RETRY);
    expect(authErrorMessage({ message: "" })).toBe(RETRY);
    expect(authErrorMessage(null)).toBe(RETRY);
    expect(authErrorMessage({ message: '{"code":500}' })).toBe(RETRY);
  });

  it("replaces backend schema/internal failures", () => {
    expect(authErrorMessage(new Error("Database error querying schema"))).toBe(RETRY);
    expect(authErrorMessage(new Error("unexpected_failure"))).toBe(RETRY);
  });

  it("explains network failures", () => {
    expect(authErrorMessage(new Error("Failed to fetch"))).toBe(
      "Connection problem. Check your internet and try again.",
    );
  });

  it("keeps real credential messages intact", () => {
    expect(authErrorMessage(new Error("Invalid login credentials"))).toBe(
      "Invalid login credentials",
    );
    expect(authErrorMessage(new Error("Email not confirmed"))).toBe("Email not confirmed");
  });
});
