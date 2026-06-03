import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Baseline HTTP security headers applied to every response. CSP is
// intentionally omitted here — it needs per-app tuning (Sentry tunnel,
// PostHog, Vercel Analytics, Next inline bootstrap) and is tracked as a
// separate card. These five are unambiguous and safe to ship as-is.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "setlist-royalty-tracker",
  project: "setlist-royalty-tracker",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
