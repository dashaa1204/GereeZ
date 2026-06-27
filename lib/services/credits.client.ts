async function parseJsonResponse(response: Response, fallbackError: string) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? fallbackError);
  }
  return data;
}

/** Fetch the current user's credit balance. */
export async function fetchBalance(): Promise<number> {
  const response = await fetch("/api/credits");
  const data = await parseJsonResponse(response, "Балансыг уншихад алдаа гарлаа");
  return data.balance as number;
}

/** Demo top-up: add free credits and return the new balance. */
export async function rechargeCredits(): Promise<number> {
  const response = await fetch("/api/credits/recharge", { method: "POST" });
  const data = await parseJsonResponse(response, "Цэнэглэхэд алдаа гарлаа");
  return data.balance as number;
}
