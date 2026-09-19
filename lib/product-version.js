export const TACHOCOMMAND_VERSIONS = Object.freeze({
  product: "2026.09.19",
  site: "2026.09.19",
  app: "2026.09.19",
  cardEngine: "parser-native-history-2026.09.19",
  transport: "golden-0.32c",
});

export function formatTachoCommandVersionLine() {
  return [
    "Site " + TACHOCOMMAND_VERSIONS.site,
    "App " + TACHOCOMMAND_VERSIONS.app,
    "Card " + TACHOCOMMAND_VERSIONS.cardEngine,
    "Transport " + TACHOCOMMAND_VERSIONS.transport,
  ].join(" · ");
}
