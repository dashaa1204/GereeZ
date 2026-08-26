import { afterEach, describe, expect, it } from "vitest";
import {
  demoCredentials,
  demoRedirectUrl,
  isDemoAutoLoginEnabled,
  isDemoEmail,
  safeDemoRedirect,
  shouldSignInAsDemo,
} from "@/lib/demo-user";
import { DASHBOARD_PATH } from "@/lib/routes";

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
    expect(safeDemoRedirect("https://evil.example")).toBe(DASHBOARD_PATH);
    expect(safeDemoRedirect("//evil.example")).toBe(DASHBOARD_PATH);
    // WHATWG URL treats `\` as `/`, so `/\\evil.com` is an open redirect.
    expect(safeDemoRedirect("/\\evil.com")).toBe(DASHBOARD_PATH);
    expect(safeDemoRedirect("/demo")).toBe(DASHBOARD_PATH);
    expect(safeDemoRedirect("/login?redirect=/")).toBe(DASHBOARD_PATH);
    expect(safeDemoRedirect(null)).toBe(DASHBOARD_PATH);
    expect(safeDemoRedirect("")).toBe(DASHBOARD_PATH);
  });

  it("sends the landing page to the dashboard", () => {
    // "/" is the marketing page; a just-signed-in visitor belongs in the app.
    expect(safeDemoRedirect("/")).toBe(DASHBOARD_PATH);
  });
});

describe("demoRedirectUrl", () => {
  const origin = "https://gereez.mn";

  it("stays on this origin for in-app paths", () => {
    const url = demoRedirectUrl("/contracts/abc?tab=meta", origin);
    expect(url.origin).toBe(origin);
    expect(url.pathname).toBe("/contracts/abc");
    expect(url.searchParams.get("tab")).toBe("meta");
  });

  it("does not follow a backslash open-redirect into another host", () => {
    // Defense in depth: even if the string check missed this, the origin
    // comparison must still refuse to send the browser to evil.com.
    const url = demoRedirectUrl("/\\evil.com", origin);
    expect(url.origin).toBe(origin);
    expect(url.pathname).toBe(DASHBOARD_PATH);
  });

  it("does not follow protocol-relative next values", () => {
    const url = demoRedirectUrl("//evil.com", origin);
    expect(url.origin).toBe(origin);
    expect(url.pathname).toBe(DASHBOARD_PATH);
  });
});

describe("shouldSignInAsDemo", () => {
  it("signs anonymous visitors into the demo account", () => {
    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn" });
    expect(shouldSignInAsDemo(null)).toBe(true);
    expect(shouldSignInAsDemo(undefined)).toBe(true);
  });

  it("does not replace a real user's session", () => {
    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn" });
    expect(shouldSignInAsDemo("user@example.com")).toBe(false);
  });

  it("lets the demo user through without treating them as a real account", () => {
    setEnv({ DEMO_USER_EMAIL: "demo@gereez.mn" });
    expect(shouldSignInAsDemo("demo@gereez.mn")).toBe(true);
  });
});
