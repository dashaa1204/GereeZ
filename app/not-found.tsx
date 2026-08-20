import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";

export const metadata: Metadata = {
  title: "Хуудас олдсонгүй",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 text-center">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-9 text-foreground" />
        <span className="text-2xl font-semibold text-foreground">GereeZ</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
          <FileQuestion className="size-6 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Хуудас олдсонгүй</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Таны хайсан хуудас байхгүй эсвэл өөр хаяг руу зөөгдсөн байна.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  );
}
