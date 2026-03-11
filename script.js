const watchlistGrid = document.getElementById("watchlist-grid");
const riskGrid = document.getElementById("risk-grid");
const positionsBody = document.getElementById("positions-body");
const executionsBody = document.getElementById("executions-body");
const newsFeed = document.getElementById("news-feed");
const forexFeed = document.getElementById("forex-feed");
const lastUpdated = document.getElementById("last-updated");

const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "AAPL", "TSLA", "SPY", "^GSPC", "^IXIC"];
const state = { quotes: {}, positions: {}, executions: [] };
const fallbackQuotes = {
  BTCUSDT: [64000, 0.8], ETHUSDT: [3200, 0.6], BNBUSDT: [580, -0.4],
  AAPL: [210, 0.2], TSLA: [185, -0.3], SPY: [520, 0.1], "^GSPC": [5200, 0.1], "^IXIC": [16600, 0.15]
};

function initTradingViewWidget() {
  const container = document.getElementById("tv-market-widget");
  if (!container) return;
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    colorTheme: "dark", dateRange: "1D", showChart: true, locale: "en", width: "100%", height: 360, isTransparent: true,
    tabs: [
      { title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD" }, { s: "FOREXCOM:NSXUSD" }, { s: "TVC:DAX" }] },
      { title: "Forex", symbols: [{ s: "FX:EURUSD" }, { s: "FX:GBPUSD" }, { s: "FX:USDJPY" }] },
      { title: "Commodities", symbols: [{ s: "TVC:GOLD" }, { s: "NYMEX:CL1!" }] },
      { title: "Crypto", symbols: [{ s: "BINANCE:BTCUSDT" }, { s: "BINANCE:ETHUSDT" }] }
    ]
  });
  container.appendChild(script);
}

function setStamp(msg = "") {
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}${msg ? ` • ${msg}` : ""}`;
}

function upsertQuote(symbol, price, movePct = 0) {
  if (!Number.isFinite(price)) return;
  state.quotes[symbol] = { price, movePct };
  renderWatchlist(); renderPositions(); renderRisk(); setStamp();
}

function seedFallbackQuotes() {
  Object.entries(fallbackQuotes).forEach(([s, [p, m]]) => upsertQuote(s, p, m));
}

function renderWatchlist() {
  watchlistGrid.innerHTML = "";
  symbols.forEach((sym) => {
    const q = state.quotes[sym] || { price: 0, movePct: 0 };
    const dir = q.movePct >= 0 ? "up" : "down";
    const sign = q.movePct >= 0 ? "+" : "";
    const div = document.createElement("article");
    div.className = "watch-item";
    div.innerHTML = `<div class="sym">${sym}</div><div class="px">${q.price ? q.price.toFixed(2) : "--"}</div><div class="${dir}">${sign}${q.movePct.toFixed(2)}%</div>`;
    watchlistGrid.appendChild(div);
  });
}

function renderRisk() {
  const exposure = Object.values(state.positions).reduce((a, p) => a + Math.abs(p.qty * (state.quotes[p.symbol]?.price || p.avg)), 0);
  const pnl = Object.values(state.positions).reduce((a, p) => a + ((state.quotes[p.symbol]?.price || p.avg) - p.avg) * p.qty, 0);
  const var95 = exposure * 0.02;
  riskGrid.innerHTML = "";
  [["Gross Exposure", `$${exposure.toFixed(2)}`],["Unrealized P&L", `${pnl>=0?"+":""}$${pnl.toFixed(2)}`],["Simulated VaR(95)", `$${var95.toFixed(2)}`],["Open Positions", `${Object.keys(state.positions).length}`]].forEach(([k,v])=>{
    const d=document.createElement('div'); d.className='risk-item'; d.innerHTML=`<div class="sym">${k}</div><div class="px">${v}</div>`; riskGrid.appendChild(d);
  });
}

function renderPositions() {
  positionsBody.innerHTML = "";
  const positions = Object.values(state.positions);
  if (!positions.length) return positionsBody.innerHTML = `<tr><td colspan="5">No open positions.</td></tr>`;
  positions.forEach((p) => {
    const last = state.quotes[p.symbol]?.price || p.avg;
    const pnl = (last - p.avg) * p.qty;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.symbol}</td><td>${p.qty.toFixed(4)}</td><td>${p.avg.toFixed(2)}</td><td>${last.toFixed(2)}</td><td class="${pnl>=0?"up":"down"}">${pnl>=0?"+":""}${pnl.toFixed(2)}</td>`;
    positionsBody.appendChild(tr);
  });
}

