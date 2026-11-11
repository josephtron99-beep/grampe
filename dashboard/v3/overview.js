/* ==========================================================
   Grampe dashboard V3 — Overview page
   Asset cards (sparklines), stats, UPI-limit gauge, portfolio donut.
   Uses window.G3 from shell.js.
   ========================================================== */
(function () {
  "use strict";
  var G = window.G3, D = G.D, $ = G.$, $$ = G.$$, ico = G.ico, num = G.num, inr = G.inr, key = G.key, label = G.label, asset = G.asset;
  var S = { hidden: [], net: "all", acct: "wallet" };
  var PALETTE = ["var(--mint-400)", "var(--violet-500)", "var(--teal-400)", "var(--amber-500)", "var(--asset-ton)", "var(--red-400)"];
  var V1 = "../#/"; // live actions open in the full dashboard until V3 pages are built

  /* greeting + updated time */
  var h = new Date().getHours();
  $("#greet3").textContent = (h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening") + ", " + D.user.first;
  $("#updated3").textContent = "Updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) + " · demo data";

  /* ---------- asset cards ---------- */
  function assetCard(a) {
    var up = a.change >= 0, pts = G.series(key(a) + "v3", 32, a.price, .05, a.change * 3);
    return '<article class="acard3 rise" data-k="' + key(a) + '">' +
      '<button class="acard3-x" data-hide="' + key(a) + '" aria-label="Hide ' + label(a) + ' card">' + ico("i-x") + "</button>" +
      '<div class="acard3-body"><div class="acard3-id"><span class="coin coin-xl ' + a.coin + '">' + a.mark + '</span><span><span class="caption">' + a.name + '</span><br><b class="money">' + inr(a.bal * a.price) + "</b></span></div>" +
      '<div class="acard3-chart"><p class="acard3-meta"><span>' + label(a) + ' <b>$' + (a.price < 1 ? a.price.toFixed(4) : num(a.price, 2)) + '</b></span><span class="' + (up ? "chg-up" : "chg-down") + '">' + (up ? "▲ " : "▼ ") + Math.abs(a.change).toFixed(2) + "%</span><span>" + num(a.bal, a.dp > 2 ? 3 : 2) + "</span></p>" +
      '<div class="spark3 ' + (up ? "up" : "down") + '" data-pts="' + pts.map(function (v) { return v.toFixed(6); }).join(",") + '"></div></div></div>' +
      '<div class="acard3-actions"><a href="' + V1 + "receive?asset=" + key(a) + '">Deposit</a><a href="' + V1 + "send?asset=" + key(a) + '">Withdraw</a><a href="' + V1 + "swap?from=" + key(a) + '">Swap</a></div></article>';
  }
  function drawSpark(el) {
    var pts = el.dataset.pts.split(",").map(Number), W = 200, H = 70, lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts);
    var x = function (i) { return i / (pts.length - 1) * W; }, y = function (v) { return 4 + (1 - (v - lo) / (hi - lo || 1)) * (H - 8); };
    var d = pts.map(function (v, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1); }).join(" ");
    var gid = "g" + Math.random().toString(36).slice(2, 7), col = el.classList.contains("up") ? "#41F69A" : "#FF5A6E";
    el.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs><path class="ar" fill="url(#' + gid + ')" d="' + d + " L" + W + " " + H + " L0 " + H + ' Z"/><path class="ln" d="' + d + '"/><line class="hair" y1="0" y2="' + H + '" style="display:none"/><circle class="pt" r="4" style="display:none"/></svg><span class="tip3" hidden></span>';
    var svg = $("svg", el), hair = $(".hair", el), pt = $(".pt", el), tip = $(".tip3", el);
    el.onpointermove = function (e) {
      var r = svg.getBoundingClientRect(), i = Math.round(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1) * (pts.length - 1));
      hair.setAttribute("x1", x(i)); hair.setAttribute("x2", x(i)); hair.style.display = ""; pt.setAttribute("cx", x(i)); pt.setAttribute("cy", y(pts[i])); pt.style.display = "";
      tip.hidden = false; tip.style.left = (x(i) / W * 100) + "%"; tip.textContent = "$" + (pts[i] < 1 ? pts[i].toFixed(4) : num(pts[i], 2)) + " · " + (pts.length - 1 - i) + "h ago";
    };
    el.onpointerleave = function () { hair.style.display = "none"; pt.style.display = "none"; tip.hidden = true; };
  }
  function renderAssets() {
    var row = $("#assetRow");
    if (S.acct === "card") {
      var g = asset("GINR");
      row.innerHTML = '<article class="acard3 rise"><div class="acard3-body"><div class="acard3-id"><span class="coin coin-xl coin-shop">▭</span><span><span class="caption">RuPay virtual card · soon</span><br><b>₹0.00</b></span></div><div class="acard3-chart"><p class="acard3-meta"><span>Card <b>•••• 4821</b></span><span>Limit ₹25,000/day</span></p><div class="spark3 up" data-pts="' + G.series("card", 24, 1, .02, 0).join(",") + '"></div></div></div><div class="acard3-actions"><a href="' + V1 + 'cards">Top up</a><a href="' + V1 + 'cards">Freeze</a><a href="' + V1 + 'cards">Details</a></div></article>' +
        '<article class="acard3 rise"><div class="acard3-body"><div class="acard3-id"><span class="coin coin-xl coin-ginr">₹</span><span><span class="caption">Funding source</span><br><b class="money">₹' + num(g.bal, 2) + '</b></span></div><div class="acard3-chart"><p class="acard3-meta"><span>GINR <b>available</b></span></p><div class="spark3 up" data-pts="' + G.series("fund", 24, g.bal, .03, 2).join(",") + '"></div></div></div><div class="acard3-actions"><a href="' + V1 + 'receive?asset=GINR">Add</a><a href="' + V1 + 'upi">UPI</a><a href="' + V1 + 'swap">Swap</a></div></article>';
    } else {
      var list = G.assets.filter(function (a) { return S.hidden.indexOf(key(a)) < 0 && (S.net === "all" || a.net === S.net); }).sort(function (a, b) { return b.bal * b.price - a.bal * a.price; }).slice(0, 3);
      row.innerHTML = list.map(assetCard).join("") + (list.length < 3 ? '<button class="add-card rise" id="addCard">' + ico("i-plus") + (S.hidden.length ? "Show hidden cards" : "No more assets on this network") + "</button>" : "");
      var ac = $("#addCard"); if (ac) ac.onclick = function () { if (S.hidden.length) S.hidden = []; else { S.net = "all"; $("#netLabel").textContent = "All networks"; } renderAssets(); };
    }
    $$(".spark3", row).forEach(drawSpark);
    G.reveal(row);
  }

  /* ---------- stats ---------- */
  function renderStats() {
    var now = Date.now(), win = 60 * 864e5, spent = 0, recv = 0;
    D.history.forEach(function (h) {
      if (now - new Date(h.date).getTime() > win) return;
      var a = asset(h.asset) || asset("GINR"), v = h.amount * a.price;
      if (h.type === "receive") recv += v; else if (h.type !== "swap") spent += v;
    });
    var f = function (v) { return "₹" + num(v, 2); };
    G.countTo($("#sTotal"), G.total() * D.usdInr, f); G.countTo($("#sSpent"), spent * D.usdInr, f); G.countTo($("#sRecv"), recv * D.usdInr, f);
    var t = G.total(), day = G.assets.reduce(function (s, a) { return s + a.bal * a.price * a.change / 100; }, 0) / (t || 1) * 100;
    $("#sTotalChg").className = day >= 0 ? "chg-up" : "chg-down"; $("#sTotalChg").textContent = (day >= 0 ? "+" : "") + day.toFixed(2) + "% today";
  }

  /* ---------- UPI limit gauge ---------- */
  function renderGauge() {
    var limit = 100000, used = D.history.filter(function (h) { return h.type === "upi"; }).reduce(function (s, h) { return s + h.amount; }, 0) + 38800;
    var pct = Math.min(used / limit, 1), L = Math.PI * 120, ticks = "", lbls = "";
    [0, .2, .4, .6, .8, 1].forEach(function (p) {
      var ang = Math.PI * (1 - p), c = Math.cos(ang), s = Math.sin(ang);
      ticks += '<line class="tick" x1="' + (150 + c * 130).toFixed(1) + '" y1="' + (150 - s * 130).toFixed(1) + '" x2="' + (150 + c * 138).toFixed(1) + '" y2="' + (150 - s * 138).toFixed(1) + '"/>';
      lbls += '<text x="' + (150 + c * 156).toFixed(1) + '" y="' + (153 - s * 156).toFixed(1) + '" text-anchor="middle">' + Math.round(p * 100) + "%</text>";
    });
    $("#gauge").innerHTML = '<svg viewBox="0 -14 300 178" role="img" aria-label="UPI limit used ' + Math.round(pct * 100) + '%"><defs><linearGradient id="gGrad" x1="0" x2="1"><stop offset="0" stop-color="#2DE1C2"/><stop offset=".6" stop-color="#7C4DFF"/><stop offset="1" stop-color="#FF5A6E"/></linearGradient></defs>' +
      '<path class="track" d="M30 150 A120 120 0 0 1 270 150"/><path class="val" id="gVal" d="M30 150 A120 120 0 0 1 270 150" stroke-dasharray="' + L.toFixed(1) + '" stroke-dashoffset="' + L.toFixed(1) + '"/>' + ticks + lbls +
      '<g class="needle" id="gNeedle" style="transform:rotate(-90deg)"><line x1="150" y1="150" x2="150" y2="62" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="150" r="7" fill="#fff"/></g></svg>' +
      '<div class="gauge-num"><b>' + Math.round(pct * 100) + '%</b><span class="caption">₹' + num(used, 0) + " of ₹" + num(limit, 0) + "</span></div>";
    $("#gaugeText").textContent = "Resets on the 1st";
    setTimeout(function () { $("#gVal").style.strokeDashoffset = String(L * (1 - pct)); $("#gNeedle").style.transform = "rotate(" + (-90 + pct * 180) + "deg)"; }, G.reduce ? 0 : 300);
  }

  /* ---------- portfolio donut ---------- */
  function renderDonut() {
    var t = G.total(), list = G.assets.filter(function (a) { return a.bal * a.price > 0; }).map(function (a) { return { n: label(a), v: a.bal * a.price }; }).sort(function (a, b) { return b.v - a.v; });
    var top = list.slice(0, 5), rest = list.slice(5).reduce(function (s, x) { return s + x.v; }, 0); if (rest) top.push({ n: "Others", v: rest });
    var R = 52, C = 2 * Math.PI * R, off = 0, whole = function (v) { return inr(v).replace(/\.\d+$/, ""); };
    var segs = top.map(function (x, i) {
      var sh = x.v / t, len = Math.max(sh * C - 6, 1), s = '<circle class="seg" data-i="' + i + '" cx="70" cy="70" r="' + R + '" stroke="' + PALETTE[i] + '" style="color:' + PALETTE[i] + ";--len:" + len.toFixed(2) + ";stroke-dashoffset:" + (-off).toFixed(2) + ";animation-delay:" + i * 110 + 'ms"/>';
      off += sh * C; x.sh = sh; return s;
    }).join("");
    $("#donut3").innerHTML = '<svg viewBox="0 0 140 140" role="img" aria-label="Portfolio allocation">' + segs + '</svg><div class="donut3-c"><b class="money" id="dVal">' + whole(t) + '</b><span class="caption" id="dLab">Portfolio</span></div>';
    $("#legend3").innerHTML = top.map(function (x, i) { return '<li data-i="' + i + '"><i style="background:' + PALETTE[i] + '"></i><span>' + x.n + "</span><b>" + (x.sh * 100).toFixed(1) + "%</b></li>"; }).join("");
    function hl(i) {
      $("#donut3").classList.toggle("hovering", i != null);
      $$("#donut3 .seg").forEach(function (c) { c.classList.toggle("hl", +c.dataset.i === i); });
      $$("#legend3 li").forEach(function (l) { l.classList.toggle("hl", +l.dataset.i === i); });
      $("#dVal").textContent = i == null ? whole(t) : whole(top[i].v);
      $("#dLab").textContent = i == null ? "Portfolio" : top[i].n + " · " + (top[i].sh * 100).toFixed(1) + "%";
    }
    $$("#donut3 .seg, #legend3 li").forEach(function (el) { el.onmouseenter = function () { hl(+el.dataset.i); }; el.onmouseleave = function () { hl(null); }; el.onclick = function () { hl(+el.dataset.i); }; });
  }

  /* ---------- controls ---------- */
  $$("[data-acct]").forEach(function (b) { b.onclick = function () { S.acct = b.dataset.acct; $$("[data-acct]").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); }); renderAssets(); }; });
  $("#addToken").onclick = function () { G.toast("Custom tokens: coming soon"); };
  $("#netBtn").onclick = function (e) {
    e.stopPropagation();
    var old = $(".netpop"); if (old) { old.remove(); return; }
    var p = document.createElement("div"); p.className = "filter3 netpop"; p.setAttribute("role", "listbox");
    p.innerHTML = [{ id: "all", name: "All networks" }].concat(D.networks).map(function (n) { return '<button class="asset-chip netopt' + (S.net === n.id ? " on" : "") + '" role="option" aria-selected="' + (S.net === n.id) + '" data-net="' + n.id + '">' + n.name + "</button>"; }).join("");
    var wrap = $(".head-actions"); wrap.style.position = "relative"; wrap.appendChild(p);
    p.onclick = function (ev) { var b = ev.target.closest("[data-net]"); if (!b) return; S.net = b.dataset.net; $("#netLabel").textContent = b.textContent; p.remove(); renderAssets(); };
  };
  document.addEventListener("click", function (e) { var p = $(".netpop"); if (p && !e.target.closest(".head-actions")) p.remove(); });
  $("#assetRow").addEventListener("click", function (e) {
    var hb = e.target.closest("[data-hide]"); if (!hb) return;
    var k = hb.dataset.hide; hb.closest(".acard3").classList.add("removing");
    setTimeout(function () { S.hidden.push(k); renderAssets(); }, G.reduce ? 0 : 280);
    G.toast(k + " card hidden", { label: "Undo", run: function () { S.hidden = S.hidden.filter(function (x) { return x !== k; }); renderAssets(); } });
  });

  /* ---------- boot ---------- */
  $$(".stat3, .viz3").forEach(function (el) { el.classList.add("rise"); });
  renderAssets(); renderStats(); renderGauge(); renderDonut(); G.reveal(document);
})();
