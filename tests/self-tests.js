#!/usr/bin/env node
/* self-tests — Symbiote. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Done-means: a favour appears in the ledger as owed by the user; settling moves it to settled WITH A DATE;
 * asking afterwards makes the companion CITE that ledger entry by its date; the totals equal the sum of the
 * open entries; and nothing leaves the device. */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var S = require(path.join(ROOT, "docs", "play", "symbiote-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }

var DAY = 86400000;
var T = new Date(2026, 10, 20).getTime();

function ledger() {
  var l = S.emptyLedger();
  l = S.record(l, { who: "Ravi", what: "lent me his drill", direction: "owed by me" }, T).ledger;
  l = S.record(l, { who: "Ravi", what: "I fed his cat", direction: "owed to me" }, T + DAY).ledger;
  return l;
}

section("done means — a favour appears in the ledger as owed by the user");
var l = ledger();
eq("two entries", l.entries.length, 2);
eq("the first is owed by me", l.entries[0].direction, "owed by me");
eq("with the date it was recorded", l.entries[0].on, "20/11/2026");
eq("and it starts open", l.entries[0].settled, false);

section("done means — settling moves it to settled with a date");
var s = S.settle(l, { id: l.entries[0].id }, T + 2 * DAY);
eq("the entry settles", s.ok, true);
eq("it is marked settled", s.entry.settled, true);
eq("with the date it settled", s.entry.settledOn, "22/11/2026");
ok("and the app says the date", /Settled on 22\/11\/2026/.test(s.says), s.says);
eq("settling twice is refused", S.settle(s.ledger, { id: l.entries[0].id }, T).ok, false);
eq("settling an entry that is not there is refused", S.settle(l, { id: "nope" }, T).field, "id");
eq("the entry is not deleted", s.ledger.entries.length, 2);

section("done means — asking afterwards cites that ledger entry by its date");
var asked = S.ask(s.ledger, "what did we settle", T + 3 * DAY);
eq("the settled entry is cited", asked.cited.length, 1);
ok("the answer names the settled date", /Settled on 22\/11\/2026/.test(asked.answer), asked.answer);
ok("and the thing itself", /lent me his drill/.test(asked.answer));
ok("and says how many entries it came from", /from 1 ledger entry/.test(asked.answer), asked.answer);
var openAsk = S.ask(s.ledger, "what do I owe Ravi", T + 3 * DAY);
ok("an open entry cites the date it opened", /Open since 21\/11\/2026/.test(openAsk.answer), openAsk.answer);
eq("the settled one is not in the open answer", openAsk.cited.length, 1);
var stranger = S.ask(l, "what do I owe Meena", T);
eq("a person the ledger does not know cites nothing", stranger.cited.length, 0);
ok("and the app refuses to make one up", /will not make one up/.test(stranger.answer), stranger.answer);
/* an EMPTY ledger: the answer has nothing to cite and must say so, not trail off into "from 0 entries" */
var nothing = S.ask(S.emptyLedger(), "what do I owe anyone", T);
eq("nothing is cited", nothing.cited.length, 0);
ok("and the answer says the ledger has nothing", /nothing to cite/.test(nothing.answer), nothing.answer);
ok("with no empty summary appended", !/from 0 ledger entr/.test(nothing.answer), nothing.answer);

section("done means — the ledger totals equal the sum of its open entries");
var t = S.totals(l);
eq("two open", t.open, 2);
eq("one owed by me", t.owedByMe, 1);
eq("one owed to me", t.owedToMe, 1);
eq("the parts equal the whole", t.agrees, true);
eq("and the arithmetic holds", t.owedByMe + t.owedToMe, t.open);
var t2 = S.totals(s.ledger);
eq("after settling, one open", t2.open, 1);
eq("and one settled", t2.settled, 1);
eq("still adding up", t2.agrees, true);
eq("an empty ledger has nothing open", S.totals(S.emptyLedger()).open, 0);

section("done means — nothing leaves the device");
var core = read("docs/play/symbiote-core.js");
ok("no fetch, XHR, WebSocket or beacon", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(core.replace(/\/\*[\s\S]*?\*\//g, "") + read("docs/play/app.js")));
ok("no URL in the engine", !/https?:\/\//.test(core));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));
ok("no model, key or endpoint", !/\b(apiKey|endpoint|openai|gpt|modelUrl)\s*[:=]/i.test(core));

section("must-not — it must not invent a favour, and it has no model");
ok("there is no language model call anywhere", !/\bfetch\b|completion|prompt\(/i.test(core));
ok("the engine says answers are assembled", /assembled from the ledger/.test(core));
ok("an empty question is refused", S.ask(l, "  ", T).field, "question");
ok("a favour with no words is refused", S.record(S.emptyLedger(), { who: "R", direction: "owed by me" }, T).field, "what");
ok("a favour with no person is refused", S.record(S.emptyLedger(), { what: "x", direction: "owed by me" }, T).field, "who");
eq("a nonsense direction is refused", S.record(S.emptyLedger(), { who: "R", what: "x", direction: "maybe" }, T).field, "direction");

section("storage");
var bad = S.parseState("{ broken ledger");
eq("a broken ledger is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
ok("it was not replaced with an empty one", /NOT replaced with an empty one/.test(bad.reason), bad.reason);
ok("and says why an empty ledger is worse", /nobody owes anybody/.test(bad.reason), bad.reason);
eq("nothing saved yet is distinguished", S.parseState("").empty, true);
var round = S.parseState(S.serialize(s.ledger));
eq("the ledger round-trips", round.ledger.entries.length, 2);
eq("with the settled date", round.ledger.entries[0].settledOn, "22/11/2026");
ok("and the citation still works after a reload", /22\/11\/2026/.test(S.ask(round.ledger, "what did we settle", T).answer));
var thrown = S.exportFile("ledger", { ledger: l }, { when: "26/11/2026" }, function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; });
eq("a failed write is reported", thrown.ok, false);

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (x) { ok("script src resolves: " + x, fs.existsSync(path.join(ROOT, "docs", "play", x.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));
ok("the web manifest exists", fs.existsSync(path.join(ROOT, "docs", "play", "manifest.webmanifest")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
