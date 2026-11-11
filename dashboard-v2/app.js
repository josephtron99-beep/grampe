/* ==========================================================
   Grampe dashboard V2 ("Night", top menu) — single-page app (demo data)
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
  var KEY = "grampe-demo-v2";
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
    { id: "home", title: "Home", group: "Overview", icon: "i-home" },
    { id: "wallet", title: "Wallet", group: "Overview", icon: "i-wallet" },
    { id: "history", title: "History", group: "Overview", icon: "i-list" },
    { id: "send", title: "Send", group: "Move money", icon: "i-send" },
    { id: "receive", title: "Add fund", group: "Move money", icon: "i-receive" },
    { id: "swap", title: "Swap", group: "Move money", icon: "i-swap" },
    { id: "transfer", title: "Transfer", group: "Move money", icon: "i-users" },
    { id: "upi", title: "UPI transfer", group: "Move money", icon: "i-bolt" },
    { id: "cards", title: "RuPay card", group: "Products", icon: "i-card", badge: "Soon" },
    { id: "staking", title: "Staking", group: "Products", icon: "i-layers", badge: "Soon" },
    { id: "gifts", title: "Gift cards", group: "Products", icon: "i-gift" },
    { id: "referral", title: "Refer & earn", group: "Products", icon: "i-share" },
    { id: "profile", title: "Profile", group: "Account", icon: "i-user" },
    { id: "security", title: "Security", group: "Account", icon: "i-lock" }
  ];
  var PAGES = {};
  function route() { return ROUTES.filter(function (r) { return r.id === current.id; })[0]; }
  var current = { id: "home", params: {} };

  /* top menu groups */
  var NAV = [
    { id: "home", title: "Home", icon: "i-home" },
    { id: "wallet", title: "Wallet", icon: "i-wallet" },
    { id: "move", title: "Move money", icon: "i-send", kids: [["send", "Send crypto to any address"], ["receive", "Your QR and deposit address"], ["swap", "Convert between assets"], ["transfer", "To a Grampe user ID, free"], ["upi", "GINR straight to a bank via UPI"]] },
    { id: "cards", title: "Cards", icon: "i-card" },
    { id: "earn", title: "Earn", icon: "i-star", kids: [["staking", "Put GCC to work · soon"], ["gifts", "Vouchers paid with GINR"], ["referral", "Invite friends, earn points"]] },
    { id: "history", title: "Activity", icon: "i-list" }
  ];
  function R(id) { return ROUTES.filter(function (r) { return r.id === id; })[0]; }
  function buildSidebar() {
    var tones = { send: "tone-primary", receive: "tone-success", swap: "tone-violet", transfer: "tone-sky", upi: "tone-warning", staking: "tone-violet", gifts: "tone-warning", referral: "tone-success" };
    var html = '<span class="nav2-ind" id="navInd" aria-hidden="true"></span>';
    NAV.forEach(function (n) {
      if (!n.kids) { html += '<a class="n2" href="#/' + n.id + '" data-nav="' + n.id + '">' + n.title + "</a>"; return; }
      html += '<div class="n2-wrap"><button class="n2" data-nav="' + n.id + '" aria-expanded="false" aria-controls="mega-' + n.id + '">' + n.title + ico("i-chevron-down", "ico chev") + "</button>" +
        '<div class="mega' + (n.kids.length < 4 ? " narrow-mega" : "") + '" id="mega-' + n.id + '" role="menu">' + n.kids.map(function (k) {
          var r = R(k[0]); return '<a role="menuitem" href="#/' + r.id + '"><span class="icon-tile ' + tones[r.id] + '">' + ico(r.icon) + "</span><span><b>" + r.title + (r.badge ? ' <span class="badge badge-sm badge-primary">' + r.badge + "</span>" : "") + "</b><small>" + k[1] + "</small></span></a>";
        }).join("") + "</div></div>";
    });
    $("#topNav").innerHTML = html;
    // mobile menu
    var mm = "", i = 0;
    [["Overview", ["home", "wallet", "history"]], ["Move money", ["send", "receive", "swap", "transfer", "upi"]], ["Products", ["cards", "staking", "gifts", "referral"]], ["Account", ["profile", "security"]]].forEach(function (g) {
      mm += '<p class="m-group">' + g[0] + "</p>";
      g[1].forEach(function (id) { var r = R(id); mm += '<a href="#/' + id + '" data-m="' + id + '" style="--i:' + (i++) + '"><span class="icon-tile tone-primary">' + ico(r.icon) + "</span>" + r.title + "</a>"; });
    });
    mm += '<p class="m-group">Session</p><a href="../dashboard/" style="--i:' + (i++) + '"><span class="icon-tile tone-sky">' + ico("i-sidebar") + '</span>Switch to V1</a><button data-action="logout" style="--i:' + i + '"><span class="icon-tile tone-dark">' + ico("i-logout") + "</span>Log out</button>";
    $("#mMenuNav").innerHTML = mm;
  }
  function groupOf(id) { var g = NAV.filter(function (n) { return n.id === id || (n.kids && n.kids.some(function (k) { return k[0] === id; })); })[0]; return g ? g.id : null; }
  function moveInd() {
    var ind = $("#navInd"), act = $(".n2.active");
    if (!ind) return;
    if (!act) { ind.style.opacity = "0"; return; }
    var nav = $("#topNav").getBoundingClientRect(), r = act.getBoundingClientRect();
    ind.style.opacity = "1"; ind.style.width = r.width + "px";
    ind.style.transform = "translateX(" + (r.left - nav.left - 5) + "px)";
  }
  function closeMegas(except) { $$(".n2[aria-expanded]").forEach(function (b) { if (b !== except) { b.setAttribute("aria-expanded", "false"); $("#" + b.getAttribute("aria-controls")).classList.remove("open"); } }); }
  function setMobileMenu(open) {
    $("#mMenu").classList.toggle("open", open); $("#mMenu").setAttribute("aria-hidden", String(!open));
    $("#burger").setAttribute("aria-expanded", String(open)); $("#burger").setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-lock", open);
  }

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
    var grp = groupOf(r.id);
    $$(".n2").forEach(function (a) { var on = a.dataset.nav === grp; a.classList.toggle("active", on); if (on && a.tagName === "A") a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    $$("#mMenuNav [data-m]").forEach(function (a) { a.classList.toggle("active", a.dataset.m === r.id); });
    closeMegas(); setMobileMenu(false); moveInd();
    document.title = r.title + " · Grampe Wallet V2";
    view.classList.remove("enter");
    var head = P.ownHead ? "" : '<header class="v2-head"><div><p class="eyebrow">' + r.group + '</p><h1 class="text-grad">' + r.title + "</h1></div></header>";
    view.innerHTML = head + P.html(current.params);
    void view.offsetWidth; view.classList.add("enter");
    if (P.mount) P.mount(view, current.params);
    window.scrollTo(0, 0);
  }
  function refreshChrome() {
    document.body.classList.toggle("masked", S.masked);
    var p = S.profile, ini = p.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    $("#userInitials").textContent = ini; $("#userName").textContent = p.name; $("#userId").textContent = "ID " + p.id;
    var g = asset("GCC"); $("#tbPriceVal").textContent = "$" + g.price.toFixed(4);
    $("#tbPriceChg").innerHTML = (g.change >= 0 ? "▲ " : "▼ ") + Math.abs(g.change).toFixed(1) + "%";
    $("#tbPriceChg").className = g.change >= 0 ? "chg-up" : "chg-down";
  }

  /* ================= PAGES ================= */

  /* ---------- V2 helpers: sparklines, odometer, donut ---------- */
  var COLORS = { GINR: "var(--mint-400)", GCC: "var(--glow-blue)", TON: "var(--asset-ton)", USDT: "var(--asset-usdt)", BNB: "var(--asset-bnb)", ETH: "var(--asset-eth)", SHOP: "var(--asset-shop)", XLM: "var(--navy-300)" };
  function sparkPts(seedStr, n, end, vol, trend) {
    var seed = 0; for (var i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) % 233280;
    var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var pts = [end]; for (var j = 1; j < n; j++) pts.unshift(pts[0] * (1 - trend / n / 100 + (rnd() - .5) * vol));
    return pts;
  }
  function sparkPath(pts, W, H, close) {
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts);
    var d = pts.map(function (v, i) { return (i ? "L" : "M") + (i / (pts.length - 1) * W).toFixed(1) + " " + (2 + (1 - (v - lo) / (hi - lo || 1)) * (H - 4)).toFixed(1); }).join(" ");
    return close ? d + " L" + W + " " + H + " L0 " + H + " Z" : d;
  }
  function spark(a, h) {
    var pts = sparkPts(key(a), 24, a.price, .03, a.change), up = a.change >= 0;
    return '<div class="spark ' + (up ? "up" : "down") + '" style="height:' + (h || 30) + 'px"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="' + sparkPath(pts, 100, 30) + '"/></svg></div>';
  }
  function odometer(usd) {
    var str = money(usd), out = "";
    var parts = str.split("."), whole = parts[0], dec = parts[1] || "00";
    whole.split("").forEach(function (ch) {
      if (/\d/.test(ch)) out += '<span class="d"><span class="col" data-digit="' + ch + '">' + "0123456789".split("").map(function (n) { return "<span>" + n + "</span>"; }).join("") + "</span></span>";
      else out += '<span class="sep">' + ch + "</span>";
    });
    return out + '<span class="dec">.' + dec + "</span>";
  }
  function rollOdometer(el) {
    $$(".col", el).forEach(function (c, i) {
      var d = +c.dataset.digit;
      if (reduce) { c.style.transform = "translateY(" + (-d) + "em)"; return; }
      c.style.transform = "translateY(0)";
      setTimeout(function () { c.style.transform = "translateY(" + (-d) + "em)"; }, 120 + i * 70);
    });
  }
  function donut(list, t) {
    var C = 2 * Math.PI * 52, off = 0;
    return '<svg viewBox="0 0 140 140" role="img" aria-label="Portfolio allocation">' + list.map(function (x, i) {
      var len = Math.max(x.share * C - 3, 0.5), seg = '<circle class="seg" data-i="' + i + '" cx="70" cy="70" r="52" stroke="' + x.color + '" style="--len:' + len.toFixed(2) + ';stroke-dashoffset:' + (-off).toFixed(2) + ";animation-delay:" + (i * 120) + 'ms"><title>' + x.name + " " + (x.share * 100).toFixed(1) + "%</title></circle>";
      off += x.share * C; return seg;
    }).join("") + "</svg>";
  }
  function allocation() {
    var t = total(), list = S.assets.filter(function (a) { return a.bal * a.price > 0; }).map(function (a) { return { name: label(a), color: COLORS[a.sym] || "var(--navy-300)", v: a.bal * a.price }; }).sort(function (a, b) { return b.v - a.v; });
    var top = list.slice(0, 4), rest = list.slice(4).reduce(function (s, x) { return s + x.v; }, 0);
    if (rest > 0) top.push({ name: "Others", color: "var(--navy-300)", v: rest });
    top.forEach(function (x) { x.share = t ? x.v / t : 0; });
    return top;
  }

  /* ---------- HOME (bento) ---------- */
  PAGES.home = {
    ownHead: true,
    html: function () {
      var t = total(), al = allocation();
      var dayChg = S.assets.reduce(function (s, a) { return s + a.bal * a.price * a.change / 100; }, 0), dayPct = t ? dayChg / t * 100 : 0;
      var port = sparkPts("portfolio", 40, t, .018, dayPct * 4);
      var mk = S.assets.slice().sort(function (a, b) { return b.bal * b.price - a.bal * a.price; }).slice(0, 6);
      return '<header class="v2-head"><div><p class="eyebrow">' + greet() + '</p><h1 class="text-grad">Hi ' + esc(S.profile.name.split(" ")[0]) + ',<br>here\'s your money.</h1></div>' + curToggle() + "</header>" +
      '<section class="bento">' +
        '<article class="card b-box b-bal"><div class="bal-top"><p class="bal-label">Total balance <button data-action="mask" aria-label="' + (S.masked ? "Show" : "Hide") + ' balances">' + ico(S.masked ? "i-eye-off" : "i-eye") + '</button></p><span class="badge badge-success">' + (dayPct >= 0 ? "▲ " : "▼ ") + Math.abs(dayPct).toFixed(2) + '% today</span></div>' +
          '<p class="odo money" id="odo" aria-label="' + money(t) + '">' + odometer(t) + "</p>" +
          '<p class="bal-meta"><span>' + S.assets.filter(function (a) { return a.bal > 0; }).length + ' assets</span><span>·</span><span>7 networks</span><span>·</span><span>Demo data</span></p>' +
          '<div class="spark-big" aria-hidden="true"><svg viewBox="0 0 400 70" preserveAspectRatio="none"><defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#41F69A" stop-opacity=".25"/><stop offset="1" stop-color="#41F69A" stop-opacity="0"/></linearGradient></defs><path class="a" d="' + sparkPath(port, 400, 70, true) + '"/><path class="l" d="' + sparkPath(port, 400, 70) + '"/></svg></div>' +
          '<nav class="q2" aria-label="Quick actions">' + [["send", "i-send", "Send"], ["receive", "i-receive", "Add fund"], ["swap", "i-swap", "Swap"], ["transfer", "i-users", "Transfer"], ["upi", "i-bolt", "UPI"]].map(function (q) { return '<a href="#/' + q[0] + '"><span class="bub">' + ico(q[1]) + "</span>" + q[2] + "</a>"; }).join("") + "</nav>" +
        "</article>" +
        '<article class="card b-box b-alloc"><h2 class="b-title">Allocation <span class="caption">by value</span></h2><div class="donut-wrap"><div class="donut" id="donut">' + donut(al) + '<div class="donut-center"><b id="dPct">100%</b><small id="dName">Portfolio</small></div></div>' +
          '<ul class="legend" id="legend">' + al.map(function (x, i) { return '<li data-i="' + i + '"><i style="background:' + x.color + '"></i><span>' + x.name + "</span><b>" + (x.share * 100).toFixed(1) + "%</b></li>"; }).join("") + "</ul></div></article>" +
        '<article class="card b-box b-gcc chart-card"><div class="b-title"><span>GCC / USD</span><div class="segmented" role="radiogroup" aria-label="Chart range">' + ["1D", "1W", "1M", "3M", "1Y"].map(function (r, i) { return '<button role="radio" aria-checked="' + (i === 1) + '" data-range="' + r + '">' + r + "</button>"; }).join("") + '</div></div><div class="price-row"><span class="coin coin-gcc">G</span><span class="price" id="cPrice">$' + asset("GCC").price.toFixed(4) + '</span><span id="cChg"></span></div><div class="chart" id="chart"></div></article>' +
        '<article class="card b-box b-market"><h2 class="b-title">Markets <a class="link" href="#/wallet">All ' + ico("i-arrow") + '</a></h2><div class="mkt">' + mk.map(function (a) {
          return '<button class="mkt-row" data-asset="' + key(a) + '">' + coin(a, "") + '<span class="row-main"><b>' + label(a) + "</b><small>$" + (a.price < 1 ? a.price.toFixed(4) : num(a.price, 2)) + "</small></span>" + spark(a) + '<span class="row-end"><b>' + m(num(a.bal, a.dp > 2 ? 3 : 2)) + "</b><small>" + chg(a.change) + "</small></span></button>";
        }).join("") + "</div></article>" +
        '<article class="card b-box b-act"><h2 class="b-title">Activity <a class="link" href="#/history">See all ' + ico("i-arrow") + '</a></h2><div class="rows timeline">' + S.history.slice(0, 5).map(txRow).join("") + "</div></article>" +
        '<article class="card b-box b-card"><h2 class="b-title">RuPay card <span class="badge badge-primary">Soon</span></h2><a href="#/cards" class="holo-wrap" aria-label="Open card"><div class="holo" id="holoMini"><div class="vtop"><span><img src="../assets/img/shield.svg" alt="" width="18" height="20">Gram Chain</span><span class="vnet">RuPay</span></div><div class="vchip"></div><p class="vnum">•••• 4821</p></div></a></article>' +
        '<article class="card b-box b-ref"><h2 class="b-title">Refer &amp; earn <span class="icon-tile icon-tile-sm tone-success">' + ico("i-users") + '</span></h2><p class="body-sm">Invite friends to Grampe and collect reward points when they verify.</p><div class="ref-link" style="margin-top:16px"><span>' + esc(S.profile.refLink) + '</span><button class="chip" data-copy="' + esc(S.profile.refLink) + '" data-what="Referral link">' + ico("i-copy") + 'Copy</button></div><div class="cta-row" style="margin-top:16px"><a class="btn btn-primary btn-sm" href="#/referral">' + ico("i-share") + 'Share</a><a class="btn btn-secondary btn-sm" href="#/gifts">' + ico("i-gift") + "Gift cards</a></div></article>" +
      "</section>";
    },
    mount: function (v) {
      rollOdometer($("#odo", v));
      drawChart($("#chart", v), "1W");
      $$("[data-range]", v).forEach(function (b) { b.addEventListener("click", function () { $$("[data-range]", v).forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); drawChart($("#chart", v), b.dataset.range); }); });
      var al = allocation();
      function hl(i) {
        $$("#donut .seg", v).forEach(function (c) { c.classList.toggle("hl", +c.dataset.i === i); });
        $("#dPct", v).textContent = i == null ? "100%" : (al[i].share * 100).toFixed(1) + "%"; $("#dName", v).textContent = i == null ? "Portfolio" : al[i].name;
      }
      $$("#donut .seg, #legend li", v).forEach(function (el) { el.addEventListener("mouseenter", function () { hl(+el.dataset.i); }); el.addEventListener("mouseleave", function () { hl(null); }); el.addEventListener("click", function () { hl(+el.dataset.i); }); });
      tilt($("#holoMini", v));
    }
  };
  function tilt(el) {
    if (!el || reduce || !window.matchMedia("(hover: hover)").matches) return;
    var host = el.closest(".card") || el;
    host.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.transform = "rotateY(" + ((x - .5) * 18) + "deg) rotateX(" + ((.5 - y) * 14) + "deg)"; el.style.setProperty("--hx", x * 100 + "%"); el.style.setProperty("--hy", y * 100 + "%"); });
    host.addEventListener("pointerleave", function () { el.style.transform = ""; });
  }
  function curToggle() { return '<div class="cur-toggle" role="group" aria-label="Display currency"><button data-cur="INR" aria-pressed="' + (S.cur === "INR") + '">₹ INR</button><button data-cur="USD" aria-pressed="' + (S.cur === "USD") + '">$ USD</button></div>'; }

  /* ---------- WALLET (asset cards + list) ---------- */
  PAGES.wallet = {
    ownHead: true,
    html: function () {
      return '<header class="v2-head"><div><p class="eyebrow">Wallet · total balance</p><h1 class="text-grad money">' + money(total()) + '</h1></div><div class="cta-row" style="margin:0"><a class="btn btn-primary" href="#/send">' + ico("i-send") + 'Send</a><a class="btn btn-secondary" href="#/receive">' + ico("i-receive") + 'Add fund</a><a class="btn btn-secondary" href="#/swap">' + ico("i-swap") + "Swap</a></div></header>" +
        '<div class="toolbar"><div class="input-wrap">' + ico("i-search") + '<input class="input" id="wQ" placeholder="Search assets" aria-label="Search assets"></div>' +
        '<label class="chip" style="cursor:pointer"><button type="button" class="switch" id="wZero" role="switch" aria-checked="false" aria-label="Hide zero balances"></button>Hide zero</label>' +
        '<div class="segmented view-toggle" role="radiogroup" aria-label="Layout"><button role="radio" aria-checked="true" data-layout="grid">' + ico("i-grid") + '</button><button role="radio" aria-checked="false" data-layout="list">' + ico("i-list") + "</button></div></div>" +
        '<div class="chip-row" id="wNets" style="margin-bottom:20px"><button class="chip is-active" data-net="all">All networks</button>' + D.networks.map(function (n) { return '<button class="chip" data-net="' + n.id + '">' + n.name + "</button>"; }).join("") + "</div>" +
        '<div id="wList"></div>';
    },
    mount: function (v) {
      var st = { q: "", zero: false, net: "all", layout: "grid" };
      function acard(a) {
        return '<button class="card acard" data-asset="' + key(a) + '"><span class="acard-top">' + coin(a) + '<span class="row-main"><b>' + label(a) + "</b><small>" + net(a.net).name + "</small></span>" + chg(a.change) + "</span>" +
          spark(a, 40) + '<span class="acard-bal money">' + num(a.bal, a.dp) + '</span><span class="acard-foot"><span class="money">' + money(a.bal * a.price) + "</span><span>$" + (a.price < 1 ? a.price.toFixed(4) : num(a.price, 2)) + "</span></span></button>";
      }
      function draw() {
        var list = S.assets.filter(function (a) { return (st.net === "all" || a.net === st.net) && (!st.zero || a.bal > 0) && (!st.q || (a.name + label(a)).toLowerCase().indexOf(st.q) > -1); })
          .sort(function (a, b) { return b.bal * b.price - a.bal * a.price; });
        var empty = '<div class="card b-box empty"><span class="icon-tile icon-tile-lg tone-primary">' + ico("i-search") + '</span><p class="title">No assets found</p><p class="body-sm">Try another network or search.</p></div>';
        $("#wList", v).innerHTML = !list.length ? empty : st.layout === "grid" ? '<div class="acard-grid">' + list.map(acard).join("") + "</div>" : '<div class="card box"><div class="rows">' + list.map(assetRow).join("") + "</div></div>";
        if (!reduce) $$("#wList .acard", v).forEach(function (c, i) { c.animate([{ opacity: 0, transform: "translateY(16px) scale(.97)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: i * 50, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); });
      }
      $("#wQ", v).addEventListener("input", function (e) { st.q = e.target.value.trim().toLowerCase(); draw(); });
      $("#wZero", v).addEventListener("click", function (e) { st.zero = !st.zero; e.currentTarget.setAttribute("aria-checked", String(st.zero)); draw(); });
      $("#wNets", v).addEventListener("click", function (e) { var b = e.target.closest("[data-net]"); if (!b) return; st.net = b.dataset.net; $$("[data-net]", v).forEach(function (x) { x.classList.toggle("is-active", x === b); }); draw(); });
      $$("[data-layout]", v).forEach(function (b) { b.addEventListener("click", function () { st.layout = b.dataset.layout; $$("[data-layout]", v).forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); draw(); }); });
      draw();
    }
  };

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
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-label="GCC price chart, ' + range + '" role="img"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5B6CFF" stop-opacity=".35"/><stop offset="1" stop-color="#5B6CFF" stop-opacity="0"/></linearGradient></defs>' +
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
        $("#hList", v).innerHTML = html ? '<div class="rows timeline">' + html + "</div>" : '<div class="empty"><span class="icon-tile icon-tile-lg tone-primary">' + ico("i-list") + '</span><p class="title">No activity yet</p><p class="body-sm">Transactions you make will appear here.</p></div>';
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
      return '<div class="page-head"><div><h2 class="h3">RuPay virtual card</h2><p class="sub">Spend your GINR anywhere RuPay is accepted.</p></div><span class="badge badge-lg badge-primary">Coming soon</span></div>' +
        '<div class="grid-2">' +
          '<section class="card box"><div class="vcard-wrap"><div class="vcard' + (c.frozen ? " frozen" : "") + '" id="vcard" role="button" tabindex="0" aria-label="Flip card">' +
            '<div class="vface"><div class="vtop"><span><img src="../assets/img/shield.svg" alt="" width="20" height="22">Gram Chain</span><span class="vnet">RuPay</span></div><div class="vchip"></div><p class="vnum" id="vnum">6254 •••• •••• 4821</p><div class="vbot"><span>' + esc(S.profile.name.toUpperCase()) + "</span><span>VALID 12/29</span></div></div>" +
            '<div class="vface back"><div class="vstripe"></div><div class="vcvv"><span class="caption">CVV</span><b id="vcvv">•••</b></div><p class="caption" style="color:var(--navy-300);margin-top:auto">Virtual card · demo details</p></div>' +
          "</div></div>" +
          '<div class="cta-row" style="justify-content:center"><button class="btn btn-secondary btn-sm" id="cReveal">' + ico("i-eye") + '<span>Show details</span></button><button class="btn btn-secondary btn-sm" id="cFlip">' + ico("i-refresh") + 'Flip</button><button class="btn btn-secondary btn-sm" id="cCopy" disabled>' + ico("i-copy") + "Copy number</button></div>" +
          '<div class="summary" style="margin-top:16px"><div><span>Card balance</span><b>' + m("₹" + num(c.balance, 2)) + "</b></div><div><span>Status</span><b>" + (c.frozen ? "Frozen" : "Active (preview)") + "</b></div></div></section>" +
          '<div class="stack">' +
            '<section class="card box"><div class="section-title"><h2>Card controls</h2></div><div class="rows card-controls">' +
              ctrl("frozen", "i-snow", "Freeze card", "Temporarily block all payments", c.frozen) +
              ctrl("online", "i-globe", "Online payments", "Use the card for online shopping", c.online) +
              ctrl("contactless", "i-bolt", "Contactless", "Tap to pay at shops", c.contactless) +
            '</div><div class="input-group" style="margin-top:16px"><label class="input-label" for="cLimit">Daily limit <b class="text-primary" id="cLimitV" style="float:right">₹' + num(c.limit, 0) + '</b></label><input type="range" id="cLimit" min="1000" max="100000" step="1000" value="' + c.limit + '" style="width:100%;accent-color:var(--color-primary)"></div></section>' +
            '<section class="card box"><div class="section-title"><h2>Send money to card</h2></div><div class="input-group"><div class="input-wrap" id="cAmtW"><span class="input-addon">₹</span><input class="input input-lg" id="cAmt" inputmode="decimal" placeholder="0"></div><p class="input-hint">From GINR balance · ' + m("₹" + num(asset("GINR").bal, 2)) + '</p></div><button class="btn btn-primary btn-block" style="margin-top:12px" id="cTop" disabled>Add money</button></section>' +
          "</div>" +
        "</div>";
    },
    mount: function (v) {
      var card = $("#vcard", v), shown = false, c = S.card;
      $(".vface:not(.back)", v).classList.add("holo-face");
      function flip() { card.classList.toggle("flipped"); }
      card.addEventListener("click", flip); card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      $("#cFlip", v).addEventListener("click", flip);
      $("#cReveal", v).addEventListener("click", function () {
        shown = !shown; $("#vnum", v).textContent = shown ? "6254 7310 9826 4821" : "6254 •••• •••• 4821"; $("#vcvv", v).textContent = shown ? "582" : "•••";
        $("#cReveal span", v).textContent = shown ? "Hide details" : "Show details"; $("#cCopy", v).disabled = !shown;
        if (shown) setTimeout(function () { if (shown) $("#cReveal", v).click(); }, 15000);
      });
      $("#cCopy", v).addEventListener("click", function () { copy("6254731098264821", "Card number"); });
      $$("[data-ctrl]", v).forEach(function (s) { s.addEventListener("click", function () { var k = s.dataset.ctrl; c[k] = !c[k]; s.setAttribute("aria-checked", String(c[k])); if (k === "frozen") { card.classList.toggle("frozen", c.frozen); toast(c.frozen ? "Card frozen" : "Card unfrozen", "i-snow"); } save(); }); });
      $("#cLimit", v).addEventListener("input", function (e) { c.limit = +e.target.value; $("#cLimitV", v).textContent = "₹" + num(c.limit, 0); save(); });
      var amt = $("#cAmt", v), g = asset("GINR");
      amt.addEventListener("input", function () { var n = parseFloat(amt.value) || 0; $("#cAmtW", v).className = "input-wrap" + (amt.value && (n <= 0 || n > g.bal) ? " is-invalid" : ""); $("#cTop", v).disabled = !(n > 0 && n <= g.bal) || c.frozen; });
      $("#cTop", v).addEventListener("click", function () { var n = parseFloat(amt.value); g.bal = +(g.bal - n).toFixed(2); c.balance = +(c.balance + n).toFixed(2); record({ type: "card", asset: "GINR", amount: n }); toast("₹" + num(n, 2) + " added to your card", "i-card"); render(); });
    }
  };
  function ctrl(k, icon, t, s, on) { return '<div class="row-item"><span class="icon-tile tone-primary">' + ico(icon) + '</span><span class="row-main"><b>' + t + "</b><small>" + s + '</small></span><button class="switch" role="switch" data-ctrl="' + k + '" aria-checked="' + on + '" aria-label="' + t + '"></button></div>'; }

  /* ---------- STAKING ---------- */
  PAGES.staking = {
    html: function () {
      return '<section class="card box"><div class="empty"><span class="icon-tile icon-tile-xl tone-violet">' + ico("i-layers") + '</span><h2 class="h3">Staking is coming soon</h2><p class="sub">Put your GCC to work on Gram Chain. Plans and rates will be shown here at launch.</p>' +
        '<label class="chip" style="cursor:pointer;min-height:48px;padding:0 16px"><button type="button" class="switch" id="stNotify" role="switch" aria-checked="' + S.notifyStaking + '" aria-label="Notify me at launch"></button>Notify me at launch</label></div></section>' +
        '<div class="feature-grid" style="margin-top:var(--grid-gap)">' +
          [["i-refresh", "Flexible", "Stake and unstake any time.", "tone-primary"], ["i-lock", "Locked", "Commit for a fixed period.", "tone-violet"], ["i-chart", "Auto-compound", "Rewards restake automatically.", "tone-success"]].map(function (f) {
            return '<div class="tile"><span class="icon-tile ' + f[3] + '">' + ico(f[0]) + '</span><b class="tile-title" style="margin-top:8px">' + f[1] + '</b><span class="tile-text">' + f[2] + "</span></div>";
          }).join("") + "</div>" +
        '<p class="fine-print">Staking returns vary and are not guaranteed.</p>';
    },
    mount: function (v) { $("#stNotify", v).addEventListener("click", function (e) { S.notifyStaking = !S.notifyStaking; e.currentTarget.setAttribute("aria-checked", String(S.notifyStaking)); save(); toast(S.notifyStaking ? "We'll notify you at launch" : "Notifications off", "i-bell"); }); }
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
      return '<div class="grid-2 grid-main"><section class="card box"><div class="profile-head"><span class="avatar avatar-5">' + ini + '</span><div><p class="title title-lg">' + esc(p.name) + '</p><p class="caption">User ID ' + p.id + ' <button class="link" data-copy="' + p.id + '" data-what="User ID" style="margin:0 0 0 6px;padding:0">Copy</button></p></div></div>' +
        '<form class="form-grid form-grid-2" id="pf" novalidate>' +
          '<div class="input-group"><label class="input-label" for="pId">User ID</label><div class="input-wrap" style="background:var(--color-bg)"><input class="input" id="pId" value="' + p.id + '" readonly></div></div>' +
          '<div class="input-group"><label class="input-label" for="pName">Full name</label><div class="input-wrap"><input class="input" id="pName" value="' + esc(p.name) + '" autocomplete="name" required></div></div>' +
          '<div class="input-group"><label class="input-label" for="pCountry">Country</label><div class="input-wrap"><select class="input" id="pCountry">' + COUNTRIES.map(function (c) { return '<option value="' + c[0] + '" data-code="' + c[1] + '"' + (c[0] === p.country ? " selected" : "") + ">" + c[0] + " (" + c[1] + ")</option>"; }).join("") + "</select>" + ico("i-chevron-down") + "</div></div>" +
          '<div class="input-group"><label class="input-label" for="pMobile">Mobile</label><div class="input-wrap"><span class="input-addon" id="pCode">' + p.code + '</span><input class="input" id="pMobile" value="' + esc(p.mobile) + '" inputmode="tel" autocomplete="tel"></div></div>' +
          '<div class="input-group" style="grid-column:1/-1"><label class="input-label" for="pEmail">Email</label><div class="input-wrap" id="pEmailW"><input class="input" id="pEmail" type="email" value="' + esc(p.email) + '" autocomplete="email"></div><p class="input-hint" id="pEmailH"></p></div>' +
          '<div style="grid-column:1/-1;display:flex;gap:12px;justify-content:flex-end"><button type="button" class="btn btn-secondary" id="pReset" disabled>Discard</button><button class="btn btn-primary" id="pSave" disabled>Save changes</button></div>' +
        "</form></section>" +
        '<div class="stack"><section class="card box"><div class="section-title"><h2>Preferences</h2></div><div class="rows card-controls">' +
          '<div class="row-item"><span class="icon-tile tone-primary">' + ico("i-eye-off") + '</span><span class="row-main"><b>Hide balances</b><small>Blur amounts across the app</small></span><button class="switch" role="switch" id="prefMask" aria-checked="' + S.masked + '" aria-label="Hide balances"></button></div>' +
          '<div class="row-item"><span class="icon-tile tone-primary">₹</span><span class="row-main"><b>Show values in</b><small>Currency for totals</small></span>' + curToggle().replace("cur-toggle", "segmented") + "</div>" +
        "</div></section>" +
        '<section class="card box"><div class="section-title"><h2>Demo data</h2></div><p class="body-sm">Balances and activity here are fictional and saved only in this browser.</p><button class="btn btn-secondary btn-block" style="margin-top:12px" id="demoReset">' + ico("i-refresh") + "Reset demo data</button></section></div></div>";
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
      $("#prefMask", v).addEventListener("click", function (e) { S.masked = !S.masked; e.currentTarget.setAttribute("aria-checked", String(S.masked)); save(); refreshChrome(); });
      $("#demoReset", v).addEventListener("click", function () { confirmBox("Reset demo data?", "Balances, activity, gift cards and settings go back to the starting demo values.", "Reset", function () { S = fresh(); save(); refreshChrome(); toast("Demo data reset", "i-refresh"); render(); }); });
    }
  };

  /* ---------- SECURITY ---------- */
  PAGES.security = {
    html: function () {
      function pw(id, lab, ac) { return '<div class="input-group"><label class="input-label" for="' + id + '">' + lab + '</label><div class="input-wrap" id="' + id + 'W"><input class="input" id="' + id + '" type="password" autocomplete="' + ac + '"><button type="button" class="icon-btn icon-btn-sm" data-eye="' + id + '" aria-label="Show password" style="border:0;box-shadow:none">' + ico("i-eye") + "</button></div></div>"; }
      return '<div class="grid-2 grid-main"><section class="card box"><div class="section-title"><h2>Update password</h2><span class="icon-tile tone-primary">' + ico("i-lock") + "</span></div>" +
        '<form class="form-grid" id="secF" novalidate>' + pw("pwOld", "Current password", "current-password") + pw("pwNew", "New password", "new-password") +
        '<div class="strength" id="pwS" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><ul class="rules" id="pwR"><li data-r="len">At least 8 characters</li><li data-r="up">One uppercase letter</li><li data-r="num">One number</li><li data-r="sym">One symbol</li></ul>' +
        pw("pwNew2", "Confirm new password", "new-password") + '<p class="input-hint" id="pwMatch"></p>' +
        '<button class="btn btn-primary btn-lg" id="pwGo" disabled>Change password</button></form>' +
        '<p class="caption" style="margin-top:12px">Demo form · on the live site this updates your Grampe login.</p></section>' +
        '<div class="stack"><section class="card box"><div class="section-title"><h2>Session</h2></div><div class="rows card-controls"><div class="row-item"><span class="icon-tile tone-success">' + ico("i-check") + '</span><span class="row-main"><b>This device</b><small>Active now · ' + esc(navigator.platform || "Browser") + "</small></span></div></div>" +
        '<button class="btn btn-secondary btn-block" style="margin-top:12px;color:var(--color-danger)" data-action="logout">' + ico("i-logout") + "Log out</button></section>" +
        '<section class="card box"><p class="note">' + ico("i-shield") + "Grampe will never ask for your password, OTP or recovery phrase over phone, email or chat.</p></section></div></div>";
    },
    mount: function (v) {
      var o = $("#pwOld", v), n = $("#pwNew", v), n2 = $("#pwNew2", v);
      $$("[data-eye]", v).forEach(function (b) { b.addEventListener("click", function () { var i = $("#" + b.dataset.eye, v), show = i.type === "password"; i.type = show ? "text" : "password"; b.innerHTML = ico(show ? "i-eye-off" : "i-eye"); b.setAttribute("aria-label", show ? "Hide password" : "Show password"); }); });
      function check() {
        var p = n.value, r = { len: p.length >= 8, up: /[A-Z]/.test(p), num: /\d/.test(p), sym: /[^A-Za-z0-9]/.test(p) }, s = Object.keys(r).filter(function (k) { return r[k]; }).length;
        $("#pwS", v).dataset.s = p ? s : 0;
        $$("#pwR li", v).forEach(function (li) { li.classList.toggle("ok", r[li.dataset.r]); });
        var match = n2.value && n2.value === p;
        $("#pwMatch", v).className = "input-hint" + (n2.value ? (match ? " is-ok" : " is-error") : "");
        $("#pwMatch", v).textContent = n2.value ? (match ? "Passwords match" : "Passwords don't match") : "";
        $("#pwGo", v).disabled = !(o.value && s === 4 && match && p !== o.value);
      }
      [o, n, n2].forEach(function (i) { i.addEventListener("input", check); });
      $("#secF", v).addEventListener("submit", function (e) { e.preventDefault(); toast("Password updated (demo)", "i-lock"); $("#secF", v).reset(); check(); });
    }
  };

  PAGES.cards.ownHead = true; PAGES.gifts.ownHead = true;

  /* ---------- confirm dialog ---------- */
  function confirmBox(title, text, okText, ok) {
    openPanel({ type: "modal", title: title, html: '<p class="body-sm">' + text + '</p><div class="grid-2" style="grid-template-columns:1fr 1fr;margin-top:20px"><button class="btn btn-secondary" data-action="close">Cancel</button><button class="btn btn-primary" id="cfOk">' + okText + "</button></div>",
      mount: function (b) { $("#cfOk", b).addEventListener("click", function () { closePanel(); ok(); }); } });
  }

  /* ---------- quick + more sheets, notifications ---------- */
  function quickSheet() {
    var fab = $(".fab2"); fab.classList.add("open");
    openPanel({ type: "sheet", title: "Quick actions", html: '<div class="action-grid">' + [["send", "i-send", "Send", "tone-primary"], ["receive", "i-receive", "Add fund", "tone-success"], ["swap", "i-swap", "Swap", "tone-violet"], ["transfer", "i-users", "Transfer", "tone-sky"], ["upi", "i-bolt", "UPI", "tone-warning"], ["gifts", "i-gift", "Gift card", "tone-warning"]].map(function (q) { return '<a href="#/' + q[0] + '"><span class="icon-tile ' + q[3] + '">' + ico(q[1]) + "</span>" + q[2] + "</a>"; }).join("") + "</div>", onClose: function () { fab.classList.remove("open"); } });
  }
  function moreSheet() { setMobileMenu(true); }
  function moreSheetOld() {
    openPanel({ type: "sheet", title: "All pages", html: '<div class="action-grid">' + ROUTES.map(function (r) { return '<a href="#/' + r.id + '"><span class="icon-tile tone-primary">' + ico(r.icon) + "</span>" + r.title + "</a>"; }).join("") + '<button data-action="logout"><span class="icon-tile tone-dark">' + ico("i-logout") + "</span>Log out</button></div>" });
  }
  function notifPanel() {
    $(".tb-dot") && $(".tb-dot").remove();
    openPanel({ type: "drawer", title: "Notifications", html: '<div class="rows">' + D.notifications.map(function (n) { return '<div class="row-item"><span class="icon-tile ' + n.tone + '">' + ico(n.icon) + '</span><span class="row-main"><b>' + n.title + "</b><small>" + n.text + '</small></span><span class="caption">' + n.time + "</span></div>"; }).join("") + "</div>" });
  }

  /* ---------- command palette ---------- */
  var pal = $("#palette"), palInput = $("#palInput"), palList = $("#palList"), palIdx = 0, palItems = [];
  function palData() {
    return ROUTES.map(function (r) { return { g: "Pages", t: r.title, i: r.icon, k: r.group, run: function () { location.hash = "#/" + r.id; } }; })
      .concat([
        { g: "Actions", t: S.masked ? "Show balances" : "Hide balances", i: "i-eye", run: function () { S.masked = !S.masked; save(); refreshChrome(); render(); } },
        { g: "Actions", t: "Show values in " + (S.cur === "INR" ? "USD" : "INR"), i: "i-globe", run: function () { S.cur = S.cur === "INR" ? "USD" : "INR"; save(); render(); } },
        { g: "Actions", t: "Copy referral link", i: "i-copy", run: function () { copy(S.profile.refLink, "Referral link"); } },
        { g: "Actions", t: "Log out", i: "i-logout", run: logout }
      ])
      .concat(S.assets.map(function (a) { return { g: "Assets", t: label(a) + " · " + a.name, i: "i-wallet", k: net(a.net).name, run: function () { assetDrawer(key(a)); } }; }));
  }
  function palDraw() {
    var q = palInput.value.trim().toLowerCase(), g = "", html = "";
    palItems = palData().filter(function (x) { return !q || (x.t + " " + (x.k || "") + " " + x.g).toLowerCase().indexOf(q) > -1; });
    palIdx = Math.min(palIdx, Math.max(palItems.length - 1, 0));
    palItems.forEach(function (x, i) { if (x.g !== g) { g = x.g; html += '<li class="pal-group" aria-hidden="true">' + g + "</li>"; } html += '<li role="option" data-i="' + i + '" class="' + (i === palIdx ? "active" : "") + '" aria-selected="' + (i === palIdx) + '">' + ico(x.i) + esc(x.t) + (x.k ? "<small>" + esc(x.k) + "</small>" : "") + "</li>"; });
    palList.innerHTML = html || '<li class="pal-group">No results</li>';
    var a = $("li.active", palList); if (a) a.scrollIntoView({ block: "nearest" });
  }
  function palOpen() { closePanel(); pal.classList.add("open"); pal.setAttribute("aria-hidden", "false"); palInput.value = ""; palIdx = 0; palDraw(); setTimeout(function () { palInput.focus(); }, 30); }
  function palClose() { pal.classList.remove("open"); pal.setAttribute("aria-hidden", "true"); }
  function palRun(i) { var x = palItems[i]; palClose(); if (x) setTimeout(x.run, 50); }
  palInput.addEventListener("input", function () { palIdx = 0; palDraw(); });
  palInput.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); palIdx = Math.min(palIdx + 1, palItems.length - 1); palDraw(); }
    if (e.key === "ArrowUp") { e.preventDefault(); palIdx = Math.max(palIdx - 1, 0); palDraw(); }
    if (e.key === "Enter") { e.preventDefault(); palRun(palIdx); }
  });
  palList.addEventListener("click", function (e) { var li = e.target.closest("[data-i]"); if (li) palRun(+li.dataset.i); });
  pal.addEventListener("click", function (e) { if (e.target === pal) palClose(); });

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
      return;
    }
    var as = t.closest("[data-asset]"); if (as && !t.closest("a")) { assetDrawer(as.dataset.asset); return; }
    var tx = t.closest("[data-tx]"); if (tx) { txDrawer(tx.dataset.tx); return; }
    if (t.closest("#panelBody a[href^='#/']")) closePanel();
  });
  $("#openPalette").addEventListener("click", palOpen);
  $("#openNotif").addEventListener("click", notifPanel);
  $("#burger").addEventListener("click", function () { setMobileMenu(!$("#mMenu").classList.contains("open")); });
  $("#mMenu").addEventListener("click", function (e) { if (e.target.closest("a")) setMobileMenu(false); });
  // mega menus: hover on desktop, click/keyboard everywhere
  $("#topNav").addEventListener("click", function (e) {
    var b = e.target.closest("button.n2"); if (!b) return;
    var open = b.getAttribute("aria-expanded") !== "true"; closeMegas(b);
    b.setAttribute("aria-expanded", String(open)); $("#" + b.getAttribute("aria-controls")).classList.toggle("open", open);
    if (open) { var f = $("#" + b.getAttribute("aria-controls") + " a"); if (f && e.detail === 0) f.focus(); }
  });
  $$(".n2-wrap").forEach(function (w) {
    var t; var b = $("button", w), m = $(".mega", w);
    w.addEventListener("mouseenter", function () { if (!window.matchMedia("(hover: hover)").matches) return; clearTimeout(t); closeMegas(b); b.setAttribute("aria-expanded", "true"); m.classList.add("open"); });
    w.addEventListener("mouseleave", function () { if (!window.matchMedia("(hover: hover)").matches) return; t = setTimeout(function () { b.setAttribute("aria-expanded", "false"); m.classList.remove("open"); }, 160); });
    m.addEventListener("click", function (e) { if (e.target.closest("a")) closeMegas(); });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".n2-wrap")) closeMegas(); });
  window.addEventListener("resize", function () { moveInd(); if (window.innerWidth >= 1100) setMobileMenu(false); });
  // cursor spotlight on glass cards
  document.addEventListener("pointermove", function (e) {
    var c = e.target.closest && e.target.closest(".card, .glass"); if (!c) return;
    var r = c.getBoundingClientRect(); c.style.setProperty("--mx", (e.clientX - r.left) + "px"); c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  var userBtn = $("#userBtn"), userMenu = $("#userMenu");
  function closeMenu() { userMenu.hidden = true; userBtn.setAttribute("aria-expanded", "false"); }
  userBtn.addEventListener("click", function (e) { e.stopPropagation(); var open = userMenu.hidden; userMenu.hidden = !open; userBtn.setAttribute("aria-expanded", String(open)); if (open) $("a", userMenu).focus(); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".tb-user")) closeMenu(); });
  userMenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal.classList.contains("open") ? palClose() : palOpen(); return; }
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); palOpen(); return; }
    if (e.key === "Escape") { closeMegas(); if ($("#mMenu").classList.contains("open")) { setMobileMenu(false); $("#burger").focus(); return; } if (pal.classList.contains("open")) palClose(); else if (!userMenu.hidden) { closeMenu(); userBtn.focus(); } else closePanel(); }
  });
  window.addEventListener("scroll", function () { $("#nav2").classList.toggle("scrolled", window.scrollY > 4); }, { passive: true });
  window.addEventListener("hashchange", render);

  /* ---------- boot ---------- */
  buildSidebar();
  refreshChrome();
  window.addEventListener("load", function () { setTimeout(function () { document.body.classList.add("ready"); moveInd(); }, reduce ? 0 : 700); });
  if (!location.hash) history.replaceState(null, "", "#/home");
  render();
})();
