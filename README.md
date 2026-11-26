# Symbiote

A companion that remembers the favours between you — and answers by **citing the entry and its date**.

- **Demo:** https://drsamonline.github.io/app-symbiote/play/index.html
- **Landing page:** https://drsamonline.github.io/app-symbiote/
- **Release:** https://github.com/drsamonline/app-symbiote/releases/tag/app-latest
- **Plan row:** #36 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-symbiote` (lead)
- **Licence:** PolyForm Noncommercial 1.0.0

## Status

| | |
|---|---|
| **Built** | A two-direction ledger with dates; settling that keeps the entry; answers assembled from entries with their dates; a refusal to invent; totals that add up. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | **A language model.** There is none: answers are assembled with fixed phrasings, which is exactly why the app can show its work. |
| **Untested** | Whether a person trusts a ledger more than a companion that sounds like it remembers. The citations are exact; the feeling is not testable. |

## The spec's "done means", counted

| The spec says | Test |
|---|---|
| a favour appears in the ledger as owed by the user | recorded with `direction: "owed by me"` and the date `20/11/2026` |
| settling moves it to settled with a date | `settled: true`, `settledOn: "22/11/2026"`, and the app says the date |
| asking afterwards makes it **cite that entry by its date** | *"Settled on 22/11/2026: lent me his drill (owed by me, Ravi). — from 1 ledger entry."* |
| the totals equal the sum of its open entries | `owedByMe + owedToMe === open`, and `agrees === true` |
| nothing leaves the device | no `fetch`/XHR/WebSocket/beacon, no URL, no model endpoint, CSP `connect-src 'none'` |

## Why there is no model, and why that is the feature

A companion that *sounds* like it remembers is the easiest thing in the world to build badly. This one has a
ledger, and every sentence it produces is assembled from a ledger entry **with that entry's date attached** —
so the answer can be checked by reading the ledger, which is on the same screen.

With nothing to cite, it says so. With a person it does not know, it says so. That is the whole design.

## What it will not do

- **Invent a favour.**
- **Answer without a citation.**
- **Use a model.**
- **Delete a settled entry.**
- **Use the internet.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | Every refusal names the field: person, words, direction, question, entry id. |
| **Nothing to cite** | The answer says the ledger has nothing and that it will not make one up. |
| **No network** | Nothing changes. |
| **Storage full or unavailable** | **NOT SAVED**, ledger unchanged. |
| **Corrupt saved state** | Reported and offered for export, never replaced with an empty one. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 57 assertions
node tests/ui-tests.js        # the page in jsdom — 20 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026. Five failed: settling deleting the entry (9 failures), the answer
citing no date (3), the totals counting settled entries (2), a broken ledger starting empty (4), settled
entries asked about as open (3). **One survived** — "it invents an answer when there is nothing" — because my
stranger test returned earlier, at the stranger check. An empty ledger was the case that reached the code
being mutated, and there is now a test for it.

## Two things I got wrong in the engine, both caught by probing

1. **"what did we settle"** matched nothing, because the regex tested `settled` and the question says
   `settle`. It matches both now.
2. **A stranger was answered about somebody else**: asking about "Meena" listed Ravi's favours. The engine now
   notices a capitalised name the ledger does not know and says it has nothing — rather than answering about
   the wrong person, which is the worst failure a memory app can have.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — record, the ledger, ask
docs/play/app.js           DOM wiring: record, settle, ask, export
docs/play/symbiote-core.js the engine — entries, settling, totals, citing answers, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (57)
tests/ui-tests.js          page suite (20, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **A settled entry is kept.** The citation has to survive the settling, or the app cannot answer "what did we settle" at all.
- **Answers are lists of citations**, joined, with a count — so the answer's own shape says how much evidence it rests on.
- **A name the ledger does not know is refused**, because answering about the wrong person is the worst thing a memory app can do.
- **Totals are arithmetic, and `agrees` is checked** against the entries rather than asserted.
- **No model, and the page says why**: the point is checkable answers, not fluent ones.

## What is not built, and why

**A language model.** The spec's mechanic is a companion that cites; a model would add fluency and remove the
guarantee. What ships is the guarantee.
