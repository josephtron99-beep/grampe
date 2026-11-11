/* ==========================================================
   Grampe dashboard — single-page app (demo data)
   Routes: #/home #/wallet #/history #/send #/receive #/swap
           #/transfer #/upi #/cards #/staking #/gifts
           #/referral #/profile #/security
   ========================================================== */
(function () {
  "use strict";

  var D = window.GRAMPE_DEMO;
  var ICON = "../assets/img/icons.svg#";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ico(id, cls) { return '<svg class="' + (cls || "ico") + '" aria-hidden="true"><use href="' + ICON + id + '"/></svg>'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------------- state (persisted per browser) ---------------- */
  var KEY = "grampe-demo-v1";
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function fresh() {
    return {
      assets: JSON.parse(JSON.stringify(D.assets)), history: JSON.parse(JSON.stringify(D.history)),
      masked: false, cur: "INR", sbCollapsed: false, notifyStaking: false,
      card: { frozen: false, online: true, contactless: true, limit: 25000, balance: 0 },
      gifts: [], profile: JSON.parse(JSON.stringify(D.user))
    };
  }
  var S = load() || fresh();

  /* ---------------- formatting ---------------- */
  var nf = function (dp) { return new Intl.NumberFormat("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp }); };
  function num(v, dp) { return nf(dp == null ? 2 : dp).format(v || 0); }
  function money(usd) { return S.cur === "INR" ? "₹" + num(usd * D.usdInr, 2) : "$" + num(usd, 2); }
  function key(a) { return a.key || a.sym; }
  function asset(k) { return S.assets.filter(function (a) { return key(a) === k || a.sym === k; })[0]; }
  function label(a) { return a.key ? a.key : a.sym; }
  function net(id) { return D.networks.filter(function (n) { return n.id === id; })[0] || { name: id, explorer: "#" }; }
  function total() { return S.assets.reduce(function (s, a) { return s + a.bal * a.price; }, 0); }
  function short(s) { return s.length > 16 ? s.slice(0, 8) + "…" + s.slice(-6) : s; }
  function coin(a, cls) { return '<span class="coin ' + (cls || "coin-xl") + " " + a.coin + '">' + a.mark + "</span>"; }
  function chg(c) { return '<span class="' + (c >= 0 ? "chg-up" : "chg-down") + '">' + (c >= 0 ? "▲ " : "▼ ") + Math.abs(c).toFixed(2) + "%</span>"; }
  function m(html) { return '<span class="money">' + html + "</span>"; }
  function explorerAddr(a) {
    var n = net(a.net);
    if (a.net === "ton" || a.net === "shop") return n.explorer + "/" + a.addr;
    if (a.net === "xlm") return n.explorer + "/public/account/" + a.addr;
    return n.explorer + "/address/" + a.addr;
  }
  function greet() { var h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

  /* ---------------- UI primitives ---------------- */
  function toast(msg, icon) {
    var host = $("#toasts"), t = document.createElement("div");
    t.className = "toast-item";
    t.innerHTML = '<span class="icon-tile icon-tile-sm icon-tile-round tone-accent">' + ico(icon || "i-check") + "</span>" + esc(msg);
    host.appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 400); }, 2600);
  }
  function copy(text, what) {
    var done = function () { toast((what || "Copied") + " to clipboard", "i-copy"); };
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy not available here", "i-info"); }
      ta.remove();
    }
  }
  function share(text, title) {
    if (navigator.share) { navigator.share({ title: title || "Grampe", text: text, url: text.indexOf("http") === 0 ? text : undefined }).catch(function () {}); }
    else copy(text, "Link copied");
  }
  function qr(text) {
    try { var q = window.qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
    catch (e) { return '<div class="empty"><span class="caption">QR unavailable offline</span></div>'; }
  }

  /* overlay: modal / drawer / sheet */
  var overlay = $("#overlay"), lastFocus = null, onClose = null;
  function openPanel(o) {
    lastFocus = document.activeElement;
    overlay.className = "overlay overlay-" + (o.type || "drawer");
    $("#panelTitle").textContent = o.title || "";
    $("#panelBody").innerHTML = o.html || "";
    overlay.setAttribute("aria-hidden", "false");
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    document.body.style.overflow = "hidden";
    onClose = o.onClose || null;
    if (o.mount) o.mount($("#panelBody"));
    setTimeout(function () { var f = $("#panelBody [autofocus]") || $("#panelBody input, #panelBody button, #panelBody a") || $(".panel-head .icon-btn", overlay); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closePanel() {
    if (!overlay.classList.contains("open")) return;
    overlay.classList.remove("open"); overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (onClose) { var c = onClose; onClose = null; c(); }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closePanel(); });

  /* asset picker */
  function pickAsset(opts, cb) {
    var list = opts.list || S.assets;
    var rows = function (q) {
      return list.filter(function (a) { return !q || (a.name + " " + label(a) + " " + net(a.net).name).toLowerCase().indexOf(q) > -1; }).map(function (a) {
        var dis = opts.disabled && opts.disabled(a);
        return '<button class="row-item" data-k="' + key(a) + '"' + (dis ? ' disabled style="opacity:.45"' : "") + ">" + coin(a) +
          '<span class="row-main"><b>' + label(a) + "</b><small>" + a.name + " · " + net(a.net).name + "</small></span>" +
          '<span class="row-end"><b>' + m(num(a.bal, a.dp)) + "</b><small>" + m(money(a.bal * a.price)) + "</small></span></button>";
      }).join("") || '<p class="empty caption">No assets match</p>';
    };
    openPanel({
      type: "modal", title: opts.title || "Select asset",
      html: '<div class="input-wrap" style="margin-bottom:12px">' + ico("i-search") + '<input class="input" id="pkQ" placeholder="Search assets" autofocus></div><div class="rows" id="pkList">' + rows("") + "</div>" + (opts.note ? '<p class="note warn" style="margin-top:12px">' + ico("i-info") + opts.note + "</p>" : ""),
      mount: function (b) {
        $("#pkQ", b).addEventListener("input", function (e) { $("#pkList", b).innerHTML = rows(e.target.value.trim().toLowerCase()); });
        b.addEventListener("click", function (e) { var r = e.target.closest("[data-k]"); if (r && !r.disabled) { closePanel(); cb(asset(r.dataset.k)); } });
      }
    });
  }

  /* add a history entry + persist */
  function record(tx) { tx.id = "t" + Date.now(); tx.date = new Date().toISOString(); tx.status = "Completed"; S.history.unshift(tx); save(); }

  /* processing → success inside the panel */
  function runFlow(body, successHtml, after) {
    body.innerHTML = '<div class="processing"><div class="spinner"></div><p class="body-sm">Processing securely…</p></div>';
    setTimeout(function () {
      if (after) after();
      body.innerHTML = '<div class="success"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="38"/><path d="m26 43 11 11 22-24"/></svg>' + successHtml +
        '<div class="cta-row" style="justify-content:center;width:100%"><a class="btn btn-secondary" href="#/history" data-action="close">View in history</a><button class="btn btn-primary" data-action="close">Done</button></div></div>';
      refreshChrome();
    }, reduce ? 200 : 1300);
  }

  /* ---------------- routes ---------------- */
  var ROUTES = [
    { id: "home", title: "Home", group: "Overview", icon: "i-home", nav: "main" },
    { id: "wallet", title: "Wallet", group: "Overview", icon: "i-wallet", nav: "main" },
    { id: "swap", title: "Swap", group: "Products", icon: "i-swap", nav: "products" },
    { id: "cards", title: "RuPay card", group: "Products", icon: "i-card", nav: "products", badge: "Soon" },
    { id: "transfer", title: "Transfer", group: "Products", icon: "i-users", nav: "products" },
    { id: "referral", title: "Refer", group: "Products", icon: "i-share", nav: "products" },
    { id: "staking", title: "Staking", group: "Products", icon: "i-layers" },
    { id: "history", title: "History", group: "Wallet", icon: "i-list" },
    { id: "send", title: "Send", group: "Wallet", icon: "i-send" },
    { id: "receive", title: "Add fund", group: "Wallet", icon: "i-receive" },
    { id: "upi", title: "UPI transfer", group: "Wallet", icon: "i-bolt" },
    { id: "gifts", title: "Gift cards", group: "Wallet", icon: "i-gift" },
    { id: "profile", title: "My profile", group: "Account", icon: "i-user" },
    { id: "security", title: "Security", group: "Account", icon: "i-lock" }
  ];
  var PAGES = {};
  function route() { return ROUTES.filter(function (r) { return r.id === current.id; })[0]; }
  var current = { id: "home", params: {} };

  /* shadcn Sidebar: "Menu" (Home, Wallet) and "Products" (Swap, RuPay card, Transfer, Refer) groups */
  function buildSidebar() {
    function link(r) { return '<a class="sb-btn" href="#/' + r.id + '" data-route="' + r.id + '">' + ico(r.icon) + "<span>" + r.title + "</span>" + (r.badge ? '<span class="badge badge-outline sb-badge">' + r.badge + "</span>" : "") + "</a>"; }
    function group(title, nav) { return '<div class="sb-section"><p class="sb-label">' + title + '</p><div class="sb-menu">' + ROUTES.filter(function (r) { return r.nav === nav; }).map(link).join("") + "</div></div>"; }
    $("#sbNav").innerHTML = group("Menu", "main") + group("Products", "products");
  }
  function sbOpen() { $("#app").classList.add("sb-open"); $(".hd-trigger").setAttribute("aria-expanded", "true"); var f = $(".sb-btn", $("#sidebar")); if (f) f.focus(); }
  function sbClose() { var was = $("#app").classList.contains("sb-open"); $("#app").classList.remove("sb-open"); $(".hd-trigger").setAttribute("aria-expanded", "false"); return was; }

  /* shadcn Select: replaces each native <select> with a trigger + rounded listbox.
     The native select stays (hidden) as the source of value and "change" events. */
  function enhanceSelects(root) {
    $$("select", root).forEach(function (sel) {
      if (sel.dataset.ui) return;
      sel.dataset.ui = "1";
      var fill = !!sel.closest(".input-wrap"), prefix = sel.dataset.prefix || "";
      var wrap = document.createElement("div"), btn = document.createElement("button"), list = document.createElement("ul");
      wrap.className = "select" + (fill ? " select-fill" : "");
      btn.type = "button"; btn.className = "select-trigger";
      btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
      if (sel.getAttribute("aria-label")) btn.setAttribute("aria-label", sel.getAttribute("aria-label"));
      if (sel.id) { btn.id = sel.id + "Btn"; var lab = $('label[for="' + sel.id + '"]'); if (lab) lab.htmlFor = btn.id; }
      list.className = "select-menu"; list.setAttribute("role", "listbox"); list.hidden = true;
      sel.parentNode.insertBefore(wrap, sel);
      wrap.appendChild(sel); wrap.appendChild(btn); wrap.appendChild(list);
      sel.hidden = true; sel.tabIndex = -1;
      function paint() {
        var o = sel.options[sel.selectedIndex];
        btn.innerHTML = (prefix ? '<span class="select-prefix">' + esc(prefix) + "</span>" : "") + '<span class="select-value">' + esc(o ? o.text : "") + "</span>" + ico("i-chevron-down", "ico select-chev");
        list.innerHTML = Array.prototype.map.call(sel.options, function (o, i) {
          return '<li role="option" tabindex="-1" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '"><span>' + esc(o.text) + "</span>" + ico("i-check", "ico select-check") + "</li>";
        }).join("");
      }
      function open() {
        closeSelects(); closeMenu();
        list.hidden = false; wrap.classList.add("open"); btn.setAttribute("aria-expanded", "true");
        ($('[aria-selected="true"]', list) || list.firstElementChild).focus();
      }
      function close(focus) { list.hidden = true; wrap.classList.remove("open"); btn.setAttribute("aria-expanded", "false"); if (focus) btn.focus(); }
      function pick(i) { if (i !== sel.selectedIndex) { sel.selectedIndex = i; sel.dispatchEvent(new Event("change", { bubbles: true })); } paint(); close(true); }
      wrap._close = close;
      btn.addEventListener("click", function (e) { e.stopPropagation(); if (list.hidden) open(); else close(); });
      btn.addEventListener("keydown", function (e) { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
      list.addEventListener("click", function (e) { var li = e.target.closest("[data-i]"); if (li) { e.stopPropagation(); pick(+li.dataset.i); } });
      list.addEventListener("keydown", function (e) {
        var items = $$("[data-i]", list), i = items.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(i - 1, 0)].focus(); }
        else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (i > -1) pick(+items[i].dataset.i); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
        else if (e.key === "Tab") close();
      });
      paint();
    });
  }
  function closeSelects() { $$(".select.open").forEach(function (w) { w._close(); }); }

  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("?"), id = parts[0] || "home", params = {};
    (parts[1] || "").split("&").forEach(function (kv) { if (kv) { var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); } });
    if (!PAGES[id]) id = "home";
    return { id: id, params: params };
  }

  var view = $("#view"), timers = [];
  function clearTimers() { timers.forEach(clearInterval); timers = []; }
  function render() {
    closePanel(); clearTimers();
    current = parseHash();
    var r = route(), P = PAGES[current.id];
    var navId = r.nav ? r.id : r.group === "Wallet" ? "wallet" : ""; // money pages light up Wallet
    $$("#sbNav [data-route]").forEach(function (a) { a.classList.toggle("active", a.dataset.route === navId); if (a.dataset.route === navId) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    sbClose();
    $("#tbTitle").textContent = r.title;
    $("#tbCrumb").textContent = r.group;
    document.title = r.title + " · Grampe Wallet";
    view.classList.remove("enter");
    view.innerHTML = P.html(current.params);
    void view.offsetWidth; view.classList.add("enter");
    if (P.mount) P.mount(view, current.params);
    enhanceSelects(view);
    window.scrollTo(0, 0);
  }
  function refreshChrome() {
    document.body.classList.toggle("masked", S.masked);
    var p = S.profile, ini = p.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    $("#userInitials").textContent = ini; $("#userName").textContent = p.name; $("#userId").textContent = "ID " + p.id;
  }

  /* ================= PAGES ================= */

  /* ---------- HOME ---------- */
  PAGES.home = {
    html: function () {
      var t = total(), top = S.assets.slice().sort(function (a, b) { return b.bal * b.price - a.bal * a.price; }).slice(0, 5);
      var dayChg = S.assets.reduce(function (s, a) { return s + a.bal * a.price * a.change / 100; }, 0), dayPct = t ? dayChg / t * 100 : 0;
      var held = S.assets.filter(function (a) { return a.bal > 0; }).length;
      var today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
      return '' +
      '<section class="welcome" aria-labelledby="wlTitle">' +
        '<img class="wl-mark" src="../assets/img/shield.svg" alt="" width="92" height="104">' +
        '<div class="wl-top"><span class="wl-badge"><i></i>' + today + "</span>" + curToggle() + "</div>" +
        '<h1 id="wlTitle">' + greet() + ", " + esc(S.profile.name.split(" ")[0]) + " 👋</h1>" +
        '<p class="wl-sub">Welcome back to Grampe. Your crypto and GINR in one safe place: send, swap and pay in seconds.</p>' +
        '<div class="wl-bal"><div>' +
          '<p class="wl-bal-label">Total balance <button data-action="mask" aria-label="' + (S.masked ? "Show" : "Hide") + ' balances">' + ico(S.masked ? "i-eye-off" : "i-eye") + "</button></p>" +
          '<p class="wl-amount">' + m('<span id="heroTotal">' + money(t) + "</span>") + "</p></div>" +
          '<div class="wl-meta"><span class="wl-pill' + (dayPct >= 0 ? " up" : "") + '">' + (dayPct >= 0 ? "▲ " : "▼ ") + Math.abs(dayPct).toFixed(2) + '% today</span><span class="wl-pill">' + held + " assets</span></div>" +
        "</div>" +
        '<div class="wl-actions">' +
          '<a class="btn btn-sm" href="#/send">' + ico("i-send") + "Send</a>" +
          '<a class="btn btn-sm" href="#/receive">' + ico("i-receive") + "Add fund</a>" +
          '<a class="btn btn-sm wl-ghost" href="#/swap">' + ico("i-swap") + "Swap</a>" +
          '<a class="btn btn-sm wl-ghost" href="#/transfer">' + ico("i-users") + "Transfer</a>" +
        "</div>" +
      "</section>" +
      '<section class="card box"><div class="card-header"><div><h2 class="card-title">Assets</h2><p class="card-desc">Your top holdings by value</p></div><a class="btn btn-ghost btn-sm" href="#/wallet">View all ' + ico("i-arrow") + "</a></div>" +
        '<div class="rows">' + top.map(assetRow).join("") + "</div></section>" +
      '<section class="card box"><div class="card-header"><div><h2 class="card-title">Recent activity</h2><p class="card-desc">Your latest transactions</p></div><a class="btn btn-ghost btn-sm" href="#/history">See all ' + ico("i-arrow") + "</a></div>" +
        '<div class="rows">' + S.history.slice(0, 5).map(txRow).join("") + "</div></section>" +
      '<section class="card box"><div class="card-header"><div><h2 class="card-title">Refer a friend</h2><p class="card-desc">Share your link and bring friends to Grampe.</p></div><span class="icon-tile icon-tile-sm tone-success">' + ico("i-users") + "</span></div>" +
        '<div class="ref-box"><span>' + esc(S.profile.refLink) + '</span><button class="btn btn-secondary btn-sm" data-copy="' + esc(S.profile.refLink) + '" data-what="Referral link">' + ico("i-copy") + "Copy</button></div>" +
        '<div class="ref-actions"><a class="btn btn-ghost btn-sm" href="#/referral">Open Refer ' + ico("i-arrow") + "</a></div></section>";
    },
    mount: function (v) { countUp($("#heroTotal", v), total()); }
  };
  function curToggle() { return '<div class="cur-toggle" role="group" aria-label="Display currency"><button data-cur="INR" aria-pressed="' + (S.cur === "INR") + '">₹ INR</button><button data-cur="USD" aria-pressed="' + (S.cur === "USD") + '">$ USD</button></div>'; }
  function countUp(el, usd) {
    if (!el || reduce) return;
    var start = null;
    (function step(t) { if (!start) start = t; var p = Math.min((t - start) / 900, 1); el.textContent = money(usd * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
  }

  /* chart */
  function series(range, end) {
    var n = { "1D": 48, "1W": 56, "1M": 60, "3M": 90, "1Y": 120 }[range], vol = { "1D": .004, "1W": .008, "1M": .012, "3M": .018, "1Y": .025 }[range];
    var seed = range.charCodeAt(0) * 97 + range.length * 13, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var pts = [end]; for (var i = 1; i < n; i++) pts.unshift(pts[0] * (1 + (rnd() - .52) * vol * 2));
    var span = { "1D": 864e5, "1W": 6048e5, "1M": 2592e6, "3M": 7776e6, "1Y": 31536e6 }[range], now = Date.now();
    return pts.map(function (p, i) { return { v: p, t: now - span + span * i / (n - 1) }; });
  }
  function drawChart(el, range) {
    var g = asset("GCC"), data = series(range, g.price), W = 600, H = 180, pad = 8;
    var vs = data.map(function (d) { return d.v; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
    var x = function (i) { return i / (data.length - 1) * W; }, y = function (v) { return pad + (1 - (v - lo) / (hi - lo || 1)) * (H - pad * 2); };
    var line = data.map(function (d, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.v).toFixed(1); }).join(" ");
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-label="GCC price chart, ' + range + '" role="img"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0500FF" stop-opacity=".18"/><stop offset="1" stop-color="#0500FF" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="area" d="' + line + " L" + W + " " + H + " L0 " + H + ' Z"/><path class="line draw" d="' + line + '" vector-effect="non-scaling-stroke"/>' +
      '<line class="cross" x1="0" x2="0" y1="0" y2="' + H + '" vector-effect="non-scaling-stroke" style="display:none"/><circle class="dot" r="5" style="display:none" vector-effect="non-scaling-stroke"/></svg><div class="chart-tip"></div>';
    var first = data[0].v, last = data[data.length - 1].v, pct = (last - first) / first * 100;
    var cc = $("#cChg"); if (cc) cc.innerHTML = chg(pct) + ' <span class="caption">' + range + "</span>";
    var svg = $("svg", el), cross = $(".cross", el), dot = $(".dot", el), tip = $(".chart-tip", el);
    function at(clientX) {
      var r = svg.getBoundingClientRect(), i = Math.round(Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * (data.length - 1)), d = data[i];
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = "";
      dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(d.v)); dot.style.display = "";
      tip.style.left = (x(i) / W * 100) + "%";
      var dt = new Date(d.t);
      tip.textContent = "$" + d.v.toFixed(4) + " · " + (range === "1D" ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      $("#cPrice").textContent = "$" + d.v.toFixed(4);
    }
    function leave() { cross.style.display = "none"; dot.style.display = "none"; el.classList.remove("touching"); $("#cPrice").textContent = "$" + last.toFixed(4); }
    el.onpointermove = function (e) { at(e.clientX); };
    el.onpointerdown = function (e) { el.classList.add("touching"); at(e.clientX); };
    el.onpointerleave = leave; el.onpointerup = function (e) { if (e.pointerType !== "mouse") leave(); };
  }

  /* rows */
  function assetRow(a) {
    return '<button class="row-item" data-asset="' + key(a) + '">' + coin(a) +
      '<span class="row-main"><b>' + label(a) + "</b><small>" + net(a.net).name + " · $" + (a.price < 1 ? a.price.toFixed(4) : num(a.price, 2)) + " " + chg(a.change) + "</small></span>" +
      '<span class="row-end hide-on-hover"><b>' + m(num(a.bal, a.dp)) + "</b><small>" + m(money(a.bal * a.price)) + "</small></span>" +
      '<span class="row-actions"><a class="chip" href="#/send?asset=' + key(a) + '">Send</a><a class="chip" href="#/receive?asset=' + key(a) + '">Receive</a></span></button>';
  }
  var TX = {
    receive: { icon: "i-receive", tone: "tone-success", t: function (x) { return "Received " + x.asset; }, s: function (x) { return "From " + x.from; }, sign: "+" },
    send: { icon: "i-send", tone: "tone-primary", t: function (x) { return "Sent " + x.asset; }, s: function (x) { return "To " + x.to; }, sign: "−" },
    swap: { icon: "i-swap", tone: "tone-violet", t: function (x) { return "Swap " + x.asset + " → " + x.to; }, s: function (x) { return "Received " + num(x.toAmount, 2) + " " + x.to; }, sign: "−" },
    transfer: { icon: "i-users", tone: "tone-sky", t: function (x) { return "Transfer " + x.asset; }, s: function (x) { return "To " + x.to; }, sign: "−" },
    upi: { icon: "i-bolt", tone: "tone-warning", t: function () { return "UPI transfer"; }, s: function (x) { return "To " + x.to; }, sign: "−" },
    gift: { icon: "i-gift", tone: "tone-warning", t: function (x) { return "Gift card · " + x.to; }, s: function () { return "Paid with GINR"; }, sign: "−" },
    card: { icon: "i-card", tone: "tone-primary", t: function () { return "Card top-up"; }, s: function () { return "RuPay virtual card"; }, sign: "−" }
  };
  function txRow(x) {
    var T = TX[x.type], d = new Date(x.date);
    return '<button class="row-item" data-tx="' + x.id + '"><span class="icon-tile ' + T.tone + '">' + ico(T.icon) + "</span>" +
      '<span class="row-main"><b>' + esc(T.t(x)) + "</b><small>" + esc(T.s(x)) + " · " + d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + "</small></span>" +
      '<span class="row-end"><b class="' + (T.sign === "+" ? "chg-up" : "") + '">' + m(T.sign + num(x.amount, 2)) + "</b><small>" + x.asset + "</small></span></button>";
  }

  /* drawers */
  function assetDrawer(k) {
    var a = asset(k); if (!a) return;
    var txs = S.history.filter(function (x) { return x.asset === key(a) || x.asset === a.sym || x.to === key(a); }).slice(0, 4);
    openPanel({
      type: "drawer", title: label(a),
      html: '<div class="profile-head">' + coin(a, "coin-xl") + '<div><p class="title">' + a.name + '</p><p class="caption">' + net(a.net).name + " network</p></div></div>" +
        '<div class="summary"><div><span>Balance</span><b>' + m(num(a.bal, a.dp) + " " + label(a)) + "</b></div><div><span>Value</span><b>" + m(money(a.bal * a.price)) + "</b></div><div><span>Price</span><b>$" + (a.price < 1 ? a.price.toFixed(4) : num(a.price, 2)) + " " + chg(a.change) + "</b></div></div>" +
        '<div class="action-grid" style="margin-top:16px"><a href="#/send?asset=' + key(a) + '">' + '<span class="icon-tile tone-primary">' + ico("i-send") + "</span>Send</a><a href=\"#/receive?asset=" + key(a) + '"><span class="icon-tile tone-success">' + ico("i-receive") + "</span>Receive</a><a href=\"#/swap?from=" + key(a) + '"><span class="icon-tile tone-violet">' + ico("i-swap") + "</span>Swap</a></div>" +
        '<p class="input-label" style="margin:20px 0 8px">Your ' + label(a) + ' address</p><div class="addr"><span>' + a.addr + '</span><button class="icon-btn icon-btn-sm" data-copy="' + a.addr + '" data-what="Address" aria-label="Copy address">' + ico("i-copy") + "</button></div>" +
        '<a class="link" style="margin-top:12px" href="' + explorerAddr(a) + '" target="_blank" rel="noopener">View on explorer ' + ico("i-ext") + "</a>" +
        (txs.length ? '<p class="input-label" style="margin:20px 0 4px">Recent</p><div class="rows">' + txs.map(txRow).join("") + "</div>" : "")
    });
  }
  function txDrawer(id) {
    var x = S.history.filter(function (t) { return t.id === id; })[0]; if (!x) return;
    var T = TX[x.type], a = asset(x.asset), d = new Date(x.date), hash = "0x" + (x.id + "a9f3c27b1e8d4065f2c19ab87e3d").repeat(3).slice(0, 64).replace(/[^0-9a-f]/g, "7");
    openPanel({
      type: "drawer", title: T.t(x),
      html: '<div class="success" style="padding-top:0"><span class="icon-tile icon-tile-xl ' + T.tone + '">' + ico(T.icon) + '</span><p class="amount">' + m(T.sign + num(x.amount, 2) + " " + x.asset) + '</p><span class="badge badge-success">' + x.status + "</span></div>" +
        '<div class="summary" style="margin-top:16px"><div><span>Date</span><b>' + d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + "</b></div>" +
        (x.from ? "<div><span>From</span><b>" + esc(x.from) + "</b></div>" : "") + (x.to ? "<div><span>To</span><b>" + esc(x.type === "swap" ? num(x.toAmount, 2) + " " + x.to : x.to) + "</b></div>" : "") +
        "<div><span>Network</span><b>" + (a ? net(a.net).name : "Gram Chain") + "</b></div><div><span>Transaction</span><b>" + short(hash) + "</b></div></div>" +
        '<div class="cta-row"><button class="btn btn-secondary" data-copy="' + hash + '" data-what="Transaction hash">' + ico("i-copy") + 'Copy hash</button><a class="btn btn-primary" href="' + (a ? net(a.net).explorer : "https://gccscan.com") + '" target="_blank" rel="noopener">Explorer ' + ico("i-ext") + "</a></div>" +
        '<p class="caption" style="margin-top:12px">Demo transaction · hash is illustrative.</p>'
    });
  }

  /* ---------- WALLET ---------- */
  PAGES.wallet = {
    html: function () {
      return '<div class="page-head"><div><p class="caption">Total balance</p><p class="h2">' + m(money(total())) + '</p></div><div class="cta-row" style="margin:0"><a class="btn btn-primary" href="#/send">' + ico("i-send") + 'Send</a><a class="btn btn-secondary" href="#/receive">' + ico("i-receive") + 'Add fund</a><a class="btn btn-secondary" href="#/swap">' + ico("i-swap") + 'Swap</a><a class="btn btn-secondary" href="#/history">' + ico("i-list") + "History</a></div></div>" +
        '<section class="card box">' +
        '<div class="toolbar"><div class="input-wrap">' + ico("i-search") + '<input class="input" id="wQ" placeholder="Search assets" aria-label="Search assets"></div>' +
        '<select id="wSort" data-prefix="Sort by" aria-label="Sort assets"><option value="value">Value</option><option value="name">Name</option><option value="change">24h change</option></select>' +
        '<label class="chip" style="cursor:pointer"><button type="button" class="switch" id="wZero" role="switch" aria-checked="false" aria-label="Hide zero balances"></button>Hide zero</label></div>' +
        '<div class="chip-row" id="wNets"><button class="chip is-active" data-net="all">All networks</button>' + D.networks.map(function (n) { return '<button class="chip" data-net="' + n.id + '">' + n.name + "</button>"; }).join("") + "</div>" +
        '<div class="rows" id="wList" style="margin-top:8px"></div></section>';
    },
    mount: function (v) {
      var st = { q: "", sort: "value", zero: false, net: "all" };
      function draw() {
        var list = S.assets.filter(function (a) {
          return (st.net === "all" || a.net === st.net) && (!st.zero || a.bal > 0) && (!st.q || (a.name + label(a)).toLowerCase().indexOf(st.q) > -1);
        }).sort(function (a, b) { return st.sort === "name" ? label(a).localeCompare(label(b)) : st.sort === "change" ? b.change - a.change : b.bal * b.price - a.bal * a.price; });
        $("#wList", v).innerHTML = list.map(assetRow).join("") || '<div class="empty"><span class="icon-tile icon-tile-lg tone-primary">' + ico("i-search") + '</span><p class="title">No assets found</p><p class="body-sm">Try another network or search.</p></div>';
      }
      $("#wQ", v).addEventListener("input", function (e) { st.q = e.target.value.trim().toLowerCase(); draw(); });
      $("#wSort", v).addEventListener("change", function (e) { st.sort = e.target.value; draw(); });
      $("#wZero", v).addEventListener("click", function (e) { st.zero = !st.zero; e.currentTarget.setAttribute("aria-checked", String(st.zero)); draw(); });
      $("#wNets", v).addEventListener("click", function (e) { var b = e.target.closest("[data-net]"); if (!b) return; st.net = b.dataset.net; $$("[data-net]", v).forEach(function (x) { x.classList.toggle("is-active", x === b); }); draw(); });
      draw();
    }
  };

  /* ---------- HISTORY ---------- */
  PAGES.history = {
    html: function () {
      var f = [["all", "All"], ["receive", "Received"], ["send", "Sent"], ["swap", "Swaps"], ["transfer", "Transfers"], ["upi", "UPI"], ["gift", "Gift cards"]];
      return '<section class="card box"><div class="toolbar"><div class="input-wrap">' + ico("i-search") + '<input class="input" id="hQ" placeholder="Search activity" aria-label="Search activity"></div></div>' +
        '<div class="chip-row" id="hF">' + f.map(function (x, i) { return '<button class="chip' + (i ? "" : " is-active") + '" data-f="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
        '<div id="hList"></div></section>';
    },
    mount: function (v) {
      var st = { q: "", f: "all" };
      function day(d) { var t = new Date(); t.setHours(0, 0, 0, 0); var x = new Date(d); x.setHours(0, 0, 0, 0); var diff = (t - x) / 864e5; return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : x.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }); }
      function draw() {
        var list = S.history.filter(function (x) { return (st.f === "all" || x.type === st.f) && (!st.q || JSON.stringify(x).toLowerCase().indexOf(st.q) > -1); });
        var html = "", last = "";
        list.forEach(function (x) { var g = day(x.date); if (g !== last) { last = g; html += '<p class="caption date-group">' + g + "</p>"; } html += txRow(x); });
        $("#hList", v).innerHTML = html ? '<div class="rows">' + html + "</div>" : '<div class="empty"><span class="icon-tile icon-tile-lg tone-primary">' + ico("i-list") + '</span><p class="title">No activity yet</p><p class="body-sm">Transactions you make will appear here.</p></div>';
      }
      $("#hQ", v).addEventListener("input", function (e) { st.q = e.target.value.trim().toLowerCase(); draw(); });
      $("#hF", v).addEventListener("click", function (e) { var b = e.target.closest("[data-f]"); if (!b) return; st.f = b.dataset.f; $$("[data-f]", v).forEach(function (x) { x.classList.toggle("is-active", x === b); }); draw(); });
      draw();
    }
  };

  /* ---------- SEND ---------- */
  var ADDR = {
    evm: /^0x[0-9a-fA-F]{40}$/, ton: /^(UQ|EQ)[A-Za-z0-9_-]{46}$/, xlm: /^G[A-Z2-7]{55}$/, tron: /^T[1-9A-HJ-NP-Za-km-z]{33}$/
  };
  function addrOk(a, s) { var t = a.net === "ton" || a.net === "shop" ? "ton" : a.net === "xlm" ? "xlm" : a.net === "tron" ? "tron" : "evm"; return ADDR[t].test(s); }
  function addrHint(a) { return a.net === "ton" || a.net === "shop" ? "TON address starting with UQ or EQ" : a.net === "xlm" ? "Stellar address starting with G" : "Address starting with 0x (42 characters)"; }
  PAGES.send = {
    html: function () {
      return '<div class="narrow"><section class="card box flow" id="sendBox"></section></div>';
    },
    mount: function (v, p) {
      var a = asset(p.asset || "GINR") || S.assets[0], st = { to: "", amt: "" }, box = $("#sendBox", v);
      function stepper(n) { return '<ol class="stepper">' + ["Details", "Review", "Done"].map(function (s, i) { return '<li class="' + (i < n ? "is-done" : i === n ? "is-current" : "") + '"><span class="step-dot">' + (i < n ? "✓" : i + 1) + "</span>" + s + "</li>"; }).join("") + "</ol>"; }
      function fee() { return D.fees[a.net] || 0; }
      function form() {
        box.innerHTML = '<div class="flow-head"><h2 class="card-title">Send crypto</h2>' + stepper(0) + "</div>" +
          '<div class="input-group"><span class="input-label">Asset</span><button class="asset-pick" id="sAsset">' + coin(a) + '<span class="row-main"><b>' + label(a) + "</b><small>" + net(a.net).name + " · Balance " + m(num(a.bal, a.dp)) + "</small></span>" + ico("i-chevron-down") + "</button></div>" +
          '<div class="input-group"><label class="input-label" for="sTo">Recipient address</label><div class="input-wrap" id="sToW"><input class="input" id="sTo" placeholder="Enter or paste address" autocomplete="off" spellcheck="false" value="' + esc(st.to) + '"><button class="chip" id="sPaste" type="button">' + ico("i-paste") + 'Paste</button></div><p class="input-hint" id="sToH">' + addrHint(a) + "</p></div>" +
          '<div class="input-group"><label class="input-label" for="sAmt">Amount</label><div class="input-wrap" id="sAmtW"><input class="input input-lg" id="sAmt" inputmode="decimal" placeholder="0.00" value="' + esc(st.amt) + '"><span class="input-addon">' + label(a) + '</span></div><div class="amount-meta"><span id="sFiat">≈ ' + money(0) + '</span><span>Available ' + num(a.bal, a.dp) + ' · <button type="button" id="sMax">Max</button></span></div></div>' +
          '<div class="summary"><div><span>Network fee (demo)</span><b>' + fee() + " " + label(a) + '</b></div><div class="total"><span>Total</span><b id="sTotal">—</b></div></div>' +
          '<button class="btn btn-primary btn-lg btn-block" id="sNext" disabled>Continue</button>';
        var to = $("#sTo", box), amt = $("#sAmt", box);
        function check() {
          st.to = to.value.trim(); st.amt = amt.value.replace(/[^0-9.]/g, "");
          var okA = addrOk(a, st.to), n = parseFloat(st.amt), okN = n > 0 && n + fee() <= a.bal, self = st.to === a.addr;
          $("#sToW", box).className = "input-wrap" + (st.to ? (okA && !self ? " is-valid" : " is-invalid") : "");
          $("#sToH", box).className = "input-hint" + (st.to ? (okA && !self ? " is-ok" : " is-error") : "");
          $("#sToH", box).textContent = !st.to ? addrHint(a) : self ? "That's your own address" : okA ? "Valid " + net(a.net).name + " address" : "Not a valid " + net(a.net).name + " address";
          $("#sAmtW", box).className = "input-wrap" + (st.amt ? (okN ? "" : " is-invalid") : "");
          $("#sFiat", box).textContent = n > a.bal ? "Not enough balance" : "≈ " + money((n || 0) * a.price);
          $("#sTotal", box).textContent = n ? num(n + fee(), a.dp) + " " + label(a) : "—";
          $("#sNext", box).disabled = !(okA && okN && !self);
        }
        to.addEventListener("input", check); amt.addEventListener("input", check);
        $("#sMax", box).addEventListener("click", function () { amt.value = Math.max(0, a.bal - fee()).toFixed(a.dp); check(); });
        $("#sPaste", box).addEventListener("click", function () { if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function (t) { to.value = t.trim(); check(); }, function () { toast("Allow clipboard access to paste", "i-info"); }); else toast("Paste with Ctrl V", "i-info"); });
        $("#sAsset", box).addEventListener("click", function () { pickAsset({ title: "Send which asset?" }, function (x) { a = x; st.to = ""; history.replaceState(null, "", "#/send?asset=" + key(a)); form(); }); });
        $("#sNext", box).addEventListener("click", review);
        check();
      }
      function review() {
        var n = parseFloat(st.amt);
        box.innerHTML = '<div class="flow-head"><h2 class="card-title">Review</h2>' + stepper(1) + "</div>" +
          '<div class="success" style="padding:0">' + coin(a) + '<p class="amount">' + num(n, a.dp) + " " + label(a) + '</p><p class="body-sm">≈ ' + money(n * a.price) + "</p></div>" +
          '<div class="summary"><div><span>To</span><b>' + esc(short(st.to)) + "</b></div><div><span>Network</span><b>" + net(a.net).name + "</b></div><div><span>Network fee</span><b>" + fee() + " " + label(a) + '</b></div><div class="total"><span>Total</span><b>' + num(n + fee(), a.dp) + " " + label(a) + "</b></div></div>" +
          '<p class="note warn">' + ico("i-info") + "Crypto transfers can't be reversed. Check the address and network.</p>" +
          '<div class="grid-2" style="grid-template-columns:1fr 2fr"><button class="btn btn-secondary btn-lg" id="sBack">Back</button><button class="btn btn-primary btn-lg" id="sGo">Confirm &amp; send</button></div>';
        $("#sBack", box).addEventListener("click", form);
        $("#sGo", box).addEventListener("click", function () {
          box.innerHTML = '<div class="flow-head"><h2 class="card-title">Sending</h2>' + stepper(2) + '</div><div id="sRun"></div>';
          runFlow($("#sRun", box), '<p class="amount">' + num(n, a.dp) + " " + label(a) + '</p><p class="body-sm">Sent to ' + esc(short(st.to)) + "</p>", function () {
            a.bal = +(a.bal - n - fee()).toFixed(8); record({ type: "send", asset: key(a), amount: n, to: short(st.to) });
          });
        });
      }
      form();
    }
  };

  /* ---------- RECEIVE / ADD FUND ---------- */
  PAGES.receive = {
    html: function (p) {
      return '<div class="narrow"><section class="card box flow"><div class="flow-head"><h2 class="card-title">Add fund</h2><span class="badge badge-success">' + ico("i-shield") + 'Secure</span></div>' +
        '<div class="chip-row" id="rAssets">' + S.assets.map(function (a) { return '<button class="chip" data-k="' + key(a) + '"><span class="coin coin-sm ' + a.coin + '">' + a.mark + "</span>" + label(a) + "</button>"; }).join("") + "</div>" +
        '<div id="rBody"></div></section></div>';
    },
    mount: function (v, p) {
      function show(a) {
        $$("#rAssets [data-k]", v).forEach(function (b) { b.classList.toggle("is-active", b.dataset.k === key(a)); if (b.dataset.k === key(a)) b.scrollIntoView({ block: "nearest", inline: "center" }); });
        $("#rBody", v).innerHTML = '<div class="qr-box" aria-label="QR code for your ' + label(a) + ' address">' + qr(a.addr) + "</div>" +
          '<p class="caption" style="text-align:center;margin-top:8px">Scan to send ' + label(a) + " on " + net(a.net).name + "</p>" +
          '<div class="addr" style="margin-top:16px"><span>' + a.addr + "</span></div>" +
          '<div class="grid-2" style="grid-template-columns:1fr 1fr;margin-top:12px"><button class="btn btn-primary" data-copy="' + a.addr + '" data-what="Address">' + ico("i-copy") + 'Copy address</button><button class="btn btn-secondary" id="rShare">' + ico("i-share") + "Share</button></div>" +
          '<p class="note warn" style="margin-top:16px">' + ico("i-info") + "Only send " + label(a) + " on the " + net(a.net).name + " network to this address. Other assets may be lost.</p>" +
          '<a class="link" style="margin-top:12px" href="' + explorerAddr(a) + '" target="_blank" rel="noopener">View on blockchain explorer ' + ico("i-ext") + "</a>";
        $("#rShare", v).addEventListener("click", function () { share(a.addr, "My " + label(a) + " address"); });
        history.replaceState(null, "", "#/receive?asset=" + key(a));
      }
      $("#rAssets", v).addEventListener("click", function (e) { var b = e.target.closest("[data-k]"); if (b) show(asset(b.dataset.k)); });
      show(asset(p.asset || "GINR") || S.assets[0]);
    }
  };

  /* ---------- SWAP ---------- */
  PAGES.swap = {
    html: function () { return '<div class="narrow"><section class="card box flow" id="swBox"></section></div>'; },
    mount: function (v, p) {
      var from = asset(p.from || "TON") || asset("TON"), to = asset("GINR"), amt = "", box = $("#swBox", v), left = 15;
      if (key(from) === "GINR") to = asset("USDT.BEP20");
      function allowed(f, t) { return f !== t && (key(t) !== "GCC" || /^USDT/.test(key(f))); }
      function rate() { return from.price / to.price; }
      function draw() {
        box.innerHTML = '<div class="flow-head"><h2 class="card-title">Swap</h2><span class="rate-timer" title="Rate refreshes automatically"><svg class="ring-timer" viewBox="0 0 18 18"><circle class="bg" cx="9" cy="9" r="7"/><circle class="fg" id="swRing" cx="9" cy="9" r="7"/></svg><span id="swLeft">Refresh in ' + left + 's</span></span></div>' +
          '<div class="swap-box">' +
            '<div class="swap-side"><div class="label-row"><span>You pay</span><span>Balance ' + m(num(from.bal, from.dp)) + ' · <button class="link" id="swMax" style="margin:0;padding:0">Max</button></span></div><div class="val-row"><input class="input" id="swAmt" inputmode="decimal" placeholder="0" value="' + esc(amt) + '" aria-label="Amount to pay"><button class="asset-pick" id="swFrom">' + coin(from, "") + "<b>" + label(from) + "</b>" + ico("i-chevron-down") + "</button></div></div>" +
            '<button class="icon-btn swap-flip" id="swFlip" aria-label="Flip assets">' + ico("i-swap") + "</button>" +
            '<div class="swap-side"><div class="label-row"><span>You receive</span><span>Balance ' + m(num(to.bal, to.dp)) + '</span></div><div class="val-row"><input class="input" id="swOut" readonly placeholder="0" aria-label="Amount you receive"><button class="asset-pick" id="swTo">' + coin(to, "") + "<b>" + label(to) + "</b>" + ico("i-chevron-down") + "</button></div></div>" +
          "</div>" +
          (!allowed(from, to) ? '<p class="note warn">' + ico("i-info") + (from === to ? "Choose two different assets." : "GCC can only be bought with USDT (BEP20 or ERC20).") + "</p>" : "") +
          '<div class="summary" id="swSum"></div>' +
          '<button class="btn btn-primary btn-lg btn-block" id="swGo" disabled>Review swap</button>';
        var inp = $("#swAmt", box);
        function calc() {
          amt = inp.value.replace(/[^0-9.]/g, ""); var n = parseFloat(amt) || 0, fee = n * D.swapFeePct / 100, out = (n - fee) * rate();
          $("#swOut", box).value = n ? num(out, to.dp) : "";
          $("#swSum", box).innerHTML = "<div><span>Rate</span><b>1 " + label(from) + " = " + num(rate(), rate() < 1 ? 6 : 4) + " " + label(to) + "</b></div><div><span>Inverse</span><b>1 " + label(to) + " = " + num(1 / rate(), 1 / rate() < 1 ? 6 : 4) + " " + label(from) + "</b></div><div><span>Swap fee (" + D.swapFeePct + "%, demo)</span><b>" + num(fee, from.dp) + " " + label(from) + '</b></div><div class="total"><span>You receive</span><b>' + (n ? num(out, to.dp) + " " + label(to) : "—") + "</b></div>";
          var ok = allowed(from, to) && n > 0 && n <= from.bal;
          $("#swGo", box).disabled = !ok;
          $("#swGo", box).textContent = n > from.bal ? "Not enough " + label(from) : "Review swap";
        }
        inp.addEventListener("input", calc);
        $("#swMax", box).addEventListener("click", function () { inp.value = from.bal.toFixed(from.dp); calc(); });
        $("#swFlip", box).addEventListener("click", function (e) {
          if (D.swapTargets.indexOf(key(from)) < 0) { toast(label(from) + " can't be received in a swap", "i-info"); return; }
          e.currentTarget.classList.add("spin"); var t = from; from = to; to = t; amt = ""; setTimeout(draw, reduce ? 0 : 250);
        });
        $("#swFrom", box).addEventListener("click", function () { pickAsset({ title: "Swap from", disabled: function (a) { return a.bal <= 0; } }, function (a) { from = a; if (from === to) to = asset(key(a) === "GINR" ? "USDT.BEP20" : "GINR"); draw(); }); });
        $("#swTo", box).addEventListener("click", function () { pickAsset({ title: "Swap to", list: D.swapTargets.map(asset), note: "GCC can only be bought with USDT.", disabled: function (a) { return !allowed(from, a); } }, function (a) { to = a; draw(); }); });
        $("#swGo", box).addEventListener("click", review);
        calc(); tick();
      }
      function tick() { var r = $("#swRing", box); if (r) r.style.strokeDashoffset = String(44 * (1 - left / 15)); var l = $("#swLeft", box); if (l) l.textContent = "Refresh in " + left + "s"; }
      timers.push(setInterval(function () {
        left--; if (left <= 0) {
          left = 15; [from, to].forEach(function (a) { if (a.sym !== "USDT" && a.sym !== "GINR") a.price = +(a.price * (1 + (Math.random() - .5) * .004)).toFixed(6); });
          var i = $("#swAmt", box); if (i) i.dispatchEvent(new Event("input"));
        }
        tick();
      }, 1000));
      function review() {
        var n = parseFloat(amt), fee = n * D.swapFeePct / 100, out = (n - fee) * rate();
        openPanel({
          type: "modal", title: "Confirm swap",
          html: '<div class="summary"><div><span>You pay</span><b>' + num(n, from.dp) + " " + label(from) + "</b></div><div><span>You receive</span><b>" + num(out, to.dp) + " " + label(to) + "</b></div><div><span>Rate</span><b>1 " + label(from) + " = " + num(rate(), 4) + " " + label(to) + "</b></div><div><span>Fee</span><b>" + num(fee, from.dp) + " " + label(from) + '</b></div></div><p class="caption" style="margin:12px 0">Final amount may change slightly if the rate updates.</p><button class="btn btn-primary btn-lg btn-block" id="swConfirm">Confirm swap</button>',
          mount: function (b) {
            $("#swConfirm", b).addEventListener("click", function () {
              runFlow(b, '<p class="amount">' + num(out, to.dp) + " " + label(to) + '</p><p class="body-sm">Swapped from ' + num(n, from.dp) + " " + label(from) + "</p>", function () {
                from.bal = +(from.bal - n).toFixed(8); to.bal = +(to.bal + out).toFixed(8);
                record({ type: "swap", asset: key(from), amount: n, to: key(to), toAmount: out });
              });
            });
          },
          onClose: function () { amt = ""; draw(); }
        });
      }
      draw();
    }
  };

  /* ---------- TRANSFER (to Grampe user) ---------- */
  function maskName(id) { var a = ["R", "P", "S", "A", "K", "M", "N", "V"], b = ["Sharma", "Patel", "Singh", "Iyer", "Khan", "Das", "Nair", "Rao"], n = parseInt(id, 10) || 0; return a[n % 8] + "*** " + b[(n >> 3) % 8].slice(0, 1) + "****"; }
  PAGES.transfer = {
    html: function () { return '<div class="narrow"><section class="card box flow" id="trBox"></section></div>'; },
    mount: function (v) {
      var a = asset("GINR"), box = $("#trBox", v), found = false, t = null;
      function form() {
        box.innerHTML = '<div class="flow-head"><h2 class="card-title">Transfer to a Grampe user</h2><span class="badge badge-success">Instant · free</span></div>' +
          '<div class="input-group"><label class="input-label" for="trId">Recipient user ID</label><div class="input-wrap" id="trIdW"><span class="input-addon">ID</span><input class="input" id="trId" inputmode="numeric" placeholder="e.g. 100377" maxlength="8" autocomplete="off"></div><p class="input-hint" id="trIdH">Ask your friend for their Grampe user ID</p></div>' +
          '<div class="input-group"><span class="input-label">Asset</span><button class="asset-pick" id="trAsset">' + coin(a) + '<span class="row-main"><b>' + label(a) + "</b><small>Balance " + m(num(a.bal, a.dp)) + "</small></span>" + ico("i-chevron-down") + "</button></div>" +
          '<div class="input-group"><label class="input-label" for="trAmt">Amount</label><div class="input-wrap" id="trAmtW"><input class="input input-lg" id="trAmt" inputmode="decimal" placeholder="0.00"><span class="input-addon">' + label(a) + '</span></div><div class="amount-meta"><span id="trFiat">≈ ' + money(0) + '</span><button type="button" id="trMax">Max</button></div></div>' +
          '<div class="input-group"><label class="input-label" for="trNote">Note <span class="caption">(optional)</span></label><div class="input-wrap"><input class="input" id="trNote" maxlength="60" placeholder="What is it for?"></div></div>' +
          '<button class="btn btn-primary btn-lg btn-block" id="trGo" disabled>Transfer</button>';
        var id = $("#trId", box), amt = $("#trAmt", box);
        function check() {
          var n = parseFloat(amt.value) || 0, ok = n > 0 && n <= a.bal;
          $("#trAmtW", box).className = "input-wrap" + (amt.value && !ok ? " is-invalid" : "");
          $("#trFiat", box).textContent = n > a.bal ? "Not enough balance" : "≈ " + money(n * a.price);
          $("#trGo", box).disabled = !(found && ok);
        }
        id.addEventListener("input", function () {
          id.value = id.value.replace(/\D/g, ""); found = false; clearTimeout(t);
          var h = $("#trIdH", box), w = $("#trIdW", box);
          if (id.value.length < 6) { h.className = "input-hint"; h.textContent = "User IDs have 6 digits or more"; w.className = "input-wrap"; check(); return; }
          if (id.value === S.profile.id) { h.className = "input-hint is-error"; h.textContent = "You can't transfer to yourself"; w.className = "input-wrap is-invalid"; check(); return; }
          h.className = "input-hint"; h.textContent = "Looking up user…";
          t = setTimeout(function () { found = true; h.className = "input-hint is-ok"; h.textContent = "✓ " + maskName(id.value) + " · Grampe user"; w.className = "input-wrap is-valid"; check(); }, 600);
        });
        amt.addEventListener("input", check);
        $("#trMax", box).addEventListener("click", function () { amt.value = a.bal.toFixed(a.dp); check(); });
        $("#trAsset", box).addEventListener("click", function () { pickAsset({ title: "Transfer which asset?" }, function (x) { a = x; form(); }); });
        $("#trGo", box).addEventListener("click", function () {
          var n = parseFloat(amt.value), who = id.value;
          openPanel({ type: "modal", title: "Confirm transfer", html: '<div class="summary"><div><span>To</span><b>' + maskName(who) + " (" + who + ")</b></div><div><span>Amount</span><b>" + num(n, a.dp) + " " + label(a) + '</b></div><div><span>Fee</span><b>Free</b></div></div><button class="btn btn-primary btn-lg btn-block" style="margin-top:16px" id="trC">Confirm transfer</button>',
            mount: function (b) { $("#trC", b).addEventListener("click", function () { runFlow(b, '<p class="amount">' + num(n, a.dp) + " " + label(a) + '</p><p class="body-sm">Sent to user ' + who + "</p>", function () { a.bal = +(a.bal - n).toFixed(8); record({ type: "transfer", asset: key(a), amount: n, to: "user " + who }); }); }); },
            onClose: form });
        });
      }
      form();
    }
  };

  /* ---------- UPI ---------- */
  PAGES.upi = {
    html: function () { return '<div class="narrow"><section class="card box flow" id="upBox"></section></div>'; },
    mount: function (v) {
      var a = asset("GINR"), box = $("#upBox", v);
      function form() {
        box.innerHTML = '<div class="flow-head"><h2 class="card-title">Send GINR to UPI</h2><span class="icon-tile tone-warning">' + ico("i-bolt") + "</span></div>" +
          '<div class="tile tile-row"><span class="coin coin-xl coin-ginr">₹</span><span class="row-main"><small class="caption">GINR balance</small><b class="title">' + m("₹" + num(a.bal, 2)) + '</b></span><a class="chip" href="#/receive?asset=GINR">' + ico("i-plus") + "Add</a></div>" +
          '<div class="input-group"><label class="input-label" for="upId">UPI ID or mobile number</label><div class="input-wrap" id="upIdW"><input class="input" id="upId" placeholder="name@bank or 10-digit number" autocomplete="off" spellcheck="false"></div><p class="input-hint" id="upIdH">Money goes straight to the linked bank account</p></div>' +
          '<div class="input-group"><label class="input-label" for="upName">Beneficiary name</label><div class="input-wrap"><input class="input" id="upName" placeholder="As per bank account" autocomplete="off"></div></div>' +
          '<div class="input-group"><label class="input-label" for="upAmt">Amount</label><div class="input-wrap" id="upAmtW"><span class="input-addon">₹</span><input class="input input-lg" id="upAmt" inputmode="decimal" placeholder="0"></div><div class="quick-amounts">' + [500, 1000, 2000, 5000].map(function (x) { return '<button class="chip" data-q="' + x + '">₹' + num(x, 0) + "</button>"; }).join("") + "</div></div>" +
          '<div class="summary"><div><span>Charges (demo)</span><b id="upFee">₹0.00</b></div><div class="total"><span>Total from GINR</span><b id="upTot">—</b></div></div>' +
          '<button class="btn btn-primary btn-lg btn-block" id="upGo" disabled>Send to UPI</button>';
        var id = $("#upId", box), nm = $("#upName", box), amt = $("#upAmt", box);
        function check() {
          var v1 = id.value.trim(), okId = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v1) || /^[6-9]\d{9}$/.test(v1), n = parseFloat(amt.value) || 0, okN = n >= 1 && n <= a.bal;
          $("#upIdW", box).className = "input-wrap" + (v1 ? (okId ? " is-valid" : " is-invalid") : "");
          $("#upIdH", box).className = "input-hint" + (v1 && !okId ? " is-error" : "");
          $("#upIdH", box).textContent = v1 && !okId ? "Enter a UPI ID like name@bank or a 10-digit mobile number" : "Money goes straight to the linked bank account";
          $("#upAmtW", box).className = "input-wrap" + (amt.value && !okN ? " is-invalid" : "");
          $("#upTot", box).textContent = n ? "₹" + num(n, 2) : "—";
          $$("[data-q]", box).forEach(function (c) { c.classList.toggle("is-active", +c.dataset.q === n); });
          $("#upGo", box).disabled = !(okId && nm.value.trim().length > 1 && okN);
          $("#upGo", box).textContent = n > a.bal ? "Not enough GINR" : "Send to UPI";
        }
        [id, nm, amt].forEach(function (i) { i.addEventListener("input", check); });
        $$("[data-q]", box).forEach(function (c) { c.addEventListener("click", function () { amt.value = c.dataset.q; check(); }); });
        $("#upGo", box).addEventListener("click", function () { otp(id.value.trim(), nm.value.trim(), parseFloat(amt.value)); });
      }
      function otp(upi, name, n) {
        var left = 30, tm;
        openPanel({
          type: "modal", title: "Enter OTP",
          html: '<p class="body-sm">We sent a 6-digit code to your registered mobile ' + esc(S.profile.code) + " ••••• " + esc(S.profile.mobile.slice(-3)) + '.</p><p class="caption" style="margin-top:4px">Demo: enter any 6 digits.</p>' +
            '<div class="otp" id="otp" style="margin:20px 0">' + "<input inputmode=\"numeric\" maxlength=\"1\" aria-label=\"Digit 1\" autofocus>" + [2, 3, 4, 5, 6].map(function (i) { return '<input inputmode="numeric" maxlength="1" aria-label="Digit ' + i + '">'; }).join("") + "</div>" +
            '<div class="summary"><div><span>To</span><b>' + esc(name) + " · " + esc(upi) + "</b></div><div><span>Amount</span><b>₹" + num(n, 2) + "</b></div></div>" +
            '<div class="cta-row" style="justify-content:space-between;align-items:center"><button class="link" id="otpResend" disabled>Resend in 30s</button><button class="btn btn-primary" id="otpGo" disabled>Verify &amp; send</button></div>',
          mount: function (b) {
            var boxes = $$("#otp input", b);
            boxes.forEach(function (inp, i) {
              inp.addEventListener("input", function () { inp.value = inp.value.replace(/\D/g, "").slice(-1); inp.classList.toggle("filled", !!inp.value); if (inp.value && boxes[i + 1]) boxes[i + 1].focus(); done(); });
              inp.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !inp.value && boxes[i - 1]) boxes[i - 1].focus(); });
              inp.addEventListener("paste", function (e) { var t = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (t) { e.preventDefault(); boxes.forEach(function (x, j) { x.value = t[j] || ""; x.classList.toggle("filled", !!x.value); }); done(); } });
            });
            function done() { $("#otpGo", b).disabled = boxes.some(function (x) { return !x.value; }); }
            tm = setInterval(function () { left--; var r = $("#otpResend", b); if (!r) return clearInterval(tm); if (left <= 0) { clearInterval(tm); r.disabled = false; r.textContent = "Resend OTP"; } else r.textContent = "Resend in " + left + "s"; }, 1000);
            $("#otpResend", b).addEventListener("click", function () { toast("New OTP sent (demo)", "i-bell"); left = 30; this.disabled = true; var self = this; tm = setInterval(function () { left--; if (left <= 0) { clearInterval(tm); self.disabled = false; self.textContent = "Resend OTP"; } else self.textContent = "Resend in " + left + "s"; }, 1000); });
            $("#otpGo", b).addEventListener("click", function () {
              clearInterval(tm);
              runFlow(b, '<p class="amount">₹' + num(n, 2) + '</p><p class="body-sm">Sent to ' + esc(name) + " · " + esc(upi) + "</p>", function () { a.bal = +(a.bal - n).toFixed(2); record({ type: "upi", asset: "GINR", amount: n, to: upi }); });
            });
          },
          onClose: function () { clearInterval(tm); form(); }
        });
      }
      form();
    }
  };

  /* ---------- CARDS ---------- */
  PAGES.cards = {
    html: function () {
      var c = S.card;
      return '<section class="card box soon-hero">' +
          '<div class="vcard-wrap"><div class="vcard" id="vcard" role="button" tabindex="0" aria-label="Flip card">' +
            '<div class="vface"><div class="vtop"><span><img src="../assets/img/shield.svg" alt="" width="20" height="22">Gram Chain</span><span class="vnet">RuPay</span></div><div class="vchip"></div><p class="vnum">6254 •••• •••• 4821</p><div class="vbot"><span>' + esc(S.profile.name.toUpperCase()) + "</span><span>VALID 12/29</span></div></div>" +
            '<div class="vface back"><div class="vstripe"></div><div class="vcvv"><span class="caption">CVV</span><b>•••</b></div><p class="caption" style="color:var(--navy-300);margin-top:auto">Virtual card preview</p></div>' +
          "</div></div>" +
          '<span class="badge badge-primary soon-badge">Coming soon</span>' +
          '<h1 class="soon-title">RuPay virtual card</h1>' +
          '<p class="soon-sub">Spend your GINR anywhere RuPay is accepted. Tap the card to flip it.</p>' +
        "</section>" +
        '<section class="card box is-soon" aria-disabled="true"><div class="card-header"><div><h2 class="card-title">Card controls</h2><p class="card-desc">Available when the card goes live</p></div><span class="badge badge-outline">Soon</span></div><div class="rows card-controls">' +
          ctrl("frozen", "i-snow", "Freeze card", "Temporarily block all payments", false) +
          ctrl("online", "i-globe", "Online payments", "Use the card for online shopping", c.online) +
          ctrl("contactless", "i-bolt", "Contactless", "Tap to pay at shops", c.contactless) +
        '</div><div class="input-group" style="margin-top:16px"><label class="input-label" for="cLimit">Daily limit <b id="cLimitV" style="float:right">₹' + num(c.limit, 0) + '</b></label><input type="range" id="cLimit" min="1000" max="100000" step="1000" value="' + c.limit + '" disabled style="width:100%"></div></section>' +
        '<section class="card box is-soon" aria-disabled="true"><div class="card-header"><div><h2 class="card-title">Send to my card</h2><p class="card-desc">Top up the card from your GINR balance</p></div><span class="badge badge-outline">Soon</span></div>' +
          '<div class="input-wrap"><span class="input-addon">₹</span><input class="input" placeholder="0" disabled aria-label="Amount"></div>' +
          '<div class="cta-row"><button class="btn btn-primary" disabled>Send to card</button></div></section>';
    },
    mount: function (v) {
      var card = $("#vcard", v);
      function flip() { card.classList.toggle("flipped"); }
      card.addEventListener("click", flip); card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $$(".is-soon button, .is-soon input", v).forEach(function (x) { x.disabled = true; x.tabIndex = -1; });
    }
  };
  function ctrl(k, icon, t, s, on) { return '<div class="row-item"><span class="icon-tile tone-primary">' + ico(icon) + '</span><span class="row-main"><b>' + t + "</b><small>" + s + '</small></span><button class="switch" role="switch" data-ctrl="' + k + '" aria-checked="' + on + '" aria-label="' + t + '"></button></div>'; }

  /* ---------- STAKING ---------- */
  PAGES.staking = {
    html: function () {
      return '<section class="card box soon-hero">' +
          '<span class="icon-tile icon-tile-xl tone-violet soon-icon">' + ico("i-layers") + "</span>" +
          '<span class="badge badge-primary soon-badge">Coming soon</span>' +
          '<h1 class="soon-title">Staking</h1>' +
          '<p class="soon-sub">Put your GCC to work on Gram Chain. Plans and rates will be shown here at launch.</p>' +
          '<label class="soon-notify"><button type="button" class="switch" id="stNotify" role="switch" aria-checked="' + S.notifyStaking + '" aria-label="Notify me at launch"></button>Notify me at launch</label>' +
        "</section>" +
        '<section class="card box is-soon" aria-disabled="true"><div class="card-header"><div><h2 class="card-title">Staking plans</h2><p class="card-desc">Available at launch</p></div><span class="badge badge-outline">Soon</span></div><div class="rows">' +
          [["i-refresh", "Flexible", "Stake and unstake any time"], ["i-lock", "Locked", "Commit for a fixed period"], ["i-chart", "Auto-compound", "Rewards restake automatically"]].map(function (f) {
            return '<div class="row-item"><span class="icon-tile tone-primary">' + ico(f[0]) + '</span><span class="row-main"><b>' + f[1] + "</b><small>" + f[2] + '</small></span><span class="caption">— APY</span></div>';
          }).join("") + "</div></section>" +
        '<section class="card box is-soon" aria-disabled="true"><div class="card-header"><div><h2 class="card-title">Stake GCC</h2><p class="card-desc">Choose an amount to stake</p></div><span class="badge badge-outline">Soon</span></div>' +
          '<div class="input-wrap"><input class="input" placeholder="0.00" disabled aria-label="Amount to stake"><span class="input-addon">GCC</span></div>' +
          '<div class="cta-row"><button class="btn btn-primary" disabled>Stake now</button></div></section>' +
        '<p class="fine-print">Staking returns vary and are not guaranteed.</p>';
    },
    mount: function (v) {
      $$(".is-soon button, .is-soon input", v).forEach(function (x) { x.disabled = true; x.tabIndex = -1; });
      $("#stNotify", v).addEventListener("click", function (e) { S.notifyStaking = !S.notifyStaking; e.currentTarget.setAttribute("aria-checked", String(S.notifyStaking)); save(); toast(S.notifyStaking ? "We'll notify you at launch" : "Notifications off", "i-bell"); });
    }
  };

  /* ---------- GIFT CARDS ---------- */
  PAGES.gifts = {
    html: function (p) {
      return '<div class="page-head"><div><h2 class="h3">Gift cards</h2><p class="sub">Buy vouchers instantly with your GINR balance.</p></div><div class="segmented" role="radiogroup" aria-label="Gift card view"><button role="radio" aria-checked="' + (p.tab !== "mine") + '" data-gt="shop">Shop</button><button role="radio" aria-checked="' + (p.tab === "mine") + '" data-gt="mine">My gift cards (' + S.gifts.length + ")</button></div></div><div id=\"gBody\"></div>";
    },
    mount: function (v, p) {
      function shop() {
        $("#gBody", v).innerHTML = '<div class="gift-grid">' + D.giftCards.map(function (g) { return '<button class="gift" data-g="' + g.id + '"><span class="icon-tile icon-tile-lg ' + g.tone + '">' + ico(g.icon) + '</span><span><b class="title">' + g.name + '</b><br><span class="tile-text">' + g.tag + '</span></span><span class="from">From ₹' + num(g.denoms[0], 0) + " · 0% fee</span></button>"; }).join("") + "</div>";
      }
      function mine() {
        $("#gBody", v).innerHTML = S.gifts.length ? '<section class="card box"><div class="rows">' + S.gifts.map(function (g) { return '<div class="row-item"><span class="icon-tile tone-warning">' + ico("i-gift") + '</span><span class="row-main"><b>' + g.name + " · ₹" + num(g.value, 0) + "</b><small>Code " + g.code.slice(0, 4) + "••••••" + g.code.slice(-2) + "</small></span><button class=\"chip\" data-copy=\"" + g.code + '" data-what="Gift card code">' + ico("i-copy") + "Copy</button></div>"; }).join("") + "</div></section>"
          : '<section class="card box"><div class="empty"><span class="icon-tile icon-tile-lg tone-warning">' + ico("i-gift") + '</span><p class="title">No gift cards yet</p><p class="body-sm">Cards you buy will appear here with their codes.</p><button class="btn btn-primary" data-gt="shop">Browse gift cards</button></div></section>';
      }
      function tab(t) { $$("[data-gt]", v).forEach(function (b) { if (b.getAttribute("role")) b.setAttribute("aria-checked", String(b.dataset.gt === t)); }); t === "mine" ? mine() : shop(); }
      // listeners on elements that are rebuilt with the page (not on the shared #view)
      $$(".page-head [data-gt]", v).forEach(function (b) { b.addEventListener("click", function () { tab(b.dataset.gt); }); });
      $("#gBody", v).addEventListener("click", function (e) {
        var t = e.target.closest("[data-gt]"); if (t) { tab(t.dataset.gt); return; }
        var g = e.target.closest("[data-g]"); if (g) buy(D.giftCards.filter(function (x) { return x.id === g.dataset.g; })[0]);
      });
      function buy(g) {
        var den = g.denoms[1] || g.denoms[0], qty = 1, ginr = asset("GINR");
        openPanel({
          type: "drawer", title: g.name + " gift card",
          html: '<div class="profile-head"><span class="icon-tile icon-tile-xl ' + g.tone + '">' + ico(g.icon) + '</span><div><p class="title">' + g.name + '</p><p class="caption">' + g.tag + "</p></div></div>" +
            '<p class="input-label">Denomination</p><div class="quick-amounts" id="gDen" style="margin:8px 0 20px">' + g.denoms.map(function (d) { return '<button class="chip' + (d === den ? " is-active" : "") + '" data-d="' + d + '">₹' + num(d, 0) + "</button>"; }).join("") + "</div>" +
            '<div class="row-item" style="padding-inline:0"><span class="row-main"><b>Quantity</b><small>Up to 5 per order</small></span><span class="stepper-num"><button class="icon-btn icon-btn-sm" id="gMinus" aria-label="Fewer">' + ico("i-minus") + '</button><b id="gQty">1</b><button class="icon-btn icon-btn-sm" id="gPlus" aria-label="More">' + ico("i-plus") + "</button></span></div>" +
            '<div class="summary" style="margin-top:12px"><div><span>Fee / discount</span><b>0%</b></div><div><span>Expiry</span><b>12 months</b></div><div class="total"><span>Total</span><b id="gTot"></b></div></div>' +
            '<p class="caption" style="margin:12px 0">Paid from GINR · balance ' + m("₹" + num(ginr.bal, 2)) + '. Standard terms apply.</p><button class="btn btn-primary btn-lg btn-block" id="gGo">Place order</button>',
          mount: function (b) {
            function upd() { var t = den * qty; $("#gQty", b).textContent = qty; $("#gTot", b).textContent = "₹" + num(t, 2); $("#gGo", b).disabled = t > ginr.bal; $("#gGo", b).textContent = t > ginr.bal ? "Not enough GINR" : "Place order · ₹" + num(t, 0); }
            $("#gDen", b).addEventListener("click", function (e) { var d = e.target.closest("[data-d]"); if (!d) return; den = +d.dataset.d; $$("[data-d]", b).forEach(function (x) { x.classList.toggle("is-active", x === d); }); upd(); });
            $("#gMinus", b).addEventListener("click", function () { qty = Math.max(1, qty - 1); upd(); });
            $("#gPlus", b).addEventListener("click", function () { qty = Math.min(5, qty + 1); upd(); });
            $("#gGo", b).addEventListener("click", function () {
              var t = den * qty;
              runFlow(b, '<p class="amount">₹' + num(t, 0) + '</p><p class="body-sm">' + qty + " × " + g.name + " gift card</p>", function () {
                ginr.bal = +(ginr.bal - t).toFixed(2);
                for (var i = 0; i < qty; i++) S.gifts.unshift({ name: g.name, value: den, code: "GRMP" + Math.random().toString(36).slice(2, 10).toUpperCase() });
                record({ type: "gift", asset: "GINR", amount: t, to: g.name });
              });
            });
            upd();
          },
          onClose: function () { render(); }
        });
      }
      tab(p.tab === "mine" ? "mine" : "shop");
    }
  };

  /* ---------- REFERRAL ---------- */
  PAGES.referral = {
    html: function () {
      var l = S.profile.refLink;
      return '<div class="grid-2"><section class="card box"><h2 class="h3">Invite friends to Grampe</h2><p class="sub" style="margin-top:8px">Share your link. When friends sign up and verify, you both collect reward points.</p>' +
        '<div class="ref-link" style="margin-top:20px"><span>' + esc(l) + '</span><button class="chip" data-copy="' + esc(l) + '" data-what="Referral link">' + ico("i-copy") + "Copy</button></div>" +
        '<div class="grid-2" style="grid-template-columns:1fr 1fr;margin-top:12px"><button class="btn btn-primary" id="refShare">' + ico("i-share") + 'Share link</button><a class="btn btn-secondary" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent("Join me on Grampe: " + l) + '">WhatsApp</a></div>' +
        '<ol class="stack" style="margin-top:24px">' + [["Share your link", "Send it to friends on any app"], ["They sign up", "Free to join, takes 2 minutes"], ["You both earn", "Points land after verification"]].map(function (s, i) { return '<li class="tile tile-row"><b class="icon-tile icon-tile-sm icon-tile-round tone-primary">' + (i + 1) + '</b><span><b class="tile-title">' + s[0] + '</b><span class="tile-text">' + s[1] + "</span></span></li>"; }).join("") + "</ol></section>" +
        '<section class="card box" style="text-align:center"><p class="input-label">Scan to join</p><div class="qr-box" style="margin-top:12px">' + qr(l) + '</div><p class="caption" style="margin-top:12px">Your referral ID · ' + esc(S.profile.id) + "</p></section></div>";
    },
    mount: function (v) { $("#refShare", v).addEventListener("click", function () { share(S.profile.refLink, "Join me on Grampe"); }); }
  };

  /* ---------- PROFILE ---------- */
  var COUNTRIES = [["India", "+91"], ["United Arab Emirates", "+971"], ["United States", "+1"], ["United Kingdom", "+44"], ["Singapore", "+65"], ["Nepal", "+977"], ["Bangladesh", "+880"], ["Sri Lanka", "+94"]];
  PAGES.profile = {
    html: function () {
      var p = S.profile, ini = p.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      return '<section class="card box"><div class="profile-head"><span class="avatar avatar-5">' + ini + '</span><div><p class="title title-lg">' + esc(p.name) + '</p><p class="caption">User ID ' + p.id + ' <button class="link" data-copy="' + p.id + '" data-what="User ID" style="margin:0 0 0 6px;padding:0">Copy</button></p></div></div>' +
        '<form class="form-grid form-grid-2" id="pf" novalidate>' +
          '<div class="input-group"><label class="input-label" for="pId">User ID</label><div class="input-wrap" style="background:var(--color-bg)"><input class="input" id="pId" value="' + p.id + '" readonly></div></div>' +
          '<div class="input-group"><label class="input-label" for="pName">Full name</label><div class="input-wrap"><input class="input" id="pName" value="' + esc(p.name) + '" autocomplete="name" required></div></div>' +
          '<div class="input-group"><label class="input-label" for="pCountry">Country</label><div class="input-wrap"><select class="input" id="pCountry">' + COUNTRIES.map(function (c) { return '<option value="' + c[0] + '" data-code="' + c[1] + '"' + (c[0] === p.country ? " selected" : "") + ">" + c[0] + " (" + c[1] + ")</option>"; }).join("") + "</select></div></div>" +
          '<div class="input-group"><label class="input-label" for="pMobile">Mobile</label><div class="input-wrap"><span class="input-addon" id="pCode">' + p.code + '</span><input class="input" id="pMobile" value="' + esc(p.mobile) + '" inputmode="tel" autocomplete="tel"></div></div>' +
          '<div class="input-group" style="grid-column:1/-1"><label class="input-label" for="pEmail">Email</label><div class="input-wrap" id="pEmailW"><input class="input" id="pEmail" type="email" value="' + esc(p.email) + '" autocomplete="email"></div><p class="input-hint" id="pEmailH"></p></div>' +
          '<div style="grid-column:1/-1;display:flex;gap:12px;justify-content:flex-end"><button type="button" class="btn btn-secondary" id="pReset" disabled>Discard</button><button class="btn btn-primary" id="pSave" disabled>Save changes</button></div>' +
        "</form></section>" +
        '<section class="card box" id="security"><div class="card-header"><div><h2 class="card-title">Security</h2><p class="card-desc">Update your password. Use one you don\'t use anywhere else.</p></div><span class="icon-tile icon-tile-sm tone-primary">' + ico("i-lock") + "</span></div>" + pwForm() + "</section>" +
        '<section class="card box"><div class="card-header"><div><h2 class="card-title">Referral</h2><p class="card-desc">Share your link and invite friends to Grampe.</p></div><span class="icon-tile icon-tile-sm tone-success">' + ico("i-users") + "</span></div>" +
          '<label class="input-label" for="pRef">Your referral link</label>' +
          '<div class="ref-box" style="margin-top:8px"><span id="pRef">' + esc(p.refLink) + "</span></div>" +
          '<div class="cta-row" style="margin-top:12px"><button class="btn btn-secondary btn-sm" data-copy="' + esc(p.refLink) + '" data-what="Referral link">' + ico("i-copy") + 'Copy</button><button class="btn btn-primary btn-sm" id="pShare">' + ico("i-share") + "Share</button></div></section>";
    },
    mount: function (v) {
      var f = $("#pf", v), p = S.profile, orig = JSON.stringify([p.name, p.country, p.mobile, p.email]);
      function vals() { return [$("#pName", v).value.trim(), $("#pCountry", v).value, $("#pMobile", v).value.trim(), $("#pEmail", v).value.trim()]; }
      function check() {
        var x = vals(), dirty = JSON.stringify(x) !== orig, okE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x[3]);
        $("#pEmailW", v).className = "input-wrap" + (okE ? "" : " is-invalid"); $("#pEmailH", v).textContent = okE ? "" : "Enter a valid email"; $("#pEmailH", v).className = "input-hint is-error";
        $("#pSave", v).disabled = !(dirty && okE && x[0].length > 1); $("#pReset", v).disabled = !dirty;
      }
      f.addEventListener("input", check);
      $("#pCountry", v).addEventListener("change", function (e) { $("#pCode", v).textContent = e.target.selectedOptions[0].dataset.code; check(); });
      $("#pReset", v).addEventListener("click", function () { render(); });
      f.addEventListener("submit", function (e) { e.preventDefault(); var x = vals(); p.name = x[0]; p.country = x[1]; p.code = $("#pCode", v).textContent; p.mobile = x[2]; p.email = x[3]; save(); refreshChrome(); toast("Profile updated", "i-user"); render(); });
      pwMount(v);
      $("#pShare", v).addEventListener("click", function () { share(S.profile.refLink, "Join me on Grampe"); });
    }
  };

  /* ---------- PASSWORD FORM (used on Profile and Security) ---------- */
  function pwField(id, lab, ac, ph) { return '<div class="input-group"><label class="input-label" for="' + id + '">' + lab + '</label><div class="input-wrap" id="' + id + 'W"><input class="input" id="' + id + '" type="password" autocomplete="' + ac + '" placeholder="' + ph + '"><button type="button" class="icon-btn icon-btn-sm" data-eye="' + id + '" aria-label="Show password">' + ico("i-eye") + "</button></div></div>"; }
  function pwForm() {
    return '<form class="form-grid" id="secF" novalidate>' +
      pwField("pwOld", "Old password", "current-password", "Enter your old password") +
      pwField("pwNew", "New password", "new-password", "Enter your new password") +
      '<div class="strength" id="pwS" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><ul class="rules" id="pwR"><li data-r="len">At least 8 characters</li><li data-r="up">One uppercase letter</li><li data-r="num">One number</li><li data-r="sym">One symbol</li></ul>' +
      pwField("pwNew2", "Retype new password", "new-password", "Retype your new password") + '<p class="input-hint" id="pwMatch"></p>' +
      '<div class="form-actions"><button class="btn btn-primary" id="pwGo" disabled>Submit</button></div></form>';
  }
  function pwMount(v) {
    var o = $("#pwOld", v), n = $("#pwNew", v), n2 = $("#pwNew2", v);
    $$("[data-eye]", v).forEach(function (b) { b.addEventListener("click", function () { var i = $("#" + b.dataset.eye, v), show = i.type === "password"; i.type = show ? "text" : "password"; b.innerHTML = ico(show ? "i-eye-off" : "i-eye"); b.setAttribute("aria-label", show ? "Hide password" : "Show password"); }); });
    function check() {
      var p = n.value, r = { len: p.length >= 8, up: /[A-Z]/.test(p), num: /\d/.test(p), sym: /[^A-Za-z0-9]/.test(p) }, sc = Object.keys(r).filter(function (k) { return r[k]; }).length;
      $("#pwS", v).dataset.s = p ? sc : 0;
      $$("#pwR li", v).forEach(function (li) { li.classList.toggle("ok", r[li.dataset.r]); });
      var match = n2.value && n2.value === p;
      $("#pwMatch", v).className = "input-hint" + (n2.value ? (match ? " is-ok" : " is-error") : "");
      $("#pwMatch", v).textContent = n2.value ? (match ? "Passwords match" : "Passwords don't match") : "";
      $("#pwGo", v).disabled = !(o.value && sc === 4 && match && p !== o.value);
    }
    [o, n, n2].forEach(function (i) { i.addEventListener("input", check); });
    $("#secF", v).addEventListener("submit", function (e) { e.preventDefault(); toast("Password updated", "i-lock"); $("#secF", v).reset(); check(); });
  }

  /* ---------- SECURITY ---------- */
  PAGES.security = {
    html: function () {
      return '<section class="card box"><div class="card-header"><div><h2 class="card-title">Update password</h2><p class="card-desc">Use a strong password you don\'t use anywhere else.</p></div><span class="icon-tile icon-tile-sm tone-primary">' + ico("i-lock") + "</span></div>" + pwForm() + "</section>" +
        '<section class="card box"><p class="note">' + ico("i-shield") + "Grampe will never ask for your password, OTP or recovery phrase over phone, email or chat.</p></section>";
    },
    mount: function (v) { pwMount(v); }
  };

  /* ---------- confirm dialog ---------- */
  function confirmBox(title, text, okText, ok) {
    openPanel({ type: "modal", title: title, html: '<p class="body-sm">' + text + '</p><div class="grid-2" style="grid-template-columns:1fr 1fr;margin-top:20px"><button class="btn btn-secondary" data-action="close">Cancel</button><button class="btn btn-primary" id="cfOk">' + okText + "</button></div>",
      mount: function (b) { $("#cfOk", b).addEventListener("click", function () { closePanel(); ok(); }); } });
  }

  /* ---------- quick + more sheets, notifications ---------- */
  function quickSheet() {
    var fab = $(".tab-fab"); if (fab) fab.classList.add("open");
    openPanel({ type: "sheet", title: "Quick actions", html: '<div class="action-grid">' + [["send", "i-send", "Send", "tone-primary"], ["receive", "i-receive", "Add fund", "tone-success"], ["swap", "i-swap", "Swap", "tone-violet"], ["transfer", "i-users", "Transfer", "tone-sky"], ["upi", "i-bolt", "UPI", "tone-warning"], ["gifts", "i-gift", "Gift card", "tone-warning"]].map(function (q) { return '<a href="#/' + q[0] + '"><span class="icon-tile ' + q[3] + '">' + ico(q[1]) + "</span>" + q[2] + "</a>"; }).join("") + "</div>", onClose: function () { if (fab) fab.classList.remove("open"); } });
  }
  function moreSheet() {
    openPanel({ type: "sheet", title: "All pages", html: '<div class="action-grid">' + ROUTES.map(function (r) { return '<a href="#/' + r.id + '"><span class="icon-tile tone-primary">' + ico(r.icon) + "</span>" + r.title + "</a>"; }).join("") + '<button data-action="logout"><span class="icon-tile tone-dark">' + ico("i-logout") + "</span>Log out</button></div>" });
  }
  function notifPanel() {
    $(".tb-dot") && $(".tb-dot").remove();
    openPanel({ type: "drawer", title: "Notifications", html: '<div class="rows">' + D.notifications.map(function (n) { return '<div class="row-item"><span class="icon-tile ' + n.tone + '">' + ico(n.icon) + '</span><span class="row-main"><b>' + n.title + "</b><small>" + n.text + '</small></span><span class="caption">' + n.time + "</span></div>"; }).join("") + "</div>" });
  }

  function logout() { confirmBox("Log out?", "You'll return to the Grampe home page.", "Log out", function () { location.href = "../index.html"; }); }

  /* ---------- global events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var c = t.closest("[data-copy]"); if (c) { e.preventDefault(); e.stopPropagation(); copy(c.dataset.copy, c.dataset.what); return; }
    var cur = t.closest("[data-cur]"); if (cur) { S.cur = cur.dataset.cur; save(); render(); return; }
    var act = t.closest("[data-action]");
    if (act) {
      var a = act.dataset.action;
      if (a === "close") {
        if (act.tagName === "A") { closePanel(); return; }
        e.preventDefault();
        if (overlay.classList.contains("open")) closePanel(); else render(); // in-page flow finished: start fresh
      }
      if (a === "mask") { S.masked = !S.masked; save(); refreshChrome(); act.innerHTML = ico(S.masked ? "i-eye-off" : "i-eye"); }
      if (a === "logout") { e.preventDefault(); closeMenu(); logout(); }
      if (a === "quick") quickSheet();
      if (a === "more") moreSheet();
      if (a === "sb-open") sbOpen();
      if (a === "sb-close") sbClose();
      return;
    }
    var as = t.closest("[data-asset]"); if (as && !t.closest("a")) { assetDrawer(as.dataset.asset); return; }
    var tx = t.closest("[data-tx]"); if (tx) { txDrawer(tx.dataset.tx); return; }
    if (t.closest("#panelBody a[href^='#/']")) closePanel();
  });
  $("#openNotif").addEventListener("click", notifPanel);

  var userBtn = $("#userBtn"), userMenu = $("#userMenu");
  function closeMenu() { userMenu.hidden = true; userBtn.setAttribute("aria-expanded", "false"); }
  userBtn.addEventListener("click", function (e) { e.stopPropagation(); var open = userMenu.hidden; userMenu.hidden = !open; userBtn.setAttribute("aria-expanded", String(open)); if (open) $("a", userMenu).focus(); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".hd-user")) closeMenu(); if (!e.target.closest(".select")) closeSelects(); });
  userMenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!userMenu.hidden) { closeMenu(); userBtn.focus(); } else if (sbClose()) $(".hd-trigger").focus(); else closePanel(); }
  });
  window.addEventListener("scroll", function () { $("#topbar").classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });
  /* amount fields accept numbers only (runs before each page's own input handler) */
  document.addEventListener("input", function (e) {
    var t = e.target, mode = t.getAttribute && t.getAttribute("inputmode");
    if (mode !== "decimal" && mode !== "numeric") return;
    var v = t.value, clean = mode === "numeric" ? v.replace(/\D/g, "") : v.replace(/,/g, ".").replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    if (clean !== v) { var pos = Math.max(0, (t.selectionStart || clean.length) - (v.length - clean.length)); t.value = clean; try { t.setSelectionRange(pos, pos); } catch (err) {} }
  }, true);
  window.addEventListener("hashchange", render);

  /* ---------- boot ---------- */
  buildSidebar();
  refreshChrome();
  if (!location.hash) history.replaceState(null, "", "#/home");
  render();
})();
