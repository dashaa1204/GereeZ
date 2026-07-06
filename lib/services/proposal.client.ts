/**
 * Ask the server to generate a correction letter from a contract's audit.
 * Returns the letter text; throws with a user-facing message on failure.
 */
export async function generateProposal(contractId: string): Promise<string> {
  const response = await fetch(`/api/contracts/${contractId}/proposal`, {
    method: "POST",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Захидал үүсгэж чадсангүй");
  }
  const data = await response.json();
  return data.proposal as string;
}
