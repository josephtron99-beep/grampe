/* ==========================================================
   Grampe dashboard V3 — Dashboard (overview) page
   Same content as the live grampe.co dashboard:
   greeting · GCC/USD chart · My Cards · Total balance + referral
   · Invest / Add Fund · Wallet & History with network filter.
   Uses window.G3 from shell.js.
   ========================================================== */
(function () {
  "use strict";
  var G = window.G3, D = G.D, $ = G.$, $$ = G.$$, ico = G.ico, num = G.num, usd = G.usd, key = G.key, label = G.label, asset = G.asset;
  var V1 = "../#/";
  var EXPLORER = { gram: "https://gccscan.com", eth: "https://etherscan.io", bsc: "https://bscscan.com", ton: "https://tonviewer.com", shop: "https://tonviewer.com", tron: "https://tronscan.org", xlm: "https://stellar.expert" };

  /* ---------- greeting ---------- */
  var hr = new Date().getHours();
  $("#greet3").textContent = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  $("#firstName").textContent = D.user.first;
  var stamp = function (d) { return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); };
  $("#updated3").textContent = stamp(new Date());
  $("#cardUpd").textContent = stamp(new Date(Date.now() - 3 * 36e5));

  /* ---------- GCC / USD chart ---------- */
  var gcc = asset("GCC"), range = "1Y";
  var SPAN = { "1D": 864e5, "1W": 6048e5, "1M": 2592e6, "3M": 7776e6, "1Y": 31536e6 };
  function series(r) {
    var n = { "1D": 48, "1W": 56, "1M": 60, "3M": 90, "1Y": 120 }[r], vol = { "1D": .006, "1W": .012, "1M": .02, "3M": .03, "1Y": .035 }[r], drift = { "1D": .0004, "1W": .001, "1M": .002, "3M": .004, "1Y": .007 }[r];
    var seed = r.charCodeAt(0) * 131 + r.length * 17, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var p = [gcc.price]; for (var i = 1; i < n; i++) p.unshift(Math.max(.3, p[0] * (1 - drift + (rnd() - .5) * vol)));
    var now = Date.now(); return p.map(function (v, i) { return { v: v, t: now - SPAN[r] + SPAN[r] * i / (n - 1) }; });
  }
  function fmtT(t, r) { var d = new Date(t); return r === "1D" ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); }
  function drawChart() {
    var el = $("#bigchart"), data = series(range), W = el.clientWidth || 800, H = el.clientHeight || 280, L = 56, R = 12, T = 12, B = 28;
    var vs = data.map(function (d) { return d.v; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pad = (hi - lo) * .12 || .01; lo -= pad; hi += pad;
    var x = function (i) { return L + i / (data.length - 1) * (W - L - R); }, y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var grid = "", ylab = "", xlab = "";
    for (var g = 0; g <= 4; g++) { var v = lo + (hi - lo) * g / 4, yy = y(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>'; ylab += '<text class="ylab" x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">$' + v.toFixed(4) + "</text>"; }
    var ticks = W < 480 ? 3 : 6;
    for (var k = 0; k <= ticks; k++) { var i = Math.round(k / ticks * (data.length - 1)); xlab += '<text class="xlab" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (k === 0 ? "start" : k === ticks ? "end" : "middle") + '">' + fmtT(data[i].t, range) + "</text>"; }
    var line = data.map(function (d, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.v).toFixed(1); }).join(" ");
    var dark = document.documentElement.getAttribute("data-theme") === "carbon", col = dark ? "#9670FF" : "#0500FF";
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="GCC to USD price, ' + range + '"><defs><linearGradient id="cFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity="' + (dark ? .3 : .14) + '"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="grid">' + grid + "</g>" + ylab + xlab +
      '<path class="area" fill="url(#cFill)" d="' + line + " L" + x(data.length - 1).toFixed(1) + " " + (H - B) + " L" + L + " " + (H - B) + ' Z"/><path class="line" d="' + line + '"/>' +
      '<line class="cross" y1="' + T + '" y2="' + (H - B) + '" style="display:none"/><circle class="dot" r="5" style="display:none"/></svg><span class="chart-tip3" hidden></span>';
    var first = data[0].v, last = data[data.length - 1].v, pct = (last - first) / first * 100;
    $("#pPrice").textContent = "$" + last.toFixed(4);
    var pc = $("#pChg"); pc.textContent = (pct >= 0 ? "↑ +" : "↓ ") + pct.toFixed(2) + "%"; pc.className = "chg-pill" + (pct < 0 ? " down" : "");
    var svg = $("svg", el), cross = $(".cross", el), dot = $(".dot", el), tip = $(".chart-tip3", el);
    function at(cx) {
      var r = svg.getBoundingClientRect(), px = (cx - r.left) / r.width * W, i = Math.round(Math.min(Math.max((px - L) / (W - L - R), 0), 1) * (data.length - 1)), d = data[i];
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = ""; dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(d.v)); dot.style.display = "";
      tip.hidden = false; tip.style.left = (x(i) / W * 100) + "%"; tip.style.top = (y(d.v) / H * 100) + "%"; tip.textContent = "$" + d.v.toFixed(4) + " · " + fmtT(d.t, range);
    }
    function leave() { cross.style.display = "none"; dot.style.display = "none"; tip.hidden = true; }
    el.onpointermove = function (e) { at(e.clientX); }; el.onpointerdown = function (e) { at(e.clientX); }; el.onpointerleave = leave;
  }
  $$("#ranges [data-r]").forEach(function (b) { b.onclick = function () { range = b.dataset.r; $$("#ranges [data-r]").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); drawChart(); }; });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(drawChart, 150); });
  G.onTheme.push(function () { if ($("#bigchart svg")) drawChart(); });

  /* ---------- My Cards ---------- */
  var card = { bal: 0, frozen: false, locked: false };
  $("#cardBal").textContent = usd(card.bal);
  $("#freezeBtn").onclick = function () { card.frozen = !card.frozen; this.setAttribute("aria-pressed", String(card.frozen)); this.setAttribute("aria-label", card.frozen ? "Unfreeze card" : "Freeze card"); $(".mycard").classList.toggle("frozen", card.frozen); G.toast(card.frozen ? "Card frozen" : "Card unfrozen"); };
  $("#lockBtn").onclick = function () { card.locked = !card.locked; this.setAttribute("aria-pressed", String(card.locked)); this.setAttribute("aria-label", card.locked ? "Unlock online payments" : "Lock online payments"); G.toast(card.locked ? "Online payments locked" : "Online payments unlocked"); };

  /* ---------- Total balance + detail + referral ---------- */
  var ginr = asset("GINR"), total = G.total();
  G.countTo($("#ginrBal"), ginr.bal, function (v) { return num(v, 2); });
  G.countTo($("#usdBal"), ginr.bal * ginr.price, function (v) { return usd(v); });
  G.countTo($("#detailBal"), total, function (v) { return usd(v); });
  setTimeout(function () { $("#balBar").style.width = Math.max(4, ginr.bal * ginr.price / total * 100).toFixed(1) + "%"; }, G.reduce ? 0 : 300);
  var top3 = G.assets.slice().sort(function (a, b) { return b.bal * b.price - a.bal * a.price; }).slice(0, 3), dots = ["var(--color-primary)", "var(--mint-400)", "var(--amber-500)"];
  $("#detailList").innerHTML = top3.map(function (a, i) { return '<li><i style="background:' + dots[i] + '"></i><span>' + label(a) + '</span><b class="money">' + usd(a.bal * a.price) + "</b></li>"; }).join("");
  $("#eyeBtn").onclick = function () {
    var on = document.body.classList.toggle("masked");
    this.setAttribute("aria-pressed", String(on)); this.setAttribute("aria-label", on ? "Show balance" : "Hide balance"); this.innerHTML = ico(on ? "i-eye-off" : "i-eye");
  };
  $("#refLink").textContent = D.user.refLink;
  $("#refCopy").onclick = function () { G.copy(D.user.refLink, "Referral link"); var b = this; b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1600); };

  /* ---------- Wallet / History ---------- */
  var tab = "wallet", netF = "all";
  $("#netSel").innerHTML += D.networks.map(function (n) { return '<option value="' + n.id + '">' + n.name + "</option>"; }).join("");
  function walletRows() {
    var list = G.assets.filter(function (a) { return netF === "all" || a.net === netF; });
    $("#avail").textContent = usd(list.reduce(function (s, a) { return s + a.bal * a.price; }, 0));
    return list.map(function (a, i) {
      return '<div class="arow' + (a.bal ? "" : " zero") + '" style="animation-delay:' + i * 40 + 'ms"><span class="coin coin-xl ' + a.coin + '">' + a.mark + '</span><span class="name"><b>' + a.name + "</b><small>" + G.net(a.net).name + '</small></span><span class="val"><small class="money">' + usd(a.bal * a.price) + '</small><b class="money">' + num(a.bal, 4) + " " + label(a) + "</b></span></div>";
    }).join("") || '<p class="empty3">No assets on this network</p>';
  }
  var TT = { receive: "Receive", send: "Send", swap: "Swap", transfer: "Transfer", upi: "UPI transfer", gift: "Gift card" };
  function historyRows() {
    var list = D.history.filter(function (h) { var a = asset(h.asset); return netF === "all" || (a && a.net === netF); });
    $("#avail").textContent = usd(G.assets.filter(function (a) { return netF === "all" || a.net === netF; }).reduce(function (s, a) { return s + a.bal * a.price; }, 0));
    return list.map(function (h, i) {
      var a = asset(h.asset) || asset("GINR"), d = new Date(h.date), sign = h.type === "receive" ? "+" : "−";
      var sub = h.type === "swap" ? h.asset + " → " + h.to + " · " + num(h.toAmount, 2) : (h.to ? "To " + h.to : "From " + h.from);
      return '<div class="arow" style="animation-delay:' + i * 40 + 'ms"><span class="coin coin-xl ' + a.coin + '">' + a.mark + '</span><span class="name"><b>' + TT[h.type] + " · " + h.asset + "</b><small>" + d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " + sub + '</small></span><span class="val"><b class="money ' + (sign === "+" ? "chg-up" : "") + '">' + sign + num(h.amount, 2) + " " + h.asset + '</b></span><a class="btn btn-sm btn-sec3 view" href="' + (EXPLORER[a.net] || "#") + '" target="_blank" rel="noopener">View</a></div>';
    }).join("") || '<p class="empty3">No activity on this network yet</p>';
  }
  function drawList() { $("#listBody").innerHTML = tab === "wallet" ? walletRows() : historyRows(); }
  var tabs = $$(".tabs-line [role=tab]");
  function setTab(t) { tab = t.dataset.tab; tabs.forEach(function (x) { var on = x === t; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; }); $("#listBody").setAttribute("aria-labelledby", t.id); drawList(); }
  tabs.forEach(function (t, i) {
    t.onclick = function () { setTab(t); };
    t.onkeydown = function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); setTab(n); } };
  });
  $("#netSel").onchange = function () { netF = this.value; drawList(); };

  /* ---------- boot ---------- */
  drawChart(); drawList(); G.reveal(document);
})();
