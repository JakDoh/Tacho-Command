import { runAppV2CardRead } from "./app-v2-card-read-controller.js";
import { readBrowserAppV2GoldenCardPayload } from "./app-v2-golden-card-browser-transport.js";

export function runBrowserAppV2GoldenCardRead({
  session,
  storage,
  capturedAtIso = new Date().toISOString(),
  transportOptions,
  onProgress,
} = {}) {
  return runAppV2CardRead({
    session,
    storage,
    capturedAtIso,
    readCompletedPayload: async () => {
      const transportResult = await readBrowserAppV2GoldenCardPayload({
        ...transportOptions,
        onProgress,
      });
      return transportResult.payload;
    },
  });
}
