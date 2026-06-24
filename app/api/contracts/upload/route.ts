import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { CONTRACTS_BUCKET, createAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Файл олдсонгүй" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Зөвхөн PDF файл хүлээн авна" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Файл 10 MB-аас бага байх ёстой" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Файл хадгалахад алдаа: ${uploadError.message}` },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(CONTRACTS_BUCKET).getPublicUrl(storagePath);

    const { data: contract, error: dbError } = await supabase
      .from("contracts")
      .insert({
        file_name: file.name,
        file_url: publicUrl,
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
