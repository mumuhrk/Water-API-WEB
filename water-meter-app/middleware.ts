import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/auth/login", "/auth/register"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // API routes that need auth
  const protectedApiRoutes = [
    "/api/buildings",
    "/api/rooms",
    "/api/read-meter",
    "/api/submit-task",
    "/api/save-reading",
  ]
  const isProtectedApiRoute = protectedApiRoutes.some((route) => pathname.startsWith(route))

  // Protected pages
  const protectedPages = ["/dashboard", "/history", "/manage", "/profile"]
  const isProtectedPage = protectedPages.some((route) => pathname.startsWith(route))

  // If no session and trying to access protected routes
  if (!session && (isProtectedPage || isProtectedApiRoute)) {
    const redirectUrl = new URL("/auth/login", req.url)
    const response = NextResponse.redirect(redirectUrl)

    // Add cache control headers to prevent back button access
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  }

  // If has session and trying to access auth pages, redirect to dashboard
  if (session && isPublicRoute) {
    const redirectUrl = new URL("/dashboard", req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "origin-when-cross-origin")

  // Add no-cache headers for protected pages
  if (isProtectedPage) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
