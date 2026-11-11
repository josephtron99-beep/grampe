/* Grampe home page — interactions & animations (progressive enhancement) */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  var inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function onView(el, cb, opts) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(el, true); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { cb(en.target, en.isIntersecting, io); });
    }, opts || { threshold: 0.2 });
    io.observe(el);
  }

  function countTo(el, to, ms, fmt) {
    if (reduce) { el.textContent = fmt(to); return; }
    var start = null, from = 0;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / ms, 1);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Header: scrolled state, progress bar, back-to-top ---------- */
  var header = $("#header"), bar = $("#progress"), toTop = $("#toTop");
  var mobileCta = $("#mobileCta"), bannerEl = $(".banner-wrap"), footerEl = $(".footer");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 8);
    if (bar) bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
    if (toTop) toTop.classList.toggle("show", y > 800);
    // sticky action bar: after the banner, before the footer, never with the menu open
    if (mobileCta && bannerEl && footerEl) {
      var show = window.innerWidth < 960 && bannerEl.getBoundingClientRect().bottom < 0 &&
                 footerEl.getBoundingClientRect().top > window.innerHeight - 40 && !document.body.classList.contains("menu-open");
      mobileCta.classList.toggle("show", show);
      document.body.classList.toggle("has-cta", show);
      if (show) mobileCta.removeAttribute("inert"); else mobileCta.setAttribute("inert", "");
    }
    ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  /* ---------- Mobile menu ---------- */
  var menuBtn = $("#menuBtn"), nav = $("#nav"), backdrop = $("#navBackdrop");
  function setMenu(open, returnFocus) {
    nav.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) { var first = $("a", nav); if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 50); }
    else if (returnFocus) menuBtn.focus();
    onScroll();
  }
  function closeMenu(returnFocus) { if (nav.classList.contains("open")) setMenu(false, returnFocus); }
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    if (backdrop) backdrop.addEventListener("click", function () { closeMenu(true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(true); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 960) closeMenu(); });
  }

  /* ---------- Loader: hide once the page (fonts + images) is ready ---------- */
  var loadStart = performance.now();
  function pageReady() {
    var wait = Math.max(0, 450 - (performance.now() - loadStart));
    setTimeout(function () { document.body.classList.add("is-loaded"); }, reduce ? 0 : wait);
  }
  if (document.readyState === "complete") pageReady(); else window.addEventListener("load", pageReady);

  /* ---------- Footer: accordions on phones, always open on larger screens ---------- */
  var footGroups = $$(".foot-group");
  function syncFooter() { var wide = window.innerWidth >= 640; footGroups.forEach(function (d) { if (wide) d.open = true; }); }
  if (footGroups.length) {
    if (window.innerWidth < 640) footGroups.forEach(function (d) { d.open = false; });
    footGroups.forEach(function (d) {
      d.querySelector("summary").addEventListener("click", function (e) { if (window.innerWidth >= 640) e.preventDefault(); });
    });
    window.addEventListener("resize", syncFooter);
  }

  /* ---------- Nav sliding indicator (desktop) ---------- */
  var ind = $(".nav-ind");
  if (ind && nav) {
    var links = $$("a:not(.btn)", nav).filter(function (a) { return !a.closest(".nav-cta-mobile"); });
    var current = links.filter(function (a) { return a.getAttribute("aria-current") === "page"; })[0] || links[0];
    var moveTo = function (a) {
      if (!a || window.innerWidth < 960) return;
      ind.style.width = a.offsetWidth + "px";
      ind.style.transform = "translateX(" + a.offsetLeft + "px)";
    };
    links.forEach(function (a) { a.addEventListener("mouseenter", function () { moveTo(a); }); a.addEventListener("focus", function () { moveTo(a); }); });
    nav.addEventListener("mouseleave", function () { moveTo(current); });
    window.addEventListener("resize", function () { moveTo(current); });
    window.addEventListener("load", function () { moveTo(current); });
    moveTo(current);
  }

  /* ---------- Scroll reveal + stagger ---------- */
  $$(".stagger").forEach(function (g) { $$(":scope > *", g).forEach(function (c, i) { c.style.setProperty("--i", i); }); });
  $$(".rail").forEach(function (r) { $$(".reveal", r).forEach(function (c, i) { c.style.setProperty("--i", i); }); });
  $$(".reveal, .stagger").forEach(function (el) {
    onView(el, function (t, vis, io) { if (vis) { t.classList.add("in"); if (io) io.unobserve(t); } }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  });

  /* ---------- Banner: rotating word ---------- */
  var word = $("#wordSwap");
  if (word && !reduce) {
    var words = ["Wallet", "UPI", "Card", "Rupee"], wi = 0;
    var cycle = function () {
      word.classList.add("out");
      setTimeout(function () {
        wi = (wi + 1) % words.length;
        word.textContent = words[wi];
        word.classList.remove("out");
        setTimeout(cycle, wi === 0 ? 4200 : 1700);
      }, 350);
    };
    setTimeout(cycle, 4200);
  }

  /* ---------- Banner: balance count-up ---------- */
  var bal = $("#balance");
  if (bal) setTimeout(function () { countTo(bal, 48752.95, 1600, function (v) { return inr2.format(v); }); }, 500);

  /* ---------- Banner: 3D tilt following the pointer ---------- */
  var banner = $("#banner"), tilt = $("#tilt");
  if (banner && tilt && finePointer && !reduce) {
    banner.addEventListener("pointermove", function (e) {
      var r = banner.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = "rotateY(" + (x * 14) + "deg) rotateX(" + (-y * 10) + "deg)";
    });
    banner.addEventListener("pointerleave", function () { tilt.style.transform = ""; });
  }

  /* ---------- Banner: live activity toast ---------- */
  var toast = $("#toast"), tT = $("#toastT"), tS = $("#toastS");
  var feed = [
    ["₹1,240 paid", "to sharmastore@upi"], ["Mobile recharged", "₹299 · prepaid"], ["Electricity bill paid", "₹1,860 · instant"],
    ["₹5,000 → 5,000 GINR", "Converted 1 : 1"], ["FASTag topped up", "₹500 · instant"], ["₹750 received", "from ravi@okaxis"]
  ];
  if (toast && !reduce) {
    var fi = 0;
    setInterval(function () {
      toast.classList.add("hide");
      setTimeout(function () { fi = (fi + 1) % feed.length; tT.textContent = feed[fi][0]; tS.textContent = feed[fi][1]; toast.classList.remove("hide"); }, 380);
    }, 3200);
  }

  /* ---------- Ripple on buttons ---------- */
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".btn");
    if (!b || reduce) return;
    var r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2;
    var s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = d + "px";
    s.style.left = (e.clientX - r.left - d / 2) + "px";
    s.style.top = (e.clientY - r.top - d / 2) + "px";
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  });

  /* ---------- Magnetic primary buttons ---------- */
  if (finePointer && !reduce) {
    $$(".magnetic").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18) + "px," + ((e.clientY - r.top - r.height / 2) * 0.28) + "px)";
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }

  /* ---------- Cursor spotlight on promo cards ---------- */
  $$(".spot").forEach(function (c) {
    c.addEventListener("pointermove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });

  /* ---------- Travel: tabs, sliding indicator, swap, date ---------- */
  var modes = {
    flights: { l1: "From", v1: "Delhi", s1: "DEL · Indira Gandhi Intl", l2: "To", v2: "Mumbai", s2: "BOM · Chhatrapati Shivaji", l3: "Depart", s3: "One way", l4: "Travellers", v4: "1 Traveller", s4: "Economy", swap: true, trip: true,
      popular: [["Delhi", "DEL", "Mumbai", "BOM"], ["Bengaluru", "BLR", "Goa", "GOI"], ["Mumbai", "BOM", "Dubai", "DXB"], ["Chennai", "MAA", "Delhi", "DEL"], ["Kolkata", "CCU", "Bengaluru", "BLR"]] },
    bus: { l1: "From", v1: "Bengaluru", s1: "Majestic", l2: "To", v2: "Chennai", s2: "Koyambedu", l3: "Travel date", s3: "Any time", l4: "Seats", v4: "1 Seat", s4: "Sleeper / Seater", swap: true,
      popular: [["Bengaluru", "Majestic", "Chennai", "Koyambedu"], ["Pune", "Swargate", "Mumbai", "Dadar"], ["Hyderabad", "MGBS", "Vijayawada", "PNBS"], ["Delhi", "Kashmere Gate", "Manali", "Bus stand"]] },
    trains: { l1: "From", v1: "New Delhi", s1: "NDLS", l2: "To", v2: "Jaipur", s2: "JP", l3: "Journey date", s3: "All quotas", l4: "Class", v4: "All classes", s4: "1 Passenger", swap: true,
      popular: [["New Delhi", "NDLS", "Jaipur", "JP"], ["Mumbai", "CSMT", "Pune", "PUNE"], ["Chennai", "MAS", "Bengaluru", "SBC"], ["Howrah", "HWH", "Patna", "PNBE"]] },
    hotels: { l1: "City or area", v1: "Goa", s1: "India", l2: "Property", v2: "Any type", s2: "Hotels & resorts", l3: "Check-in", s3: "1 night", l4: "Guests", v4: "2 Guests", s4: "1 Room", swap: false,
      popular: [["Goa", "India"], ["Jaipur", "Rajasthan"], ["Udaipur", "Rajasthan"], ["Kochi", "Kerala"], ["Manali", "Himachal"]] }
  };
  var tabs = $$('.tabs [role="tab"]'), tabInd = $(".tab-ind"), bk = $("#bk"), swapBtn = $("#bkSwap");
  var trip = $("#trip"), popular = $("#popular"), mode = "flights", tripType = "one";
  var dateEl = $("#bkDate");
  var fmtDate = function (d) { return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
  var dep = new Date(); dep.setDate(dep.getDate() + 1);
  var ret = new Date(dep); ret.setDate(ret.getDate() + 3);
  function renderDate() {
    if (!dateEl) return;
    if (mode === "flights" && tripType === "round") { dateEl.textContent = fmtDate(dep) + " – " + fmtDate(ret); setField("s3", "Round trip"); setField("l3", "Depart – Return"); }
    else if (mode === "hotels") { var out = new Date(dep); out.setDate(out.getDate() + 1); dateEl.textContent = fmtDate(dep) + " – " + fmtDate(out); }
    else { dateEl.textContent = dep.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); if (mode === "flights") { setField("s3", "One way"); setField("l3", "Depart"); } }
  }
  function setField(k, v) { var el = bk && bk.querySelector("[data-" + k + "]"); if (el && v != null) el.textContent = v; }
  function placeTabInd(tab) { if (tabInd && tab) { tabInd.style.width = tab.offsetWidth + "px"; tabInd.style.transform = "translateX(" + tab.offsetLeft + "px)"; } }
  function flash(idx) {
    $$(".field", bk).forEach(function (f, i) { if (idx.indexOf(i) > -1) { f.classList.add("is-flash"); setTimeout(function () { f.classList.remove("is-flash"); }, 700); } });
  }
  function renderPopular() {
    if (!popular) return;
    popular.innerHTML = "";
    modes[mode].popular.forEach(function (p, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip chip-soft";
      b.style.animationDelay = (i * 50) + "ms";
      if (p.length === 4) { b.innerHTML = p[0] + ' <span class="ar">→</span> ' + p[2]; b.setAttribute("aria-label", "Search " + p[0] + " to " + p[2]); }
      else { b.textContent = p[0]; b.setAttribute("aria-label", "Search hotels in " + p[0]); }
      b.addEventListener("click", function () {
        bk.classList.add("swapping");
        setTimeout(function () {
          setField("v1", p[0]); setField("s1", p[1]);
          if (p.length === 4) { setField("v2", p[2]); setField("s2", p[3]); }
          bk.classList.remove("swapping");
          flash(p.length === 4 ? [0, 1] : [0]);
        }, reduce ? 0 : 180);
      });
      popular.appendChild(b);
    });
  }
  function activate(tab) {
    tabs.forEach(function (t) { var on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    placeTabInd(tab);
    bk.setAttribute("aria-labelledby", tab.id);
    mode = tab.dataset.mode;
    var m = modes[mode];
    bk.classList.add("swapping");
    setTimeout(function () {
      ["l1","v1","s1","l2","v2","s2","l3","s3","l4","v4","s4"].forEach(function (k) { setField(k, m[k]); });
      renderDate();
      bk.classList.remove("swapping");
    }, reduce ? 0 : 180);
    if (swapBtn) swapBtn.style.visibility = m.swap ? "visible" : "hidden";
    if (trip) trip.classList.toggle("is-hidden", !m.trip);
    renderPopular();
  }
  if (trip) {
    $$("button", trip).forEach(function (b) {
      b.addEventListener("click", function () {
        tripType = b.dataset.trip;
        $$("button", trip).forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
        renderDate(); flash([2]);
      });
    });
  }
  renderDate();
  renderPopular();
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { activate(tab); });
    tab.addEventListener("keydown", function (e) {
      var n = e.key === "ArrowRight" ? tabs[(i + 1) % tabs.length] : e.key === "ArrowLeft" ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
      if (n) { e.preventDefault(); n.focus(); activate(n); }
    });
  });
  var selTab = tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0];
  placeTabInd(selTab);
  window.addEventListener("load", function () { placeTabInd(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]); });
  window.addEventListener("resize", function () { placeTabInd(tabs.filter(function (t) { return t.getAttribute("aria-selected") === "true"; })[0]); });
  function placeSwap() {
    if (!swapBtn || !bk) return;
    var f = $$(".field", bk), b = bk.getBoundingClientRect(), a = f[0].getBoundingClientRect(), c = f[1].getBoundingClientRect();
    if (Math.abs(a.top - c.top) < 4) { // side by side
      swapBtn.style.left = ((a.right + c.left) / 2 - b.left - 19) + "px";
      swapBtn.style.top = (a.top - b.top + a.height / 2 - 19) + "px";
    } else { // stacked
      swapBtn.style.left = (a.right - b.left - 58) + "px";
      swapBtn.style.top = ((a.bottom + c.top) / 2 - b.top - 19) + "px";
    }
  }
  placeSwap();
  window.addEventListener("resize", placeSwap);
  window.addEventListener("load", placeSwap);
  if (swapBtn) {
    swapBtn.addEventListener("click", function () {
      swapBtn.classList.toggle("spin");
      bk.classList.add("swapping");
      setTimeout(function () {
        var v1 = $("[data-v1]", bk), v2 = $("[data-v2]", bk), s1 = $("[data-s1]", bk), s2 = $("[data-s2]", bk);
        var tv = v1.textContent, ts = s1.textContent;
        v1.textContent = v2.textContent; s1.textContent = s2.textContent; v2.textContent = tv; s2.textContent = ts;
        bk.classList.remove("swapping");
      }, reduce ? 0 : 200);
    });
  }

  /* ---------- Rail arrows ---------- */
  $$(".arr").forEach(function (b) {
    b.addEventListener("click", function () {
      var rail = document.getElementById(b.dataset.scroll);
      if (rail) rail.scrollBy({ left: rail.clientWidth * 0.8 * Number(b.dataset.dir), behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------- Pay: replay the receipt animation every time it enters ---------- */
  var pv = $("#payVisual");
  var payVisible = false, payTimer = null, payIdx = 0;

  /* ---------- Pay scene: people send / receive UPI, GCC, GINR ---------- */
  var txs = [
    { p: "a2", dir: "send", kind: "gcc",  coin: "G", say: "Send 100 GCC",       amt: "100 GCC",   to: "Paid to rahul@gram",       method: "GCC · Gram Chain",  time: "3.1 sec", reward: "+20 pts", ok: "✓ Transfer successful" },
    { p: "a6", dir: "send", kind: "upi",  coin: "₹", say: "Send ₹500 via UPI",  amt: "₹500",      to: "Paid to priya@upi",        method: "UPI",               time: "2.2 sec", reward: "+40 pts", ok: "✓ Payment successful" },
    { p: "a3", dir: "recv", kind: "ginr", coin: "₹", say: "Sent you 250 GINR",  amt: "+250 GINR", to: "Received from sahil@gram",  method: "GINR · Gram Chain", time: "2.9 sec", reward: "+10 pts", ok: "✓ Received" },
    { p: "a1", dir: "send", kind: "upi",  coin: "₹", say: "Send ₹1,240 via UPI", amt: "₹1,240",   to: "Paid to sharmastore@upi",  method: "UPI",               time: "2.4 sec", reward: "+40 pts", ok: "✓ Payment successful" },
    { p: "a4", dir: "recv", kind: "gcc",  coin: "G", say: "Sent you 50 GCC",    amt: "+50 GCC",   to: "Received from kiran@gram",  method: "GCC · Gram Chain",  time: "3.0 sec", reward: "+10 pts", ok: "✓ Received" },
    { p: "a5", dir: "send", kind: "ginr", coin: "₹", say: "Send 2,000 GINR",    amt: "2,000 GINR", to: "Paid to meera@gram",      method: "GINR · Gram Chain", time: "2.7 sec", reward: "+40 pts", ok: "✓ Transfer successful" }
  ];
  var bubble = $("#payBubble"), bText = $("#payBubbleText"), bCoin = $("#payBubbleCoin"), receipt = $("#payReceipt");
  var setText = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };

  function centerOf(el) {
    var a = el.getBoundingClientRect(), b = pv.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2, top: a.top - b.top, bottom: a.bottom - b.top };
  }
  function replayReceipt(tx) {
    receipt.classList.add("updating");
    setTimeout(function () {
      setText("payAmt", tx.amt); setText("payTo", tx.to); setText("payMethod", tx.method);
      setText("payTime", tx.time); setText("payReward", tx.reward); setText("payOk", tx.ok);
      var tag = $("#payTag"); tag.textContent = tx.kind.toUpperCase(); tag.className = "badge r-tag " + ({ upi: "badge-primary", gcc: "badge-dark", ginr: "badge-success" })[tx.kind];
      $("#payAmt").classList.toggle("in-amt", tx.dir === "recv");
      receipt.classList.remove("updating");
      pv.classList.remove("play"); void pv.offsetWidth; pv.classList.add("play");
      receipt.classList.add("bump"); setTimeout(function () { receipt.classList.remove("bump"); }, 350);
    }, 220);
  }
  function flyCoin(tx, from, to, done) {
    var dx = to.x - from.x, dy = to.y - from.y, lift = -Math.max(50, Math.abs(dx) * 0.35);
    var frames = [
      { transform: "translate(" + from.x + "px," + from.y + "px) scale(.4)", opacity: 0 },
      { transform: "translate(" + (from.x + dx * 0.15) + "px," + (from.y + dy * 0.15 + lift * 0.45) + "px) scale(1)", opacity: 1, offset: 0.18 },
      { transform: "translate(" + (from.x + dx * 0.5) + "px," + (from.y + dy * 0.5 + lift) + "px) scale(1.1) rotate(180deg)", opacity: 1, offset: 0.55 },
      { transform: "translate(" + to.x + "px," + to.y + "px) scale(.5) rotate(360deg)", opacity: 0 }
    ];
    [0, 70, 140].forEach(function (delay, i) {
      var c = document.createElement("i");
      c.className = "coin coin-lg fly-coin coin-" + tx.kind + (i ? " ghost" : "");
      c.textContent = tx.coin;
      pv.appendChild(c);
      var anim = c.animate(frames, { duration: 1000, delay: delay, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" });
      anim.onfinish = function () { c.remove(); if (i === 0 && done) done(); };
    });
  }
  function runTx() {
    if (!payVisible || !receipt) return;
    var tx = txs[payIdx % txs.length]; payIdx++;
    var av = pv.querySelector('[data-p="' + tx.p + '"]');
    var a = centerOf(av), r = centerOf(receipt), w = pv.clientWidth;
    $$(".pv", pv).forEach(function (x) { x.classList.toggle("active", x === av); });
    // bubble above the person (below if too close to the top), kept inside the scene
    bText.textContent = tx.say; bCoin.textContent = tx.coin; bCoin.className = "coin coin-sm coin-" + tx.kind;
    var card = pv.closest(".card") || pv;
    var roomAbove = av.getBoundingClientRect().top - card.getBoundingClientRect().top;
    var below = roomAbove < 58;
    bubble.classList.toggle("below", below);
    var half = bubble.offsetWidth / 2 + 4;
    bubble.style.left = Math.min(Math.max(a.x, half), w - half) + "px";
    bubble.style.top = (below ? a.bottom : a.top) + "px";
    bubble.classList.add("show");
    setTimeout(function () {
      var from = tx.dir === "send" ? a : r, to = tx.dir === "send" ? r : a;
      flyCoin(tx, from, to, function () { replayReceipt(tx); });
    }, 600);
    setTimeout(function () { bubble.classList.remove("show"); }, 2600);
    setTimeout(function () { av.classList.remove("active"); }, 2900);
    payTimer = setTimeout(runTx, 3400);
  }
  onView(pv, function (t, vis) {
    payVisible = vis;
    if (vis) {
      t.classList.add("play");
      if (!reduce && !payTimer && "animate" in Element.prototype) payTimer = setTimeout(runTx, 1400);
    } else {
      clearTimeout(payTimer); payTimer = null;
      bubble && bubble.classList.remove("show");
      $$(".pv", t).forEach(function (x) { x.classList.remove("active"); });
    }
  }, { threshold: 0.35 });

  /* ---------- GINR converter ---------- */
  var cvIn = $("#cvIn"), cvOut = $("#cvOut"), chips = $$(".cv-chips button");
  function convert() {
    var n = parseFloat(cvIn.value.replace(/[^0-9.]/g, ""));
    cvOut.textContent = isFinite(n) ? inr2.format(n) : "0.00";
    chips.forEach(function (c) { c.classList.toggle("is-active", Number(c.dataset.amt) === n); });
  }
  if (cvIn && cvOut) {
    cvIn.addEventListener("input", convert);
    cvIn.addEventListener("blur", function () { var n = parseFloat(cvIn.value.replace(/[^0-9.]/g, "")); if (isFinite(n)) cvIn.value = inr0.format(n); });
    chips.forEach(function (c) { c.addEventListener("click", function () { cvIn.value = inr0.format(Number(c.dataset.amt)); convert(); }); });
    convert();
  }

  /* ---------- Coin flip ---------- */
  var coin = $("#coin");
  if (coin) {
    coin.setAttribute("role", "button"); coin.setAttribute("tabindex", "0"); coin.setAttribute("aria-label", "Flip the GINR coin");
    var flip = function () { coin.classList.toggle("flipped"); };
    coin.addEventListener("click", flip);
    coin.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
    if (finePointer) { coin.addEventListener("mouseenter", flip); coin.addEventListener("mouseleave", flip); }
  }

  /* ---------- Copy contract ---------- */
  var copyBtn = $("#copyAddr");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var label = $("span", copyBtn);
      var reset = function () { setTimeout(function () { label.textContent = "Copy"; copyBtn.classList.remove("is-success"); }, 1600); };
      try {
        navigator.clipboard.writeText(copyBtn.dataset.addr).then(function () { label.textContent = "Copied"; copyBtn.classList.add("is-success"); reset(); }, function () { label.textContent = "Copy failed"; reset(); });
      } catch (e) { label.textContent = "Copy failed"; reset(); }
    });
  }

  /* ---------- Stats: count-up on view + live gccscan data ---------- */
  var counted = false;
  var statsEl = $(".stats");
  function runCounts() {
    $$(".count").forEach(function (el) { countTo(el, Number(el.dataset.to), 1400, function (v) { return inr0.format(v); }); });
  }
  onView(statsEl, function (t, vis, io) { if (vis && !counted) { counted = true; runCounts(); if (io) io.unobserve(t); } }, { threshold: 0.4 });

  if (window.fetch) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    fetch("https://gccscan.com/api/v2/tokens/0x67E53850C46845c879519dc114a3aa3B2A5286f5", ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (timer) clearTimeout(timer);
        var dec = parseInt(d.decimals, 10) || 18, s = String(d.total_supply || "");
        var sup = $("#stSupply"), hol = $("#stHolders");
        if (s.length > dec) { sup.dataset.to = s.slice(0, s.length - dec); if (counted) sup.textContent = inr0.format(Number(sup.dataset.to)); }
        if (d.holders_count) { hol.dataset.to = d.holders_count; if (counted) hol.textContent = inr0.format(Number(d.holders_count)); $("#stLive").textContent = "live from gccscan"; }
      })
      .catch(function () { /* keep fallback values */ });
  }

  /* ---------- GINR steps: light up in sequence ---------- */
  var steps = $("#steps");
  onView(steps, function (t, vis, io) {
    if (!vis) return;
    if (io) io.unobserve(t);
    $$("li", t).forEach(function (li, i) {
      setTimeout(function () { li.classList.add("on"); t.style.setProperty("--prog", (i * 33.4) + "%"); }, reduce ? 0 : i * 600);
    });
  }, { threshold: 0.5 });

  /* ---------- Debit card 3D tilt + glare ---------- */
  var c3 = $("#card3d");
  if (c3 && finePointer && !reduce) {
    var wrap = c3.closest(".dcard");
    wrap.addEventListener("pointermove", function (e) {
      var r = c3.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      c3.style.transform = "rotateY(" + ((x - 0.5) * 24) + "deg) rotateX(" + ((0.5 - y) * 18) + "deg)";
      c3.style.setProperty("--gx", (x * 100) + "%");
      c3.style.setProperty("--gy", (y * 100) + "%");
    });
    wrap.addEventListener("pointerleave", function () { c3.style.transform = ""; });
  }

  /* ---------- Loyalty: ring fill + tap to earn ---------- */
  var ring = $("#ptsRing"), num = $("#ptsNum"), pts = 0, goal = 1000, C = 327;
  function setPts(n, animate) {
    var from = pts; pts = n;
    ring.style.strokeDashoffset = String(C * (1 - Math.min(pts / goal, 1)));
    if (!animate || reduce) { num.textContent = inr0.format(pts); return; }
    var start = null;
    (function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / 700, 1);
      num.textContent = inr0.format(Math.round(from + (pts - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if (ring && num) {
    onView(ring, function (t, vis, io) { if (vis) { if (io) io.unobserve(t); setPts(410, true); } }, { threshold: 0.5 });
    $$(".pts-list button").forEach(function (b) {
      b.addEventListener("click", function () {
        var add = Number(b.dataset.pts);
        setPts(pts + add >= goal * 1.5 ? add : pts + add, true);
        var p = document.createElement("span"); p.className = "pop"; p.textContent = "+" + add;
        b.appendChild(p); setTimeout(function () { p.remove(); }, 900);
      });
    });
  }

  /* ---------- Reduced motion: stop SVG plane animations ---------- */
  if (reduce) $$("svg.route").forEach(function (s) { try { s.pauseAnimations(); } catch (e) {} });

  /* ---------- Year ---------- */
  var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
