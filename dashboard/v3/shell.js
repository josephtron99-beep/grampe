/* ==========================================================
   Grampe dashboard V3 — shared shell for every V3 page
   Top bar, page tabs (glow indicator), toasts, helpers.
   Exposes window.G3 for page scripts (overview.js, …).
   ========================================================== */
(function () {
  "use strict";
  var D = window.GRAMPE_DEMO, ICON = "../../assets/img/icons.svg#";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var nf = function (dp) { return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }); };

  var G = {
    D: D, $: $, $$: $$, reduce: reduce,
    assets: JSON.parse(JSON.stringify(D.assets)),
    ico: function (id) { return '<svg class="ico" aria-hidden="true"><use href="' + ICON + id + '"/></svg>'; },
    num: function (v, dp) { return nf(dp == null ? 2 : dp).format(v || 0); },
    inr: function (usd) { return "₹" + G.num(usd * D.usdInr, 2); },
    key: function (a) { return a.key || a.sym; },
    label: function (a) { return a.key || a.sym; },
    asset: function (k) { return G.assets.filter(function (a) { return G.key(a) === k; })[0]; },
    net: function (id) { return D.networks.filter(function (n) { return n.id === id; })[0] || { name: id }; },
    total: function () { return G.assets.reduce(function (s, a) { return s + a.bal * a.price; }, 0); },
    series: function (seedStr, n, end, vol, trend) {
      var seed = 7; for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 233280;
      var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      var p = [end]; for (var j = 1; j < n; j++) p.unshift(p[0] * (1 - trend / n / 100 + (rnd() - .5) * vol)); return p;
    },
    countTo: function (el, to, fmt, ms) {
      if (!el) return; var from = parseFloat(el.dataset.v || 0); el.dataset.v = to;
      if (reduce) { el.textContent = fmt(to); return; }
      var st = null; (function step(t) { if (!st) st = t; var p = Math.min((t - st) / (ms || 900), 1); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
    },
    toast: function (msg, action) {
      var t = document.createElement("div"); t.className = "toast-item";
      t.innerHTML = '<span class="icon-tile icon-tile-sm icon-tile-round tone-accent">' + G.ico("i-check") + "</span><span>" + msg + "</span>";
      if (action) { var b = document.createElement("button"); b.className = "link-btn"; b.style.pointerEvents = "auto"; b.style.marginLeft = "8px"; b.textContent = action.label; b.onclick = function () { action.run(); t.remove(); }; t.appendChild(b); }
      $("#toasts").appendChild(t);
      setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, action ? 4500 : 2600);
    },
    copy: function (text, what) {
      var ok = function () { G.toast(what + " copied"); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { G.toast("Copy not available here"); });
      else G.toast("Copy not available here");
    },
    reveal: function (root) {
      $$(".rise", root).forEach(function (el, i) { el.style.transitionDelay = (i * 70) + "ms"; if (io && !reduce) io.observe(el); else el.classList.add("in"); });
    }
  };
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .1 }) : null;
  window.G3 = G;

  /* ---------- top bar ---------- */
  var main = G.asset("GINR");
  $("#addrShort").textContent = main.addr.slice(0, 6) + "…" + main.addr.slice(-4);
  $("#addrPill").addEventListener("click", function () { G.copy(main.addr, "Wallet address"); });
  $$("[data-toast]").forEach(function (b) { b.addEventListener("click", function () { G.toast(b.dataset.toast); }); });

  /* ---------- page tabs: glow sits on the current page, follows hover ---------- */
  var tabs = $$(".tab3"), ind = $("#tabInd"), current = $(".tab3.active") || tabs[0];
  function place(tab) { var n = $("#tabs3").getBoundingClientRect(), r = tab.getBoundingClientRect(); ind.style.width = r.width + "px"; ind.style.transform = "translateX(" + (r.left - n.left) + "px)"; }
  tabs.forEach(function (t) {
    if (window.matchMedia("(hover: hover)").matches) { t.addEventListener("mouseenter", function () { place(t); }); }
    t.addEventListener("click", function (e) {
      if (t.dataset.soon) { e.preventDefault(); place(current); G.toast(t.dataset.soon + " page is coming next"); }
    });
  });
  $("#tabs3").addEventListener("mouseleave", function () { place(current); });
  window.addEventListener("resize", function () { place(current); });
  place(current);

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { var p = $(".pick3, .netpop"); if (p) p.remove(); } });
})();
