"use client";

import { useEffect } from "react";

export function RegisterSw() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The control page still runs online if the offline shell does not install.
    });
  }, []);

  return null;
}
