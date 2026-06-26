"use client";

import { AnimatePresence, motion } from "motion/react";
import { AuditAlertList } from "@/components/contracts/AuditAlertList";
import type { AuditAlert } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

const EXPAND_TRANSITION = {
  height: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  opacity: { duration: 0.3, ease: "easeOut" as const },
};

interface ExpandableAuditListProps {
  alerts: AuditAlert[];
  expanded: boolean;
  onToggleExpanded: () => void;
  maxVisible?: number;
  className?: string;
  variant?: "cards" | "list";
  toggleClassName?: string;
}

export function ExpandableAuditList({
  alerts,
  expanded,
  onToggleExpanded,
  maxVisible = 3,
  className,
  variant = "list",
  toggleClassName,
}: ExpandableAuditListProps) {
  if (alerts.length === 0) return null;

  const initialAlerts = alerts.slice(0, maxVisible);
  const extraAlerts = alerts.slice(maxVisible);
  const hasMore = extraAlerts.length > 0;

  return (
    <>
      <AuditAlertList alerts={initialAlerts} className={className} variant={variant} />

      <AnimatePresence initial={false}>
        {expanded && hasMore && (
          <motion.div
            key="extra-alerts"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={EXPAND_TRANSITION}
            className="overflow-hidden"
          >
            <AuditAlertList
              alerts={extraAlerts}
              className={cn(className, "border-t border-border")}
              variant={variant}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {hasMore && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className={cn(
            "w-full border-t border-border py-2.5 text-center text-xs font-medium text-navy transition-colors hover:bg-muted/30 active:bg-muted/50",
            toggleClassName,
          )}
        >
          {expanded ? "Хураах" : `Нийт ${alerts.length} анхааруулга`}
        </button>
      )}
    </>
  );
}
