import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const sensitiveLimits: Record<string, string> = {
  "/api/tracking": "RATE_LIMIT_TRACKING_PER_MINUTE",
  "/api/quotes": "RATE_LIMIT_QUOTES_PER_MINUTE",
  "/api/chat": "RATE_LIMIT_CHAT_PER_MINUTE",
  "/api/admin/carriers/rates": "RATE_LIMIT_ADMIN_PER_MINUTE",
};

const RATE_LIMIT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "return count",
].join("\n");

async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const envName = sensitiveLimits[path] ?? (path.startsWith("/api/admin/shipments/") ? "RATE_LIMIT_ADMIN_PER_MINUTE" : undefined);
  if (!envName) return null;
  const redisUrl = process.env.RATE_LIMIT_REDIS_REST_URL;
  const redisToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 })
      : null;
  }
  const ip = request.headers.get("x-real-ip");
  if (!ip && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  const minute = Math.floor(Date.now() / 60_000);
  const key = `neltrix:ratelimit:${request.nextUrl.pathname}:${minute}:${ip ?? "local-dev"}`;
  const parsedLimit = Number.parseInt(process.env[envName] ?? "30", 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(10_000, Math.max(1, parsedLimit)) : 30;
  try {
    const endpoint = new URL(redisUrl);
    if (endpoint.protocol !== "https:") throw new Error("Rate-limit endpoint must use HTTPS");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", key, "60"]),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error("Rate-limit store unavailable");
    const result = (await response.json()) as { result?: unknown; error?: string };
    const count = Number(result.result);
    if (result.error || !Number.isSafeInteger(count) || count < 1) throw new Error("Invalid rate-limit response");
    if (count > limit) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(60 - (Math.floor(Date.now() / 1000) % 60)) } },
      );
    }
    return null;
  } catch {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 })
      : null;
  }
}

function setSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; "));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  response.headers.set("Cache-Control", response.headers.get("Cache-Control") ?? "no-store");
}

export async function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }
  const limited = await applyRateLimit(request);
  if (limited) return limited;

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const isAdminRoute = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (isAdminRoute) {
      const role = typeof user?.app_metadata?.role === "string" ? user.app_metadata.role : "";
      if (!user) {
        const signInUrl = new URL("/login", request.url);
        signInUrl.searchParams.set("next", request.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
      if (!["ADMIN", "OPERATIONS_STAFF"].includes(role)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  } else if (isAdminRoute) {
    return NextResponse.redirect(new URL("/login?reason=auth-not-configured", request.url));
  }
  setSecurityHeaders(response, nonce);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
