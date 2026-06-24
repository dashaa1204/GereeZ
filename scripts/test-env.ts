import { embedText } from "../lib/embeddings";
import { createAdminClient } from "../lib/supabase-server";

async function main() {
  console.log("Testing Supabase...");
  const supabase = createAdminClient();
  const { error: dbError } = await supabase
    .from("legal_documents")
    .select("id")
    .limit(1);

  if (dbError) {
    console.error("Supabase error:", dbError.message);
    console.error("Hint: Run supabase/migrations/003_gemini_embeddings_768.sql");
    process.exit(1);
  }
  console.log("Supabase OK");

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY");
    console.error("Get one free at https://aistudio.google.com/apikey");
    process.exit(1);
  }

  console.log("Testing Gemini embedding...");
  const embedding = await embedText("түрээсийн гэрээ");
  console.log("Gemini OK, dimensions:", embedding.length);
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
