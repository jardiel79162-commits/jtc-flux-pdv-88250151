import { supabase } from "@/integrations/supabase/client";

/**
 * Generates an invite code for the current user if they don't have one.
 * Updates both the profiles table and invite_codes table.
 */
export async function generateInviteCode(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Generate a random 8-char code
  const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 8);

  // Update profile with the new code
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ invite_code: code })
    .eq("user_id", user.id);

  if (profileError) throw profileError;

  // Insert into invite_codes table
  const { error: codeError } = await supabase
    .from("invite_codes")
    .insert({ code, owner_user_id: user.id, is_used: false });

  // Ignore duplicate key errors
  if (codeError && codeError.code !== "23505") throw codeError;

  return code;
}
