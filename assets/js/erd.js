/* =====================================================================
   ER diagram renderer: one model, two notations (Crow's Foot / Chen).
   Markup:  <div class="erd-widget" data-model="shop" [data-notation="crow|chen"]
                 [data-lock="crow"] [data-caption="…"]></div>
   Models live in erd-models.js. Cardinality of a relationship end is
   [min, max] = how many instances of THAT entity relate to ONE instance
   of the entity at the other end ("look-across" reading).
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};
  var NS = "http://www.w3.org/2000/svg";
  var PREF_KEY = "qho541.erdNotation";
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  /* ---------- text measuring ---------- */
  var mctx = null;
  function textW(t, size, weight) {
    try {
      if (!mctx) mctx = document.createElement("canvas").getContext("2d");
      mctx.font = (weight || 400) + " " + size + "px Segoe UI, system-ui, Arial, sans-serif";
      return mctx.measureText(t).width;
    } catch (e) { return t.length * size * 0.56; }
  }

  /* ---------- wording helpers ---------- */
  function phrase(end) {
    var min = end[0], max = end[1];
    if (max === 1) return min === 0 ? "zero or one" : "exactly one";
    return min === 0 ? "zero or many" : "one or many";
  }
  function plural(label, end) { return end[1] === 1 ? label : label + (/(s|x)$/i.test(label) ? "" : "s"); }
  function nice(label) { return label.replace(/_/g, " ").toLowerCase(); }
  function sentences(model, rel) {
    if (rel.text) return rel.text;
    var A = model.entities[rel.a].label, B = model.entities[rel.b].label;
    if (rel.roles) { A = A + " (as " + rel.roles[0] + ")"; B = B + " (as " + rel.roles[1] + ")"; }
    return [
      "Each " + nice(A) + " " + rel.verb + " " + phrase(rel.bEnd) + " " + nice(plural(B, rel.bEnd)) + ".",
      "Each " + nice(B) + " " + rel.inv + " " + phrase(rel.aEnd) + " " + nice(plural(A, rel.aEnd)) + "."
    ];
  }
  function ratio(rel) {
    var a = rel.aEnd[1] === 1 ? "1" : "M", b = rel.bEnd[1] === 1 ? "1" : "N";
    if (a === "1" && b === "1") return "one-to-one (1:1)";
    if (a === "M" && b === "N") return "many-to-many (M:N)";
    return "one-to-many (1:N)";
  }

  /* ---------- svg helpers ---------- */
  function el(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  /* =================================================================
     Crow's Foot
     ================================================================= */
  var HEAD = 30, ROW = 22, PAD = 8;
  function boxH(ent) { return HEAD + ent.attrs.length * ROW + PAD; }

  function sidePoint(box, side, t) {
    t = t === undefined ? 0.5 : t;
    if (side === "left") return { x: box.x, y: box.y + box.h * t, nx: -1, ny: 0 };
    if (side === "right") return { x: box.x + box.w, y: box.y + box.h * t, nx: 1, ny: 0 };
    if (side === "top") return { x: box.x + box.w * t, y: box.y, nx: 0, ny: -1 };
    return { x: box.x + box.w * t, y: box.y + box.h, nx: 0, ny: 1 };
  }

  // Draw the end symbol for cardinality `end` at point p with outward normal (nx, ny).
  function crowEnd(g, p, end) {
    var ux = p.nx, uy = p.ny, vx = -uy, vy = ux;
    function P(d, s) { return (p.x + ux * d + vx * s).toFixed(1) + "," + (p.y + uy * d + vy * s).toFixed(1); }
    function bar(d) { el("path", { d: "M" + P(d, -8) + "L" + P(d, 8), "class": "rel-sym" }, g); }
    function crow() { el("path", { d: "M" + P(0, -9) + "L" + P(15, 0) + "L" + P(0, 9) + "M" + P(0, 0) + "L" + P(15, 0), "class": "rel-sym" }, g); }
    function circle(d) { var c = P(d, 0).split(","); el("circle", { cx: c[0], cy: c[1], r: 5.5, "class": "rel-sym-circle" }, g); }
    var many = end[1] !== 1, opt = end[0] === 0;
    if (many) { crow(); if (opt) circle(24); else bar(21); }
    else { bar(8); if (opt) circle(21); else bar(15); }
  }

  function routeCrow(pa, pb) {
    // orthogonal route between two side points, leaving each box along its normal
    var pts = [[pa.x, pa.y]];
    var horizA = pa.nx !== 0, horizB = pb.nx !== 0;
    if (horizA && horizB) {
      if (Math.abs(pa.y - pb.y) < 0.5) { pts.push([pb.x, pb.y]); }
      else { var mx = (pa.x + pb.x) / 2; pts.push([mx, pa.y], [mx, pb.y], [pb.x, pb.y]); }
    } else if (!horizA && !horizB) {
      if (Math.abs(pa.x - pb.x) < 0.5) { pts.push([pb.x, pb.y]); }
      else { var my = (pa.y + pb.y) / 2; pts.push([pa.x, my], [pb.x, my], [pb.x, pb.y]); }
    } else if (horizA) { pts.push([pb.x, pa.y], [pb.x, pb.y]); }
    else { pts.push([pa.x, pb.y], [pb.x, pb.y]); }
    return pts;
  }

  function renderCrow(model, view, svg) {
    var boxes = {};
    Object.keys(view.pos).forEach(function (id) {
      var p = view.pos[id], ent = model.entities[id];
      boxes[id] = { x: p.x, y: p.y, w: p.w || 230, h: boxH(ent) };
    });
    var gRels = el("g", {}, svg), gEnts = el("g", {}, svg);
    // relationships
    view.links.forEach(function (lk) {
      var rel = model.rels[lk.rel];
      var A = boxes[rel.a], B = boxes[rel.b];
      var pa, pb;
      var horizontalPair = (lk.aSide === "left" || lk.aSide === "right") && (lk.bSide === "left" || lk.bSide === "right");
      var verticalPair = (lk.aSide === "top" || lk.aSide === "bottom") && (lk.bSide === "top" || lk.bSide === "bottom");
      if (horizontalPair && lk.at === undefined && lk.aT === undefined) {
        var lo = Math.max(A.y + HEAD, B.y + HEAD), hi = Math.min(A.y + A.h, B.y + B.h);
        if (hi > lo) { var yy = (lo + hi) / 2; pa = sidePoint(A, lk.aSide, (yy - A.y) / A.h); pb = sidePoint(B, lk.bSide, (yy - B.y) / B.h); }
      } else if (verticalPair && lk.aT === undefined) {
        var lx = Math.max(A.x, B.x), hx = Math.min(A.x + A.w, B.x + B.w);
        if (hx > lx) { var xx = (lx + hx) / 2; pa = sidePoint(A, lk.aSide, (xx - A.x) / A.w); pb = sidePoint(B, lk.bSide, (xx - B.x) / B.w); }
      }
      if (!pa) { pa = sidePoint(A, lk.aSide, lk.aT); pb = sidePoint(B, lk.bSide, lk.bT); }
      var g = el("g", { "class": "rel", "data-rel": lk.rel }, gRels);
      var pts;
      if (rel.a === rel.b) {
        // unary (recursive) relationship: loop out of one side and back into another
        var off = lk.loop || 36;
        pts = [[pa.x, pa.y], [pa.x + pa.nx * off, pa.y + pa.ny * off]];
        var corner = pa.nx !== 0 ? [pa.x + pa.nx * off, pb.y + pb.ny * off] : [pb.x + pb.nx * off, pa.y + pa.ny * off];
        pts.push(corner, [pb.x + pb.nx * off, pb.y + pb.ny * off], [pb.x, pb.y]);
      } else {
        pts = routeCrow(pa, pb);
      }
      // Coronel & Morris / MySQL Workbench convention: solid = identifying, dashed = non-identifying
      el("polyline", { points: pts.map(function (q) { return q.join(","); }).join(" "), "class": "rel-line" + (rel.identifying === false ? " non-identifying" : "") }, g);
      // wide transparent hit area for clicking
      el("polyline", { points: pts.map(function (q) { return q.join(","); }).join(" "), fill: "none", stroke: "transparent", "stroke-width": 14 }, g);
      crowEnd(g, pa, rel.aEnd);
      crowEnd(g, pb, rel.bEnd);
      // label on the longest segment
      var best = 0, bi = 0;
      for (var i = 0; i < pts.length - 1; i++) { var L = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]); if (L > best) { best = L; bi = i; } }
      var mx = (pts[bi][0] + pts[bi + 1][0]) / 2 + (lk.lx || 0), my = (pts[bi][1] + pts[bi + 1][1]) / 2 + (lk.ly || 0);
      // short horizontal segment: lift the label above the line so it never hides the end symbols
      if (pts[bi][1] === pts[bi + 1][1] && best < 150 && lk.ly === undefined) my -= 14;
      var lbl = lk.label || rel.verb;
      var tw = textW(lbl, 11.5, 400) + 10;
      el("rect", { x: mx - tw / 2, y: my - 9, width: tw, height: 18, rx: 4, "class": "rel-label-bg" }, g);
      el("text", { x: mx, y: my + 4, "text-anchor": "middle", "class": "rel-label" }, g, lbl);
    });
    // entities
    Object.keys(boxes).forEach(function (id) {
      var b = boxes[id], ent = model.entities[id];
      var g = el("g", { "class": "ent", "data-ent": id }, gEnts);
      el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 6, "class": "ent-body" }, g);
      el("path", { d: "M" + b.x + "," + (b.y + HEAD) + "V" + (b.y + 6) + "q0,-6 6,-6H" + (b.x + b.w - 6) + "q6,0 6,6V" + (b.y + HEAD) + "Z", "class": "ent-head" }, g);
      el("text", { x: b.x + b.w / 2, y: b.y + 20, "text-anchor": "middle", "class": "ent-head-text", "font-size": 13.5 }, g, ent.label);
      ent.attrs.forEach(function (a, i) {
        var y = b.y + HEAD + 16 + i * ROW, keys = a[1] || "", type = a[2] || "";
        var isPk = /PK/.test(keys), isFk = /FK/.test(keys);
        if (keys) el("text", { x: b.x + 8, y: y, "class": "ent-key " + (isPk ? "ent-row-pk" : isFk ? "ent-row-fk" : ""), "font-size": 9.5 }, g, keys);
        el("text", { x: b.x + 54, y: y, "font-size": 12.5, "class": isPk ? "ent-row-pk" : isFk ? "ent-row-fk" : "", "text-decoration": isPk ? "underline" : null }, g, a[0]);
        if (type) el("text", { x: b.x + b.w - 8, y: y, "text-anchor": "end", "font-size": 10.5, opacity: 0.6 }, g, type);
      });
      if (b.h > HEAD + ROW) el("line", { x1: b.x + 46, y1: b.y + HEAD, x2: b.x + 46, y2: b.y + b.h, stroke: "var(--border)", "stroke-width": 1 }, g);
    });
  }

  /* =================================================================
     Chen
     ================================================================= */
  var EW = 128, EH = 46, DW = 124, DH = 62;

  function entityEdge(c, toward) {
    // point where the segment from rect centre c toward `toward` leaves the rectangle
    var dx = toward.x - c.x, dy = toward.y - c.y;
    var sx = dx === 0 ? Infinity : (EW / 2) / Math.abs(dx), sy = dy === 0 ? Infinity : (EH / 2) / Math.abs(dy);
    var s = Math.min(sx, sy);
    return { x: c.x + dx * s, y: c.y + dy * s };
  }
  function diamondEdge(c, toward) {
    var dx = toward.x - c.x, dy = toward.y - c.y;
    var s = 1 / (Math.abs(dx) / (DW / 2) + Math.abs(dy) / (DH / 2));
    return { x: c.x + dx * s, y: c.y + dy * s };
  }
  function doubleLine(g, p, q, cls) {
    var dx = q.x - p.x, dy = q.y - p.y, L = Math.sqrt(dx * dx + dy * dy) || 1, ox = -dy / L * 2.6, oy = dx / L * 2.6;
    el("line", { x1: p.x + ox, y1: p.y + oy, x2: q.x + ox, y2: q.y + oy, "class": cls }, g);
    el("line", { x1: p.x - ox, y1: p.y - oy, x2: q.x - ox, y2: q.y - oy, "class": cls }, g);
  }
  function attrOval(g, cx, cy, name, opts, from) {
    opts = opts || {};
    var w = textW(name, 11, opts.pk ? 700 : 400) + 22, rx = Math.max(34, w / 2), ry = 14;
    if (from) {
      // connect from the edge of the owning shape to the oval edge
      var dx = cx - from.x, dy = cy - from.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
      el("line", { x1: from.ex, y1: from.ey, x2: cx - dx * t, y2: cy - dy * t, "class": "chen-line" }, g);
    }
    el("ellipse", { cx: cx, cy: cy, rx: rx, ry: ry, "class": "chen-attr" + (opts.derived ? " derived" : "") }, g);
    var t = el("text", { x: cx, y: cy + 4, "text-anchor": "middle", "class": "attr-text" + (opts.pk ? " pk" : ""), "font-size": 11 }, g, name);
    if (opts.pk) t.setAttribute("text-decoration", "underline");
  }

  function renderChen(model, view, svg) {
    var gLines = el("g", {}, svg), gShapes = el("g", {}, svg);
    var C = view.pos;
    // relationships
    Object.keys(view.rels).forEach(function (rid) {
      var rel = model.rels[rid], d = view.rels[rid];
      var g = el("g", { "class": "rel", "data-rel": rid }, gShapes);
      var lines = el("g", { "class": "rel", "data-rel": rid }, gLines);
      var self = rel.a === rel.b;
      [["a", rel.a, rel.bEnd, rel.aEnd], ["b", rel.b, rel.aEnd, rel.bEnd]].forEach(function (side) {
        var ent = C[side[1]], otherEnd = side[2], ownEnd = side[3];
        var p, q;
        if (self) {
          // two separate connectors for the two roles of the same entity
          var anchor = side[0] === "a" ? (d.aAt || { x: ent.x + EW / 2, y: ent.y }) : (d.bAt || { x: ent.x, y: ent.y + EH / 2 });
          p = anchor;
          q = diamondEdge(d, { x: anchor.x, y: anchor.y });
          var mid = side[0] === "a" ? { x: q.x, y: p.y } : { x: p.x, y: q.y };
          el("polyline", { points: [p.x, p.y, mid.x, mid.y, q.x, q.y].join(","), "class": "chen-line" }, lines);
          el("polyline", { points: [p.x, p.y, mid.x, mid.y, q.x, q.y].join(","), fill: "none", stroke: "transparent", "stroke-width": 12 }, lines);
          var lbl0 = ownEnd[1] === 1 ? "1" : "N";
          el("text", { x: (side[0] === "a" ? p.x + 12 : p.x - 12), y: (side[0] === "a" ? p.y - 8 : p.y + 18), "text-anchor": "middle", "class": "chen-card" }, g, lbl0);
          if (rel.roles) el("text", { x: mid.x + (side[0] === "a" ? 6 : -8), y: mid.y + (side[0] === "a" ? -8 : 4), "text-anchor": side[0] === "a" ? "start" : "end", "class": "rel-label" }, g, rel.roles[side[0] === "a" ? 0 : 1]);
          return;
        }
        p = entityEdge(ent, d); q = diamondEdge(d, ent);
        // participation of this entity is total if every instance must take part,
        // i.e. the minimum at the OTHER end is at least 1
        var total = otherEnd[0] >= 1;
        if (total) doubleLine(lines, p, q, "chen-line"); else el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, "class": "chen-line" }, lines);
        // wide hit area
        el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "transparent", "stroke-width": 12 }, lines);
        // cardinality label (look-across): max of THIS entity's own end, placed next to the entity
        var lbl = ownEnd[1] === 1 ? "1" : (otherEnd[1] === 1 ? "N" : (side[0] === "a" ? "M" : "N"));
        var dx = q.x - p.x, dy = q.y - p.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
        var t = Math.min(16, L * 0.35);
        var lx = p.x + dx / L * t - dy / L * 11, ly = p.y + dy / L * t + dx / L * 11;
        el("text", { x: lx, y: ly + 4, "text-anchor": "middle", "class": "chen-card" }, g, lbl);
      });
      var pts = [[d.x, d.y - DH / 2], [d.x + DW / 2, d.y], [d.x, d.y + DH / 2], [d.x - DW / 2, d.y]].map(function (q) { return q.join(","); }).join(" ");
      el("polygon", { points: pts, "class": "chen-rel" }, g);
      if (rel.identifying) {
        var pts2 = [[d.x, d.y - DH / 2 + 6], [d.x + DW / 2 - 10, d.y], [d.x, d.y + DH / 2 - 6], [d.x - DW / 2 + 10, d.y]].map(function (q) { return q.join(","); }).join(" ");
        el("polygon", { points: pts2, "class": "chen-rel" }, g);
      }
      el("text", { x: d.x, y: d.y + 4, "text-anchor": "middle", "class": "chen-relname" }, g, rel.chen || rel.verb.toUpperCase());
      (d.attrs || []).forEach(function (a) {
        var cx = d.x + a[1], cy = d.y + a[2];
        var from = diamondEdge(d, { x: cx, y: cy });
        attrOval(g, cx, cy, a[0], {}, { x: d.x, y: d.y, ex: from.x, ey: from.y });
      });
    });
    // entities and attributes
    Object.keys(C).forEach(function (id) {
      var c = C[id], ent = model.entities[id];
      var weak = (view.weak || []).indexOf(id) >= 0;
      var ga = el("g", { "class": "attrs", "data-ent": id }, gShapes);
      (view.attrs[id] || []).forEach(function (a) {
        var cx = c.x + a[1], cy = c.y + a[2];
        var from = entityEdge(c, { x: cx, y: cy });
        attrOval(ga, cx, cy, a[0], { pk: !!a[3], derived: a[4] === "derived" }, { x: c.x, y: c.y, ex: from.x, ey: from.y });
      });
      var g = el("g", { "class": "ent", "data-ent": id }, gShapes);
      el("rect", { x: c.x - EW / 2, y: c.y - EH / 2, width: EW, height: EH, "class": "chen-entity" }, g);
      if (weak) el("rect", { x: c.x - EW / 2 + 5, y: c.y - EH / 2 + 5, width: EW - 10, height: EH - 10, "class": "chen-entity" }, g);
      el("text", { x: c.x, y: c.y + 5, "text-anchor": "middle", "class": "chen-name", "font-size": 12.5 }, g, ent.label);
    });
  }

  /* =================================================================
     Legends
     ================================================================= */
  function legendCrow() {
    function sym(end) {
      var s = '<svg width="74" height="22" viewBox="0 0 74 22" aria-hidden="true"><line x1="0" y1="11" x2="74" y2="11" stroke="var(--dg-stroke)" stroke-width="1.6"/>';
      var g = document.createElementNS(NS, "g");
      crowEnd(g, { x: 74, y: 11, nx: -1, ny: 0 }, end);
      var tmp = document.createElement("div"); tmp.appendChild(g);
      return s + tmp.innerHTML.replace(/class="rel-sym-circle"/g, 'fill="var(--dg-entity-bg)" stroke="var(--dg-stroke)" stroke-width="1.6"').replace(/class="rel-sym"/g, 'fill="none" stroke="var(--dg-stroke)" stroke-width="1.6"') + "</svg>";
    }
    return '<div class="erd-legend"><span>' + sym([1, 1]) + " exactly one</span><span>" + sym([0, 1]) + " zero or one</span><span>" + sym([1, "N"]) + " one or many</span><span>" + sym([0, "N"]) +
      ' zero or many</span><span><b style="color:var(--dg-pk)">PK</b> primary key · <b style="color:var(--dg-fk)">FK</b> foreign key · UQ unique</span>' +
      '<span><svg width="44" height="10" aria-hidden="true"><line x1="0" y1="5" x2="44" y2="5" stroke="var(--dg-stroke)" stroke-width="1.6"/></svg> identifying (child’s PK includes the parent key)</span>' +
      '<span><svg width="44" height="10" aria-hidden="true"><line x1="0" y1="5" x2="44" y2="5" stroke="var(--dg-stroke)" stroke-width="1.6" stroke-dasharray="6 4"/></svg> non-identifying</span></div>';
  }
  function legendChen() {
    var st = 'stroke="var(--dg-stroke)" stroke-width="1.5"';
    return '<div class="erd-legend">' +
      '<span><svg width="44" height="22"><rect x="2" y="3" width="40" height="16" fill="var(--dg-entity-bg)" ' + st + '/></svg> entity</span>' +
      '<span><svg width="44" height="22"><rect x="2" y="2" width="40" height="18" fill="var(--dg-entity-bg)" ' + st + '/><rect x="5" y="5" width="34" height="12" fill="none" ' + st + '/></svg> weak entity</span>' +
      '<span><svg width="44" height="24"><polygon points="22,2 42,12 22,22 2,12" fill="var(--dg-rel-bg)" stroke="var(--dg-rel-stroke)" stroke-width="1.5"/></svg> relationship</span>' +
      '<span><svg width="44" height="22"><ellipse cx="22" cy="11" rx="19" ry="8" fill="var(--dg-attr-bg)" ' + st + '/></svg> attribute (<u>underlined</u> = key)</span>' +
      '<span><svg width="44" height="14"><line x1="2" y1="7" x2="42" y2="7" ' + st + '/></svg> partial participation</span>' +
      '<span><svg width="44" height="14"><line x1="2" y1="5" x2="42" y2="5" ' + st + '/><line x1="2" y1="9.5" x2="42" y2="9.5" ' + st + '/></svg> total participation</span>' +
      '<span><b style="color:var(--c-assess)">1 / N / M</b> cardinality</span></div>';
  }

  /* =================================================================
     Widget
     ================================================================= */
  function prefNotation() { return (Q.store && Q.store.get(PREF_KEY, "crow")) || "crow"; }

  function Widget(host) {
    this.host = host;
    this.model = (Q.erdModels || {})[host.getAttribute("data-model")];
    if (!this.model) { host.innerHTML = '<div class="pg-msg err">Unknown ER model: ' + esc(host.getAttribute("data-model")) + "</div>"; return; }
    this.lock = host.getAttribute("data-lock");
    this.notation = this.lock || host.getAttribute("data-notation") || prefNotation();
    if (!this.model.views[this.notation]) this.notation = Object.keys(this.model.views)[0];
    this.build();
  }
  Widget.prototype.build = function () {
    var self = this, host = this.host, m = this.model;
    var hasBoth = m.views.crow && m.views.chen && !this.lock;
    host.innerHTML =
      '<div class="toolbar">' +
      (hasBoth ? '<div class="seg" role="group" aria-label="ER notation"><button type="button" data-n="crow">Crow’s Foot</button><button type="button" data-n="chen">Chen</button></div>' :
        '<span class="chip">' + (this.notation === "crow" ? "Crow’s Foot notation" : "Chen notation") + "</span>") +
      '<span class="spacer"></span><button class="btn" type="button" data-a="clear" title="Clear highlighting">Clear</button>' +
      '<button class="btn" type="button" data-a="svg" title="Download this diagram as an SVG file">Download SVG</button></div>' +
      '<div class="erd-canvas" role="img"></div><div class="erd-legend-wrap"></div>' +
      '<div class="erd-info" aria-live="polite"></div>' +
      (host.getAttribute("data-caption") ? '<figcaption>' + host.getAttribute("data-caption") + "</figcaption>" : "");
    this.canvas = host.querySelector(".erd-canvas");
    this.info = host.querySelector(".erd-info");
    host.querySelector(".toolbar").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-n")) { self.setNotation(b.getAttribute("data-n"), true); }
      else if (b.getAttribute("data-a") === "clear") self.focus(null);
      else if (b.getAttribute("data-a") === "svg") self.download();
    });
    this.canvas.addEventListener("click", function (e) {
      var r = e.target.closest("g.rel"), en = e.target.closest("g.ent, g.attrs");
      if (r) self.focus({ rel: r.getAttribute("data-rel") });
      else if (en) self.focus({ ent: en.getAttribute("data-ent") });
      else self.focus(null);
    });
    this.render();
  };
  Widget.prototype.setNotation = function (n, broadcast) {
    if (this.lock || !this.model.views[n]) return;
    this.notation = n;
    this.render();
    if (broadcast) {
      if (Q.store) Q.store.set(PREF_KEY, n);
      document.dispatchEvent(new CustomEvent("qho541:erd-notation", { detail: { n: n, src: this } }));
    }
  };
  Widget.prototype.render = function () {
    var m = this.model, view = m.views[this.notation];
    this.host.querySelectorAll(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-n") === this.notation)); }, this);
    this.canvas.innerHTML = "";
    this.canvas.style.setProperty("--erd-min", (view.minWidth || Math.min(view.w, 760)) + "px");
    var svg = el("svg", { viewBox: "0 0 " + view.w + " " + view.h, width: view.w, height: view.h, xmlns: NS, "aria-label": m.title + " — " + (this.notation === "crow" ? "Crow's Foot" : "Chen") + " notation" }, this.canvas);
    svg.style.width = "100%"; svg.style.height = "auto"; svg.style.maxWidth = view.w + "px";
    el("title", {}, svg, m.title + " (" + (this.notation === "crow" ? "Crow's Foot" : "Chen") + " notation)");
    if (this.notation === "crow") renderCrow(m, view, svg); else renderChen(m, view, svg);
    this.svg = svg;
    this.host.querySelector(".erd-legend-wrap").innerHTML = this.notation === "crow" ? legendCrow() : legendChen();
    this.focus(this.current || null, true);
  };
  Widget.prototype.focus = function (sel, keep) {
    this.current = sel;
    var m = this.model, canvas = this.canvas, notation = this.notation, view = m.views[notation];
    canvas.classList.toggle("focus", !!sel);
    canvas.querySelectorAll(".hl").forEach(function (n) { n.classList.remove("hl"); });
    if (!sel) {
      this.info.innerHTML = view.note || "<strong>Tip:</strong> click an entity or a relationship line to see what it means.";
      return;
    }
    var html = "";
    if (sel.rel) {
      var rel = m.rels[sel.rel];
      if (!rel || !canvas.querySelector('[data-rel="' + sel.rel + '"]')) { this.focus(null); return; }
      canvas.querySelectorAll('[data-rel="' + sel.rel + '"]').forEach(function (n) { n.classList.add("hl"); });
      [rel.a, rel.b].forEach(function (e) { canvas.querySelectorAll('[data-ent="' + e + '"]').forEach(function (n) { n.classList.add("hl"); }); });
      var s = sentences(m, rel);
      html = "<strong>" + esc(m.entities[rel.a].label) + " — " + esc(rel.verb) + " — " + esc(m.entities[rel.b].label) + "</strong> · " + ratio(rel) + "<br>" + esc(s[0]) + "<br>" + esc(s[1]);
      if (notation === "chen") {
        var pa = rel.bEnd[0] >= 1 ? "total" : "partial", pb = rel.aEnd[0] >= 1 ? "total" : "partial";
        html += '<br><span class="muted">Participation: ' + esc(nice(m.entities[rel.a].label)) + " = " + pa + ", " + esc(nice(m.entities[rel.b].label)) + " = " + pb + ".</span>";
      }
      if (rel.impl) html += '<br><span class="muted">Implemented in SQLite by: ' + rel.impl + "</span>";
      if (rel.note) html += '<br><span class="muted">' + rel.note + "</span>";
    } else if (sel.ent) {
      var ent = m.entities[sel.ent];
      if (!ent || !canvas.querySelector('[data-ent="' + sel.ent + '"]')) { this.focus(null); return; }
      canvas.querySelectorAll('[data-ent="' + sel.ent + '"]').forEach(function (n) { n.classList.add("hl"); });
      var rels = Object.keys(m.rels).filter(function (k) { return (m.rels[k].a === sel.ent || m.rels[k].b === sel.ent) && canvas.querySelector('[data-rel="' + k + '"]'); });
      rels.forEach(function (k) {
        canvas.querySelectorAll('[data-rel="' + k + '"]').forEach(function (n) { n.classList.add("hl"); });
        var o = m.rels[k].a === sel.ent ? m.rels[k].b : m.rels[k].a;
        canvas.querySelectorAll('g.ent[data-ent="' + o + '"]').forEach(function (n) { n.classList.add("hl"); });
      });
      var pk = ent.attrs.filter(function (a) { return /PK/.test(a[1] || ""); }).map(function (a) { return a[0]; });
      var fk = ent.attrs.filter(function (a) { return /FK/.test(a[1] || ""); }).map(function (a) { return a[0]; });
      html = "<strong>" + esc(ent.label) + "</strong>" + (ent.desc ? " — " + esc(ent.desc) : "") +
        "<br>Primary key: <code>" + esc(pk.join(", ") || "—") + "</code>" + (fk.length ? " · Foreign key(s): <code>" + esc(fk.join(", ")) + "</code>" : "");
      if (notation === "chen" && fk.length) html += '<br><span class="muted">Chen diagrams do not show foreign keys: the relationship diamonds carry that information.</span>';
      if (ent.note) html += '<br><span class="muted">' + ent.note + "</span>";
      if (rels.length) html += "<br>" + rels.map(function (k) { var s = sentences(m, m.rels[k]); return esc(m.rels[k].a === sel.ent ? s[0] : s[1]); }).join(" ");
    }
    this.info.innerHTML = html;
  };
  Widget.prototype.download = function () {
    // inline computed styles so the exported SVG looks right outside the site
    var clone = this.svg.cloneNode(true);
    var src = this.svg.querySelectorAll("*"), dst = clone.querySelectorAll("*");
    var props = ["fill", "stroke", "stroke-width", "stroke-dasharray", "font-size", "font-weight", "font-family", "font-style", "text-decoration", "opacity"];
    for (var i = 0; i < src.length; i++) {
      var cs = getComputedStyle(src[i]), style = "";
      props.forEach(function (p) { var v = cs.getPropertyValue(p); if (v) style += p + ":" + v + ";"; });
      dst[i].setAttribute("style", style); dst[i].removeAttribute("class");
    }
    clone.querySelectorAll("g").forEach(function (g) { g.style.opacity = "1"; });
    var bg = getComputedStyle(this.canvas).backgroundColor;
    var rect = document.createElementNS(NS, "rect"); rect.setAttribute("width", "100%"); rect.setAttribute("height", "100%"); rect.setAttribute("fill", bg);
    clone.insertBefore(rect, clone.firstChild);
    clone.removeAttribute("style");
    var blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (this.host.getAttribute("data-model") || "erd") + "-" + (this.notation === "crow" ? "crows-foot" : "chen") + ".svg";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  var widgets = [];
  document.addEventListener("qho541:erd-notation", function (e) {
    widgets.forEach(function (w) { if (w !== e.detail.src) w.setNotation(e.detail.n, false); });
  });
  function initAll() {
    document.querySelectorAll(".erd-widget").forEach(function (h) { if (!h.__erd) { h.__erd = new Widget(h); widgets.push(h.__erd); } });
  }
  Q.erd = { initAll: initAll, sentences: sentences };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll); else initAll();
})();
