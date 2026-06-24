import { FileText } from "lucide-react";
import type { Contract } from "@/lib/types/contract";

interface ActiveContractsProps {
  contracts: Contract[];
}

const STATUS_LABELS: Record<Contract["status"], string> = {
  completed: "Шалгасан",
  pending: "Хүлээгдэж буй",
  processing: "Шинжилж байна",
  failed: "Алдаатай",
};

const STATUS_STYLES: Record<Contract["status"], string> = {
  completed: "bg-success/10 text-success",
  pending: "bg-muted text-muted-foreground",
  processing: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scoreBarWidth(score: number | null): string {
  if (score == null) return "0%";
  return `${score}%`;
}

function scoreBarColor(score: number | null): string {
  if (score == null) return "bg-muted";
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

export function ActiveContracts({ contracts }: ActiveContractsProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Миний гэрээнүүд{" "}
          <span className="font-normal text-muted-foreground">
            ({contracts.length})
          </span>
        </h2>
      </div>

      {contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Гэрээ байхгүй байна
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF гэрээгээ оруулж эхлээрэй.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className="rounded-xl border border-border bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{contract.file_name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(contract.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[contract.status]}`}
                >
                  {STATUS_LABELS[contract.status]}
                </span>
              </div>

              {contract.status === "completed" && contract.compliance_score != null && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Нийцлийн оноо</span>
                    <span className="font-medium">{contract.compliance_score}/100</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${scoreBarColor(contract.compliance_score)}`}
                      style={{ width: scoreBarWidth(contract.compliance_score) }}
                    />
                  </div>
                </div>
              )}

              {contract.audit_summary?.summary && (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {contract.audit_summary.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
