/* symbiote-core — the engine behind Symbiote.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: a companion that remembers the favours between you, keeps them in a ledger, and ANSWERS BY
 * CITING THE ENTRY — with its date — rather than from memory.
 *
 * THE CITATION IS THE POINT. When you ask "what do I owe Ravi?", the answer is not a sentence the app made
 * up; it is a sentence built from a ledger entry, and it names that entry's date so you can go and check.
 * If the ledger has nothing, the answer says so instead of inventing a favour.
 *
 * THERE IS NO LANGUAGE MODEL HERE. Answers are assembled from the ledger with fixed phrasings, which is
 * the honest way to do this offline and is also why the app can always show its work.
 *
 * Pure functions: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SymbioteCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ddmm(ms) { var d = new Date(ms); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }

  function emptyLedger() { return { entries: [] }; }

  /* direction: 'owed by me' or 'owed to me'. A favour recorded is an entry, not a memory. */
  function record(ledger, input, now) {
    var who = clean(input && input.who);
    var what = clean(input && input.what);
    var dir = clean(input && input.direction).toLowerCase();
    if (!who) return { ok: false, field: "who", reason: "a favour needs a person" };
    if (!what) return { ok: false, field: "what", reason: "a favour with no words is refused: there would be nothing to cite later" };
    if (dir !== "owed by me" && dir !== "owed to me") return { ok: false, field: "direction", reason: "a favour is either owed by me or owed to me" };
    var at = now || Date.now();
    var l = clone(ledger);
    var e = { id: "f" + (l.entries.length + 1), who: who, what: what, direction: dir, at: at, on: ddmm(at), settled: false, settledAt: 0, settledOn: "" };
    l.entries.push(e);
    return { ok: true, ledger: l, entry: e, says: "Recorded: " + what + " — " + dir + " (" + who + ", " + e.on + ")." };
  }

  /* Settling moves it, with a date; it is never deleted, because the citation has to survive. */
  function settle(ledger, input, now) {
    var l = clone(ledger);
    var id = clean(input && input.id);
    var e = l.entries.filter(function (x) { return x.id === id; })[0];
    if (!e) return { ok: false, field: "id", reason: "there is no such entry in the ledger" };
    if (e.settled) return { ok: false, field: "id", reason: "that entry was already settled on " + e.settledOn };
    var at = now || Date.now();
    e.settled = true; e.settledAt = at; e.settledOn = ddmm(at);
    return { ok: true, ledger: l, entry: e, says: "Settled on " + e.settledOn + ": " + e.what + " (" + e.who + ")." };
  }

  /* The totals: open entries only, by direction. The sum is asserted against the entries themselves. */
  function totals(ledger) {
    var open = (ledger && ledger.entries || []).filter(function (e) { return !e.settled; });
    var byMe = open.filter(function (e) { return e.direction === "owed by me"; }).length;
    var toMe = open.filter(function (e) { return e.direction === "owed to me"; }).length;
    return {
      open: open.length, owedByMe: byMe, owedToMe: toMe, settled: ((ledger && ledger.entries) || []).length - open.length,
      agrees: byMe + toMe === open.length,
      says: open.length ? byMe + " owed by me, " + toMe + " owed to me, " + (((ledger && ledger.entries) || []).length - open.length) + " settled." : "Nothing open in the ledger.",
      disclaimer: "These are entries, not impressions. Every one has a date."
    };
  }

  /* THE ANSWER: assembled from entries, and it CITES the date of each. With nothing to cite, it says so. */
  function ask(ledger, question, now) {
    var q = clean(question).toLowerCase();
    if (!q) return { ok: false, field: "question", reason: "a question with no words is refused", answer: "" };
    var entries = (ledger && ledger.entries || []).slice();
    var settled = /settle|settled|paid|done|cleared/.test(q);
    var pool = entries.filter(function (e) { return settled ? e.settled : !e.settled; });

    /* who is named in the question, if anyone — and whether they are a person this ledger knows */
    var names = [];
    entries.forEach(function (e) { if (q.indexOf(e.who.toLowerCase()) >= 0 && names.indexOf(e.who) < 0) names.push(e.who); });
    if (names.length) pool = pool.filter(function (e) { return names.indexOf(e.who) >= 0; });
    /* a capitalised word that is nobody in the ledger is a person the app has nothing about, and it says so
     * rather than answering about somebody else */
    var known = entries.map(function (e) { return e.who.toLowerCase(); });
    var strangers = (clean(question).match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(function (w, i, all) {
      var lw = w.toLowerCase();
      return all.indexOf(w) === i && known.indexOf(lw) < 0 && lw !== "the" && lw !== "i";
    });
    if (!names.length && strangers.length) {
      return { ok: true, cited: [], answer: "I have nothing about " + strangers.join(" or ") + " in the ledger. I will not make one up.", says: "Nothing cited." };
    }

    if (!pool.length) {
      return {
        ok: true, cited: [], answer: "The ledger has nothing to cite for that" + (names.length ? " about " + names.join(" and ") : "") + ". I will not make one up.",
        says: "Nothing cited."
      };
    }
    var lines = pool.map(function (e) {
      return (e.settled ? "Settled on " + e.settledOn : "Open since " + e.on) + ": " + e.what + " (" + e.direction + ", " + e.who + ").";
    });
    return {
      ok: true, cited: pool.map(function (e) { return { id: e.id, on: e.on, settledOn: e.settledOn, what: e.what, who: e.who, direction: e.direction }; }),
      answer: lines.join(" ") + " — from " + pool.length + " ledger entr" + (pool.length === 1 ? "y" : "ies") + ".",
      says: "Cited " + pool.length + " entr" + (pool.length === 1 ? "y" : "ies") + "."
    };
  }

  function clone(l) {
    var x = l || emptyLedger();
    return { entries: (x.entries || []).map(function (e) {
      return { id: e.id, who: e.who, what: e.what, direction: e.direction, at: e.at || 0, on: e.on || "", settled: !!e.settled, settledAt: e.settledAt || 0, settledOn: e.settledOn || "" };
    }) };
  }

  function serialize(ledger) { return JSON.stringify({ version: VERSION, format: "symbiote-1", ledger: clone(ledger) }, null, 2); }
  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "the ledger is empty on this device", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, unreadable: true, reason: "The saved ledger cannot be read. It was NOT replaced with an empty one \u2014 an empty ledger looks like nobody owes anybody anything. Export it to keep it.", raw: raw }; }
    if (!data || !data.ledger || !Array.isArray(data.ledger.entries)) return { ok: false, unreadable: true, reason: "The saved file holds no ledger. Nothing was started over it; export it to keep it.", raw: raw };
    return { ok: true, ledger: clone(data.ledger), raw: raw };
  }
  function stamp(when) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || "")); return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated"; }
  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "ledger") { name = "symbiote-" + stamp(meta.when) + ".json"; body = serialize(payload.ledger); }
    else if (what === "raw") { name = "symbiote-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return { version: VERSION, emptyLedger: emptyLedger, record: record, settle: settle, totals: totals, ask: ask,
    serialize: serialize, parseState: parseState, exportFile: exportFile };
});
