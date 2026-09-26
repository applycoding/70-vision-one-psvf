/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const week = 60 * 60 * 24 * 7;

const serwist = new Serwist({
  precacheEntries: [{ url: "/manifest.webmanifest", revision: "1" }],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "psvf-pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: week }),
        ],
      }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (request.destination === "style" ||
          request.destination === "script" ||
          request.destination === "font"),
      handler: new CacheFirst({
        cacheName: "psvf-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: week }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();
