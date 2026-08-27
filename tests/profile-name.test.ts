import { describe, expect, it } from "vitest";
import {
  MAX_PROFILE_NAME_LENGTH,
  normalizeProfileName,
} from "@/lib/profile-name";

describe("normalizeProfileName", () => {
  it("keeps a name, trimmed", () => {
    expect(normalizeProfileName("  Б. Дорж  ")).toBe("Б. Дорж");
  });

  it("rejects a name that is only whitespace", () => {
    expect(normalizeProfileName("   ")).toBeNull();
    expect(normalizeProfileName("")).toBeNull();
  });

  it("rejects anything that isn't a string", () => {
    expect(normalizeProfileName(undefined)).toBeNull();
    expect(normalizeProfileName(null)).toBeNull();
    expect(normalizeProfileName(42)).toBeNull();
    expect(normalizeProfileName({ name: "Дорж" })).toBeNull();
  });

  it("accepts a name of exactly the cap", () => {
    const name = "a".repeat(MAX_PROFILE_NAME_LENGTH);
    expect(normalizeProfileName(name)).toBe(name);
  });

  it("rejects one character past the cap", () => {
    expect(normalizeProfileName("a".repeat(MAX_PROFILE_NAME_LENGTH + 1))).toBeNull();
  });

  // The cap is measured after trimming, so padding a name to the limit with
  // spaces is not a way past it — nor a reason to refuse a name that fits.
  it("measures the cap after trimming", () => {
    const padded = ` ${"a".repeat(MAX_PROFILE_NAME_LENGTH)} `;
    expect(normalizeProfileName(padded)).toBe("a".repeat(MAX_PROFILE_NAME_LENGTH));
  });
});
