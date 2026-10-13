/* =====================================================================
   Normalisation widgets
   1. Stepper   <div class="stepper" data-src="week01_normalisation">
                  <template data-step="unf" data-label="Flat file">…</template> …
   2. Anomalies <div class="anomaly" data-src="week01_normalisation"></div>
   3. Classifier <div class="classify"> <div class="classify-item" data-answer="partial"
                  data-why="…"><code>…</code></div> … </div>
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};
  var ROOT = document.body.getAttribute("data-root") || "";
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var cache = {};
  function load(name) {
    if (!cache[name]) cache[name] = fetch(ROOT + "data/" + name + ".json").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    return cache[name];
  }

  /* ---------- relational table renderer ---------- */
  // opts: {redundancy: bool, mark: fn(rowIdx, colIdx) -> class}
  function tableHtml(t, opts) {
    opts = opts || {};
    var names = t.cols.map(function (c) { return c.n; });
    var dupCells = {};
    if (opts.redundancy && t.redundant) {
      t.redundant.forEach(function (rule) {
        var det = names.indexOf(rule[0]); if (det < 0) return;
        var seen = {};
        t.rows.forEach(function (r, ri) {
          var key = String(r[det]);
          if (seen[key]) rule[1].forEach(function (dn) { var ci = names.indexOf(dn); if (ci >= 0) dupCells[ri + ":" + ci] = 1; });
          seen[key] = true;
        });
      });
    }
    var pkCols = t.cols.filter(function (c) { return c.pk; }).map(function (c) { return c.n; });
    var keyText = pkCols.length > 1 ? "Composite primary key: (" + pkCols.join(", ") + ")" : pkCols.length ? "Primary key: " + pkCols[0] : "No primary key yet";
    var h = '<div class="rel-table"><div class="tname">' + esc(t.name) + (t.tag ? '<span class="tag">' + esc(t.tag) + "</span>" : "") +
      '<span class="keyline' + (pkCols.length ? "" : " none") + '">' + esc(keyText) + "</span></div>";
    // a band above the header row spanning the leading key columns makes a composite key unmistakable
    var lead = 0; while (lead < t.cols.length && t.cols[lead].pk) lead++;
    var band = "";
    if (lead > 0 && lead === pkCols.length) {
      band = '<tr class="keyband"><th colspan="' + lead + '" class="kb sticky-key">' + (lead > 1 ? "composite primary key" : "primary key") + "</th>" +
        (t.cols.length > lead ? '<th colspan="' + (t.cols.length - lead) + '" class="kb-rest"></th>' : "") + "</tr>";
    }
    h += '<div class="table-wrap" data-sticky="' + lead + '"><table><thead>' + band + "<tr>" + t.cols.map(function (c) {
      var k = c.pk && c.fk ? "PK FK" : c.pk ? "PK" : c.fk ? "FK" : "";
      return '<th class="' + (c.pk ? "pk " : "") + (c.fk ? "fk" : "") + '" scope="col">' + esc(c.n) + (k ? '<span class="k">' + k + "</span>" : "") + "</th>";
    }).join("") + "</tr></thead><tbody>";
    t.rows.forEach(function (r, ri) {
      var rowCls = opts.rowClass ? opts.rowClass(ri) : "";
      h += "<tr" + (rowCls ? ' class="' + rowCls + '"' : "") + ">" + r.map(function (v, ci) {
        var cls = [];
        if (t.multi && t.multi.indexOf(ci) >= 0) cls.push("multi");
        if (dupCells[ri + ":" + ci]) cls.push("dup");
        if (opts.mark) { var m = opts.mark(ri, ci); if (m) cls.push(m); }
        var content = Array.isArray(v) ? v.map(esc).join("<br>") : esc(opts.value ? opts.value(ri, ci, v) : v);
        return "<td" + (cls.length ? ' class="' + cls.join(" ") + '"' : "") + ">" + content + "</td>";
      }).join("") + "</tr>";
    });
    h += "</tbody></table></div></div>";
    return h;
  }
  function fdHtml(fds) {
    if (!fds || !fds.length) return "";
    return '<ul class="fd-list">' + fds.map(function (f) {
      return '<li><span class="fd-badge ' + f.kind + '">' + f.kind + "</span><span>" + esc(f.lhs) + " → " + esc(f.rhs) + "</span>" +
        (f.via ? '<span class="fd-via">chain: key → ' + esc(f.via) + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  /** Pin the leading key columns of wide tables so they stay visible while scrolling sideways. */
  function stickKeys(root) {
    (root || document).querySelectorAll('.table-wrap[data-sticky]').forEach(function (w) {
      var n = +w.getAttribute("data-sticky"); if (!n) return;
      var hdr = w.querySelectorAll("thead tr:last-child th");
      var left = 0, lefts = [];
      for (var i = 0; i < n && i < hdr.length; i++) { lefts.push(left); left += hdr[i].getBoundingClientRect().width; }
      w.querySelectorAll("tr").forEach(function (tr) {
        var cells = tr.classList.contains("keyband") ? [] : tr.children;
        for (var i = 0; i < n && i < cells.length; i++) {
          cells[i].classList.add("sticky-key");
          cells[i].style.left = lefts[i] + "px";
          if (i === n - 1) cells[i].classList.add("sticky-edge");
        }
      });
      var kb = w.querySelector(".keyband .kb"); if (kb) { kb.style.left = "0px"; kb.classList.add("sticky-edge"); }
    });
  }
  Q.normalise = { tableHtml: tableHtml, load: load, stickKeys: stickKeys };

  /* =================== Stepper =================== */
  function Stepper(el) {
    var self = this;
    this.el = el;
    this.tpls = Array.prototype.slice.call(el.querySelectorAll("template[data-step]"));
    this.i = 0;
    this.redundancy = true;
    load(el.getAttribute("data-src")).then(function (d) { self.data = d; self.build(); }).catch(function (e) {
      el.innerHTML = '<div class="pg-msg err" style="margin:1rem">Could not load the normalisation data (' + esc(e.message) + "). Open the site through a web server.</div>";
    });
  }
  Stepper.prototype.build = function () {
    var self = this;
    var nav = '<div class="stepper-nav" role="tablist" aria-label="Normalisation steps">' + this.tpls.map(function (t, i) {
      return '<button type="button" role="tab" data-i="' + i + '"><span class="n">Step ' + i + "</span>" + esc(t.getAttribute("data-label") || t.getAttribute("data-step")) + "</button>";
    }).join("") + "</div>";
    var shell = document.createElement("div");
    shell.innerHTML = nav + '<div class="stepper-body"></div><div class="stepper-foot"><button class="btn" type="button" data-a="prev">← Previous</button>' +
      '<label class="small" style="display:flex;align-items:center;gap:.4rem"><input type="checkbox" data-a="dup" checked> Highlight redundant copies</label>' +
      '<button class="btn primary" type="button" data-a="next">Next →</button></div>';
    this.el.appendChild(shell);
    this.body = shell.querySelector(".stepper-body");
    shell.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-i")) self.go(+b.getAttribute("data-i"));
      else if (b.getAttribute("data-a") === "prev") self.go(self.i - 1);
      else if (b.getAttribute("data-a") === "next") self.go(self.i + 1);
    });
    shell.querySelector('[data-a="dup"]').addEventListener("change", function () { self.redundancy = this.checked; self.go(self.i); });
    this.go(0);
  };
  Stepper.prototype.go = function (i) {
    if (i < 0 || i >= this.tpls.length) return;
    this.i = i;
    var tpl = this.tpls[i], id = tpl.getAttribute("data-step"), self = this;
    this.el.querySelectorAll(".stepper-nav button").forEach(function (b, bi) { b.setAttribute("aria-selected", String(bi === i)); });
    var step = (this.data.steps || []).filter(function (s) { return s.id === id; })[0];
    var html = tpl.innerHTML;
    if (step) {
      var tables = '<div class="rel-tables">' + step.tables.map(function (t) { return tableHtml(t, { redundancy: self.redundancy }); }).join("") + "</div>";
      html = html.replace("<!--TABLES-->", tables).replace("<!--FDS-->", fdHtml(step.fds));
      if (html.indexOf("rel-tables") < 0) html += tables;
    }
    this.body.innerHTML = html;
    stickKeys(this.body);
    this.el.querySelector('[data-a="prev"]').disabled = i === 0;
    this.el.querySelector('[data-a="next"]').disabled = i === this.tpls.length - 1;
    if (window.hljs) this.body.querySelectorAll("pre code").forEach(function (c) { try { window.hljs.highlightElement(c); } catch (e) {} });
  };

  /* =================== Anomaly lab =================== */
  function Anomaly(el) {
    var self = this;
    this.el = el;
    load(el.getAttribute("data-src")).then(function (d) {
      self.table = d.steps.filter(function (s) { return s.id === "1nf"; })[0].tables[0];
      self.build();
    }).catch(function (e) { el.innerHTML = '<div class="pg-msg err">Could not load data: ' + esc(e.message) + "</div>"; });
  }
  Anomaly.prototype.build = function () {
    var self = this;
    this.el.innerHTML =
      '<div class="toolbar"><strong>Try to break the 1NF table:</strong><span class="spacer"></span>' +
      '<button class="btn" type="button" data-a="update">Update anomaly</button>' +
      '<button class="btn" type="button" data-a="insert">Insertion anomaly</button>' +
      '<button class="btn" type="button" data-a="delete">Deletion anomaly</button>' +
      '<button class="btn" type="button" data-a="reset">Reset</button></div>' +
      '<div class="anomaly-table"></div><div class="result" aria-live="polite"></div>';
    this.el.querySelector(".toolbar").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (b) self[b.getAttribute("data-a")]();
    });
    this.reset();
  };
  Anomaly.prototype.cols = function () { return this.table.cols.map(function (c) { return c.n; }); };
  Anomaly.prototype.show = function (opts, msg) {
    var t = JSON.parse(JSON.stringify(this.table));
    if (opts.extraRow) t.rows.push(opts.extraRow);
    this.el.querySelector(".anomaly-table").innerHTML = tableHtml(t, opts);
    stickKeys(this.el);
    this.el.querySelector(".result").innerHTML = msg || "";
  };
  Anomaly.prototype.reset = function () {
    this.show({}, "Pick an anomaly above. The table is the 1NF version of the shop’s flat file: one row per order line, primary key <code>(order_no, product)</code>.");
  };
  Anomaly.prototype.update = function () {
    var names = this.cols(), ph = names.indexOf("phone"), em = names.indexOf("email"), rows = this.table.rows;
    var first = -1;
    rows.forEach(function (r, i) { if (first < 0 && r[em] === "jane.morris@example.com") first = i; });
    this.show({
      value: function (ri, ci, v) { return ri === first && ci === ph ? "07700 900999" : v; },
      mark: function (ri, ci) { if (ci !== ph || rows[ri][em] !== "jane.morris@example.com") return ""; return ri === first ? "changed" : "conflict"; }
    }, "<strong>Update anomaly.</strong> Jane changes her phone number, and the clerk updates only the first row (green). Jane’s other rows (red) still hold the old number, so the table now <em>contradicts itself</em>. Every copy has to be found and changed. In 3NF her phone number is stored <strong>once</strong>, in <code>customer</code>.");
  };
  Anomaly.prototype.insert = function () {
    var names = this.cols();
    var row = names.map(function (n) {
      return { product: "Garden Peas 900g", price: "1.30", category: "Frozen", vat_rate: "0%", supplier: "Best Products Ltd", supplier_phone: "0121 496 0004" }[n] || (n === "order_no" ? "NULL ?" : "—");
    });
    var last = this.table.rows.length, on = names.indexOf("order_no");
    this.show({ extraRow: row, mark: function (ri, ci) { return ri === last ? (ci === on ? "conflict" : "ghost") : ""; } },
      "<strong>Insertion anomaly.</strong> The shop wants to list a new product, Garden Peas, that nobody has ordered yet. Every row needs an <code>order_no</code> because it is part of the primary key, and a primary key cannot be NULL. So a product cannot be recorded until someone buys it. In 3NF the product is simply a new row in <code>product</code>.");
  };
  Anomaly.prototype.delete = function () {
    var names = this.cols(), on = names.indexOf("order_no"), rows = this.table.rows;
    this.show({ rowClass: function (ri) { return rows[ri][on] === 1003 ? "deleted" : ""; } },
      "<strong>Deletion anomaly.</strong> Order 1003 is cancelled and its rows are deleted. That also wipes out the <em>only</em> record of customer Andy Green, of Olive Oil, and of the supplier Home Foods Ltd and its phone number. Facts we wanted to keep disappear with an unrelated delete. In 3NF, deleting the order removes only <code>orders</code> and <code>order_line</code> rows.");
  };

  /* =================== Classifier =================== */
  function Classify(el) {
    var opts = (el.getAttribute("data-options") || "full,partial,transitive").split(",");
    var score = el.querySelector(".classify-score");
    var items = el.querySelectorAll(".classify-item");
    function update() {
      if (!score) return;
      var right = el.querySelectorAll(".classify-item.answered.ok").length, done = el.querySelectorAll(".classify-item.answered").length;
      score.textContent = done ? right + " / " + done + " correct so far (" + items.length + " in total)" : "";
    }
    items.forEach(function (it) {
      var ans = it.getAttribute("data-answer");
      var o = document.createElement("span"); o.className = "opts";
      o.innerHTML = opts.map(function (x) { return '<button type="button" data-v="' + x + '">' + x + "</button>"; }).join("");
      it.appendChild(o);
      var why = document.createElement("span"); why.className = "why"; why.innerHTML = it.getAttribute("data-why") || ""; it.appendChild(why);
      o.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b || it.classList.contains("answered")) return;
        var v = b.getAttribute("data-v");
        it.classList.add("answered"); it.classList.toggle("ok", v === ans);
        o.querySelectorAll("button").forEach(function (x) { if (x.getAttribute("data-v") === ans) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
        why.innerHTML = (v === ans ? "<strong>Correct.</strong> " : "<strong>Not quite: it is " + ans + ".</strong> ") + (it.getAttribute("data-why") || "");
        update();
      });
    });
    var reset = el.querySelector("[data-reset]");
    if (reset) reset.addEventListener("click", function () {
      items.forEach(function (it) { it.classList.remove("answered", "ok"); it.querySelectorAll(".opts button").forEach(function (x) { x.classList.remove("right", "wrong"); }); });
      update();
    });
  }

  function initAll() {
    document.querySelectorAll(".stepper[data-src]").forEach(function (el) { if (!el.__s) el.__s = new Stepper(el); });
    document.querySelectorAll(".anomaly[data-src]").forEach(function (el) { if (!el.__a) el.__a = new Anomaly(el); });
    document.querySelectorAll(".classify").forEach(function (el) { if (!el.__c) { el.__c = true; Classify(el); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll); else initAll();
})();
