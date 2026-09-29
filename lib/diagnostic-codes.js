// Stable support taxonomy. Codes describe observed technical signals, not a proven physical cause.
export function diagnosticForAttempt({ kind, status, phase, errorCode }) {
  if (status === "complete") return { code: "000", label: kind === "card" ? "Kartica očitana i obrađena" : "LIVE očitavanje završeno" };
  const byError = {
    packet_idle_timeout: ["015", "Očitavanje prekinuto: 60 s bez novog paketa"],
    disconnected: ["016", "Bluetooth veza prekinuta"],
    peer_closed: ["017", "Tahograf zatvorio prenos"],
    first_packet_timeout: ["018", "Prvi paket nije stigao u roku od 90 s"],
    packet_sequence_error: ["019", "Pogrešan redosled paketa"],
    invalid_fragment: ["019", "Neispravan fragment paketa"],
    credit_write_failed: ["020", "Upis potvrde protoka nije uspeo"],
    credits_timeout: ["020", "Potvrda protoka nije stigla"],
    gatt_write_timeout: ["020", "Bluetooth upis nije završen na vreme"],
    chooser_cancelled: ["022", "Izbor uređaja je otkazan"],
    bluetooth_unavailable: ["023", "Bluetooth nije dostupan u pregledaču"],
    service_missing: ["024", "Potreban servis nije pronađen"],
    characteristic_missing: ["024", "Potrebna karakteristika nije pronađena"],
    gatt_connect_failed: ["025", "Povezivanje sa uređajem nije uspelo"],
    negative_response: ["026", "Tahograf je odbio zahtev"],
    payload_invalid: ["027", "Preuzeti sadržaj nije validan"],
    parser_rejected: ["027", "Obrada kartice nije prihvatila sadržaj"],
    storage_error: ["028", "Čuvanje na telefonu nije uspelo"],
    read_timeout: ["029", "Odgovor nije stigao na vreme"],
    response_timeout: ["029", "Odgovor nije stigao na vreme"],
    tester_present_timeout: ["029", "Potvrda dijagnostičke sesije nije stigla"],
  };
  if (errorCode && errorCode !== "unknown" && byError[errorCode]) {
    const [code, label] = byError[errorCode];
    return { code, label };
  }
  if (status === "failed" && kind === "live" && phase === "bluetooth") {
    return { code: "021", label: "Povezivanje nije uspelo; tačan uzrok nije zabeležen" };
  }
  if (status === "failed") return { code: "099", label: "Greška; tačan uzrok nije utvrđen" };
  return { code: "—", label: status === "in_progress" ? "Pokušaj je u toku" : status === "transfer_complete" ? "Prenos završen; obrada nije potvrđena" : "Nema završnog događaja" };
}
