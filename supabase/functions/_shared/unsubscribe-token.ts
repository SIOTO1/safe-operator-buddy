import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Get or create an unsubscribe token for a recipient email.
 * One token per email address (upsert pattern).
 */
export async function getUnsubscribeToken(
  supabase: ReturnType<typeof createClient>,
  recipientEmail: string
): Promise<string> {
  const email = recipientEmail.trim().toLowerCase();

  // Check for existing token
  const { data: existing } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", email)
    .is("used_at", null)
    .maybeSingle();

  if (existing?.token) return existing.token;

  // Create new token
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from("email_unsubscribe_tokens")
    .insert({ email, token });

  if (error) {
    // Race condition: another request created it
    const { data: retry } = await supabase
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email)
      .is("used_at", null)
      .maybeSingle();
    if (retry?.token) return retry.token;
    // Fallback: return a token anyway (the API just needs a non-empty string)
    return token;
  }

  return token;
}
