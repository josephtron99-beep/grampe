/* ==========================================================
   Grampe dashboard V3 — shared shell for every V3 page
   Top menu (sliding underline), light/dark theme, user menu,
   toasts and helpers. Exposes window.G3 for page scripts.
   ========================================================== */
(function () {
  "use strict";
  var D = window.GRAMPE_DEMO, ICON = "../../assets/img/icons.svg#";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nf = function (dp) { return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }); };
  var nfUS = function (dp) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); };
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .08 }) : null;

  var G = {
    D: D, $: $, $$: $$, reduce: reduce,
    assets: JSON.parse(JSON.stringify(D.assets)),
    ico: function (id) { return '<svg class="ico" aria-hidden="true"><use href="' + ICON + id + '"/></svg>'; },
    num: function (v, dp) { return nf(dp == null ? 2 : dp).format(v || 0); },
    usd: function (v, dp) { return "$" + nfUS(dp == null ? 2 : dp).format(v || 0); },
    key: function (a) { return a.key || a.sym; },
    label: function (a) { return a.key || a.sym; },
    asset: function (k) { return G.assets.filter(function (a) { return G.key(a) === k; })[0]; },
    net: function (id) { return D.networks.filter(function (n) { return n.id === id; })[0] || { name: id }; },
    total: function () { return G.assets.reduce(function (s, a) { return s + a.bal * a.price; }, 0); },
    countTo: function (el, to, fmt, ms) {
      if (!el) return; var from = parseFloat(el.dataset.v || 0); el.dataset.v = to;
      if (reduce) { el.textContent = fmt(to); return; }
      var st = null; (function step(t) { if (!st) st = t; var p = Math.min((t - st) / (ms || 1000), 1); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
    },
    toast: function (msg) {
      var t = document.createElement("div"); t.className = "toast-item";
      t.innerHTML = '<span class="icon-tile icon-tile-sm icon-tile-round tone-accent">' + G.ico("i-check") + "</span><span>" + msg + "</span>";
      $("#toasts").appendChild(t);
      setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, 2600);
    },
    copy: function (text, what) {
      var ok = function () { G.toast(what + " copied"); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { G.toast("Copy not available here"); });
      else G.toast("Copy not available here");
    },
    reveal: function (root) { $$(".rise", root).forEach(function (el, i) { el.style.transitionDelay = Math.min(i * 70, 420) + "ms"; if (io && !reduce) io.observe(el); else el.classList.add("in"); }); },
    onTheme: []
  };
  window.G3 = G;

  /* ---------- light / dark theme ---------- */
  var root = document.documentElement, btn = $("#themeBtn"), meta = $('meta[name="theme-color"]');
  function applyTheme(t, animate) {
    if (animate && !reduce) { document.body.classList.add("theme-anim"); setTimeout(function () { document.body.classList.remove("theme-anim"); }, 400); }
    root.setAttribute("data-theme", t);
    var dark = t === "carbon";
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.innerHTML = G.ico(dark ? "i-sun" : "i-moon"); // re-render so the icon spins in
    if (meta) meta.setAttribute("content", dark ? "#0A0A0B" : "#F3F6FB");
    try { localStorage.setItem("grampe-v3-theme", t); } catch (e) {}
    G.onTheme.forEach(function (fn) { fn(t); });
  }
  btn.addEventListener("click", function () { applyTheme(root.getAttribute("data-theme") === "carbon" ? "light" : "carbon", true); });
  applyTheme(root.getAttribute("data-theme") || "carbon", false);

  /* ---------- top menu: underline sits on the current page, follows hover ---------- */
  var nav = $("#nav3"), ind = $("#navInd"), current = $(".n3.active");
  function place(a) { if (!a || !ind) return; var n = nav.getBoundingClientRect(), r = a.getBoundingClientRect(); ind.style.width = r.width + "px"; ind.style.transform = "translateX(" + (r.left - n.left) + "px)"; }
  if (nav) {
    $$(".n3", nav).forEach(function (a) { a.addEventListener("mouseenter", function () { place(a); }); a.addEventListener("focus", function () { place(a); }); });
    nav.addEventListener("mouseleave", function () { place(current); });
    window.addEventListener("resize", function () { place(current); });
    window.addEventListener("load", function () { place(current); });
    place(current);
  }

  /* pages that are not built yet */
  document.addEventListener("click", function (e) {
    var s = e.target.closest("[data-soon]");
    if (s) { e.preventDefault(); place(current); G.toast(s.dataset.soon + " page is coming next"); return; }
    var t = e.target.closest("[data-toast]");
    if (t) { G.toast(t.dataset.toast); }
  });
  $("#langBtn") && $("#langBtn").addEventListener("click", function () { G.toast("More languages are coming soon"); });

  /* ---------- user menu ---------- */
  var ub = $("#userBtn"), um = $("#userMenu");
  function closeMenu() { um.hidden = true; ub.setAttribute("aria-expanded", "false"); }
  ub.addEventListener("click", function (e) { e.stopPropagation(); var open = um.hidden; um.hidden = !open; ub.setAttribute("aria-expanded", String(open)); if (open) $("a", um).focus(); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".user3")) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !um.hidden) { closeMenu(); ub.focus(); } });
  $("#userName").textContent = D.user.name; $("#userId").textContent = "ID " + D.user.id;
  var yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
})();
