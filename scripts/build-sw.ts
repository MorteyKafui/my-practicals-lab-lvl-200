/**
 * Post-build step: bundle pwa/sw.ts and inject the precache manifest of everything in out/.
 * Run by `bun run build` after `next build`.
 */
import { injectManifest } from "@serwist/build";

const OUT = "out";
const BUNDLED = "pwa/.sw.bundled.js";

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
