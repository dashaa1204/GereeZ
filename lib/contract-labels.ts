import type { ContractMetadata, ContractType } from "@/lib/types/contract";

/** Resolved UI wording for a contract's parties, payment, and kind. */
export interface ContractLabels {
  /**
   * What kind of contract this is, for the type tag. Null when the audit
   * hasn't run and the kind is unknown — hide the tag rather than guess.
   */
  typeLabel: string | null;
  tenantLabel: string;
  landlordLabel: string;
  rentLabel: string;
}

const TYPE_LABELS: Record<ContractType, string> = {
  rental: "Түрээсийн гэрээ",
  employment: "Хөдөлмөрийн гэрээ",
};

// Rental wording doubles as the unknown-type default: pre-detection audits
// all ran as rentals, and the UI showed exactly these labels before.
const FALLBACK_LABELS: Record<ContractType, Omit<ContractLabels, "typeLabel">> =
  {
    rental: {
      tenantLabel: "Түрээслэгч",
      landlordLabel: "Эзэмшигч",
      rentLabel: "Сарын түрээс",
    },
    employment: {
      tenantLabel: "Ажилтан",
      landlordLabel: "Ажил олгогч",
      rentLabel: "Сарын цалин",
    },
  };

/**
 * UI labels for a contract. Prefers the wording the audit extracted from the
 * contract itself — correct for any civil-code contract (sale, cooperation,
 * …), not just the two detected types — and falls back to detected-type
 * wording for audits stored before label extraction shipped.
 */
export function resolveContractLabels(
  metadata: ContractMetadata | null | undefined,
  contractType: ContractType | undefined,
): ContractLabels {
  const fallback = FALLBACK_LABELS[contractType ?? "rental"];
  return {
    typeLabel:
      metadata?.contractTitle ??
      (contractType ? TYPE_LABELS[contractType] : null),
    tenantLabel: metadata?.tenantLabel ?? fallback.tenantLabel,
    landlordLabel: metadata?.landlordLabel ?? fallback.landlordLabel,
    rentLabel: metadata?.paymentLabel ?? fallback.rentLabel,
  };
}
