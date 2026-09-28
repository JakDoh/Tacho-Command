import { runAppV2CardRead } from "./app-v2-card-read-controller.js";
import { readBrowserAppV2GoldenCardPayload } from "./app-v2-golden-card-browser-transport.js";
import { createAppV2CardTelemetry } from "./app-v2-card-telemetry.js";

export function runBrowserAppV2GoldenCardRead({
  session,
  storage,
  capturedAtIso = new Date().toISOString(),
  transportOptions,
  onProgress,
  telemetryOptions,
  onTelemetryAttempt,
} = {}) {
  const telemetry = createAppV2CardTelemetry(telemetryOptions);
  if (telemetry?.attemptCode) onTelemetryAttempt?.(telemetry.attemptCode);
  let transportCompleted = false;
  const resultPromise = runAppV2CardRead({
    session,
    storage,
    capturedAtIso,
    readCompletedPayload: async () => {
      try {
        const transportResult = await readBrowserAppV2GoldenCardPayload({
          ...transportOptions,
          onProgress: (progress) => {
            telemetry?.progress(progress);
            onProgress?.(progress);
          },
        });
        transportCompleted = true;
        telemetry?.transportComplete();
        return transportResult.payload;
      } catch (error) {
        telemetry?.transportError(error);
        throw error;
      }
    },
  });

  return resultPromise.then(async (result) => {
    const telemetryResult = await telemetry?.finish(result);
    return Object.freeze({
      ...result,
      cardAttemptCode: telemetry?.attemptCode ?? null,
      cardTelemetryStatus: telemetryResult?.status ?? "unavailable",
      cardTelemetryAcceptedCount: telemetryResult?.status === "accepted"
        ? Number(telemetryResult.accepted ?? 0)
        : null,
      transportCompleted,
    });
  });
}
