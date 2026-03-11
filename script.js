const tickerGrid = document.getElementById("ticker-grid");
const predictionList = document.getElementById("prediction-list");
const newsFeed = document.getElementById("news-feed");
const chatLog = document.getElementById("chat-log");
const lastUpdated = document.getElementById("last-updated");

const symbols = {
  BTCUSDT: { label: "BTC", source: "binance" },
  ETHUSDT: { label: "ETH", source: "binance" },
  BNBUSDT: { label: "BNB", source: "binance" },
  AAPL: { label: "AAPL", source: "fmp" },
  MSFT: { label: "MSFT", source: "fmp" },
  TSLA: { label: "TSLA", source: "fmp" },
  SPY: { label: "SPY", source: "fmp" }
};

const marketState = {};
const history = {};

function setUpdatedStamp() {
  const now = new Date();
  lastUpdated.textContent = `Updated ${now.toLocaleTimeString()}`;
}

function upsertQuote(symbol, price, movePct = 0) {
  marketState[symbol] = { price, movePct };
  history[symbol] = history[symbol] || [];
  history[symbol].push(price);
  if (history[symbol].length > 20) history[symbol].shift();
  renderQuotes();
  renderPredictions();
  setUpdatedStamp();
}

function renderQuotes() {
  tickerGrid.innerHTML = "";

  Object.entries(symbols).forEach(([symbol, meta]) => {
    const quote = marketState[symbol];
    const price = quote ? quote.price.toFixed(2) : "--";
    const movePct = quote ? quote.movePct : 0;
    const direction = movePct >= 0 ? "up" : "down";
    const sign = movePct >= 0 ? "+" : "";

    const card = document.createElement("article");
    card.className = "ticker";
    card.innerHTML = `
      <div class="symbol">${meta.label}</div>
      <div class="price">${price}</div>
      <div class="move ${direction}">${sign}${movePct.toFixed(2)}%</div>
    `;
    tickerGrid.appendChild(card);
  });
}

function computePrediction(symbol) {
  const points = history[symbol] || [];
  if (points.length < 5) return null;

  const latest = points[points.length - 1];
  const oldest = points[0];
  const momentum = (latest - oldest) / oldest;
  const confidence = Math.min(92, Math.max(51, 60 + Math.abs(momentum) * 900));
  const forecast = latest * (1 + momentum * 0.35);
  const bias = momentum >= 0 ? "Bullish" : "Bearish";

  return {
    bias,
    forecast,
    confidence
  };
}

function renderPredictions() {
  predictionList.innerHTML = "";

  Object.keys(symbols).forEach((symbol) => {
    const prediction = computePrediction(symbol);
    if (!prediction) return;

    const div = document.createElement("div");
    div.className = "prediction";
    div.innerHTML = `
      <strong>${symbols[symbol].label}: ${prediction.bias}</strong><br />
      <small>Projected short-horizon value: ${prediction.forecast.toFixed(2)} • Confidence: ${prediction.confidence.toFixed(0)}%</small>
    `;
    predictionList.appendChild(div);
  });

  if (!predictionList.children.length) {
    predictionList.innerHTML = '<div class="prediction"><small>Collecting enough data for predictions…</small></div>';
  }
}

async function loadEquities() {
  try {
    const response = await fetch(
      "https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT,TSLA,SPY?apikey=demo"
    );
    const data = await response.json();

    data.forEach((item) => {
      upsertQuote(item.symbol, item.price, item.changesPercentage || 0);
    });
  } catch {
    addSystemMessage("Unable to refresh equity quotes right now.");
  }
}

function startCryptoStream() {
  const stream = "btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker";
  const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data)?.data;
    if (!payload) return;

    upsertQuote(
      payload.s,
      Number(payload.c),
      Number(payload.P)
    );
  };

  socket.onclose = () => {
    addSystemMessage("Crypto stream disconnected. Retrying…");
    setTimeout(startCryptoStream, 2200);
  };
}

async function loadNews() {
  try {
    const rssUrl = encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,TSLA,AAPL,MSFT&region=US&lang=en-US");
    const response = await fetch(`https://api.allorigins.win/raw?url=${rssUrl}`);
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const items = [...doc.querySelectorAll("item")].slice(0, 8);

    newsFeed.innerHTML = "";
    items.forEach((item) => {
      const title = item.querySelector("title")?.textContent || "Headline";
      const link = item.querySelector("link")?.textContent || "#";
      const pubDate = item.querySelector("pubDate")?.textContent || "";
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="${link}" target="_blank" rel="noreferrer">${title}</a>
        <p>${new Date(pubDate).toLocaleString()}</p>
      `;
      newsFeed.appendChild(li);
    });

    if (!items.length) {
      newsFeed.innerHTML = "<li><p>No headlines available at this moment.</p></li>";
    }
  } catch {
    newsFeed.innerHTML = "<li><p>News feed is temporarily unavailable.</p></li>";
  }
}

function addChatMessage(role, text) {
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = text;
  chatLog.appendChild(node);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addSystemMessage(text) {
  addChatMessage("bot", text);
}

function summarizeMoves() {
  const entries = Object.entries(marketState);
  if (!entries.length) return "I’m still collecting live market ticks. Please ask again in a moment.";

  const sorted = entries.sort((a, b) => b[1].movePct - a[1].movePct);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  return `${symbols[top[0]].label} is leading at ${top[1].movePct.toFixed(2)}%, while ${symbols[bottom[0]].label} is weakest at ${bottom[1].movePct.toFixed(2)}%.`;
}

function chatReply(input) {
  const q = input.toLowerCase();

  if (q.includes("summary") || q.includes("market")) {
    return summarizeMoves();
  }

  if (q.includes("prediction") || q.includes("forecast")) {
    const available = Object.keys(symbols)
      .map((s) => ({ s, p: computePrediction(s) }))
      .filter((x) => x.p);
    if (!available.length) return "Prediction model needs more live ticks. Wait ~20–30 seconds.";
    const best = available.sort((a, b) => b.p.confidence - a.p.confidence)[0];
    return `${symbols[best.s].label} currently shows ${best.p.bias.toLowerCase()} momentum with ${best.p.confidence.toFixed(0)}% confidence.`;
  }

  if (q.includes("risk")) {
    return "Not financial advice: diversify positions, use stop-loss logic, and avoid overexposure to one asset class.";
  }

  if (q.includes("hello") || q.includes("hi")) {
    return "Hello! I can provide market summary, trend direction, predictions, and risk reminders.";
  }

  return "I can help with: market summary, live movers, predictions, and risk guidance. Try: 'market summary'.";
}

document.getElementById("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  addChatMessage("user", text);
  const reply = chatReply(text);
  setTimeout(() => addChatMessage("bot", reply), 180);
  input.value = "";
});

addSystemMessage("Assistant online. Ask for market summary, prediction, or risk guidance.");
renderQuotes();
renderPredictions();
loadNews();
loadEquities();
startCryptoStream();

setInterval(loadEquities, 20000);
setInterval(loadNews, 60000);
