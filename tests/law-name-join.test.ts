import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A law name is a join key, and these are its two ends.
 *
 * `ingestLegalText` is the only place it is written; `getLawLastUpdated` reads
 * it back to say when each law last moved. Everything in between — retrieval,
 * the cache-freshness check, the law-update alert — compares the two strings
 * for equality, so a spelling that enters at one end and not the other is not
 * a mismatch anybody sees: it is a law that never moved and an audit that was
 * measured against nothing.
 */

const rpc = vi.fn();
const deleted: unknown[] = [];
const inserted: Array<Record<string, unknown>> = [];

vi.mock("@/lib/supabase-server", () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({
      delete: () => ({
        eq: (_column: string, value: unknown) => {
          deleted.push(value);
          return Promise.resolve({ error: null });
        },
      }),
      insert: (rows: Array<Record<string, unknown>>) => {
        inserted.push(...rows);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

vi.mock("@/lib/embeddings", () => ({
  embedTexts: (texts: string[]) => Promise.resolve(texts.map(() => [0.1, 0.2])),
  embedText: () => Promise.resolve([0.1, 0.2]),
}));

import { getLawLastUpdated } from "@/lib/legal-articles";
import { ingestLegalText } from "@/lib/vector-store";

const CIVIL = "Иргэний хууль";
const LABOR = "Хөдөлмөрийн тухай хууль";

const LAW_TEXT = `287 дугаар зүйл. Эд хөрөнгө хөлслөх гэрээ

287.1. Хөлслүүлэгч нь эд хөрөнгийг хөлслөгчид шилжүүлэх үүрэг хүлээнэ.`;

beforeEach(() => {
  rpc.mockReset();
  deleted.length = 0;
  inserted.length = 0;
});

describe("ingestLegalText law name", () => {
  it("stores the knowledge base's own name, not the spelling it was handed", async () => {
    const result = await ingestLegalText(
      "  иргэний хууль (Mongolian Civil Code) ",
      LAW_TEXT,
    );

    expect(result.lawName).toBe(CIVIL);
    expect(inserted.length).toBeGreaterThan(0);
    expect(new Set(inserted.map((row) => row.law_name))).toEqual(
      new Set([CIVIL]),
    );
  });

  it("replaces the rows under the canonical name, not the decorated one", async () => {
    // A re-ingest that cleared «иргэний хууль …» would leave the real law's
    // chunks in place and add a second copy alongside them.
    await ingestLegalText("иргэний хууль (Mongolian Civil Code)", LAW_TEXT);
    expect(deleted).toEqual([CIVIL]);
  });

  it("refuses a law nothing can ever ask for, before touching the database", async () => {
    await expect(
      ingestLegalText("Эрүүгийн хууль", LAW_TEXT),
    ).rejects.toThrow(/Эрүүгийн хууль/);
    await expect(ingestLegalText("", LAW_TEXT)).rejects.toThrow();

    expect(deleted).toEqual([]);
    expect(inserted).toEqual([]);
  });
});

describe("getLawLastUpdated", () => {
  it("keys the versions the way an audit names its laws", async () => {
    // Retrieval filters `law_name` exactly, so this row should not exist — but
    // if it ever does, the audit that says «Иргэний хууль» has to find it.
    rpc.mockResolvedValue({
      data: [
        {
          law_name: "Иргэний хууль (Mongolian Civil Code)",
          last_updated: "2026-06-18T13:43:57Z",
        },
      ],
      error: null,
    });

    expect(await getLawLastUpdated()).toEqual(
      new Map([[CIVIL, "2026-06-18T13:43:57Z"]]),
    );
  });

  it("folds two spellings of one law to its newest ingest", async () => {
    rpc.mockResolvedValue({
      data: [
        { law_name: CIVIL, last_updated: "2026-06-18T13:43:57Z" },
        {
          law_name: "Иргэний хууль (Mongolian Civil Code)",
          last_updated: "2026-07-04T07:52:36Z",
        },
        { law_name: LABOR, last_updated: "2026-07-04T07:52:36Z" },
      ],
      error: null,
    });

    expect(await getLawLastUpdated()).toEqual(
      new Map([
        [CIVIL, "2026-07-04T07:52:36Z"],
        [LABOR, "2026-07-04T07:52:36Z"],
      ]),
    );
  });

  it("keeps a name it does not recognise rather than dropping the law", async () => {
    rpc.mockResolvedValue({
      data: [{ law_name: "Эрүүгийн хууль", last_updated: "2026-07-04T07:52:36Z" }],
      error: null,
    });

    expect(await getLawLastUpdated()).toEqual(
      new Map([["Эрүүгийн хууль", "2026-07-04T07:52:36Z"]]),
    );
  });
});
