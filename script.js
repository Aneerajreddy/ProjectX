const tickerGrid = document.getElementById("ticker-grid");
const predictionList = document.getElementById("prediction-list");
const newsFeed = document.getElementById("news-feed");
const forexFeed = document.getElementById("forex-feed");
const chatLog = document.getElementById("chat-log");
const lastUpdated = document.getElementById("last-updated");
const goldCard = document.getElementById("gold-card");
const impactDetail = document.getElementById("impact-detail");
const impactButtons = [...document.querySelectorAll(".impact-point")];

const symbols = {
  BTCUSDT: { label: "BTC" },
  ETHUSDT: { label: "ETH" },
  BNBUSDT: { label: "BNB" },
  AAPL: { label: "AAPL" },
  MSFT: { label: "MSFT" },
  TSLA: { label: "TSLA" },
  SPY: { label: "SPY" },
  "^GSPC": { label: "S&P500" },
  "^IXIC": { label: "NASDAQ" }
};

const regionModels = {
  northAmerica: { label: "North America", refs: ["AAPL", "MSFT", "TSLA", "SPY", "^GSPC", "^IXIC"], goldWeight: -0.2 },
  southAmerica: { label: "South America", refs: ["BTCUSDT", "SPY"], goldWeight: 0.35 },
  europe: { label: "Europe", refs: ["SPY", "^GSPC", "BTCUSDT"], goldWeight: 0.4 },
  middleEast: { label: "Middle East", refs: ["SPY", "BTCUSDT"], goldWeight: 0.55 },
  asia: { label: "Asia", refs: ["BTCUSDT", "ETHUSDT", "^IXIC"], goldWeight: 0.15 },
  africa: { label: "Africa", refs: ["SPY", "BTCUSDT"], goldWeight: 0.6 },
  oceania: { label: "Oceania", refs: ["BTCUSDT", "SPY", "^IXIC"], goldWeight: 0.25 }
};

const marketState = {};
const history = {};
const goldState = { price: null, movePct: 0, source: "loading" };
let goldHeadlines = [];
let forexEvents = [];

function initTradingViewWidget() {
  const container = document.getElementById("tv-market-widget");
  if (!container) return;

  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    colorTheme: "dark",
    dateRange: "1D",
    showChart: true,
    locale: "en",
    width: "100%",
    height: 430,
    largeChartUrl: "",
    isTransparent: true,
    showSymbolLogo: true,
    tabs: [
      {
        title: "Indices",
        symbols: [{ s: "FOREXCOM:SPXUSD" }, { s: "FOREXCOM:NSXUSD" }, { s: "TVC:UKX" }, { s: "TVC:DAX" }]
      },
      {
        title: "Forex",
        symbols: [{ s: "FX:EURUSD" }, { s: "FX:GBPUSD" }, { s: "FX:USDJPY" }, { s: "FX:AUDUSD" }]
      },
      {
        title: "Commodities",
        symbols: [{ s: "TVC:GOLD" }, { s: "TVC:SILVER" }, { s: "NYMEX:CL1!" }]
      },
      {
        title: "Crypto",
        symbols: [{ s: "BINANCE:BTCUSDT" }, { s: "BINANCE:ETHUSDT" }, { s: "BINANCE:BNBUSDT" }]
      }
    ]
  });
  container.appendChild(script);
}

function setUpdatedStamp() {
  lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
}

function upsertQuote(symbol, price, movePct = 0) {
  if (!Number.isFinite(price)) return;
  marketState[symbol] = { price, movePct };
  history[symbol] = history[symbol] || [];
  history[symbol].push(price);
  if (history[symbol].length > 30) history[symbol].shift();

  renderQuotes();
  renderPredictions();
  renderRegionStyles();
  setUpdatedStamp();
}

function renderQuotes() {
  tickerGrid.innerHTML = "";

  Object.entries(symbols).forEach(([symbol, meta]) => {
    const q = marketState[symbol];
    const price = q ? q.price.toFixed(2) : "--";
    const move = q ? q.movePct : 0;
    const dir = move >= 0 ? "up" : "down";
    const sign = move >= 0 ? "+" : "";

    const el = document.createElement("article");
    el.className = "ticker";
    el.innerHTML = `
      <div class="symbol">${meta.label}</div>
      <div class="price">${price}</div>
      <div class="move ${dir}">${sign}${move.toFixed(2)}%</div>
    `;
    tickerGrid.appendChild(el);
  });
}

