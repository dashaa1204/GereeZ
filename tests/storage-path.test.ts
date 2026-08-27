import { describe, expect, it } from "vitest";
import { contractStoragePath } from "@/lib/storage-path";

const USER = "6e73efb3-23b2-4387-bb1c-1a29ed6756f3";

describe("contractStoragePath", () => {
  it("files the object under its owner", () => {
    expect(contractStoragePath(USER, "lease.pdf").startsWith(`${USER}/`)).toBe(true);
  });

  // The collision the prefix exists to prevent: two users, same file name,
  // same millisecond. `upsert: false` makes that a 500 for the second one.
  it("keeps two users' identical uploads apart", () => {
    const mine = contractStoragePath(USER, "lease.pdf");
    const theirs = contractStoragePath("11111111-2222-3333-4444-555555555555", "lease.pdf");
    expect(mine).not.toBe(theirs);
  });

  // And the one the prefix cannot prevent: the same user, twice, fast.
  it("keeps one user's identical uploads apart", () => {
    const first = contractStoragePath(USER, "lease.pdf");
    const second = contractStoragePath(USER, "lease.pdf");
    expect(first).not.toBe(second);
  });

  it("keeps the file name readable when it is already safe", () => {
    expect(contractStoragePath(USER, "lease-2026_v2.pdf").endsWith("-lease-2026_v2.pdf")).toBe(true);
  });

  // Storage keys are not the place for spaces, slashes or Cyrillic — the real
  // name is kept on the contract row, which is what the UI reads.
  it("replaces anything unsafe in the name", () => {
    const path = contractStoragePath(USER, "Түрээс гэрээ /2026.pdf");
    const name = path.slice(path.indexOf("/") + 1);
    expect(name).toMatch(/^\d+-[0-9a-f]+-[a-zA-Z0-9._-]+$/);
    expect(name.endsWith("_2026.pdf")).toBe(true);
  });
});
