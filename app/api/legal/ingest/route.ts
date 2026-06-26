import { NextResponse } from "next/server";
import { secureCompare } from "@/lib/admin-auth";
import { extractPdfText } from "@/lib/pdf";
import { ingestLegalText } from "@/lib/vector-store";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

function isAuthorized(request: Request): boolean {
  const secret = process.env.LEGAL_INGEST_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";

  const header = request.headers.get("x-ingest-secret");
  return secureCompare(header, secret);
}

async function extractTextFromFile(file: File): Promise<string> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return extractPdfText(buffer);
  }

  return file.text();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const lawName =
      (formData.get("lawName") as string | null) ?? "Иргэний хууль";
    const replaceExisting = formData.get("replaceExisting") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be smaller than 20 MB" },
        { status: 400 },
      );
    }

    const rawText = await extractTextFromFile(file);
    if (rawText.trim().length < 100) {
      return NextResponse.json(
        {
          error:
            "Could not extract enough text. Use a text-based PDF (not a scanned image).",
        },
        { status: 400 },
      );
    }

    const result = await ingestLegalText(lawName, rawText, { replaceExisting });

    return NextResponse.json({
      message: `Ingested ${result.chunksIngested} chunks for ${result.lawName}`,
      sourceFile: file.name,
      charactersExtracted: rawText.length,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ingest failed unexpectedly";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
