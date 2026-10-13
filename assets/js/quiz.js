/* =====================================================================
   Self-assessment quiz with explanations.
   <div class="quiz" data-title="…" data-progress="week01">
     <script type="application/json">[{"q":"…","options":["…"],"answer":1,"explain":"…"}]</script>
   </div>
   Question/option/explanation strings may contain simple HTML (<code>).
   data-progress: if set, the best score (%) is saved for that week.
   ===================================================================== */
(function () {
  "use strict";
  var Q = window.QHO541 = window.QHO541 || {};
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function Quiz(el) {
    var src = el.querySelector('script[type="application/json"]');
    try { this.qs = JSON.parse(src.textContent); } catch (e) { el.innerHTML = '<div class="pg-msg err">Quiz data could not be read.</div>'; return; }
    this.el = el;
    this.title = el.getAttribute("data-title") || "Quiz";
    this.week = el.getAttribute("data-progress");
    this.start();
  }
  Quiz.prototype.start = function () {
    this.i = 0; this.answers = [];
    this.el.innerHTML = '<div class="quiz-head"><h3>' + esc(this.title) + '</h3><span class="spacer"></span><span class="chip qcount"></span><span class="chip best"></span></div>' +
      '<div class="quiz-progress"><div></div></div><div class="quiz-body" aria-live="polite"></div>';
    this.body = this.el.querySelector(".quiz-body");
    this.showBest();
    this.render();
  };
  Quiz.prototype.showBest = function () {
    var chip = this.el.querySelector(".best");
    if (!this.week || !Q.progress) { chip.style.display = "none"; return; }
    var w = Q.progress.get()[this.week] || {};
    if (typeof w.quiz === "number") { chip.textContent = "Best: " + w.quiz + "%"; chip.className = "chip best " + (w.quiz >= 70 ? "ok" : "pending"); }
    else chip.style.display = "none";
  };
  Quiz.prototype.render = function () {
    var self = this, q = this.qs[this.i], n = this.qs.length;
    this.el.querySelector(".qcount").textContent = "Question " + (this.i + 1) + " of " + n;
    this.el.querySelector(".quiz-progress > div").style.width = (this.i / n * 100) + "%";
    var letters = "ABCDEFG";
    this.body.innerHTML = '<div class="quiz-q">' + q.q + '</div><ul class="quiz-opts">' + q.options.map(function (o, k) {
      return '<li><button type="button" data-k="' + k + '"><span class="letter">' + letters[k] + "</span><span>" + o + "</span></button></li>";
    }).join("") + '</ul><div class="quiz-feedback"></div>';
    this.body.querySelector(".quiz-opts").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      self.answer(+b.getAttribute("data-k"));
    });
  };
  Quiz.prototype.answer = function (k) {
    var self = this, q = this.qs[this.i], ok = k === q.answer;
    this.answers[this.i] = k;
    this.body.querySelectorAll(".quiz-opts button").forEach(function (b) {
      var bk = +b.getAttribute("data-k"); b.disabled = true;
      if (bk === q.answer) b.classList.add("correct"); else if (bk === k) b.classList.add("incorrect");
    });
    var last = this.i === this.qs.length - 1;
    this.body.querySelector(".quiz-feedback").innerHTML =
      '<div class="quiz-expl"><span class="verdict ' + (ok ? "ok" : "bad") + '">' + (ok ? "Correct." : "Not quite.") + "</span> " + (q.explain || "") + "</div>" +
      '<div class="quiz-nav"><span class="small faint">' + this.answers.filter(function (a, i) { return a === self.qs[i].answer; }).length + " correct so far</span>" +
      '<button class="btn primary" type="button">' + (last ? "See my score" : "Next question →") + "</button></div>";
    var btn = this.body.querySelector(".quiz-nav .btn");
    btn.addEventListener("click", function () { if (last) self.finish(); else { self.i++; self.render(); } });
    btn.focus({ preventScroll: true });
  };
  Quiz.prototype.finish = function () {
    var self = this, n = this.qs.length;
    var right = this.answers.filter(function (a, i) { return a === self.qs[i].answer; }).length;
    var pct = Math.round(right / n * 100);
    this.el.querySelector(".quiz-progress > div").style.width = "100%";
    this.el.querySelector(".qcount").textContent = "Finished";
    if (this.week && Q.progress) {
      var prev = (Q.progress.get()[this.week] || {}).quiz;
      if (typeof prev !== "number" || pct > prev) Q.progress.set(this.week, "quiz", pct);
      this.showBest();
    }
    var missed = this.qs.map(function (q, i) { return { q: q, i: i }; }).filter(function (x) { return self.answers[x.i] !== x.q.answer; });
    this.body.innerHTML = '<div class="quiz-score"><div class="big">' + right + " / " + n + "</div><div>" + pct + "% · " +
      (pct >= 90 ? "Excellent: you are ready for the seminar tasks." : pct >= 70 ? "Good: this counts towards completing the week. Review the questions you missed." : "Worth another look: revisit the lecture sections linked below, then try again.") +
      "</div>" + (missed.length ? '<div class="quiz-review"><strong>Review these:</strong><ol>' + missed.map(function (x) {
        return "<li>" + x.q.q + ' <span class="small muted">Answer: ' + x.q.options[x.q.answer] + "</span></li>";
      }).join("") + "</ol></div>" : "") +
      '<div class="quiz-nav" style="justify-content:center"><button class="btn primary" type="button">Try again</button></div></div>';
    this.body.querySelector(".btn").addEventListener("click", function () { self.start(); });
  };

  function initAll() { document.querySelectorAll(".quiz").forEach(function (el) { if (!el.__q) el.__q = new Quiz(el); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll); else initAll();
})();
