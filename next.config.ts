import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Origin the browser talks to directly: `createBrowserClient` (lib/supabase.ts)
 * calls Supabase auth/REST from the client, so `connect-src` has to name it.
 * Read from the same public env the client uses; the wildcard is only a
 * fallback for a build with the var unset (which would fail at runtime anyway).
 */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return "https://*.supabase.co wss://*.supabase.co";
  try {
    const { origin, host } = new URL(url);
    return `${origin} wss://${host}`;
  } catch {
    return "https://*.supabase.co wss://*.supabase.co";
  }
})();

/**
 * Content Security Policy, nonce-free variant (see the Next.js CSP guide).
 *
 * `script-src` keeps `'unsafe-inline'` because the App Router streams its RSC
 * payload through inline `<script>` tags whose content isn't known ahead of
 * time — the only ways around that are a per-request nonce or experimental SRI,
 * and a nonce would force every page (including the prerendered /legal/[slug]
 * pages) into dynamic rendering. So this policy does not stop injected inline
 * script; what it does stop is loading script from another origin, `<base>`
 * hijacking, posting a form off-site, and being framed for clickjacking.
 *
 * Dev needs `'unsafe-eval'` (React's error-stack reconstruction) and a
 * websocket for HMR; neither is granted in production.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind and motion both write inline style attributes.
  "style-src 'self' 'unsafe-inline'",
  // blob: covers the canvas re-encoding in lib/images.client.ts.
  "img-src 'self' blob: data:",
  // next/font self-hosts the Geist files under /_next/static.
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin}${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  // The app embeds nothing and must not be embedded.
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy companion to frame-ancestors, for browsers that predate CSP3.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in the app uses these; uploads go through a file input, which
  // opens the OS picker (and the phone camera) without the camera permission.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Ignored over http, so it is inert in local dev. `preload` is deliberately
  // omitted — submitting to the preload list is hard to undo.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Don't advertise the framework and version to scanners.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
