import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

export async function UploadDisclaimer() {
  const disclaimer = await getSiteContent("disclaimer");
  const preview = disclaimer.content.split("\n\n")[0]?.slice(0, 160);

  return (
    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
      {preview}
      {disclaimer.content.length > 160 ? "…" : ""}{" "}
      <Link
        href="/legal/disclaimer"
        className="font-medium text-navy underline-offset-2 hover:underline"
      >
        Бүрэн анхааруулга
      </Link>
      {" · "}
      <Link
        href="/legal/privacy_policy"
        className="font-medium text-navy underline-offset-2 hover:underline"
      >
        Нууцлал
      </Link>
      {" · "}
      <Link
        href="/legal/terms_of_service"
        className="font-medium text-navy underline-offset-2 hover:underline"
      >
        Үйлчилгээний нөхцөл
      </Link>
    </p>
  );
}
