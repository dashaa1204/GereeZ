/**
 * Merge JPEG images into a single multi-page PDF, one image per page.
 *
 * Runs client-side so multi-photo contracts reach the server as one ordinary
 * scanned PDF and flow through the existing pipeline unchanged (page-count
 * quote → per-page credits → Vision OCR). JPEG needs no decoding to live in a
 * PDF — the bytes are embedded as-is behind a DCTDecode filter — so this stays
 * dependency-free and adds ~2 KB to the bundle instead of a PDF library.
 */

/**
 * Ceiling on images merged into one upload. Must not exceed MAX_OCR_PDF_PAGES
 * (lib/audit/ocr.ts) or the audit would reject the resulting scanned PDF.
 */
export const MAX_IMAGE_PAGES = 50;

export interface PageOrderable {
  name: string;
  lastModified: number;
}

/**
 * Best-effort page ordering for a multi-photo selection — the OS file picker
 * does not deliver files in the order the user clicked them. Camera-roll names
 * that differ only by digits (IMG_0012.jpg, IMG_0013.jpg…) sort by that number;
 * anything else (UUID exports, mixed names) sorts by capture/download time,
 * which for photos taken page-by-page is the page order.
 */
export function sortPagesForUpload<T extends PageOrderable>(files: T[]): T[] {
  const nameSkeletons = new Set(files.map((f) => f.name.replace(/\d+/g, "#")));
  const sequentialNames =
    nameSkeletons.size === 1 && /\d/.test(files[0]?.name ?? "");
  return [...files].sort(
    sequentialNames
      ? (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })
      : (a, b) => a.lastModified - b.lastModified,
  );
}

/** Long edge of a PDF page in points (11in), so viewers show a sane zoom. */
const MAX_PAGE_POINTS = 792;

const encoder = new TextEncoder();

export interface JpegInfo {
  width: number;
  height: number;
  /** Color components from the SOF header: 1 = grayscale, 3 = YCbCr/RGB, 4 = CMYK. */
  components: number;
}

/**
 * Read dimensions and component count from a JPEG's SOF marker without
 * decoding pixels. Returns null for anything that isn't a parseable JPEG.
 */
export function jpegInfo(data: Uint8Array): JpegInfo | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null;

  let i = 2;
  while (i + 9 < data.length) {
    if (data[i] !== 0xff) return null;
    const marker = data[i + 1];
    // Fill bytes before a marker are legal — skip them.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Standalone markers (TEM, RSTn) carry no length segment.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    // EOI / SOS before any SOF means we won't find dimensions.
    if (marker === 0xd9 || marker === 0xda) return null;

    const length = (data[i + 2] << 8) | data[i + 3];
    if (length < 2) return null;

    // SOF0–SOF15 minus the non-frame markers DHT (C4), JPG (C8), DAC (CC).
    const isSOF =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSOF) {
      const height = (data[i + 5] << 8) | data[i + 6];
      const width = (data[i + 7] << 8) | data[i + 8];
      const components = data[i + 9];
      if (width === 0 || height === 0) return null;
      return { width, height, components };
    }

    i += 2 + length;
  }
  return null;
}

function colorSpaceFor(components: number): string | null {
  if (components === 1) return "/DeviceGray";
  if (components === 3) return "/DeviceRGB";
  // CMYK JPEGs (Adobe) also need an inverted Decode array — reject rather
  // than embed wrong colors. Canvas re-encoding upstream never produces them.
  return null;
}

/** Build a multi-page PDF from JPEG page images (one page per image). */
export function buildPdfFromJpegs(jpegs: Uint8Array[]): Uint8Array<ArrayBuffer> {
  if (jpegs.length === 0) {
    throw new Error("Хуудас алга — дор хаяж нэг зураг шаардлагатай");
  }

  const images = jpegs.map((data, index) => {
    const info = jpegInfo(data);
    if (!info) {
      throw new Error(`${index + 1}-р хуудас JPEG зураг биш байна`);
    }
    const colorSpace = colorSpaceFor(info.components);
    if (!colorSpace) {
      throw new Error(`${index + 1}-р хуудасны өнгөний формат дэмжигдэхгүй байна`);
    }
    return { data, ...info, colorSpace };
  });

  const chunks: Uint8Array[] = [];
  let offset = 0;
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    offset += bytes.length;
  };

  // Byte offset of each object, indexed by object number - 1, for the xref.
  const objectOffsets: number[] = [];
  const beginObject = (num: number) => {
    objectOffsets[num - 1] = offset;
    push(`${num} 0 obj\n`);
  };

  push("%PDF-1.4\n");
  // Conventional high-bit comment so tools treat the file as binary.
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  // Objects: 1 = catalog, 2 = page tree, then [page, image, content] per page.
  const pageObjectNumbers = images.map((_, i) => 3 + i * 3);

  beginObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  beginObject(2);
  push(
    `<< /Type /Pages /Kids [${pageObjectNumbers
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${images.length} >>\nendobj\n`,
  );

  images.forEach((image, i) => {
    const pageNum = pageObjectNumbers[i];
    const imageNum = pageNum + 1;
    const contentNum = pageNum + 2;

    const scale = Math.min(1, MAX_PAGE_POINTS / Math.max(image.width, image.height));
    const pageWidth = (image.width * scale).toFixed(2);
    const pageHeight = (image.height * scale).toFixed(2);

    beginObject(pageNum);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
    );

    beginObject(imageNum);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
        `/ColorSpace ${image.colorSpace} /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${image.data.length} >>\nstream\n`,
    );
    push(image.data);
    push("\nendstream\nendobj\n");

    // Scale the unit-square image XObject to fill the page.
    const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
    beginObject(contentNum);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
  });

  const objectCount = 2 + images.length * 3;
  const xrefOffset = offset;
  push(`xref\n0 ${objectCount + 1}\n`);
  // Each xref entry is exactly 20 bytes: 10-digit offset, 5-digit gen, type.
  push("0000000000 65535 f \n");
  for (let num = 1; num <= objectCount; num++) {
    push(`${String(objectOffsets[num - 1]).padStart(10, "0")} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const out = new Uint8Array(offset);
  let position = 0;
  for (const chunk of chunks) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
