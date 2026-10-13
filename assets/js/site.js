/* =====================================================================
   QHO541 site shell: header, navigation, theme, tabs, code blocks,
   table of contents, search, progress tracking and presentation mode.
   No build step and no backend: works on GitHub Pages as-is.
   ===================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Course map. Add a week by flipping its status to "ready" and
     creating weeks/weekNN.html. Nothing else needs to change.
     ------------------------------------------------------------------ */
  var COURSE = {
    code: "QHO541",
    name: "Advanced Database Systems",
    pages: [
      { id: "home", title: "Home", href: "index.html", icon: "home" },
      { id: "setup", title: "Setup & tools", href: "setup.html", icon: "wrench" },
      { id: "assessment", title: "Assessment guide", href: "assessment.html", icon: "flag" }
    ],
    weeks: [
      { n: 1,  id: "week01", title: "Normalisation & ER diagrams", status: "ready" },
      { n: 2,  id: "week02", title: "Database triggers", status: "ready" },
      { n: 3,  id: "week03", title: "Views, functions & query optimisation", status: "planned" },
      { n: 4,  id: "week04", title: "Python, SQLite, Tkinter & CRUD", status: "planned" },
      { n: 5,  id: "week05", title: "Object-oriented GUI design", status: "planned" },
      { n: 6,  id: "week06", title: "Validation, cryptography & security", status: "planned" },
      { n: 7,  id: "week07", title: "XML & database integration", status: "planned" },
      { n: 8,  id: "week08", title: "Data visualisation", status: "planned" },
      { n: 9,  id: "week09", title: "BLOBs & multimedia", status: "planned" },
      { n: 10, id: "week10", title: "SQL injection & secure programming", status: "planned" },
      { n: 11, id: "week11", title: "Concurrency, transactions & testing", status: "planned" },
      { n: 12, id: "week12", title: "System integration & assessment prep", status: "planned" }
    ]
  };
  window.QHO541 = window.QHO541 || {};
  window.QHO541.COURSE = COURSE;

  var body = document.body;
  var ROOT = body.getAttribute("data-root") || "";
  var PAGE = body.getAttribute("data-page") || "";

  /* ---------- Safe storage ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  window.QHO541.store = store;

  /* ---------- Icons ---------- */
  var I = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
    present: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/></svg>',
    home: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
    // callout icons
    concept: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 9 3 3-3 3M13 15h4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>',
    seminar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 20c0-2.5 1.5-4.5 4-4.8"/></svg>',
    assess: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="m9 13 2 2 4-4"/></svg>',
    rec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg>'
  };
  window.QHO541.icons = I;

  var BRAND = '<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="var(--primary)"/>' +
    '<ellipse cx="20" cy="11" rx="10" ry="4" fill="none" stroke="var(--primary-ink)" stroke-width="2.2"/>' +
    '<path d="M10 11v18c0 2.2 4.5 4 10 4s10-1.8 10-4V11" fill="none" stroke="var(--primary-ink)" stroke-width="2.2"/>' +
    '<path d="M10 20c0 2.2 4.5 4 10 4s10-1.8 10-4" fill="none" stroke="var(--primary-ink)" stroke-width="2.2"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  window.QHO541.esc = esc;

  /* ---------- Theme ---------- */
  var THEME_KEY = "qho541.theme";
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function themePref() { var p; try { p = localStorage.getItem(THEME_KEY); } catch (e) {} return p || "auto"; }
  function applyTheme(pref) {
    var dark = pref === "dark" || (pref === "auto" && mq && mq.matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme-pref", pref);
    var btn = document.getElementById("theme-btn");
    if (btn) {
      var label = pref === "auto" ? "Auto" : pref === "dark" ? "Dark" : "Light";
      btn.innerHTML = (pref === "auto" ? I.auto : pref === "dark" ? I.moon : I.sun) + '<span class="lbl">' + label + "</span>";
      btn.setAttribute("aria-label", "Theme: " + label + " (click to change)");
      btn.title = "Theme: " + label;
    }
    document.dispatchEvent(new CustomEvent("qho541:theme"));
  }
  function cycleTheme() {
    var order = ["auto", "light", "dark"];
    var next = order[(order.indexOf(themePref()) + 1) % order.length];
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
  }
  if (mq && mq.addEventListener) mq.addEventListener("change", function () { if (themePref() === "auto") applyTheme("auto"); });

  /* ---------- Progress ---------- */
  var PROG_KEY = "qho541.progress";
  function getProgress() { return store.get(PROG_KEY, {}); }
  function setPart(weekId, part, value) {
    var p = getProgress(); p[weekId] = p[weekId] || {}; p[weekId][part] = value; store.set(PROG_KEY, p);
    document.dispatchEvent(new CustomEvent("qho541:progress"));
  }
  function weekFraction(weekId) {
    var w = getProgress()[weekId] || {};
    var n = 0;
    if (w.lecture) n++;
    if (w.seminar) n++;
    if (typeof w.quiz === "number" && w.quiz >= 70) n++;
    return n / 3;
  }
  window.QHO541.progress = { get: getProgress, set: setPart, fraction: weekFraction };

  /* ---------- Header ---------- */
  function buildHeader() {
    var h = document.getElementById("site-header");
    if (!h) return;
    h.innerHTML =
      '<button class="icon-btn menu-btn" id="menu-btn" aria-label="Open navigation" aria-expanded="false" aria-controls="sidebar">' + I.menu + "</button>" +
      '<a class="brand" href="' + ROOT + 'index.html">' + BRAND +
      '<span class="brand-text"><span class="brand-code">' + COURSE.code + '</span><span class="brand-name">' + COURSE.name + "</span></span></a>" +
      '<span class="header-spacer"></span>' +
      '<div class="search" role="search"><label class="sr-only" for="search-input">Search the course</label>' + I.search +
      '<input id="search-input" type="search" placeholder="Search notes  ( / )" autocomplete="off" aria-controls="search-results">' +
      '<div class="search-results" id="search-results" role="listbox"></div></div>' +
      '<button class="icon-btn" id="present-btn" title="Presentation mode (P)" aria-label="Start presentation mode">' + I.present + '<span class="lbl">Present</span></button>' +
      '<button class="icon-btn" id="theme-btn"></button>';
    document.getElementById("theme-btn").addEventListener("click", cycleTheme);
    document.getElementById("menu-btn").addEventListener("click", function () {
      var open = !body.classList.contains("nav-open");
      body.classList.toggle("nav-open", open);
      this.setAttribute("aria-expanded", String(open));
    });
    var pres = document.getElementById("present-btn");
    if (!document.querySelector(".lsec")) pres.style.display = "none";
    pres.addEventListener("click", function () { Present.start(); });
    applyTheme(themePref());
  }

  /* ---------- Sidebar ---------- */
  function ring(frac) {
    if (!frac) return "";
    var c = 2 * Math.PI * 15;
    return '<svg class="ring" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="15" fill="none" stroke="var(--ok)" stroke-width="3" stroke-dasharray="' +
      (c * frac).toFixed(1) + " " + c.toFixed(1) + '"/></svg>';
  }
  function buildSidebar() {
    var s = document.getElementById("sidebar");
    if (!s) return;
    var html = '<div class="nav-group"><div class="nav-group-title">Course</div><ul class="nav-list">';
    COURSE.pages.forEach(function (p) {
      html += '<li><a class="nav-link" href="' + ROOT + p.href + '"' + (PAGE === p.id ? ' aria-current="page"' : "") + ">" +
        '<span class="nav-num" style="border:0;background:none">' + I[p.icon] + "</span>" + esc(p.title) + "</a></li>";
    });
    html += "</ul></div>";
    html += '<div class="nav-group"><div class="nav-group-title">Weekly lessons</div><ul class="nav-list">';
    COURSE.weeks.forEach(function (w) {
      var frac = weekFraction(w.id);
      var num = '<span class="nav-num' + (frac === 1 ? " done" : "") + '">' + ring(frac) + (frac === 1 ? "✓" : w.n) + "</span>";
      if (w.status === "ready") {
        html += '<li><a class="nav-link" href="' + ROOT + "weeks/" + w.id + '.html"' + (PAGE === w.id ? ' aria-current="page"' : "") +
          ' title="Week ' + w.n + ": " + esc(w.title) + (frac ? " — " + Math.round(frac * 100) + "% complete" : "") + '">' + num + esc(w.title) + "</a></li>";
      } else {
        html += '<li><span class="nav-link disabled" title="In preparation">' + num + esc(w.title) + '<span class="nav-tag">In prep</span></span></li>';
      }
    });
    html += "</ul></div>";
    html += '<div class="nav-group"><div class="nav-group-title">Progress</div><p class="small faint" style="margin:0 .5rem">Progress is saved in this browser only. A week is complete when you finish the lecture, the seminar and score 70%+ on the quiz.</p></div>';
    s.innerHTML = html;
    var scrim = document.querySelector(".scrim");
    if (scrim) scrim.addEventListener("click", function () { body.classList.remove("nav-open"); });
  }
  document.addEventListener("qho541:progress", function () { buildSidebar(); renderProgressOverview(); syncTabDots(); });

  function renderProgressOverview() {
    var el = document.getElementById("progress-overview");
    if (!el) return;
    el.innerHTML = COURSE.weeks.map(function (w) {
      var f = weekFraction(w.id);
      return '<div class="pw" title="Week ' + w.n + ": " + esc(w.title) + '"><b>W' + w.n + "</b>" + (w.status === "ready" ? Math.round(f * 100) + "%" : "in prep") +
        '<div class="bar"><i style="width:' + Math.round(f * 100) + '%"></i></div></div>';
    }).join("");
  }

  /* ---------- Callouts: inject icons ---------- */
  function decorateCallouts() {
    document.querySelectorAll(".callout").forEach(function (c) {
      var t = c.querySelector(".callout-title");
      if (!t || t.querySelector("svg")) return;
      var kind = ["concept", "task", "seminar", "assess", "rec", "warn", "note"].filter(function (k) { return c.classList.contains(k); })[0] || "note";
      t.insertAdjacentHTML("afterbegin", I[kind]);
    });
  }

  /* ---------- Code blocks: header, copy, highlight ---------- */
  function copyText(text, btn) {
    function done() { if (!btn) return; var o = btn.textContent; btn.textContent = "Copied"; btn.classList.add("copied"); setTimeout(function () { btn.textContent = o; btn.classList.remove("copied"); }, 1400); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(ta);
    }
  }
  window.QHO541.copyText = copyText;

  function decorateCode() {
    document.querySelectorAll("pre > code").forEach(function (code) {
      var pre = code.parentElement;
      if (pre.closest(".code-block") || pre.closest(".no-decorate")) return;
      var lang = (code.className.match(/language-(\w+)/) || [])[1] || "";
      var file = code.getAttribute("data-file") || "";
      // trim a single leading/trailing newline left by HTML authoring
      code.textContent = code.textContent.replace(/^\n/, "").replace(/\n\s*$/, "");
      var wrap = document.createElement("div");
      wrap.className = "code-block";
      var label = { sql: "SQL", python: "Python", xml: "XML", bash: "Shell", shell: "Shell", plaintext: "Text", text: "Text", ini: "Config" }[lang] || lang;
      wrap.innerHTML = '<div class="code-head"><span class="lang">' + esc(label) + "</span>" + (file ? '<span class="fname">' + esc(file) + "</span>" : "") +
        '<span class="spacer"></span><button class="copy-btn" type="button">Copy</button></div>';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      wrap.querySelector(".copy-btn").addEventListener("click", function () { copyText(code.textContent, this); });
      if (window.hljs && lang && lang !== "text" && lang !== "plaintext") { try { window.hljs.highlightElement(code); } catch (e) {} }
    });
  }

  /* ---------- Tabs ---------- */
  var tabs = [], panels = [];
  function activateTab(id, opts) {
    opts = opts || {};
    var found = false;
    tabs.forEach(function (t) {
      var on = t.getAttribute("aria-controls") === "panel-" + id;
      if (on) found = true;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (!found) return false;
    panels.forEach(function (p) {
      var on = p.id === "panel-" + id;
      p.hidden = !on;
      p.classList.toggle("active-panel", on);
    });
    if (opts.updateHash) { try { history.replaceState(null, "", "#" + id); } catch (e) {} }
    store.set("qho541.tab." + PAGE, id);
    buildToc();
    document.dispatchEvent(new CustomEvent("qho541:tab", { detail: { id: id } }));
    if (opts.scrollTop) {
      var tb = document.querySelector(".tabs");
      if (tb && window.scrollY > tb.offsetTop) window.scrollTo({ top: tb.offsetTop - 60 });
    }
    return true;
  }
  function initTabs() {
    tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
    panels = Array.prototype.slice.call(document.querySelectorAll(".tabpanel"));
    if (!tabs.length) return;
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { activateTab(t.getAttribute("aria-controls").replace("panel-", ""), { updateHash: true, scrollTop: true }); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
      });
    });
    var initial = routeHash() || store.get("qho541.tab." + PAGE, null) || tabs[0].getAttribute("aria-controls").replace("panel-", "");
    if (!activateTab(initial)) activateTab(tabs[0].getAttribute("aria-controls").replace("panel-", ""));
    window.addEventListener("hashchange", function () { var r = routeHash(); if (r) activateTab(r); scrollToHash(); });
    syncTabDots();
  }
  // returns the tab id to show for the current hash (tab id itself or a panel containing the target)
  function routeHash() {
    var h = decodeURIComponent((location.hash || "").slice(1));
    if (!h) return null;
    if (document.getElementById("panel-" + h)) return h;
    var el = document.getElementById(h);
    var p = el && el.closest(".tabpanel");
    return p ? p.id.replace("panel-", "") : null;
  }
  function scrollToHash() {
    var h = decodeURIComponent((location.hash || "").slice(1));
    if (!h || document.getElementById("panel-" + h)) return;
    var el = document.getElementById(h);
    if (el) setTimeout(function () { el.scrollIntoView(); }, 30);
  }
  function syncTabDots() {
    var w = getProgress()[PAGE] || {};
    tabs.forEach(function (t) {
      var part = t.getAttribute("data-part");
      var dot = t.querySelector(".dot");
      if (!dot || !part) return;
      var done = part === "quiz" ? (typeof w.quiz === "number" && w.quiz >= 70) : !!w[part];
      dot.classList.toggle("done", done);
    });
  }
  window.QHO541.activateTab = activateTab;

  /* ---------- Table of contents ---------- */
  var tocObserver = null;
  function buildToc() {
    var toc = document.getElementById("toc");
    if (!toc) return;
    var scope = document.querySelector(".tabpanel.active-panel") || document.getElementById("content");
    if (!scope) return;
    var hs = scope.querySelectorAll("h2[id]");
    if (hs.length < 2) { toc.innerHTML = ""; return; }
    toc.innerHTML = '<div class="toc-title">On this page</div><ol>' + Array.prototype.map.call(hs, function (h) {
      return '<li><a href="#' + h.id + '">' + esc(h.textContent.replace(/\s*#$/, "")) + "</a></li>";
    }).join("") + "</ol>";
    if (tocObserver) tocObserver.disconnect();
    if ("IntersectionObserver" in window) {
      var links = toc.querySelectorAll("a");
      tocObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id); });
          }
        });
      }, { rootMargin: "-70px 0px -70% 0px" });
      hs.forEach(function (h) { tocObserver.observe(h); });
    }
  }

  /* ---------- Completion bars ---------- */
  function initCompletion() {
    document.querySelectorAll(".complete-bar[data-part]").forEach(function (bar) {
      var part = bar.getAttribute("data-part");
      function render() {
        var done = !!(getProgress()[PAGE] || {})[part];
        var what = part === "lecture" ? "lecture" : part === "seminar" ? "seminar activities" : part;
        bar.innerHTML = '<span class="msg">' + (done ? "You have marked the " + what + " as complete. Your progress is saved in this browser." :
          "Finished the " + what + "? Mark it complete to update your progress tracker.") + "</span>" +
          '<button class="btn' + (done ? " done" : " primary") + '" type="button">' + (done ? I.check + " Completed" : "Mark as complete") + "</button>";
        bar.querySelector("button").addEventListener("click", function () { setPart(PAGE, part, !done); });
      }
      render();
      document.addEventListener("qho541:progress", render);
    });
  }

  /* ---------- Search ---------- */
  var searchIndex = null, searchLoading = null;
  function loadIndex() {
    if (searchIndex) return Promise.resolve(searchIndex);
    if (searchLoading) return searchLoading;
    searchLoading = fetch(ROOT + "assets/search-index.json").then(function (r) { return r.json(); }).then(function (d) { searchIndex = d; return d; })
      .catch(function () { searchIndex = []; return []; });
    return searchLoading;
  }
  function initSearch() {
    var input = document.getElementById("search-input");
    var box = document.getElementById("search-results");
    var wrap = input && input.closest(".search");
    if (!input) return;
    var active = -1;
    function close() { box.classList.remove("open"); active = -1; wrap.classList.remove("expanded"); }
    function hl(text, terms) {
      var out = esc(text);
      terms.forEach(function (t) { if (t.length > 1) out = out.replace(new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>"); });
      return out;
    }
    function run() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.classList.remove("open"); box.innerHTML = ""; return; }
      loadIndex().then(function (idx) {
        var terms = q.split(/\s+/).filter(Boolean);
        var res = idx.map(function (e) {
          var t = (e.title || "").toLowerCase(), x = (e.text || "").toLowerCase(), score = 0;
          for (var i = 0; i < terms.length; i++) {
            var term = terms[i], inT = t.indexOf(term) >= 0, inX = x.indexOf(term) >= 0;
            if (!inT && !inX) return null;
            score += (inT ? 10 : 0) + (inX ? 2 : 0);
          }
          if (t.indexOf(q) >= 0) score += 15;
          return { e: e, s: score };
        }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 12);
        if (!res.length) { box.innerHTML = '<div style="padding:.7rem" class="muted small">No matches for “' + esc(q) + "”.</div>"; box.classList.add("open"); return; }
        box.innerHTML = res.map(function (r) {
          var x = r.e.text || "", i = x.toLowerCase().indexOf(terms[0]);
          var snip = x.slice(Math.max(0, i - 50), Math.max(0, i - 50) + 150);
          return '<a href="' + ROOT + r.e.url + '" role="option"><div class="sr-page">' + esc(r.e.page) + '</div><div class="sr-title">' + hl(r.e.title, terms) +
            '</div><div class="sr-snip">' + (i > 50 ? "… " : "") + hl(snip, terms) + "…</div></a>";
        }).join("");
        box.classList.add("open"); active = -1;
      });
    }
    input.addEventListener("input", run);
    input.addEventListener("focus", function () { loadIndex(); wrap.classList.add("expanded"); if (input.value.trim().length > 1) run(); });
    input.addEventListener("keydown", function (e) {
      var items = box.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach(function (a, i) { a.classList.toggle("active", i === active); });
        items[active].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && active >= 0 && items[active]) { e.preventDefault(); items[active].click(); }
      else if (e.key === "Escape") { input.value = ""; close(); input.blur(); }
    });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) close(); });
    box.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
  }

  /* ---------- Presentation mode ---------- */
  var Present = {
    i: 0, secs: [],
    start: function () {
      var panel = document.querySelector(".tabpanel.active-panel") || document.getElementById("content");
      this.secs = Array.prototype.slice.call(panel.querySelectorAll(".lsec"));
      if (!this.secs.length) {
        // fall back to the lecture tab if the active tab has no slide sections
        if (activateTab("lecture")) return this.start();
        return;
      }
      // start at the section currently on screen
      var y = window.scrollY + 120, start = 0;
      this.secs.forEach(function (s, idx) { if (s.getBoundingClientRect().top + window.scrollY <= y) start = idx; });
      body.classList.add("presenting");
      this.bar();
      this.go(start);
      try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {}); } catch (e) {}
    },
    stop: function () {
      var cur = this.secs[this.i];
      body.classList.remove("presenting");
      this.secs.forEach(function (s) { s.classList.remove("present-current"); });
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      if (cur) cur.scrollIntoView();
    },
    go: function (i) {
      if (i < 0 || i >= this.secs.length) return;
      this.secs.forEach(function (s) { s.classList.remove("present-current"); });
      this.i = i; this.secs[i].classList.add("present-current");
      var main = document.querySelector(".main"); if (main) main.scrollTop = 0;
      var h = this.secs[i].querySelector("h2");
      var bar = document.querySelector(".present-bar");
      bar.querySelector(".count").textContent = (i + 1) + " / " + this.secs.length;
      bar.querySelector(".ptitle").textContent = h ? h.textContent.replace(/\s*#$/, "") : "";
      document.dispatchEvent(new CustomEvent("qho541:present", { detail: { section: this.secs[i] } }));
    },
    bar: function () {
      var bar = document.querySelector(".present-bar");
      if (!bar) { bar = document.createElement("div"); bar.className = "present-bar"; document.body.appendChild(bar); }
      bar.innerHTML = '<button class="icon-btn" data-a="prev" aria-label="Previous section">' + I.prev + "</button>" +
        '<span class="count"></span><button class="icon-btn" data-a="next" aria-label="Next section">' + I.next + "</button>" +
        '<span class="ptitle"></span><button class="icon-btn" data-a="exit" aria-label="Exit presentation (Esc)">' + I.close + '<span class="lbl">Exit</span></button>';
      var self = this;
      bar.onclick = function (e) {
        var b = e.target.closest("button"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "prev") self.go(self.i - 1); else if (a === "next") self.go(self.i + 1); else self.stop();
      };
    }
  };
  window.QHO541.present = Present;

  function typingTarget(e) { var t = e.target; return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest(".CodeMirror")); }
  document.addEventListener("keydown", function (e) {
    if (body.classList.contains("presenting")) {
      if (typingTarget(e)) return;
      if (["ArrowRight", "PageDown", " "].indexOf(e.key) >= 0) { e.preventDefault(); Present.go(Present.i + 1); }
      else if (["ArrowLeft", "PageUp"].indexOf(e.key) >= 0) { e.preventDefault(); Present.go(Present.i - 1); }
      else if (e.key === "Escape") { Present.stop(); }
      return;
    }
    if (typingTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "/") { var s = document.getElementById("search-input"); if (s) { e.preventDefault(); s.focus(); } }
    else if (e.key === "p" || e.key === "P") { if (document.querySelector(".lsec")) Present.start(); }
  });
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && body.classList.contains("presenting")) Present.stop(); });

  /* ---------- Heading anchors ---------- */
  function headingAnchors() {
    document.querySelectorAll(".content h2[id], .content h3[id]").forEach(function (h) {
      if (h.querySelector(".anchor")) return;
      var a = document.createElement("a"); a.className = "anchor"; a.href = "#" + h.id; a.textContent = "#";
      a.setAttribute("aria-label", "Link to this section"); a.style.cssText = "margin-left:.4rem;text-decoration:none;color:var(--text-faint);font-weight:400;opacity:.0";
      h.appendChild(a);
      h.addEventListener("mouseenter", function () { a.style.opacity = ".8"; }); h.addEventListener("mouseleave", function () { a.style.opacity = "0"; });
    });
  }

  /* ---------- Checklists (state saved per browser) ---------- */
  function initChecklists() {
    document.querySelectorAll("ul.checklist[data-id]").forEach(function (ul) {
      var key = "qho541.check." + ul.getAttribute("data-id");
      var state = store.get(key, {});
      var items = ul.querySelectorAll("li");
      var counter = document.querySelector('[data-count-for="' + ul.getAttribute("data-id") + '"]');
      function count() {
        if (!counter) return;
        var n = ul.querySelectorAll("input:checked").length;
        counter.textContent = n + " of " + items.length + " done";
      }
      items.forEach(function (li, i) {
        if (li.querySelector("input")) return;
        var id = ul.getAttribute("data-id") + "-" + i;
        var label = document.createElement("label");
        label.setAttribute("for", id);
        while (li.firstChild) label.appendChild(li.firstChild);
        var cb = document.createElement("input");
        cb.type = "checkbox"; cb.id = id; cb.checked = !!state[i];
        cb.addEventListener("change", function () { state[i] = cb.checked; store.set(key, state); count(); });
        li.appendChild(cb); li.appendChild(label);
      });
      count();
    });
  }

  /* ---------- Wide tables: mark scrollable ones and add a hint ---------- */
  function markScrollables() {
    document.querySelectorAll(".table-wrap").forEach(function (w) {
      if (w.closest(".pg-out") || w.closest(".trigger-lab")) return;
      var over = w.scrollWidth > w.clientWidth + 2;
      w.classList.toggle("scroll-x", over);
      var next = w.nextElementSibling;
      if (over && !(next && next.classList.contains("scroll-hint"))) {
        var hint = document.createElement("div"); hint.className = "scroll-hint"; hint.setAttribute("aria-hidden", "true");
        hint.textContent = "Scroll sideways for more columns →";
        w.parentNode.insertBefore(hint, w.nextSibling);
      }
    });
  }
  var msTimer = null;
  function scheduleScrollables() { clearTimeout(msTimer); msTimer = setTimeout(markScrollables, 120); }
  window.QHO541.markScrollables = scheduleScrollables;
  window.addEventListener("resize", scheduleScrollables);
  document.addEventListener("qho541:tab", scheduleScrollables);
  if ("MutationObserver" in window) {
    document.addEventListener("DOMContentLoaded", function () {
      var c = document.getElementById("content");
      if (c) new MutationObserver(function (m) {
        for (var i = 0; i < m.length; i++) { if (m[i].target.closest && !m[i].target.closest(".scroll-hint")) { scheduleScrollables(); return; } }
      }).observe(c, { childList: true, subtree: true });
    });
  }

  /* ---------- Footer & pager ---------- */
  function buildFooter() {
    var f = document.getElementById("site-footer");
    if (!f) return;
    f.innerHTML = "<span>" + COURSE.code + " " + COURSE.name + " · Teaching notes</span>" +
      '<span><a href="' + ROOT + 'assessment.html">Assessment guide</a></span>' +
      '<span><a href="' + ROOT + 'setup.html">Setup &amp; tools</a></span>' +
      "<span>Keyboard: <kbd>/</kbd> search · <kbd>P</kbd> present · <kbd>←</kbd><kbd>→</kbd> tabs</span>";
  }

  /* ---------- Boot ---------- */
  function boot() {
    buildHeader();
    buildSidebar();
    decorateCallouts();
    decorateCode();
    initTabs();
    buildToc();
    initCompletion();
    initChecklists();
    initSearch();
    headingAnchors();
    buildFooter();
    renderProgressOverview();
    scheduleScrollables();
    scrollToHash();
    document.dispatchEvent(new CustomEvent("qho541:ready"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
