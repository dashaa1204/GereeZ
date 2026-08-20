import Link from "next/link";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import type { ContractVM } from "@/lib/view-models";
import { ContractUploadFlow } from "../ContractUploadFlow";
import { scoreColor } from "../display";
import { Card, Eyebrow, Panel, PanelGlow, SectionHeading } from "../kit";

export function HomeScreen({
  credits,
  userName,
  activeCount,
  averageCompliance,
  expiringSoon,
  recent,
}: {
  credits: number;
  userName: string | null;
  activeCount: number;
  averageCompliance: number | null;
  expiringSoon: number;
  recent?: ContractVM;
}) {
  return (
    <div className="space-y-6 lg:space-y-7">
      {/* Greeting banner — the same near-black panel the landing page leads
          with, so entering the app is continuous with the marketing page. */}
      <Panel className="px-5 py-6 lg:px-8 lg:py-8">
        <PanelGlow className="lg:-top-32 lg:-right-24 lg:size-80" />
        {/* On a wide screen the greeting alone leaves most of the panel empty,
            so the chips move out to the right edge instead of stacking under
            the copy. Below lg they stay in the original single column. */}
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/60">Сайн байна уу 👋</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight capitalize lg:text-3xl">
              {userName ?? "Тавтай морил"}
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              Таны гэрээнүүдийг хянаж байна.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/10 ring-inset">
              <CreditCard className="size-3.5 text-white/70" />
              <span className="text-xs font-semibold">{credits} кредит</span>
            </span>
            <span className="bg-brand/20 ring-brand/30 flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ring-inset">
              <ShieldCheck className="text-brand-bright size-3.5" />
              <span className="text-brand-bright text-xs font-semibold">
                Идэвхтэй
              </span>
            </span>
          </div>
        </div>
      </Panel>

      {/* From lg up the stack splits into two columns: uploading on the left
          (the primary action, so it gets the wider one), metrics and the recent
          contract on the right. Explicit row/column placement keeps the phone's
          reading order — metrics, upload, recent — unchanged. */}
      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-5 lg:space-y-0 lg:items-start">
        {/* metric cards */}
        <div className="lg:col-start-2 lg:row-start-1">
          <Eyebrow className="mb-3">Тойм</Eyebrow>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                {activeCount}
              </p>
              <p className="mt-1 text-xs leading-tight text-muted-foreground">
                Идэвхтэй гэрээ
              </p>
            </Card>
            <Card className="p-4 text-center">
              {averageCompliance === null ? (
                <p className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
                  —
                </p>
              ) : (
                <p
                  className="text-2xl font-bold tracking-tight lg:text-3xl"
                  style={{ color: scoreColor(averageCompliance) }}
                >
                  {averageCompliance}
                </p>
              )}
              <p className="mt-1 text-xs leading-tight text-muted-foreground">
                Нийцлийн оноо
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold tracking-tight text-amber-500 lg:text-3xl">
                {expiringSoon}
              </p>
              <p className="mt-1 text-xs leading-tight text-muted-foreground">
                Удахгүй дуусна
              </p>
            </Card>
          </div>
        </div>

        {/* upload — spans both rows of the right column on desktop */}
        <div className="space-y-4 lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <SectionHeading
            eyebrow="Шинэ гэрээ"
            title="Гэрээ шинжлүүлэх"
            description="PDF эсвэл зурган гэрээгээ оруулахад хуудас тус бүрийг хуультай тулгаж шалгана."
            className="hidden lg:flex"
          />
          <ContractUploadFlow />
        </div>

        {/* recent contract */}
        {recent && (
          <div className="lg:col-start-2 lg:row-start-2">
            <Eyebrow className="mb-3">Сүүлийн гэрээ</Eyebrow>
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {recent.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Дуусах: {recent.endDate}
                  </p>
                </div>
                {recent.score != null && (
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: `${scoreColor(recent.score)}1f`,
                      color: scoreColor(recent.score),
                    }}
                  >
                    {recent.score} оноо
                  </span>
                )}
              </div>
              <Link
                href={`/contracts/${recent.id}`}
                className="bg-brand/10 text-brand hover:bg-brand/15 group mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                Дэлгэрэнгүй харах
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
