/* =====================================================================
   In-browser SQLite playground (sql.js / WebAssembly).
   Markup:
     <div class="playground" data-db="shop_v1" data-title="…" [data-setup="setup-id"]>
       <script type="text/plain" class="pg-sql">SELECT …;</script>
     </div>
   data-db: a database file in /data (without .db) or "empty".
   data-setup: id of a <script type="text/plain"> whose SQL runs after
               the database opens (and again on Reset).
   Every playground has its own private copy of the database, so
   students can INSERT/DELETE freely and press Reset to start again.
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};
  var ROOT = document.body.getAttribute("data-root") || "";
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var MAX_ROWS = 200;

  var sqlPromise = null;
  function loadSql() {
    if (sqlPromise) return sqlPromise;
    if (typeof window.initSqlJs !== "function") return Promise.reject(new Error("sql.js did not load."));
    sqlPromise = window.initSqlJs({ locateFile: function (f) { return ROOT + "assets/vendor/sqljs/" + f; } });
    return sqlPromise;
  }
  var dbBytes = {};
  function loadBytes(name) {
    if (name === "empty") return Promise.resolve(null);
    if (!dbBytes[name]) {
      dbBytes[name] = fetch(ROOT + "data/" + name + ".db").then(function (r) {
        if (!r.ok) throw new Error("Could not load data/" + name + ".db (HTTP " + r.status + ")");
        return r.arrayBuffer();
      }).then(function (b) { return new Uint8Array(b); });
    }
    return dbBytes[name];
  }
  /** Open a fresh private copy of a named database. Resolves to a sql.js Database. */
  function openDb(name, setupSql) {
    return Promise.all([loadSql(), loadBytes(name)]).then(function (r) {
      var SQL = r[0], bytes = r[1];
      var db = bytes ? new SQL.Database(bytes) : new SQL.Database();
      db.run("PRAGMA foreign_keys = ON;");
      if (setupSql) db.exec(setupSql);
      return db;
    });
  }

  /** Execute a script statement by statement, returning a list of result blocks. */
  function runScript(db, sql) {
    var out = [], idx = 0;
    var t0 = performance.now();
    try {
      var it = db.iterateStatements(sql);
      for (var stmt = it.next(); !stmt.done; stmt = it.next()) {
        var st = stmt.value; idx++;
        var text = st.getSQL ? st.getSQL() : "";
        try {
          var cols = st.getColumnNames();
          if (cols.length) {
            var rows = [], total = 0;
            while (st.step()) { total++; if (rows.length < MAX_ROWS) rows.push(st.get()); }
            out.push({ type: "table", cols: cols, rows: rows, total: total, sql: text });
          } else {
            st.step();
            var changed = db.getRowsModified();
            out.push({ type: "ok", sql: text, changed: changed });
          }
        } finally { st.free(); }
      }
    } catch (e) {
      out.push({ type: "error", message: String(e.message || e), n: idx });
    }
    return { blocks: out, ms: performance.now() - t0 };
  }

  function verbOf(sql) { var m = /^\s*(?:--[^\n]*\n\s*)*([A-Za-z]+)/.exec(sql || ""); return m ? m[1].toUpperCase() : ""; }

  function renderResults(res) {
    var html = "";
    res.blocks.forEach(function (b) {
      if (b.type === "table") {
        html += '<div class="table-wrap"><table><thead><tr>' + b.cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
        if (!b.rows.length) html += '<tr><td colspan="' + b.cols.length + '" class="null">(no rows)</td></tr>';
        b.rows.forEach(function (r) {
          html += "<tr>" + r.map(function (v) {
            if (v === null) return '<td class="null">NULL</td>';
            if (v instanceof Uint8Array) return '<td class="null">BLOB (' + v.length + " bytes)</td>";
            var num = typeof v === "number";
            return "<td" + (num ? ' class="num"' : "") + ">" + esc(v) + "</td>";
          }).join("") + "</tr>";
        });
        html += "</tbody></table></div>";
        html += '<div class="rowcount">' + b.total + " row" + (b.total === 1 ? "" : "s") + (b.total > b.rows.length ? " (showing first " + b.rows.length + ")" : "") + "</div>";
      } else if (b.type === "ok") {
        var v = verbOf(b.sql);
        var msg = /^(INSERT|UPDATE|DELETE|REPLACE)$/.test(v) ? v + " OK: " + b.changed + " row" + (b.changed === 1 ? "" : "s") + " affected." : (v || "Statement") + " OK.";
        html += '<div class="pg-msg ok">✓ ' + esc(msg) + "</div>";
      } else if (b.type === "error") {
        html += '<div class="pg-msg err">✗ Error in statement ' + b.n + ": " + esc(b.message) + "</div>";
      }
    });
    if (!res.blocks.length) html = '<div class="pg-msg info">Nothing to run. Type a SQL statement first.</div>';
    return html;
  }

  var instances = [];

  function Playground(el) {
    this.el = el;
    this.dbName = el.getAttribute("data-db") || "shop_v1";
    var setupId = el.getAttribute("data-setup"), setupSrc = el.getAttribute("data-setup-src");
    var inline = setupId && document.getElementById(setupId) ? document.getElementById(setupId).textContent : "";
    // data-setup-src: a .sql file (relative to the site root) run after the database opens
    this.setupPromise = setupSrc ? fetch(ROOT + setupSrc).then(function (r) {
      if (!r.ok) throw new Error("Could not load " + setupSrc + " (HTTP " + r.status + ")"); return r.text();
    }) : Promise.resolve(inline);
    var src = el.querySelector(".pg-sql");
    this.original = src ? src.textContent.replace(/^\n/, "").replace(/\s+$/, "") + "\n" : "";
    this.build();
    this.db = null;
    this.ready = this.reset(true);
  }
  Playground.prototype.build = function () {
    var el = this.el, self = this;
    var title = el.getAttribute("data-title") || "SQL playground";
    var dbLabel = this.dbName === "empty" ? "empty database" : this.dbName + ".db";
    el.innerHTML =
      '<div class="pg-head"><span class="pg-title">' + esc(title) + ' <span class="db">' + esc(dbLabel) + "</span></span><span class=\"spacer\"></span>" +
      '<button class="btn primary" data-a="run" type="button" title="Run (Ctrl+Enter)"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>Run</button>' +
      '<button class="btn" data-a="reset" type="button" title="Restore the original query and a fresh copy of the database">Reset</button>' +
      '<button class="btn" data-a="copy" type="button">Copy</button>' +
      '<button class="btn" data-a="schema" type="button" title="List tables and columns">Schema</button></div>' +
      '<div class="pg-editor"><textarea class="fallback" spellcheck="false" aria-label="SQL editor"></textarea></div>' +
      '<div class="pg-out" aria-live="polite"></div>' +
      '<div class="pg-foot"><span class="pg-status">Loading SQLite…</span><span class="spacer"></span><span class="pg-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs · select text to run just that part · changes stay in your browser</span></div>';
    this.out = el.querySelector(".pg-out");
    this.status = el.querySelector(".pg-status");
    var ta = el.querySelector("textarea");
    ta.value = this.original;
    if (window.CodeMirror) {
      this.cm = window.CodeMirror.fromTextArea(ta, {
        mode: "text/x-sqlite", lineNumbers: true, matchBrackets: true, indentUnit: 2, tabSize: 2, lineWrapping: false,
        viewportMargin: Infinity,
        extraKeys: { "Ctrl-Enter": function () { self.run(); }, "Cmd-Enter": function () { self.run(); }, "Tab": false, "Shift-Tab": false }
      });
    } else {
      this.ta = ta;
      ta.addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); self.run(); } });
    }
    el.querySelector(".pg-head").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "run") self.run(); else if (a === "reset") self.reset(); else if (a === "copy") Q.copyText ? Q.copyText(self.getValue(), b) : null; else if (a === "schema") self.schema();
    });
  };
  Playground.prototype.getValue = function () { return this.cm ? this.cm.getValue() : this.ta.value; };
  Playground.prototype.setValue = function (v) { if (this.cm) this.cm.setValue(v); else this.ta.value = v; };
  Playground.prototype.getRunText = function () {
    if (this.cm && this.cm.somethingSelected()) return this.cm.getSelection();
    if (this.ta && this.ta.selectionEnd > this.ta.selectionStart) return this.ta.value.slice(this.ta.selectionStart, this.ta.selectionEnd);
    return this.getValue();
  };
  Playground.prototype.reset = function (initial) {
    var self = this;
    if (!initial) { this.setValue(this.original); this.out.innerHTML = ""; }
    this.status.textContent = "Loading SQLite…";
    if (this.db) { try { this.db.close(); } catch (e) {} this.db = null; }
    return this.setupPromise.then(function (setup) { return openDb(self.dbName, setup); }).then(function (db) {
      self.db = db;
      self.status.textContent = initial ? "Ready. Press Run to execute the query." : "Reset: original query and a fresh copy of the database restored.";
    }).catch(function (e) {
      var hint = location.protocol === "file:" ? " Open the site through a web server (see Setup → Run the site locally) rather than double-clicking the HTML file." : "";
      self.status.textContent = "Could not start SQLite.";
      self.out.innerHTML = '<div class="pg-msg err">' + esc(e.message || e) + esc(hint) + "</div>";
    });
  };
  Playground.prototype.run = function () {
    var self = this;
    this.ready.then(function () {
      if (!self.db) return;
      var res = runScript(self.db, self.getRunText());
      self.out.innerHTML = renderResults(res);
      var errors = res.blocks.filter(function (b) { return b.type === "error"; }).length;
      self.status.textContent = (errors ? "Finished with an error" : "Done") + " in " + res.ms.toFixed(1) + " ms · " + res.blocks.length + " statement" + (res.blocks.length === 1 ? "" : "s");
      self.el.dispatchEvent(new CustomEvent("pg:run", { detail: res, bubbles: true }));
    });
  };
  Playground.prototype.schema = function () {
    var self = this;
    this.ready.then(function () {
      if (!self.db) return;
      var r = runScript(self.db,
        "SELECT m.name AS \"table\", p.name AS \"column\", p.type AS \"type\", CASE WHEN p.pk > 0 THEN 'PK' ELSE '' END AS \"key\", " +
        "CASE WHEN p.\"notnull\" THEN 'NOT NULL' ELSE '' END AS \"null?\" FROM sqlite_master m JOIN pragma_table_info(m.name) p " +
        "WHERE m.type = 'table' AND m.name NOT LIKE 'sqlite_%' ORDER BY m.name, p.cid;");
      self.out.innerHTML = '<div class="pg-msg info">Schema of this database (tables and columns):</div>' + renderResults(r);
      self.status.textContent = "Schema listed.";
    });
  };

  function initAll(root) {
    (root || document).querySelectorAll(".playground").forEach(function (el) {
      if (el.__pg) return;
      el.__pg = new Playground(el);
      instances.push(el.__pg);
    });
  }
  function refreshEditors() { instances.forEach(function (p) { if (p.cm) p.cm.refresh(); }); }
  document.addEventListener("qho541:tab", function () { setTimeout(refreshEditors, 0); });
  document.addEventListener("qho541:present", function () { setTimeout(refreshEditors, 0); });
  document.addEventListener("toggle", function () { setTimeout(refreshEditors, 0); }, true);

  Q.sql = { load: loadSql, openDb: openDb, run: runScript, render: renderResults, initAll: initAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initAll(); }); else initAll();
})();
