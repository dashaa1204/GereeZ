import type { Contract } from "@/lib/types";

/**
 * An API error that still knows its status, so a caller can tell a refusal the
 * same request will always earn (400 — too long, too many pages) from one worth
 * trying again (a timeout, a 500, a rate limit).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when repeating the identical request cannot produce a different answer. */
  get permanent(): boolean {
    return this.status === 400;
  }
}

async function parseJsonResponse(response: Response, fallbackError: string) {
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error ?? fallbackError, response.status);
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

/** Permanently delete a contract (file + audit). Spent credits stay spent. */
export async function deleteContract(contractId: string): Promise<void> {
  const response = await fetch(`/api/contracts/${encodeURIComponent(contractId)}`, {
    method: "DELETE",
  });
  await parseJsonResponse(response, "Гэрээ устгахад алдаа гарлаа");
}
