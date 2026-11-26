#!/usr/bin/env node
/* ui-tests — the Symbiote page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "symbiote-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
ok("the engine loaded", !!w.SymbioteCore);
eq("the ledger starts empty", $("totalsNum").textContent, "0 open");

$("who").value = "Ravi"; $("what").value = "lent me his drill"; $("dir").value = "owed by me"; $("recBtn").click();
ok("a favour is recorded", /Recorded: lent me his drill/.test($("status").textContent), $("status").textContent);
eq("one entry in the ledger", d.querySelectorAll("#entryList li").length, 1);
eq("one open", $("totalsNum").textContent, "1 open");
ok("owed by me is on screen", /owed by me/.test($("entryList").textContent), $("entryList").textContent);

$("q").value = "what do I owe Ravi"; $("askBtn").click();
ok("the answer cites the open date", /Open since \d{2}\/\d{2}\/\d{4}/.test($("answer").textContent), $("answer").textContent);
ok("and says how many entries it came from", /from 1 ledger entry/.test($("answer").textContent));

d.querySelector("#entryList button").click();
ok("settling works", /Settled on \d{2}\/\d{2}\/\d{4}/.test($("status").textContent), $("status").textContent);
eq("nothing open now", $("totalsNum").textContent, "0 open");
ok("the entry is still listed", d.querySelectorAll("#entryList li").length, 1);
ok("and marked settled", /settled/.test($("entryList").textContent));

$("q").value = "what did we settle"; $("askBtn").click();
ok("asking about it cites the settled date", /Settled on \d{2}\/\d{2}\/\d{4}/.test($("answer").textContent), $("answer").textContent);

$("q").value = "what do I owe Meena"; $("askBtn").click();
ok("a stranger is refused", /will not make one up/.test($("answer").textContent), $("answer").textContent);

$("exportBtn").click();
ok("the ledger exports", /Wrote symbiote-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);
var saved = w.localStorage.getItem("symbiote:ledger");
var dom2 = build({ "symbiote:ledger": saved });
var d2 = dom2.window.document;
eq("the reload keeps the entry", d2.querySelectorAll("#entryList li").length, 1);
d2.getElementById("q").value = "what did we settle"; d2.getElementById("askBtn").click();
ok("and the citation survives the reload", /Settled on/.test(d2.getElementById("answer").textContent), d2.getElementById("answer").textContent);

var dom3 = build({ "symbiote:ledger": "{ broken ledger" });
var d3 = dom3.window.document;
ok("a broken ledger is reported", /cannot be read/.test(d3.getElementById("status").textContent));
ok("and not replaced with an empty one", /NOT replaced with an empty one/.test(d3.getElementById("status").textContent));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("who").value = "R"; d4.getElementById("what").value = "x"; d4.getElementById("recBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
