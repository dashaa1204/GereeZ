import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  buildPdfFromJpegs,
  jpegInfo,
  MAX_IMAGE_PAGES,
  sortPagesForUpload,
} from "@/lib/images-to-pdf";
import { detectContractMediaType } from "@/lib/audit/file-type";
import { getPdfPageCount } from "@/lib/pdf";
import { MAX_OCR_PDF_PAGES } from "@/lib/audit/ocr";

async function makeJpeg(
  width: number,
  height: number,
  options: { progressive?: boolean; greyscale?: boolean } = {},
): Promise<Uint8Array> {
  let image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 120, b: 60 },
    },
  });
  if (options.greyscale) image = image.toColourspace("b-w");
  const buffer = await image
    .jpeg({ progressive: options.progressive ?? false })
    .toBuffer();
  return new Uint8Array(buffer);
}

describe("jpegInfo", () => {
  it("reads baseline JPEG dimensions", async () => {
    const jpeg = await makeJpeg(320, 240);
    expect(jpegInfo(jpeg)).toMatchObject({ width: 320, height: 240, components: 3 });
  });

  it("reads progressive JPEG dimensions", async () => {
    const jpeg = await makeJpeg(150, 400, { progressive: true });
    expect(jpegInfo(jpeg)).toMatchObject({ width: 150, height: 400 });
  });

  it("reports a single component for greyscale JPEGs", async () => {
    const jpeg = await makeJpeg(64, 64, { greyscale: true });
    expect(jpegInfo(jpeg)).toMatchObject({ components: 1 });
  });

  it("returns null for non-JPEG data", () => {
    expect(jpegInfo(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull();
    // PNG magic bytes
    expect(
      jpegInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBeNull();
  });
});

describe("buildPdfFromJpegs", () => {
  // The only test in the suite that loads a PDF parser, and it pays for the
  // whole of pdf-parse on the first call: measured at ~3.1s against 4ms for a
  // second call in the same process, against a 5s default budget. Building the
  // four JPEGs costs ~70ms of that. Alone it passed; sharing a machine with the
  // rest of the suite it failed about half the time, which is a flake in the
  // budget rather than in the code under test — so the budget is stated here,
  // where the reason is, instead of loosened for every other test.
  it("produces a PDF that the production parser reads with the right page count", async () => {
    const pages = [
      await makeJpeg(320, 240),
      await makeJpeg(240, 320, { progressive: true }),
      await makeJpeg(2000, 1500),
      await makeJpeg(64, 64, { greyscale: true }),
    ];
    const pdf = buildPdfFromJpegs(pages);
    const buffer = Buffer.from(pdf);

    // Same magic-byte check the upload route runs on the received file.
    expect(detectContractMediaType(buffer)).toBe("application/pdf");
    // Same page counter the quote route uses to price the audit.
    expect(await getPdfPageCount(buffer)).toBe(pages.length);
  }, 20_000);

  it("embeds each JPEG's bytes verbatim (DCTDecode passthrough)", async () => {
    const page = await makeJpeg(100, 80);
    const pdf = buildPdfFromJpegs([page]);
    expect(Buffer.from(pdf).includes(Buffer.from(page))).toBe(true);
  });

  it("rejects empty input", () => {
    expect(() => buildPdfFromJpegs([])).toThrow();
  });

  it("rejects non-JPEG pages with a 1-based page number", async () => {
    const jpeg = await makeJpeg(32, 32);
    expect(() =>
      buildPdfFromJpegs([jpeg, new Uint8Array([1, 2, 3, 4, 5])]),
    ).toThrow(/2-р хуудас/);
  });

  it("keeps the client page cap within the OCR pipeline's PDF page cap", () => {
    expect(MAX_IMAGE_PAGES).toBeLessThanOrEqual(MAX_OCR_PDF_PAGES);
  });
});

describe("sortPagesForUpload", () => {
  const names = (files: { name: string }[]) => files.map((f) => f.name);

  it("sorts camera-roll sequences by name even when timestamps disagree", () => {
    const files = [
      { name: "IMG_0013.jpg", lastModified: 100 },
      { name: "IMG_0012.jpg", lastModified: 300 },
      { name: "IMG_0014.jpg", lastModified: 200 },
    ];
    expect(names(sortPagesForUpload(files))).toEqual([
      "IMG_0012.jpg",
      "IMG_0013.jpg",
      "IMG_0014.jpg",
    ]);
  });

  it("compares embedded numbers numerically, not lexicographically", () => {
    const files = [
      { name: "page10.jpg", lastModified: 1 },
      { name: "page2.jpg", lastModified: 2 },
    ];
    expect(names(sortPagesForUpload(files))).toEqual([
      "page2.jpg",
      "page10.jpg",
    ]);
  });

  it("falls back to modification time for non-sequential names (UUID exports)", () => {
    const files = [
      { name: "037bb94d-92fd.jpg", lastModified: 400 },
      { name: "742ecb99-cf45.jpg", lastModified: 100 },
      { name: "eef86ef6-7216.jpg", lastModified: 300 },
      { name: "c25f5a0b-b8c3.jpg", lastModified: 200 },
    ];
    expect(names(sortPagesForUpload(files))).toEqual([
      "742ecb99-cf45.jpg",
      "c25f5a0b-b8c3.jpg",
      "eef86ef6-7216.jpg",
      "037bb94d-92fd.jpg",
    ]);
  });

  it("does not mutate the input array", () => {
    const files = [
      { name: "b.jpg", lastModified: 2 },
      { name: "a.jpg", lastModified: 1 },
    ];
    sortPagesForUpload(files);
    expect(names(files)).toEqual(["b.jpg", "a.jpg"]);
  });
});
