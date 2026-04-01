"use client";

import { useEffect } from "react";

const RELOAD_KEY = "legacy-sw-cleanup-reloaded";

export function LegacyServiceWorkerCleanup(): null {
  useEffect(() => {
    async function cleanupLegacyServiceWorkers(): Promise<void> {
      if (typeof window === "undefined") {
        return;
      }

      if (!("serviceWorker" in navigator)) {
        return;
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      let unregisteredAny = false;

      for (const registration of registrations) {
        const wasUnregistered = await registration.unregister();
        unregisteredAny = unregisteredAny || wasUnregistered;
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }

      if (unregisteredAny && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
      }
    }

    void cleanupLegacyServiceWorkers();
  }, []);

  return null;
}