function computePrediction(symbol) {
  const points = history[symbol] || [];
  if (points.length < 6) return null;
  const latest = points[points.length - 1];
  const oldest = points[0];
  const momentum = (latest - oldest) / oldest;
  const confidence = Math.min(93, Math.max(52, 60 + Math.abs(momentum) * 1000));
  const forecast = latest * (1 + momentum * 0.32);
  const bias = momentum >= 0 ? "Bullish" : "Bearish";
  return { confidence, forecast, bias };
}

function renderPredictions() {
  predictionList.innerHTML = "";

  Object.keys(symbols).forEach((symbol) => {
    const p = computePrediction(symbol);
    if (!p) return;
    const item = document.createElement("div");
    item.className = "prediction";
    item.innerHTML = `<strong>${symbols[symbol].label}: ${p.bias}</strong><br/><small>Forecast: ${p.forecast.toFixed(2)} • Confidence: ${p.confidence.toFixed(0)}%</small>`;
    predictionList.appendChild(item);
  });

  if (!predictionList.children.length) {
    predictionList.innerHTML = '<div class="prediction"><small>Collecting enough live ticks for AI predictions…</small></div>';
  }
}

async function loadEquities() {
  try {
    const [fmpRes, yRes] = await Promise.all([
      fetch("https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT,TSLA,SPY?apikey=demo"),
      fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EGSPC,%5EIXIC")
    ]);

    const fmpData = await fmpRes.json();
    const yData = await yRes.json();

    fmpData.forEach((item) => upsertQuote(item.symbol, Number(item.price), Number(item.changesPercentage || 0)));
    (yData?.quoteResponse?.result || []).forEach((item) => {
      upsertQuote(item.symbol, Number(item.regularMarketPrice), Number(item.regularMarketChangePercent || 0));
    });
  } catch {
    addChatMessage("bot", "Equity/index refresh temporarily unavailable.");
  }
}

function startCryptoStream() {
  const stream = "btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker";
  const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data)?.data;
    if (!payload?.s) return;
    upsertQuote(payload.s, Number(payload.c), Number(payload.P));
  };

  socket.onclose = () => {
    addChatMessage("bot", "Crypto stream disconnected; reconnecting.");
    setTimeout(startCryptoStream, 2200);
  };
}

async function loadGoldPrice() {
  try {
    const res = await fetch("https://api.metals.live/v1/spot");
    const data = await res.json();
    const goldEntry = data.find((x) => Object.keys(x)[0] === "gold");
    const price = Number(goldEntry?.gold);

    if (Number.isFinite(price)) {
      const prev = goldState.price;
      goldState.price = price;
      goldState.source = "metals.live";
      goldState.movePct = prev ? ((price - prev) / prev) * 100 : 0;
      renderGold();
      renderRegionStyles();
      setUpdatedStamp();
    }
  } catch {
    goldState.source = "fallback";
    renderGold();
  }
}

function renderGold() {
  const value = Number.isFinite(goldState.price) ? goldState.price.toFixed(2) : "--";
  const move = Number.isFinite(goldState.movePct) ? goldState.movePct : 0;
  const dir = move >= 0 ? "up" : "down";
  const sign = move >= 0 ? "+" : "";

  const headlines = goldHeadlines
    .slice(0, 3)
    .map((h) => `<li><a href="${h.link}" target="_blank" rel="noreferrer">${h.title}</a></li>`)
    .join("");

  goldCard.innerHTML = `
    <div class="gold-main">
      <div>
        <div class="label">XAU/USD Spot</div>
        <div class="value">${value}</div>
      </div>
      <div class="delta ${dir}">${sign}${move.toFixed(2)}%</div>
    </div>
    <p class="tiny">Source: ${goldState.source}</p>
    <ul class="gold-news-mini">${headlines || "<li><a href='#'>Loading gold headlines…</a></li>"}</ul>
  `;
}