function renderExecutions() {
  executionsBody.innerHTML = "";
  if (!state.executions.length) return executionsBody.innerHTML = `<tr><td colspan="7">No executions yet.</td></tr>`;
  state.executions.slice().reverse().forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${e.time}</td><td>${e.symbol}</td><td>${e.side}</td><td>${e.type}</td><td>${e.qty}</td><td>${e.price.toFixed(2)}</td><td>${e.status}</td>`;
    executionsBody.appendChild(tr);
  });
}

function applyFill(symbol, side, qty, fillPx) {
  const signed = qty * (side === "BUY" ? 1 : -1);
  const p = state.positions[symbol];
  if (!p) return (state.positions[symbol] = { symbol, qty: signed, avg: fillPx });
  const newQty = p.qty + signed;
  if (Math.abs(newQty) < 1e-9) return delete state.positions[symbol];
  if (Math.sign(p.qty) === Math.sign(newQty)) p.avg = ((p.avg * p.qty) + (fillPx * signed)) / newQty;
  p.qty = newQty;
}

document.getElementById("order-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const symbol = document.getElementById("order-symbol").value;
  const side = document.getElementById("order-side").value;
  const type = document.getElementById("order-type").value;
  const qty = Number(document.getElementById("order-qty").value);
  const limit = Number(document.getElementById("order-price").value);
  const mkt = state.quotes[symbol]?.price;
  const fillPx = type === "MARKET" ? mkt : limit;
  if (!Number.isFinite(fillPx)) return;
  applyFill(symbol, side, qty, fillPx);
  state.executions.push({ time: new Date().toLocaleTimeString(), symbol, side, type, qty: qty.toFixed(4), price: fillPx, status: "FILLED" });
  renderPositions(); renderExecutions(); renderRisk();
});

async function loadEquities() {
  try {
    const [fmpRes, yRes] = await Promise.all([
      fetch("https://financialmodelingprep.com/api/v3/quote/AAPL,TSLA,SPY?apikey=demo"),
      fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EGSPC,%5EIXIC")
    ]);
    const fmpData = await fmpRes.json();
    const yData = await yRes.json();
    fmpData.forEach((q) => upsertQuote(q.symbol, Number(q.price), Number(q.changesPercentage || 0)));
    (yData?.quoteResponse?.result || []).forEach((q) => upsertQuote(q.symbol, Number(q.regularMarketPrice), Number(q.regularMarketChangePercent || 0)));
  } catch { setStamp("degraded data mode"); }
}

function startFallbackTicker() {
  setInterval(() => {
    Object.entries(state.quotes).forEach(([s, q]) => {
      const drift = (Math.random() - 0.5) * 0.006;
      const price = q.price * (1 + drift);
      const move = q.movePct + drift * 100;
      upsertQuote(s, price, move);
    });
  }, 2200);
}

function startCryptoStream() {
  try {
    const socket = new WebSocket("wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker");
    let opened = false;
    socket.onopen = () => { opened = true; };
    socket.onmessage = (event) => {
      const d = JSON.parse(event.data)?.data; if (!d?.s) return;
      upsertQuote(d.s, Number(d.c), Number(d.P));
    };
    socket.onclose = () => {
      if (!opened) startFallbackTicker();
      setTimeout(startCryptoStream, 4000);
    };
    socket.onerror = () => { if (!opened) startFallbackTicker(); };
  } catch { startFallbackTicker(); }
}

async function loadNews() {
  try {
    const macroUrl = encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,TSLA,AAPL&region=US&lang=en-US");
    const res = await fetch(`https://api.allorigins.win/raw?url=${macroUrl}`);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = [...doc.querySelectorAll("item")].slice(0, 8);
    newsFeed.innerHTML = "";
    items.forEach((it) => {
      const t = it.querySelector("title")?.textContent || "Headline";
      const l = it.querySelector("link")?.textContent || "#";
      const d = it.querySelector("pubDate")?.textContent || "";
      const li = document.createElement("li");
      li.innerHTML = `<a href="${l}" target="_blank" rel="noreferrer">${t}</a><p>${new Date(d).toLocaleString()}</p>`;
      newsFeed.appendChild(li);
    });
    if (!items.length) throw new Error();
  } catch {
    newsFeed.innerHTML = "<li><a href='#'>Fallback: US CPI expected to remain sticky</a><p>Data provider unavailable</p></li><li><a href='#'>Fallback: Treasury yields mixed into close</a><p>Data provider unavailable</p></li>";
  }
}

async function loadForexFactoryFeed() {
  try {
    const ff = encodeURIComponent("https://nfs.faireconomy.media/ff_calendar_thisweek.xml");
    const res = await fetch(`https://api.allorigins.win/raw?url=${ff}`);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const events = [...doc.querySelectorAll("event")].slice(0, 12);
    forexFeed.innerHTML = "";
    events.forEach((e) => {
      const title = e.querySelector("title")?.textContent || "Event";
      const country = e.querySelector("country")?.textContent || "N/A";
      const impact = (e.querySelector("impact")?.textContent || "Low").replace(/\s+/g, " ").trim();
      const date = e.querySelector("date")?.textContent || "";
      const time = e.querySelector("time")?.textContent || "";
      const cls = impact.toLowerCase().includes("high") ? "high" : impact.toLowerCase().includes("medium") ? "medium" : "low";
      const li = document.createElement("li");
      li.innerHTML = `<a href="https://www.forexfactory.com/calendar" target="_blank" rel="noreferrer">${title}</a><p><span class="badge ${cls}">${impact}</span>${country} • ${date} ${time}</p>`;
      forexFeed.appendChild(li);
    });
    if (!events.length) throw new Error();
  } catch {
    forexFeed.innerHTML = "<li><a href='https://www.forexfactory.com/calendar' target='_blank' rel='noreferrer'>Fallback: USD High Impact Event</a><p><span class='badge high'>High</span>US • This Week</p></li>";
  }
}

seedFallbackQuotes();
renderWatchlist(); renderRisk(); renderPositions(); renderExecutions();
initTradingViewWidget(); loadEquities(); loadNews(); loadForexFactoryFeed(); startCryptoStream();
setInterval(loadEquities, 25000);
setInterval(loadNews, 65000);
setInterval(loadForexFactoryFeed, 300000);
