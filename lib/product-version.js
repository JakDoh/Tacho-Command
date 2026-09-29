/* global __TACHO_BUILD_SHA__ */
export const TACHOCOMMAND_VERSIONS = Object.freeze({
  product: "2026.09.29-diagnostic.2",
  site: "2026.09.29-diagnostic.2",
  app: "2026.09.29-diagnostic.2",
  cardEngine: "parser-native-history-2026.09.19",
  transport: "golden-0.32c",
});

export function formatTachoCommandVersionLine() {
  const commit = typeof __TACHO_BUILD_SHA__ === "string" ? __TACHO_BUILD_SHA__ : "development";
  return [
    "Build " + commit,
    "Site " + TACHOCOMMAND_VERSIONS.site,
    "App " + TACHOCOMMAND_VERSIONS.app,
    "Card " + TACHOCOMMAND_VERSIONS.cardEngine,
    "Transport " + TACHOCOMMAND_VERSIONS.transport,
  ].join(" · ");
}
