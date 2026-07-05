/**
 * Browser-side image normalization for multi-photo contract uploads.
 *
 * Every selected image is redrawn through a canvas before being merged into
 * the upload PDF: this applies EXIF orientation (phone photos), converts PNG
 * to JPEG so the PDF builder only ever sees one format, flattens transparency
 * onto white (JPEG has no alpha), and downscales so a stack of camera photos
 * stays under the 20 MB upload limit while remaining sharp enough for OCR.
 */

/** Long edge in pixels after downscaling — plenty for Vision OCR on documents. */
const MAX_DIMENSION = 2000;

const JPEG_QUALITY = 0.85;

function loadImage(file: File, url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`"${file.name}" зургийг уншиж чадсангүй`));
    image.src = url;
  });
}

/** Re-encode an image file as an upright, white-backed, bounded-size JPEG. */
export async function imageFileToJpegBytes(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(file, url);

    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Энэ хөтөч дээр зураг боловсруулах боломжгүй байна");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob) {
      throw new Error(`"${file.name}" зургийг хөрвүүлэхэд алдаа гарлаа`);
    }
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