async function loadNews() {
  try {
    const macroUrl = encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,TSLA,AAPL,MSFT&region=US&lang=en-US");
    const goldUrl = encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=GC%3DF,GLD,XAUUSD%3DX&region=US&lang=en-US");

    const [macroRes, goldRes] = await Promise.all([
      fetch(`https://api.allorigins.win/raw?url=${macroUrl}`),
      fetch(`https://api.allorigins.win/raw?url=${goldUrl}`)
    ]);

    const [macroXml, goldXml] = await Promise.all([macroRes.text(), goldRes.text()]);

    const parseItems = (xmlText) => {
      const doc = new DOMParser().parseFromString(xmlText, "text/xml");
      return [...doc.querySelectorAll("item")].map((item) => ({
        title: item.querySelector("title")?.textContent || "Headline",
        link: item.querySelector("link")?.textContent || "#",
        date: item.querySelector("pubDate")?.textContent || ""
      }));
    };

    const macroItems = parseItems(macroXml).slice(0, 8);
    goldHeadlines = parseItems(goldXml).slice(0, 6);

    newsFeed.innerHTML = "";
    macroItems.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${item.link}" target="_blank" rel="noreferrer">${item.title}</a><p>${new Date(item.date).toLocaleString()}</p>`;
      newsFeed.appendChild(li);
    });

    if (!macroItems.length) newsFeed.innerHTML = "<li><p>No macro headlines available.</p></li>";
    renderGold();
  } catch {
    newsFeed.innerHTML = "<li><p>News feed temporarily unavailable.</p></li>";
  }
}

async function loadForexFactoryFeed() {
  try {
    const ffUrl = encodeURIComponent("https://nfs.faireconomy.media/ff_calendar_thisweek.xml");
    const res = await fetch(`https://api.allorigins.win/raw?url=${ffUrl}`);
    const xml = await res.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const events = [...doc.querySelectorAll("event")].slice(0, 12).map((e) => ({
      title: e.querySelector("title")?.textContent || "Event",
      country: e.querySelector("country")?.textContent || "N/A",
      date: e.querySelector("date")?.textContent || "",
      time: e.querySelector("time")?.textContent || "",
      impact: (e.querySelector("impact")?.textContent || "Low").replace(/\s+/g, " ").trim(),
      forecast: e.querySelector("forecast")?.textContent || "-",
      previous: e.querySelector("previous")?.textContent || "-"
    }));

    forexEvents = events;
    renderForexFactory();
  } catch {
    forexFeed.innerHTML = "<li><p>Forex Factory feed temporarily unavailable.</p></li>";
  }
}

function renderForexFactory() {
  forexFeed.innerHTML = "";
  if (!forexEvents.length) {
    forexFeed.innerHTML = "<li><p>No forex events available.</p></li>";
    return;
  }

  forexEvents.forEach((event) => {
    const li = document.createElement("li");
    const impactLevel = event.impact.toLowerCase().includes("high") ? "high" : event.impact.toLowerCase().includes("medium") ? "medium" : "low";
    li.innerHTML = `
      <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noreferrer">${event.title}</a>
      <p><span class="badge ${impactLevel}">${event.impact}</span>${event.country} • ${event.date} ${event.time}</p>
      <p>Forecast: ${event.forecast} | Previous: ${event.previous}</p>
    `;
    forexFeed.appendChild(li);
  });
}

function computeRegionImpact(regionKey) {
  const model = regionModels[regionKey];
  if (!model) return { score: 0, label: "Neutral" };

  const moves = model.refs.map((sym) => marketState[sym]?.movePct).filter((v) => typeof v === "number");
  const avgMove = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : 0;
  const goldImpact = (goldState.movePct || 0) * model.goldWeight;
  const score = avgMove + goldImpact;
  const label = score > 0.35 ? "Positive" : score < -0.35 ? "Negative" : "Neutral";
  return { score, label, avgMove, goldImpact };
}

function renderRegionStyles() {
  impactButtons.forEach((btn) => {
    btn.classList.remove("positive", "negative");
    const { label } = computeRegionImpact(btn.dataset.region);
    if (label === "Positive") btn.classList.add("positive");
    if (label === "Negative") btn.classList.add("negative");
  });

  if (!impactDetail.textContent.trim()) showRegionDetail("northAmerica");
}

