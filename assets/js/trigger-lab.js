/* =====================================================================
   Trigger lab: run one statement against a private copy of a database
   and show (a) the watched rows before and after, with changes
   highlighted, and (b) the chain of triggers that fired, step by step.
   <div class="trigger-lab" data-db="shop_v2">
     <script type="application/json">[ {id, title, intro, sql, watch:[{label, sql}],
        steps:[{t:"before|row|after|cascade|error|end", text}], expect:"ok|error"} ]</script>
   </div>
   The steps are the teaching narrative; the before/after data is REAL,
   produced by SQLite running in the browser.
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var KIND = { before: "BEFORE", row: "ROW", after: "AFTER", cascade: "CASCADE", error: "RAISE", end: "RESULT", when: "WHEN" };

  function query(db, sql) {
    var r = db.exec(sql);
    return r.length ? { cols: r[0].columns, rows: r[0].values } : { cols: [], rows: [] };
  }
  function tableHtml(res, other, side) {
    if (!res.cols.length) return '<div class="tl-empty">(no rows)</div>';
    var h = '<div class="table-wrap"><table><thead><tr>' + res.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
    res.rows.forEach(function (r, i) {
      var o = other && other.rows[i];
      var isNew = side === "after" && other && i >= other.rows.length;
      h += "<tr" + (isNew ? ' class="tl-new"' : "") + ">" + r.map(function (v, j) {
        var changed = side === "after" && o && String(o[j]) !== String(v);
        return "<td" + (changed ? ' class="changed"' : v === null ? ' class="null"' : "") + ">" + (v === null ? "NULL" : esc(v)) + "</td>";
      }).join("") + "</tr>";
    });
    if (!res.rows.length) h += '<tr><td colspan="' + res.cols.length + '" class="null">(no rows)</td></tr>';
    return h + "</tbody></table></div>";
  }

  function Lab(el) {
    var src = el.querySelector('script[type="application/json"]');
    this.el = el;
    this.db = null;
    this.dbName = el.getAttribute("data-db") || "shop_v2";
    try { this.sc = JSON.parse(src.textContent); } catch (e) { el.innerHTML = '<div class="pg-msg err">Scenario data could not be read.</div>'; return; }
    this.i = 0;
    this.build();
  }
  Lab.prototype.build = function () {
    var self = this;
    this.el.innerHTML =
      '<div class="tl-head"><span class="pg-title">Trigger lab <span class="db">' + esc(this.dbName) + '.db</span></span>' +
      '<label class="tl-pick"><span class="sr-only">Scenario</span><select>' + this.sc.map(function (s, i) { return '<option value="' + i + '">' + (i + 1) + ". " + esc(s.title) + "</option>"; }).join("") + "</select></label></div>" +
      '<div class="tl-body"><p class="tl-intro"></p><div class="code-block"><div class="code-head"><span class="lang">SQL</span><span class="fname">statement to run</span></div><pre><code class="language-sql tl-sql"></code></pre></div>' +
      '<div class="toolbar"><button class="btn primary" data-a="run" type="button">Run statement</button><button class="btn" data-a="reset" type="button">Reset database</button>' +
      '<span class="spacer"></span><span class="tl-status small muted">Loading SQLite…</span></div>' +
      '<div class="tl-grid"><div><h4 class="tl-h">What fires, in order</h4><ol class="tl-steps"></ol></div><div class="tl-watch"></div></div></div>';
    this.sel = this.el.querySelector("select");
    this.sel.addEventListener("change", function () { self.show(+self.sel.value); });
    this.el.querySelector(".toolbar").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.getAttribute("data-a") === "run") self.run(); else self.reset(true);
    });
    this.reset(false).then(function () { self.show(0); });
  };
  Lab.prototype.reset = function (announce) {
    var self = this;
    if (this.db) { try { this.db.close(); } catch (e) {} this.db = null; }
    this.ran = false;
    return Q.sql.openDb(this.dbName).then(function (db) {
      self.db = db;
      if (announce) self.show(self.i);
      self.status(announce ? "Database reset to the original " + self.dbName + " data. Press Run statement." : "Ready.");
    }).catch(function (e) {
      self.status("Could not start SQLite: " + (e.message || e) + (location.protocol === "file:" ? " (open the site through a web server)" : ""));
    });
  };
  Lab.prototype.status = function (t, cls) {
    var s = this.el.querySelector(".tl-status"); s.textContent = t; s.className = "tl-status small " + (cls || "muted");
  };
  Lab.prototype.show = function (i) {
    this.i = i; this.sel.value = String(i);
    var sc = this.sc[i];
    this.el.querySelector(".tl-intro").innerHTML = sc.intro;
    var code = this.el.querySelector(".tl-sql");
    code.textContent = sc.sql;
    if (window.hljs) { code.removeAttribute("data-highlighted"); try { window.hljs.highlightElement(code); } catch (e) {} }
    this.el.querySelector(".tl-steps").innerHTML = sc.steps.map(function (s) {
      return '<li class="tl-step k-' + s.t + '"><span class="tl-kind">' + (KIND[s.t] || s.t) + "</span><span>" + s.text + "</span></li>";
    }).join("");
    this.before = null;
    if (this.db) this.renderWatch(null);
    this.status("Press Run statement to execute it.");
  };
  Lab.prototype.renderWatch = function (after) {
    var self = this, sc = this.sc[this.i];
    if (!after) this.before = sc.watch.map(function (w) { return query(self.db, w.sql); });
    this.el.querySelector(".tl-watch").innerHTML = sc.watch.map(function (w, k) {
      return '<div class="tl-w"><h4 class="tl-h">' + esc(w.label) + '</h4><div class="tl-ba"><div><div class="tl-tag">Before</div>' + tableHtml(self.before[k]) + "</div>" +
        '<div><div class="tl-tag">After</div>' + (after ? tableHtml(after[k], self.before[k], "after") : '<div class="tl-empty">Run the statement to see the result.</div>') + "</div></div></div>";
    }).join("");
  };
  Lab.prototype.run = function () {
    var self = this, sc = this.sc[this.i];
    if (!this.db) return;
    if (this.ran) { this.reset(false).then(function () { self.renderWatch(null); self.run(); }); return; }
    this.renderWatch(null);
    var err = null;
    try { this.db.exec(sc.sql); } catch (e) { err = String(e.message || e); }
    this.ran = true;
    var after = sc.watch.map(function (w) { return query(self.db, w.sql); });
    this.renderWatch(after);
    var steps = this.el.querySelectorAll(".tl-step");
    steps.forEach(function (s) { s.classList.remove("on"); });
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    steps.forEach(function (s, k) { setTimeout(function () { s.classList.add("on"); }, reduce ? 0 : 350 * k); });
    if (err) this.status("SQLite refused the statement: " + err + " (all its changes were undone)", "tl-err");
    else this.status("Statement succeeded. Changed cells are highlighted; new rows are marked.", "tl-ok");
    this.el.dispatchEvent(new CustomEvent("tl:run", { bubbles: true, detail: { error: err } }));
  };

  function initAll() { document.querySelectorAll(".trigger-lab").forEach(function (el) { if (!el.__tl) el.__tl = new Lab(el); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll); else initAll();
})();
