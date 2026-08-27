import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import {
  ACCEPTED_MEDIA_TYPES,
  detectContractMediaType,
} from "@/lib/audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { contractStoragePath } from "@/lib/storage-path";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Нэвтэрнэ үү" },
        { status: 401 },
      );
    }

    const rateLimit = await checkRateLimit("upload", user.id);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
    }

    if (!(ACCEPTED_MEDIA_TYPES as string[]).includes(file.type)) {
      return NextResponse.json(
        { error: "Зөвхөн PDF эсвэл зураг (PNG, JPG) хүлээн авна" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл 20 MB-аас бага байх ёстой" },
        { status: 400 },
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // The `file.type` header is client-controlled and spoofable. Verify the
    // real content by its magic bytes (PDF / PNG / JPEG).
    const mediaType = detectContractMediaType(fileBuffer);
    if (!mediaType) {
      return NextResponse.json(
        { error: "Файл бодит PDF эсвэл зураг биш байна" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const storagePath = contractStoragePath(user.id, file.name);

    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mediaType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Файл хадгалахад алдаа: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Bucket is private — no permanent public URL. `storage_path` is the
    // canonical reference; signed URLs are minted on demand when needed.
    const { data: contract, error: dbError } = await supabase
      .from("contracts")
      .insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: storagePath,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from(CONTRACTS_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: `Өгөгдлийн санд бичихэд алдаа: ${dbError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ contract });
  } catch (error) {
    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}
