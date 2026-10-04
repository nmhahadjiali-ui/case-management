import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

/** Signs the user out (used when an account is deactivated mid-session). */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const reason = request.nextUrl.searchParams.get("reason")
  const url = new URL("/login", request.nextUrl.origin)
  if (reason === "inactive") url.searchParams.set("error", "inactive")
  return NextResponse.redirect(url)
}
