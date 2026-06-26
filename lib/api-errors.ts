import { getAuditProvider } from "@/lib/ai";

export function formatUserError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("missing audit api key") ||
    lower.includes("anthropic_api_key олдсонгүй") ||
    lower.includes("anthropic_api_key буруу")
  ) {
    return message;
  }

  if (
    lower.includes("invalid x-api-key") ||
    lower.includes("authentication_error")
  ) {
    return "Anthropic API key буруу эсвэл хүчингүй. console.anthropic.com/settings/keys-аас шинэ key авч .env.local дээр ANTHROPIC_API_KEY гэж зөв нэрээр оруулна уу.";
  }

  if (lower.includes("too large") || lower.includes("tokens per minute") || lower.includes("tpm")) {
    return "API-д хэт том хүсэлт илгээгдлээ. Богино PDF ашиглаад дахин оролдоно уу.";
  }

  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
    return "API хязгаарт хүрлээ. 1–2 минут хүлээгээд дахин оролдоно уу.";
  }

  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("invalid")) {
    const provider = getAuditProvider();
    if (provider === "anthropic") {
      return "Anthropic API key буруу байна. .env.local дотор ANTHROPIC_API_KEY=sk-ant-... зөв эсэхийг шалгана уу.";
    }
    return "API key буруу байна. .env.local тохиргоогоо шалгана уу.";
  }

  if (lower.includes("could not extract enough text")) {
    return "PDF-ээс хангалттай текст гаргаж чадсангүй. Сканнердсан зураг биш, тексттэй PDF ашиглана уу.";
  }

  if (message.length > 200) {
    return `${message.slice(0, 200)}…`;
  }

  return message;
}
