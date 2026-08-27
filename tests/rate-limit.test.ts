import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RATE_LIMITS, type RateLimitBucket } from "@/lib/rate-limit";

const API_DIR = path.resolve(__dirname, "../app/api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

/** Every `checkRateLimit("bucket")` in the API routes, with the file it's in. */
function bucketUses(): { bucket: string; file: string }[] {
  return routeFiles(API_DIR).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const matches = source.matchAll(/checkRateLimit\(\s*"([^"]+)"/g);
    return [...matches].map((m) => ({
      bucket: m[1],
      file: path.relative(API_DIR, file).split(path.sep).join("/"),
    }));
  });
}

// The bug this file exists to prevent: five unrelated actions — upload, quote,
// recharge, delete-contract, delete-account — spent one `upload` budget, so an
// upload cost two of twenty and deleting contracts could lock a user out of
// closing their account. Sharing is invisible at every call site and only
// shows up as a 429 for something the user never did, so it is asserted here.
describe("rate-limit buckets", () => {
  const uses = bucketUses();

  it("finds the rate-limited routes", () => {
    expect(uses.length).toBeGreaterThan(0);
  });

  it("limits every action through a declared bucket", () => {
    for (const use of uses) {
      expect(Object.keys(RATE_LIMITS), use.file).toContain(use.bucket);
    }
  });

  it("gives each action a bucket of its own", () => {
    const sharers = Object.entries(
      uses.reduce<Record<string, string[]>>((acc, use) => {
        (acc[use.bucket] ??= []).push(use.file);
        return acc;
      }, {}),
    ).filter(([, files]) => files.length > 1);

    expect(sharers).toEqual([]);
  });

  it("leaves no bucket declared but unused", () => {
    const used = new Set(uses.map((u) => u.bucket));
    for (const bucket of Object.keys(RATE_LIMITS)) {
      expect(used, bucket).toContain(bucket);
    }
  });
});

describe("rate-limit rules", () => {
  const rules = Object.entries(RATE_LIMITS) as [
    RateLimitBucket,
    (typeof RATE_LIMITS)[RateLimitBucket],
  ][];

  it("caps every action within a real window", () => {
    for (const [bucket, rule] of rules) {
      expect(rule.limit, bucket).toBeGreaterThan(0);
      expect(rule.windowSeconds, bucket).toBeGreaterThan(0);
    }
  });

  // Shared wording is how "wait an hour" came to read as "the app won't delete
  // your account" — the refusal has to name what was actually refused.
  it("says something of its own about each refused action", () => {
    const messages = rules.map(([, rule]) => rule.message);
    for (const [bucket, rule] of rules) {
      expect(rule.message.trim(), bucket).not.toBe("");
    }
    expect(new Set(messages).size).toBe(messages.length);
  });

  // Quoting is a page count with no AI behind it, and it runs at least once per
  // upload: if it were the tighter of the two it would cap uploading instead.
  it("never lets quoting be the thing that stops an upload", () => {
    expect(RATE_LIMITS.quote.limit).toBeGreaterThan(RATE_LIMITS.upload.limit);
  });
});
