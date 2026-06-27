import type { Contract } from "@/lib/types";

async function parseJsonResponse(response: Response, fallbackError: string) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? fallbackError);
  }
  return data;
}

export async function uploadContract(file: File): Promise<Contract> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/contracts/upload", {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonResponse(response, "Оруулахад алдаа гарлаа");
  return data.contract as Contract;
}

export interface AuditQuote {
  pageCount: number;
  /** Cost in credits to audit this contract. */
  cost: number;
  /** The user's current credit balance. */
  balance: number;
  /** Whether the balance covers the cost. */
  sufficient: boolean;
}

/** Price a contract (page count + credit cost + balance) before auditing. */
export async function quoteContract(contractId: string): Promise<AuditQuote> {
  const response = await fetch("/api/contracts/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractId }),
  });

  return parseJsonResponse(response, "Үнэ тооцоход алдаа гарлаа") as Promise<AuditQuote>;
}

export async function auditContract(contractId: string): Promise<Contract> {
  const response = await fetch("/api/contracts/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractId }),
  });

  const data = await parseJsonResponse(response, "Шинжилгээ амжилтгүй боллоо");
  return data.contract as Contract;
}
