import { getGoogleVisionApiKey } from "@/lib/env";

const VISION_ENDPOINT = "https://vision.googleapis.com/v1";

// Mongolian Cyrillic first; Russian/English help mixed-script contracts.
const LANGUAGE_HINTS = ["mn", "ru", "en"];

interface VisionTextAnnotation {
  fullTextAnnotation?: { text?: string };
}

interface VisionError {
  error?: { message?: string };
}

/**
 * Extract contract text from a scanned PDF or image with Google Cloud Vision
 * (DOCUMENT_TEXT_DETECTION). A purpose-built OCR engine — far faster and more
 * accurate on dense Cyrillic documents than a general vision model. The text
 * then flows through the normal Claude RAG audit.
 *
 * Note: the synchronous PDF endpoint reads at most the first 5 pages. Longer
 * scanned contracts need the async (GCS-backed) endpoint — a later step.
 */
export async function extractTextWithOCR(
  data: Buffer,
  mediaType: string,
): Promise<string> {
  const apiKey = getGoogleVisionApiKey();
  if (!apiKey) {
    throw new Error(
      "GOOGLE_VISION_API_KEY олдсонгүй. GCP Console-оос Cloud Vision API key гаргаж .env.local-д нэмнэ үү.",
    );
  }

  const content = data.toString("base64");
  return mediaType === "application/pdf"
    ? ocrPdf(content, apiKey)
    : ocrImage(content, apiKey);
}

async function ocrImage(content: string, apiKey: string): Promise<string> {
  const json = await callVision("images:annotate", apiKey, {
    requests: [
      {
        image: { content },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: LANGUAGE_HINTS },
      },
    ],
  });

  const responses = json.responses as VisionTextAnnotation[] | undefined;
  return responses?.[0]?.fullTextAnnotation?.text?.trim() ?? "";
}

async function ocrPdf(content: string, apiKey: string): Promise<string> {
  const json = await callVision("files:annotate", apiKey, {
    requests: [
      {
        inputConfig: { mimeType: "application/pdf", content },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: LANGUAGE_HINTS },
      },
    ],
  });

  // files:annotate nests a per-page response array inside responses[0].
  const fileResponse = (json.responses as
    | Array<{ responses?: VisionTextAnnotation[] }>
    | undefined)?.[0];

  return (fileResponse?.responses ?? [])
    .map((page) => page.fullTextAnnotation?.text ?? "")
    .join("\n\n")
    .trim();
}

async function callVision(
  path: string,
  apiKey: string,
  body: unknown,
): Promise<{ responses?: unknown[] }> {
  const res = await fetch(`${VISION_ENDPOINT}/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { responses?: unknown[] } & VisionError;

  if (!res.ok) {
    throw new Error(
      `Google Vision алдаа (${res.status}): ${json.error?.message ?? "тодорхойгүй"}`,
    );
  }
  // A per-request error can be nested even on a 200 response.
  const firstError = (json.responses as VisionError[] | undefined)?.[0]?.error;
  if (firstError) {
    throw new Error(`Google Vision алдаа: ${firstError.message}`);
  }

  return json;
}
