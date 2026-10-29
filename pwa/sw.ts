/// <reference lib="webworker" />
import { CacheFirst, Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] };

// Every file of the static export is precached at install, so the whole lab works offline
// after the first visit. Clean URLs (/experiments/stretched-wire → .html) and Next's ?_rsc
// navigation payloads resolve against the precache.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanURLs: true,
    ignoreURLParametersMatching: [/^_rsc$/, /^utm_/],
  },
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) => sameOrigin && request.destination !== "document",
      handler: new CacheFirst({ cacheName: "lab-assets" }),
    },
  ],
});

serwist.addEventListeners();
