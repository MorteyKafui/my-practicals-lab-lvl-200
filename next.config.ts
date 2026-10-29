import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Fully static, offline-first build: `bun run build` writes the whole app to `out/`.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Vercel sets VERCEL=1 at build time; analytics are only included in Vercel deployments.
  env: { NEXT_PUBLIC_ON_VERCEL: process.env.VERCEL ? "1" : "" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
