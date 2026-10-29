/**
 * Post-build step: bundle pwa/sw.ts and inject the precache manifest of everything in out/.
 * Run by `bun run build` after `next build`.
 */
import { copyFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { injectManifest } from "@serwist/build";

const OUT = "out";
const BUNDLED = "pwa/.sw.bundled.js";

/**
 * Next 16's static export writes per-segment RSC payloads as nested folders
 * (experiments/__next.experiments/__PAGE__.txt) while the client router prefetches flat names
 * (experiments/__next.experiments.__PAGE__.txt), so those requests 404. Write the flat copies.
 */
function flattenSegmentPayloads(dir: string): number {
  let copied = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (!statSync(path).isDirectory()) continue;
    if (name.startsWith("__next.")) {
      const walk = (d: string) => {
        for (const child of readdirSync(d)) {
          const p = join(d, child);
          if (statSync(p).isDirectory()) walk(p);
          else if (child.endsWith(".txt")) {
            const flat = relative(dir, p).split(sep).join(".");
            copyFileSync(p, join(dir, flat));
            copied++;
          }
        }
      };
      walk(path);
    } else {
      copied += flattenSegmentPayloads(path);
    }
  }
  return copied;
}

console.log(`segment payloads: wrote ${flattenSegmentPayloads(OUT)} flat copies`);

const bundle = await Bun.build({ entrypoints: ["pwa/sw.ts"], target: "browser", minify: true });
if (!bundle.success) {
  console.error(bundle.logs);
  process.exit(1);
}
await Bun.write(BUNDLED, bundle.outputs[0]);

const { count, size, warnings } = await injectManifest({
  swSrc: BUNDLED,
  swDest: `${OUT}/sw.js`,
  globDirectory: OUT,
  globPatterns: ["**/*.{html,txt,js,css,woff2,png,svg,ico,json,webmanifest,jpg,pdf}"],
  globIgnores: ["sw.js"],
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
});
for (const w of warnings) console.warn(w);
console.log(`service worker: precached ${count} files (${(size / 1024 / 1024).toFixed(2)} MB)`);
