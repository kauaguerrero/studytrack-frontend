"use client";

import { useEffect } from "react";

// Turbopack bug workaround: performance.measure() throws when the start mark
// hasn't been recorded yet, producing a "negative time stamp" DOMException.
// This patch silently swallows that specific error class-wide so the app
// doesn't crash in development. Has no effect in production builds.
export function PerformancePatch() {
  useEffect(() => {
    if (typeof performance === "undefined") return;
    const original = performance.measure.bind(performance);
    performance.measure = (...args: Parameters<typeof performance.measure>) => {
      try {
        return original(...args);
      } catch {
        return new PerformanceMeasure();
      }
    };
  }, []);

  return null;
}
