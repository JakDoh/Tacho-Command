import { runAppV2CardRead } from "./app-v2-card-read-controller.js";
import { readBrowserAppV2GoldenCardPayload } from "./app-v2-golden-card-browser-transport.js";
import { createAppV2CardTelemetry } from "./app-v2-card-telemetry.js";

export function runBrowserAppV2GoldenCardRead({
  session,
  storage,
  capturedAtIso = new Date().toISOString(),
  transportOptions,
  onProgress,
  onDiagnostic,
  telemetryOptions,
  onTelemetryAttempt,
  telemetry: preparedTelemetry,
} = {}) {
  const telemetry = preparedTelemetry === undefined ? createAppV2CardTelemetry(telemetryOptions) : preparedTelemetry;
  telemetry?.transportStart();
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
          onDiagnostic: (diagnostic) => {
            telemetry?.diagnostic(diagnostic);
            onDiagnostic?.(diagnostic);
          },
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

  return resultPromise.then((result) => {
    // UI/data acceptance must never wait for the telemetry network request.
    void Promise.resolve().then(() => telemetry?.finish(result)).catch(() => {});
    return Object.freeze({
      ...result,
      cardAttemptCode: telemetry?.attemptCode ?? null,
      cardTelemetryStatus: "deferred",
      cardTelemetryAcceptedCount: null,
      transportCompleted,
    });
  }, (error) => {
    // Unexpected controller/pipeline rejection must still leave a terminal report.
    void Promise.resolve().then(() => telemetry?.finish({ status: "pipeline_error" })).catch(() => {});
    throw error;
  });
}
