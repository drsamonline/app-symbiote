/* app — the Symbiote page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the ledger, the totals and the citing answers live in symbiote-core.js. */
(function () {
  "use strict";
  var S = window.SymbioteCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "symbiote:ledger";
  var state = { ledger: S.emptyLedger(), unreadable: null };

  var els = {
    status: $("status"), who: $("who"), what: $("what"), dir: $("dir"), recBtn: $("recBtn"),
    totalsNum: $("totalsNum"), totalsSays: $("totalsSays"), entryList: $("entryList"),
    q: $("q"), askBtn: $("askBtn"), answer: $("answer"), exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    try { window.localStorage.setItem(K, S.serialize(state.ledger)); return true; }
    catch (e) { setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") + ". The ledger on screen is unchanged."); return false; }
  }

  function render() {
    var t = S.totals(state.ledger);
    els.totalsNum.textContent = t.open + " open";
    els.totalsSays.textContent = t.says + " " + t.disclaimer;
    els.entryList.textContent = "";
    if (!state.ledger.entries.length) els.entryList.appendChild(node("li", null, "Nothing in the ledger yet."));
    state.ledger.entries.forEach(function (e) {
      var li = node("li", e.settled ? "settled" : "");
      var left = node("div", null, e.what);
      left.appendChild(node("span", "meta", e.who + " \u00b7 " + e.direction + " \u00b7 " + (e.settled ? "settled " + e.settledOn : "open since " + e.on)));
      li.appendChild(left);
      if (!e.settled) {
        var b = node("button", "small", "Settle it");
        b.addEventListener("click", function () {
          var out = S.settle(state.ledger, { id: e.id }, Date.now());
          if (!out.ok) { setStatus("bad", out.reason); return; }
          state.ledger = out.ledger;
          var saved = persist();
          render();
          if (saved) setStatus("ok", out.says);
        });
        li.appendChild(b);
      }
      els.entryList.appendChild(li);
    });
  }

  function record() {
    var out = S.record(state.ledger, { who: els.who.value, what: els.what.value, direction: els.dir.value }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.ledger = out.ledger;
    var saved = persist();
    els.what.value = "";
    render();
    if (saved) setStatus("ok", out.says);
  }

  function ask() {
    var out = S.ask(state.ledger, els.q.value, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    els.answer.hidden = false;
    els.answer.textContent = out.answer;
    setStatus(out.cited.length ? "ok" : "warn", out.says);
  }

  function doExport() {
    var out = S.exportFile("ledger", { ledger: state.ledger }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + "."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  els.recBtn.addEventListener("click", record);
  els.askBtn.addEventListener("click", ask);
  els.q.addEventListener("keydown", function (e) { if (e.key === "Enter") ask(); });
  els.exportBtn.addEventListener("click", doExport);

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = S.parseState(raw);
    if (parsed.ok) state.ledger = parsed.ledger;
    else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable ledger");
      keep.addEventListener("click", function () {
        var out = S.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  render();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
