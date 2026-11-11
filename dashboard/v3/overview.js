/* ==========================================================
   Grampe dashboard V3 — Dashboard (overview), "Aurora editorial"
   Content = live grampe.co dashboard, new composition:
   hero (balance + action dock + 3D card) · price chart ·
   balance detail (stacked bar) · referral ticket · wallet tiles /
   history timeline with network chips. Uses window.G3 (shell.js).
   ========================================================== */
(function () {
  "use strict";
  var G = window.G3, D = G.D, $ = G.$, $$ = G.$$, ico = G.ico, num = G.num, usd = G.usd, key = G.key, label = G.label, asset = G.asset;
  var EXPLORER = { gram: "https://gccscan.com", eth: "https://etherscan.io", bsc: "https://bscscan.com", ton: "https://tonviewer.com", shop: "https://tonviewer.com", tron: "https://tronscan.org", xlm: "https://stellar.expert" };
  var COLORS = { GINR: "var(--mint-400)", GCC: "var(--violet-500)", TON: "var(--asset-ton)", "USDT.BEP20": "var(--asset-usdt)", "USDT.ERC20": "var(--teal-400)", BNB: "var(--asset-bnb)", ETH: "var(--asset-eth)", SHOP: "var(--color-danger)", XLM: "var(--gray-600)" };

  /* ---------- hero text ---------- */
  var hr = new Date().getHours();
  $("#greet3").textContent = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  $("#firstName").textContent = D.user.first;
  $("#meInit").textContent = D.user.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2);
  $("#cardName").textContent = D.user.name.toUpperCase();
  var stamp = function (d) { return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); };
  $("#updated3").textContent = stamp(new Date());
  $("#cardUpd").textContent = "Updated " + stamp(new Date(Date.now() - 3 * 36e5));

  /* ---------- balances ---------- */
  var ginr = asset("GINR"), total = G.total();
  $("#assetCount").textContent = G.assets.filter(function (a) { return a.bal > 0; }).length;
  G.countTo($("#ginrBal"), ginr.bal, function (v) { return num(v, 2); }, 1300);
  G.countTo($("#usdBal"), ginr.bal * ginr.price, function (v) { return usd(v); }, 1300);
  G.countTo($("#detailBal"), total, function (v) { return usd(v); }, 1300);
  $("#eyeBtn").onclick = function () {
    var on = document.body.classList.toggle("masked");
    this.setAttribute("aria-pressed", String(on)); this.setAttribute("aria-label", on ? "Show balance" : "Hide balance"); this.innerHTML = ico(on ? "i-eye-off" : "i-eye");
  };

  /* ---------- 3D card: tilt + shine, freeze / lock ---------- */
  var vc = $("#vc3"), stage = $("#stage3"), cardS = { frozen: false, locked: false };
  $("#cardBal").textContent = usd(0);
  if (!G.reduce && window.matchMedia("(hover: hover)").matches) {
    stage.addEventListener("pointermove", function (e) {
      var r = vc.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      vc.style.transform = "rotateX(" + ((.5 - y) * 16) + "deg) rotateY(" + ((x - .5) * 22) + "deg)";
      vc.style.setProperty("--sx", x * 100 + "%"); vc.style.setProperty("--sy", y * 100 + "%");
    });
    stage.addEventListener("pointerleave", function () { vc.style.transform = ""; });
  }
  $("#freezeBtn").onclick = function () { cardS.frozen = !cardS.frozen; this.setAttribute("aria-pressed", String(cardS.frozen)); vc.classList.toggle("frozen", cardS.frozen); G.toast(cardS.frozen ? "Card frozen" : "Card unfrozen"); };
  $("#lockBtn").onclick = function () { cardS.locked = !cardS.locked; this.setAttribute("aria-pressed", String(cardS.locked)); G.toast(cardS.locked ? "Online payments locked" : "Online payments unlocked"); };

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
    var el = $("#bigchart"), data = series(range), W = el.clientWidth || 700, H = el.clientHeight || 270, L = 8, R = 56, T = 14, B = 26;
    var vs = data.map(function (d) { return d.v; }), lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs), pad = (hi - lo) * .14 || .01; lo -= pad; hi += pad;
    var x = function (i) { return L + i / (data.length - 1) * (W - L - R); }, y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var grid = "", ylab = "", xlab = "";
    for (var g = 0; g <= 3; g++) { var v = lo + (hi - lo) * g / 3, yy = y(v); grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>'; ylab += '<text class="ylab" x="' + (W - R + 10) + '" y="' + (yy + 4).toFixed(1) + '">$' + v.toFixed(3) + "</text>"; }
    var ticks = W < 480 ? 3 : 5;
    for (var k = 0; k <= ticks; k++) { var i = Math.round(k / ticks * (data.length - 1)); xlab += '<text class="xlab" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (k === 0 ? "start" : k === ticks ? "end" : "middle") + '">' + fmtT(data[i].t, range) + "</text>"; }
    var line = data.map(function (d, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.v).toFixed(1); }).join(" ");
    var dark = document.documentElement.getAttribute("data-theme") === "carbon", col = dark ? "#2DE1C2" : "#0500FF", n1 = data.length - 1;
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="GCC to USD price, ' + range + '"><defs><linearGradient id="cFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity="' + (dark ? .22 : .12) + '"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="grid">' + grid + "</g>" + ylab + xlab +
      '<path class="area" fill="url(#cFill)" d="' + line + " L" + x(n1).toFixed(1) + " " + (H - B) + " L" + L + " " + (H - B) + ' Z"/><path class="line" d="' + line + '"/>' +
      '<circle class="last-ring" cx="' + x(n1).toFixed(1) + '" cy="' + y(data[n1].v).toFixed(1) + '" r="5"/><circle class="last" cx="' + x(n1).toFixed(1) + '" cy="' + y(data[n1].v).toFixed(1) + '" r="5"/>' +
      '<line class="cross" y1="' + T + '" y2="' + (H - B) + '" style="display:none"/><circle class="dot" r="5" style="display:none"/></svg><span class="chart-tip3" hidden></span>';
    var first = data[0].v, last = data[n1].v, pct = (last - first) / first * 100;
    $("#pPrice").textContent = "$" + last.toFixed(4); $("#pPrice2").textContent = "$" + last.toFixed(4);
    var pc = $("#pChg"); pc.textContent = (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%"; pc.className = "chg3" + (pct < 0 ? " down" : "");
    var svg = $("svg", el), cross = $(".cross", el), dot = $(".dot", el), tip = $(".chart-tip3", el);
    function at(cx) {
      var r = svg.getBoundingClientRect(), px = (cx - r.left) / r.width * W, i = Math.round(Math.min(Math.max((px - L) / (W - L - R), 0), 1) * n1), d = data[i];
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = ""; dot.setAttribute("cx", x(i)); dot.setAttribute("cy", y(d.v)); dot.style.display = "";
      tip.hidden = false; tip.style.left = (x(i) / W * 100) + "%"; tip.style.top = (y(d.v) / H * 100) + "%"; tip.textContent = "$" + d.v.toFixed(4) + " · " + fmtT(d.t, range);
      $("#pPrice").textContent = "$" + d.v.toFixed(4);
    }
    function leave() { cross.style.display = "none"; dot.style.display = "none"; tip.hidden = true; $("#pPrice").textContent = "$" + last.toFixed(4); }
    el.onpointermove = function (e) { at(e.clientX); }; el.onpointerdown = function (e) { at(e.clientX); }; el.onpointerleave = leave;
  }
  var rangeBtns = $$("#ranges [data-r]");
  function placeRange() { var b = $('#ranges [aria-checked="true"]'), n = $("#ranges").getBoundingClientRect(), r = b.getBoundingClientRect(); $("#rgInd").style.width = r.width + "px"; $("#rgInd").style.transform = "translateX(" + (r.left - n.left) + "px)"; }
  rangeBtns.forEach(function (b) { b.onclick = function () { range = b.dataset.r; rangeBtns.forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); placeRange(); drawChart(); }; });
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { drawChart(); placeRange(); }, 150); });
  G.onTheme.push(function () { if ($("#bigchart svg")) drawChart(); });

  /* ---------- balance detail: stacked bar ---------- */
  var parts = G.assets.filter(function (a) { return a.bal * a.price > 0; }).map(function (a) { return { n: label(a), v: a.bal * a.price, c: COLORS[label(a)] || "var(--gray-600)" }; }).sort(function (a, b) { return b.v - a.v; });
  var top = parts.slice(0, 4), rest = parts.slice(4).reduce(function (s, p) { return s + p.v; }, 0); if (rest) top.push({ n: "Others", v: rest, c: "var(--gray-600)" });
  $("#stackBar").innerHTML = top.map(function (p) { return '<i style="background:' + p.c + '" data-w="' + (p.v / total * 100).toFixed(2) + '"></i>'; }).join("");
  setTimeout(function () { $$("#stackBar i").forEach(function (i) { i.style.width = i.dataset.w + "%"; }); }, G.reduce ? 0 : 350);
  $("#detailList").innerHTML = top.map(function (p) { return '<li><i style="background:' + p.c + '"></i><span>' + p.n + '</span><b class="money">' + usd(p.v) + "</b></li>"; }).join("");

  /* ---------- referral ticket ---------- */
  $("#refId").textContent = "#" + D.user.id;
  $("#refLink").textContent = D.user.refLink;
  $("#refCopy").onclick = function () { G.copy(D.user.refLink, "Referral link"); var s = $("span", this); s.textContent = "Copied"; setTimeout(function () { s.textContent = "Copy"; }, 1600); };

  /* ---------- wallet tiles / history timeline ---------- */
  var tab = "wallet", netF = "all";
  var nets = [{ id: "all", name: "All networks" }].concat(D.networks.filter(function (n) { return G.assets.some(function (a) { return a.net === n.id; }); }));
  $("#netChips").innerHTML = nets.map(function (n, i) { return '<button class="net3' + (i ? "" : " on") + '" data-net="' + n.id + '" aria-pressed="' + !i + '">' + n.name + "</button>"; }).join("");
  $("#netChips").onclick = function (e) { var b = e.target.closest("[data-net]"); if (!b) return; netF = b.dataset.net; $$(".net3").forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); draw(); };
  function inNet(a) { return netF === "all" || (a && a.net === netF); }
  function tiles() {
    var list = G.assets.filter(inNet).sort(function (a, b) { return b.bal * b.price - a.bal * a.price; }), sum = list.reduce(function (s, a) { return s + a.bal * a.price; }, 0);
    return list.length ? '<div class="tiles3">' + list.map(function (a, i) {
      var v = a.bal * a.price, share = sum ? v / sum * 100 : 0;
      return '<article class="tile3' + (a.bal ? "" : " zero") + '" style="animation-delay:' + i * 45 + 'ms"><div class="tile3-top"><span class="coin coin-xl ' + a.coin + '">' + a.mark + "</span><span><b>" + a.name + "</b><small>" + G.net(a.net).name + '</small></span></div><p class="tile3-amt money">' + num(a.bal, 4) + " <small>" + label(a) + '</small></p><div class="share3"><i style="width:' + share.toFixed(1) + '%"></i></div><p class="tile3-foot"><span class="money">' + usd(v) + "</span><span>" + share.toFixed(1) + "%</span></p></article>";
    }).join("") + "</div>" : '<p class="empty3">No assets on this network</p>';
  }
  var TT = { receive: "Received", send: "Sent", swap: "Swapped", transfer: "Transferred", upi: "UPI transfer", gift: "Gift card" };
  function timeline() {
    var list = D.history.filter(function (h) { return inNet(asset(h.asset)); });
    return list.length ? '<div class="tl3">' + list.map(function (h, i) {
      var a = asset(h.asset) || ginr, d = new Date(h.date), incoming = h.type === "receive";
      var sub = h.type === "swap" ? h.asset + " → " + h.to + " · " + num(h.toAmount, 2) : (h.to ? "To " + h.to : "From " + h.from);
      return '<div class="ev3' + (incoming ? " in3" : "") + '" style="animation-delay:' + i * 45 + 'ms"><span class="coin coin-lg ' + a.coin + '">' + a.mark + '</span><span class="ev3-main"><b>' + TT[h.type] + " " + h.asset + "</b><small>" + d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · " + sub + '</small></span><span class="ev3-amt money ' + (incoming ? "up3" : "") + '">' + (incoming ? "+" : "−") + num(h.amount, 2) + '</span><a class="view3" href="' + (EXPLORER[a.net] || "#") + '" target="_blank" rel="noopener">View</a></div>';
    }).join("") + "</div>" : '<p class="empty3">No activity on this network yet</p>';
  }
  function draw() {
    $("#avail").textContent = usd(G.assets.filter(inNet).reduce(function (s, a) { return s + a.bal * a.price; }, 0));
    $("#listBody").innerHTML = tab === "wallet" ? tiles() : timeline();
  }
  var tabs = $$(".switch3 [role=tab]");
  function setTab(t) { tab = t.dataset.tab; tabs.forEach(function (x) { var on = x === t; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; }); $(".switch3").classList.toggle("hist", tab === "history"); $("#listBody").setAttribute("aria-labelledby", t.id); draw(); }
  tabs.forEach(function (t, i) {
    t.onclick = function () { setTab(t); };
    t.onkeydown = function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); var n = tabs[(i + 1) % 2]; n.focus(); setTab(n); } };
  });

  /* ---------- boot ---------- */
  drawChart(); placeRange(); draw(); G.reveal(document);
  window.addEventListener("load", placeRange);
})();
