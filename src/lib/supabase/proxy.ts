import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth"]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/** Refreshes the auth session cookie and performs optimistic route protection. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()
  const isSignedIn = Boolean(data?.claims?.sub)
  const { pathname, searchParams } = request.nextUrl

  const redirectTo = (path: string, next?: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    if (next) url.searchParams.set("next", next)
    const redirect = NextResponse.redirect(url)
    // Carry refreshed auth cookies over to the redirect response.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
    return redirect
  }

  if (!isSignedIn && !isPublic(pathname)) {
    const next = pathname === "/" ? undefined : pathname + request.nextUrl.search
    return redirectTo("/login", next)
  }

  // Signed-in users never need the login pages (unless showing an error).
  if (isSignedIn && (pathname === "/login" || pathname === "/forgot-password") && !searchParams.has("error")) {
    return redirectTo("/dashboard")
  }

  return response
}
