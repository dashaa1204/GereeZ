import { AlarmClock, CalendarClock } from "lucide-react";
import type { Contract } from "@/lib/types/contract";
import { expiryLabel, getTrackStatus, sortByExpiry } from "@/lib/tracking";
import { cn } from "@/lib/utils";

interface ExpiryRemindersProps {
  contracts: Contract[];
}

/**
 * Expiry side of the alerts page: completed contracts whose end date is past
 * or within the "expiring soon" window, soonest first. Renders nothing when
 * there's nothing to remind about (the compliance list below still shows).
 */
export function ExpiryReminders({ contracts }: ExpiryRemindersProps) {
  const relevant = sortByExpiry(
    contracts.filter((c) => {
      if (c.status !== "completed") return false;
      const status = getTrackStatus(c);
      return status === "expiring-soon" || status === "expired";
    }),
  );

  if (relevant.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <CalendarClock className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Хугацааны сануулга</h2>
      </div>
      <div className="divide-y divide-border">
        {relevant.map((contract) => {
          const expired = getTrackStatus(contract) === "expired";
          return (
            <div
              key={contract.id}
              className={cn(
                "border-l-4 px-4 py-3",
                expired ? "border-l-destructive" : "border-l-warning",
              )}
            >
              <div className="flex gap-2">
                <AlarmClock
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    expired ? "text-destructive" : "text-warning",
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {contract.file_name}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs font-medium",
                      expired ? "text-destructive" : "text-warning",
                    )}
                  >
                    {expiryLabel(contract)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
