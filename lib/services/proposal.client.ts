/** A generated letter, with what is left of the audit's letter allowance. */
export interface ProposalResult {
  proposal: string;
  /** Generations still covered by this contract's audit. */
  runsLeft: number;
}

/**
 * Failure from the proposal endpoint. Carries `runsLeft` when the server said
 * how many generations remain — the refusal to spend a run the audit no longer
 * has is itself the news that there are none left.
 */
export class ProposalError extends Error {
  readonly runsLeft?: number;
  constructor(message: string, runsLeft?: number) {
    super(message);
    this.name = "ProposalError";
    this.runsLeft = runsLeft;
  }
}

/**
 * Ask the server to generate a correction letter from a contract's audit.
 * Throws a `ProposalError` with a user-facing message on failure.
 */
export async function generateProposal(
  contractId: string,
): Promise<ProposalResult> {
  const response = await fetch(`/api/contracts/${contractId}/proposal`, {
    method: "POST",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ProposalError(
      data?.error ?? "Захидал үүсгэж чадсангүй",
      typeof data?.runsLeft === "number" ? data.runsLeft : undefined,
    );
  }
  return {
    proposal: data.proposal as string,
    runsLeft: data.runsLeft as number,
  };
}
