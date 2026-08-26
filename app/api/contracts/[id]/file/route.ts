import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import {
  createAdminClient,
  createSignedContractUrl,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Send the user to their own contract file.
 *
 * The bucket is private and nothing else hands the file back, so an uploaded
 * contract used to be write-only: the audit could quote a clause and the reader
 * had no way to go and look at it. This mints a short-lived signed URL and
 * redirects to it, which means the UI can link to the document with a plain
 * anchor — no fetch, no token in the page, nothing to leak if the link is
 * copied after it expires.
 *
 * `?download=1` asks the browser to save the file under the name it was
 * uploaded with instead of opening it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("id, user_id, file_name, storage_path")
      .eq("id", id)
      .maybeSingle();

    // 404 (not 403) when it belongs to someone else — don't leak existence.
    if (error || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: "Гэрээ олдсонгүй" }, { status: 404 });
    }
    if (!contract.storage_path) {
      return NextResponse.json(
        { error: "Энэ гэрээний файл хадгалагдаагүй байна" },
        { status: 404 },
      );
    }

    const download =
      new URL(request.url).searchParams.get("download") === "1";
    const signedUrl = await createSignedContractUrl(
      contract.storage_path,
      undefined,
      download ? { download: contract.file_name || true } : {},
    );

    const redirect = NextResponse.redirect(signedUrl);
    // The signed URL expires; a cached redirect would outlive it and send a
    // later click to a dead link.
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
