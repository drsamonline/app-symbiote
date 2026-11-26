# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- **A ledger of favours** in both directions — owed by me, owed to me — each with a date.
- **Settling** an entry, with the date it settled; a settled entry is kept, never deleted, because the citation
  has to survive.
- **Answers that cite**: every line names the entry's date (*"Settled on 22/11/2026: lent me his drill"*), and
  the answer says how many entries it came from.
- **A refusal to invent**: with nothing to cite, or a person the ledger does not know, the answer says so.
- **Totals** that add up, checked against the open entries themselves.
- Refusals: no person, no words, a nonsense direction, an empty question, settling a missing or already-settled
  entry.
- An unreadable ledger is reported and offered for export, **never** replaced with an empty one — an empty
  ledger looks like nobody owes anybody anything.
- A failed save says **NOT SAVED** and leaves the ledger unchanged.
- PWA shell, CI (57 engine assertions + 20 in jsdom + page smoke), and the app-builder pipeline pinned to the
  canonical SHA for the EXE/APK/Linux release.

### Not built
- A language model. Answers are assembled from the ledger with fixed phrasings, which is why the app can
  always show its work.
