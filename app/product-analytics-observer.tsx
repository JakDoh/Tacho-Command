"use client";

import { useEffect } from "react";
import {
  productAnalyticsSurfaceForPath,
  trackProductAnalytics,
} from "../lib/product-analytics-client.js";

const APP_OPEN_SEEN_KEY = "tachocommand.analytics.app-open-seen.v1";

export default function ProductAnalyticsObserver() {
  useEffect(() => {
    const surface = productAnalyticsSurfaceForPath(window.location.pathname);

    if (surface === "landing") {
      void trackProductAnalytics("landing_view", { surface });
      return;
    }
    if (surface !== "app") return;

    try {
      if (window.sessionStorage.getItem(APP_OPEN_SEEN_KEY) === "1") return;
      window.sessionStorage.setItem(APP_OPEN_SEEN_KEY, "1");
    } catch {
      // No identity fallback. A duplicate app-open is safer than persistent tracking.
    }
    void trackProductAnalytics("app_open", { surface });
  }, []);

  return null;
}
