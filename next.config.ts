import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent browsers from MIME-sniffing content types
          { key: "X-Content-Type-Options",  value: "nosniff" },
          // Disallow embedding in iframes (clickjacking protection)
          { key: "X-Frame-Options",         value: "DENY" },
          // Legacy XSS filter — belt-and-suspenders for older browsers
          { key: "X-XSS-Protection",        value: "1; mode=block" },
          // Don't leak full URL to third parties
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          // Force HTTPS for 2 years, include subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Restrict browser features we don't use
          { key: "Permissions-Policy",      value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
