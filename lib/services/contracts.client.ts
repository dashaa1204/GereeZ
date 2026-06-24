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

export async function auditContract(contractId: string): Promise<Contract> {
  const response = await fetch("/api/contracts/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contractId }),
  });

  const data = await parseJsonResponse(response, "Шинжилгээ амжилтгүй боллоо");
  return data.contract as Contract;
}
