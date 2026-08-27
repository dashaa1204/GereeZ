import { describe, expect, it } from "vitest";
import { chromeFor } from "@/lib/app-chrome";
import { DASHBOARD_PATH } from "@/lib/routes";

describe("chromeFor", () => {
  it("names the top-level screens and gives them no back button", () => {
    for (const path of ["/app", "/contracts", "/alerts", "/settings"]) {
      expect(chromeFor(path).up, path).toBeNull();
      expect(chromeFor(path).title, path).not.toBe("");
    }
  });

  // Both of these are linked to directly from the notification feed, so either
  // can be the first page of a session. A back button that runs browser
  // history would leave the app; these name a destination inside it instead.
  it("sends the audit screen up to the contract list", () => {
    expect(chromeFor("/contracts/abc-123").up).toBe("/contracts");
    expect(chromeFor("/contracts/abc-123").title).toBe("Аудит дүн");
  });

  it("sends the credit screen up to the dashboard", () => {
    expect(chromeFor("/payment").up).toBe(DASHBOARD_PATH);
  });

  it("keeps the contract list itself top-level", () => {
    expect(chromeFor("/contracts").up).toBeNull();
  });

  it("falls back to the dashboard chrome for anything else", () => {
    expect(chromeFor("/somewhere-new")).toEqual({
      title: "GereeZ",
      desktop: "Нүүр",
      up: null,
    });
  });
});
