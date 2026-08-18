import { afterEach, describe, expect, it } from "vitest";
import {
  demoCredentials,
  isDemoAutoLoginEnabled,
  isDemoEmail,
  safeDemoRedirect,
} from "@/lib/demo-user";

const KEYS = ["DEMO_USER_EMAIL", "DEMO_USER_PASSWORD", "DEMO_AUTOLOGIN"] as const;

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

afterEach(() => setEnv({}));

describe("demoCredentials", () => {
  it("is null unless both email and password are configured", () => {
    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn" });
    expect(demoCredentials()).toBeNull();

    setEnv({ DEMO_USER_PASSWORD: "secret" });
    expect(demoCredentials()).toBeNull();

    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn", DEMO_USER_PASSWORD: "secret" });
    expect(demoCredentials()).toEqual({
      email: "demo@gereez.mn",
      password: "secret",
    });
  });
});

describe("isDemoAutoLoginEnabled", () => {
  it("needs the flag AND a configured account", () => {
    setEnv({ DEMO_AUTOLOGIN: "true" });
    expect(isDemoAutoLoginEnabled()).toBe(false);

    setEnv({
      DEMO_AUTOLOGIN: "true",
      DEMO_USER_EMAIL: "demo@gereez.mn",
      DEMO_USER_PASSWORD: "secret",
    });
    expect(isDemoAutoLoginEnabled()).toBe(true);

    setEnv({
      DEMO_AUTOLOGIN: "false",
      DEMO_USER_EMAIL: "demo@gereez.mn",
      DEMO_USER_PASSWORD: "secret",
    });
    expect(isDemoAutoLoginEnabled()).toBe(false);
  });
});

describe("isDemoEmail", () => {
  it("matches the configured account case-insensitively", () => {
    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn" });
    expect(isDemoEmail("DEMO@Gereez.MN")).toBe(true);
    expect(isDemoEmail(" demo@gereez.mn ")).toBe(true);
    expect(isDemoEmail("someone@else.mn")).toBe(false);
    expect(isDemoEmail(null)).toBe(false);
  });

  it("never matches when no demo account is configured", () => {
    setEnv({});
    expect(isDemoEmail("demo@gereez.mn")).toBe(false);
    // A real user with no email must not be mistaken for the demo account.
    expect(isDemoEmail(undefined)).toBe(false);
  });
});

describe("safeDemoRedirect", () => {
  it("keeps in-app paths", () => {
    expect(safeDemoRedirect("/contracts")).toBe("/contracts");
    expect(safeDemoRedirect("/contracts/abc?tab=meta")).toBe(
      "/contracts/abc?tab=meta",
    );
  });

  it("refuses off-site and looping targets", () => {
    expect(safeDemoRedirect("https://evil.example")).toBe("/");
    expect(safeDemoRedirect("//evil.example")).toBe("/");
    expect(safeDemoRedirect("/demo")).toBe("/");
    expect(safeDemoRedirect("/login?redirect=/")).toBe("/");
    expect(safeDemoRedirect(null)).toBe("/");
    expect(safeDemoRedirect("")).toBe("/");
  });
});
