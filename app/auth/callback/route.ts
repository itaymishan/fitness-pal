import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the auth `code` for a session, then routes:
 *  - password recovery → /auth/reset (set a new password)
 *  - signup confirmation / magic link → /diary
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        `${origin}${type === "recovery" ? "/auth/reset" : "/diary"}`
      );
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
