import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Physics Bench — virtual physics practicals",
    short_name: "Physics Bench",
    description:
      "Perform physics practicals on a 3D bench, record your own readings, plot your graph and write your lab report. Works offline.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eef1ea",
    theme_color: "#eef1ea",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