function showRegionDetail(regionKey) {
  const model = regionModels[regionKey];
  if (!model) return;
  const r = computeRegionImpact(regionKey);
  const sign = r.score >= 0 ? "+" : "";

  impactDetail.innerHTML = `
    <strong>${model.label} — ${r.label} Impact</strong>
    <p>Score: ${sign}${r.score.toFixed(2)} | Market contribution: ${r.avgMove >= 0 ? "+" : ""}${r.avgMove.toFixed(2)}% | Gold contribution: ${r.goldImpact >= 0 ? "+" : ""}${r.goldImpact.toFixed(2)}</p>
    <p>Drivers: ${model.refs.map((s) => symbols[s]?.label || s).join(", ")}</p>
  `;
}

impactButtons.forEach((btn) => btn.addEventListener("click", () => showRegionDetail(btn.dataset.region)));

function addChatMessage(role, text) {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = text;
  chatLog.appendChild(node);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function summarizeMarket() {
  const entries = Object.entries(marketState);
  if (!entries.length) return "Still collecting live ticks. Ask again in a few seconds.";
  const sorted = entries.sort((a, b) => b[1].movePct - a[1].movePct);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  return `${symbols[top[0]]?.label || top[0]} leads at ${top[1].movePct.toFixed(2)}%, while ${symbols[bottom[0]]?.label || bottom[0]} lags at ${bottom[1].movePct.toFixed(2)}%.`;
}

function goldOutlook() {
  if (!Number.isFinite(goldState.price)) return "Gold feed is loading; check again shortly.";
  const mood = goldState.movePct >= 0 ? "risk-off hedge demand may be increasing" : "risk appetite may be improving";
  return `Gold is at ${goldState.price.toFixed(2)} (${goldState.movePct >= 0 ? "+" : ""}${goldState.movePct.toFixed(2)}%). AI take: ${mood}.`;
}

function bestPrediction() {
  const candidates = Object.keys(symbols).map((sym) => ({ sym, p: computePrediction(sym) })).filter((x) => x.p);
  if (!candidates.length) return "Prediction model needs more live data (~20-40s).";
  const best = candidates.sort((a, b) => b.p.confidence - a.p.confidence)[0];
  return `${symbols[best.sym].label} shows ${best.p.bias.toLowerCase()} momentum with ${best.p.confidence.toFixed(0)}% confidence.`;
}

function regionalOutlook() {
  const scores = Object.keys(regionModels).map((k) => ({ key: k, ...computeRegionImpact(k) })).sort((a, b) => b.score - a.score);
  return `${regionModels[scores[0].key].label} strongest (${scores[0].score.toFixed(2)}), ${regionModels[scores.at(-1).key].label} weakest (${scores.at(-1).score.toFixed(2)}).`;
}

function forexOutlook() {
  if (!forexEvents.length) return "Forex Factory calendar is still loading.";
  const high = forexEvents.filter((e) => e.impact.toLowerCase().includes("high")).slice(0, 2);
  if (!high.length) return "No high-impact events immediately ahead in the loaded feed.";
  return `Top high-impact events: ${high.map((e) => `${e.country} ${e.title}`).join(" | ")}.`;
}

function chatReply(input) {
  const q = input.toLowerCase();
  if (q.includes("forex") || q.includes("calendar")) return forexOutlook();
  if (q.includes("gold")) return goldOutlook();
  if (q.includes("impact") || q.includes("region") || q.includes("map")) return regionalOutlook();
  if (q.includes("prediction") || q.includes("forecast")) return bestPrediction();
  if (q.includes("summary") || q.includes("market")) return summarizeMarket();
  if (q.includes("risk")) return "Not financial advice: manage position size, use stops, and hedge with low-correlation assets like gold or cash.";
  return "Try: 'market summary', 'gold outlook', 'forex calendar', 'regional impact', or 'best prediction'.";
}

document.getElementById("chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  setTimeout(() => addChatMessage("bot", chatReply(text)), 160);
  input.value = "";
});

addChatMessage("bot", "Assistant online. Ask for market summary, gold outlook, forex calendar, regional impact, or prediction.");
renderQuotes();
renderPredictions();
renderGold();
renderRegionStyles();
initTradingViewWidget();

loadNews();
loadForexFactoryFeed();
loadGoldPrice();
loadEquities();
startCryptoStream();

setInterval(loadEquities, 25000);
setInterval(loadNews, 65000);
setInterval(loadGoldPrice, 15000);
setInterval(loadForexFactoryFeed, 300000);
