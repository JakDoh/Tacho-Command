# Last Good Card Snapshot — 2026-09-18

## Product rule

The latest **fully successful** driver-card read remains available locally until another fully successful read replaces it.

A failed, cancelled, malformed, or partial new read must never erase or overwrite the last known-good history.

## Storage contract

- schema: `tc-card-snapshot-v1`
- browser key: `tachocommand.last-good-card-snapshot.v1`
- local device storage only;
- maximum 56 history-day records;
- one active last-good snapshot;
- a successful replacement is one `localStorage.setItem` operation;
- malformed or unknown-version stored data fails closed and is not shown as real history.

The snapshot stores already-parsed product data only. It never stores or handles raw BLE packets, DDP/UDS/TREP traffic, or a raw `.ddd` payload.

Stored fields may include local driver-facing identity/display data (name and masked last four card digits), parsed history rows, 14-day total, slot label, attention copy, the card-read timestamp, and explicit/derived oldest/newest history dates.

Nothing in this module is transmitted to a server.

## Refresh behavior

1. App loads the last-good snapshot on startup.
2. User can inspect that stored history without re-reading the card.
3. A new card read runs independently.
4. Only after the card-read pipeline declares the read fully complete does the caller invoke `saveLastGoodCardSnapshot`.
5. The new good snapshot replaces the old one.
6. If the new read fails before that point, the storage function is never called, or rejects the incomplete state, so the old snapshot remains.

## Important integration boundary

The repository still does not contain the authoritative source that produced the physically tested integrated card-reader UI. Therefore this PR adds the persistence engine and adapter bridge, but does **not** invent a hook into an unknown card-parser source.

The later integration point must be immediately after a verified complete parsed-card result and before UI state is published.

## Golden transport

The permanently locked 0.32c communication path is not touched by this work.
