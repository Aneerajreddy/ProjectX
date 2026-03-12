(() => {
  if (window.__PROJECTX_TERMINAL_BOOTED__) {
    console.warn("ProjectX terminal already initialized; skipping duplicate script execution.");
    return;
  }
  window.__PROJECTX_TERMINAL_BOOTED__ = true;

  const lastUpdated = document.getElementById("last-updated");
  const announcementFeed = document.getElementById("announcement-feed");
  const regionNews = document.getElementById("region-news");
  const regionRateLine = document.getElementById("region-rate-line");
  const selectedRegionTitle = document.getElementById("selected-region-title");
  const assetList = document.getElementById("asset-list");
  const assetSearch = document.getElementById("asset-search");
  const countrySelect = document.getElementById("country-select");
  const countrySearch = document.getElementById("country-search");
  const countryCount = document.getElementById("country-count");
  const indicatorBox = document.getElementById("indicator-box");
  const signalBox = document.getElementById("signal-box");
  const selectedAIPrediction = document.getElementById("selected-ai-prediction");
  const categoryAIPredictions = document.getElementById("category-ai-predictions");
  const regionChips = [...document.querySelectorAll(".region-chip")];

  const ALL_COUNTRIES = `Afghanistan,Albania,Algeria,Andorra,Angola,Antigua and Barbuda,Argentina,Armenia,Australia,Austria,Azerbaijan,Bahamas,Bahrain,Bangladesh,Barbados,Belarus,Belgium,Belize,Benin,Bhutan,Bolivia,Bosnia and Herzegovina,Botswana,Brazil,Brunei,Bulgaria,Burkina Faso,Burundi,Cabo Verde,Cambodia,Cameroon,Canada,Central African Republic,Chad,Chile,China,Colombia,Comoros,Congo,Costa Rica,Côte d’Ivoire,Croatia,Cuba,Cyprus,Czechia,Democratic Republic of the Congo,Denmark,Djibouti,Dominica,Dominican Republic,Ecuador,Egypt,El Salvador,Equatorial Guinea,Eritrea,Estonia,Eswatini,Ethiopia,Fiji,Finland,France,Gabon,Gambia,Georgia,Germany,Ghana,Greece,Grenada,Guatemala,Guinea,Guinea-Bissau,Guyana,Haiti,Honduras,Hungary,Iceland,India,Indonesia,Iran,Iraq,Ireland,Israel,Italy,Jamaica,Japan,Jordan,Kazakhstan,Kenya,Kiribati,Kuwait,Kyrgyzstan,Laos,Latvia,Lebanon,Lesotho,Liberia,Libya,Liechtenstein,Lithuania,Luxembourg,Madagascar,Malawi,Malaysia,Maldives,Mali,Malta,Marshall Islands,Mauritania,Mauritius,Mexico,Micronesia,Moldova,Monaco,Mongolia,Montenegro,Morocco,Mozambique,Myanmar,Namibia,Nauru,Nepal,Netherlands,New Zealand,Nicaragua,Niger,Nigeria,North Korea,North Macedonia,Norway,Oman,Pakistan,Palau,Panama,Papua New Guinea,Paraguay,Peru,Philippines,Poland,Portugal,Qatar,Romania,Russia,Rwanda,Saint Kitts and Nevis,Saint Lucia,Saint Vincent and the Grenadines,Samoa,San Marino,Sao Tome and Principe,Saudi Arabia,Senegal,Serbia,Seychelles,Sierra Leone,Singapore,Slovakia,Slovenia,Solomon Islands,Somalia,South Africa,South Korea,South Sudan,Spain,Sri Lanka,Sudan,Suriname,Sweden,Switzerland,Syria,Tajikistan,Tanzania,Thailand,Timor-Leste,Togo,Tonga,Trinidad and Tobago,Tunisia,Turkey,Turkmenistan,Tuvalu,Uganda,Ukraine,United Arab Emirates,United Kingdom,United States,Uruguay,Uzbekistan,Vanuatu,Vatican City,Venezuela,Vietnam,Yemen,Zambia,Zimbabwe`
    .split(",").map((x) => x.trim()).filter(Boolean);

  const assets = {
    indices: ["SPY", "^GSPC", "^IXIC", "DAX", "FTSE"],
    commodities: ["OIL", "NATGAS", "COPPER"],
    forex: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"],
    cryptos: ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"],
    metals: ["XAUUSD", "XAGUSD", "XPTUSD"]
  };

  const symbolToTV = {
    SPY: "AMEX:SPY", "^GSPC": "FOREXCOM:SPXUSD", "^IXIC": "FOREXCOM:NSXUSD", DAX: "TVC:DAX", FTSE: "TVC:UKX",
    OIL: "TVC:USOIL", NATGAS: "TVC:NATGAS", COPPER: "COMEX:HG1!",
    EURUSD: "FX:EURUSD", GBPUSD: "FX:GBPUSD", USDJPY: "FX:USDJPY", AUDUSD: "FX:AUDUSD",
    BTCUSDT: "BINANCE:BTCUSDT", ETHUSDT: "BINANCE:ETHUSDT", BNBUSDT: "BINANCE:BNBUSDT", SOLUSDT: "BINANCE:SOLUSDT",
    XAUUSD: "TVC:GOLD", XAGUSD: "TVC:SILVER", XPTUSD: "OANDA:XPTUSD"
  };

  const fallback = {
    SPY: [520, 0.2], "^GSPC": [5200, 0.1], "^IXIC": [16600, 0.15], DAX: [18650, 0.1], FTSE: [8350, 0.05],
    OIL: [78, -0.3], NATGAS: [2.45, 0.4], COPPER: [4.1, 0.1],
    EURUSD: [1.08, 0.1], GBPUSD: [1.27, -0.08], USDJPY: [149.5, 0.2], AUDUSD: [0.66, 0.04],
    BTCUSDT: [64000, 0.8], ETHUSDT: [3200, 0.6], BNBUSDT: [580, -0.4], SOLUSDT: [142, 0.5],
    XAUUSD: [2350, 0.3], XAGUSD: [28.2, 0.2], XPTUSD: [980, 0.1]
  };

  const aliasMap = {
    gold:["XAUUSD"], silver:["XAGUSD"], platinum:["XPTUSD"], oil:["OIL"], gas:["NATGAS"], copper:["COPPER"],
    bitcoin:["BTCUSDT"], btc:["BTCUSDT"], ethereum:["ETHUSDT"], eth:["ETHUSDT"],
    forex:["EURUSD","GBPUSD","USDJPY","AUDUSD"], metals:["XAUUSD","XAGUSD","XPTUSD"], crypto:["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT"],
    indices:["SPY","^GSPC","^IXIC","DAX","FTSE"]
  };

  const keywordAliases = {
    "United States": ["US", "Federal Reserve", "Wall Street", "Treasury", "NASDAQ", "NY"],
    "United Kingdom": ["UK", "BoE", "Britain", "London"],
    "United Arab Emirates": ["UAE", "Dubai", "Abu Dhabi", "Gulf"],
    "South Korea": ["Korea", "Seoul"],
    "North Korea": ["Korea", "Pyongyang"],
    "Côte d’Ivoire": ["Ivory Coast"],
    "Czechia": ["Czech Republic"]
  };

  const state = { quotes:{}, histories:{}, candles:{}, headlines:[], selectedRegion:"United States", selectedSymbol:"SPY", search:"", countryFilter:"" };

  function setStamp(msg = "") { lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}${msg ? ` • ${msg}` : ""}`; }

  function populateCountries(filter = "") {
    const q = filter.trim().toLowerCase();
    const countries = q ? ALL_COUNTRIES.filter((c) => c.toLowerCase().includes(q)) : ALL_COUNTRIES;
    const previous = state.selectedRegion;
    countrySelect.innerHTML = countries.map((c) => `<option value="${c}">${c}</option>`).join("");
    if (countries.includes(previous)) countrySelect.value = previous;
    else if (countries.length) {
      countrySelect.value = countries[0];
      state.selectedRegion = countries[0];
    }
    countryCount.textContent = `${countries.length} countries`;
  }

  function initAdvancedChart(symbol = "SPY") {
    const container = document.getElementById("tv-advanced-chart");
    if (!container) return;
    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol: symbolToTV[symbol] || "AMEX:SPY", interval: "15", timezone: "Etc/UTC", theme: "dark", style: "1", locale: "en", allow_symbol_change: true,
      studies: ["MASimple@tv-basicstudies","ExponentialMovingAverage@tv-basicstudies","RSI@tv-basicstudies","MACD@tv-basicstudies","BB@tv-basicstudies"]
    });
    container.appendChild(script);
  }

  function seedFallback() { Object.entries(fallback).forEach(([s, [p, m]]) => upsertQuote(s, p, m)); }

  function updateCandle(symbol, price) {
    const c = state.candles[symbol] || { o: price, h: price, l: price, c: price, ticks: 0 };
    if (c.ticks === 0) c.o = price;
    c.h = Math.max(c.h, price); c.l = Math.min(c.l, price); c.c = price; c.ticks += 1;
    state.candles[symbol] = c;
  }

  function upsertQuote(symbol, price, movePct = 0) {
    if (!Number.isFinite(price)) return;
    state.quotes[symbol] = { price, movePct };
    state.histories[symbol] = state.histories[symbol] || [];
    state.histories[symbol].push(price);
    if (state.histories[symbol].length > 220) state.histories[symbol].shift();
    updateCandle(symbol, price);
    renderAssets(); renderIndicators(); renderSignals(); renderAI(); renderRegionRates(); setStamp();
  }

  function getFilteredAssets() {
    const q = state.search.trim().toLowerCase();
    const rows = [];
    Object.entries(assets).forEach(([cat, list]) => list.forEach((sym) => rows.push({ cat, sym })));
    if (!q) return rows;
    const aliasTargets = aliasMap[q] || [];
    return rows.filter((r) => r.sym.toLowerCase().includes(q) || r.cat.toLowerCase().includes(q) || aliasTargets.includes(r.sym));
  }

  function renderAssets() {
    const rows = getFilteredAssets();
    assetList.innerHTML = "";
    rows.forEach((r) => {
      const quote = state.quotes[r.sym] || { price: 0, movePct: 0 };
      const candle = state.candles[r.sym] || { o: quote.price, h: quote.price, l: quote.price, c: quote.price, ticks: 0 };
      const dir = quote.movePct >= 0 ? "up" : "down";
      const sign = quote.movePct >= 0 ? "+" : "";
      const el = document.createElement("article");
      el.className = `asset-item ${r.sym === state.selectedSymbol ? "active" : ""}`;
      el.innerHTML = `<div class="sym">${r.sym}</div><div class="cat">${r.cat.toUpperCase()}</div><div class="px">${quote.price ? quote.price.toFixed(4) : "--"}</div><div class="${dir}">${sign}${quote.movePct.toFixed(2)}%</div><div class="asset-ohlc">O ${candle.o.toFixed(4)} | H ${candle.h.toFixed(4)} | L ${candle.l.toFixed(4)} | C ${candle.c.toFixed(4)}<br/>Ticks: ${candle.ticks}</div>`;
      el.onclick = () => { state.selectedSymbol = r.sym; initAdvancedChart(r.sym); renderAssets(); renderIndicators(); renderSignals(); renderAI(); };
      assetList.appendChild(el);
    });
    if (!rows.length) assetList.innerHTML = '<div class="asset-item">No matching assets for current search.</div>';
  }

  function sma(arr, n) { if (arr.length < n) return null; return arr.slice(-n).reduce((a, b) => a + b, 0) / n; }
  function ema(arr, n) { if (arr.length < n) return null; const k = 2 / (n + 1); let e = arr[arr.length - n]; for (let i = arr.length - n + 1; i < arr.length; i++) e = arr[i] * k + e * (1 - k); return e; }
  function rsi(arr, n = 14) { if (arr.length < n + 1) return null; let gains = 0, losses = 0; for (let i = arr.length - n; i < arr.length; i++) { const d = arr[i] - arr[i - 1]; if (d >= 0) gains += d; else losses -= d; } if (losses === 0) return 100; const rs = (gains / n) / (losses / n); return 100 - (100 / (1 + rs)); }
  function currentMetrics(symbol) { const h = state.histories[symbol] || []; const last = h.at(-1) || state.quotes[symbol]?.price || 0; const sma20 = sma(h, 20); const ema20 = ema(h, 20); const rsi14 = rsi(h, 14); const momentum = h.length > 12 ? ((h.at(-1) - h.at(-12)) / h.at(-12)) * 100 : 0; return { last, sma20, ema20, rsi14, momentum }; }

  function renderIndicators() {
    const s = state.selectedSymbol, m = currentMetrics(s);
    indicatorBox.innerHTML = `<h3>${s} Indicator Snapshot</h3><div class="ind-row"><span>Last</span><strong>${m.last.toFixed(4)}</strong></div><div class="ind-row"><span>SMA(20)</span><strong>${m.sma20 ? m.sma20.toFixed(4) : "N/A"}</strong></div><div class="ind-row"><span>EMA(20)</span><strong>${m.ema20 ? m.ema20.toFixed(4) : "N/A"}</strong></div><div class="ind-row"><span>RSI(14)</span><strong>${m.rsi14 ? m.rsi14.toFixed(2) : "N/A"}</strong></div><div class="ind-row"><span>12-tick Momentum</span><strong class="${m.momentum >= 0 ? "up" : "down"}">${m.momentum >= 0 ? "+" : ""}${m.momentum.toFixed(2)}%</strong></div>`;
  }

  function renderSignals() {
    const s = state.selectedSymbol, m = currentMetrics(s), signals = [];
    if (m.rsi14 !== null) {
      if (m.rsi14 > 70) signals.push(`RSI ${m.rsi14.toFixed(1)} → Overbought: consider partial profit / tighter stop.`);
      else if (m.rsi14 < 30) signals.push(`RSI ${m.rsi14.toFixed(1)} → Oversold: watch reversal confirmation for buy setups.`);
      else signals.push(`RSI ${m.rsi14.toFixed(1)} → Neutral zone: trend-follow with confirmation.`);
    }
    if (m.sma20 && m.ema20) signals.push(m.ema20 > m.sma20 ? "EMA20 above SMA20 → bullish short-term structure." : "EMA20 below SMA20 → defensive/bearish short-term structure.");
    if (m.momentum > 0.35) signals.push(`Momentum ${m.momentum.toFixed(2)}% → BUY bias / trail stop.`);
    else if (m.momentum < -0.35) signals.push(`Momentum ${m.momentum.toFixed(2)}% → SELL/HEDGE bias.`);
    else signals.push(`Momentum ${m.momentum.toFixed(2)}% → HOLD / wait breakout.`);
    signalBox.innerHTML = `<h3>Live Action Signals (${s})</h3>${signals.map((x) => `<div class="signal">${x}</div>`).join("")}`;
  }

  function predictionFor(sym) {
    const h = state.histories[sym] || [];
    if (h.length < 18) return { bias: "Neutral", conf: 52, msg: "Collecting data" };
    const m = ((h.at(-1) - h.at(-14)) / h.at(-14)) * 100;
    const v = Math.abs((h.at(-1) - h.at(-2)) / h.at(-2)) * 100;
    const bias = m > 0.5 ? "Bullish" : m < -0.5 ? "Bearish" : "Sideways";
    const conf = Math.min(94, Math.max(55, 58 + Math.abs(m) * 5 - v));
    const action = bias === "Bullish" ? "Bias: Buy on pullbacks" : bias === "Bearish" ? "Bias: Sell rallies / Hedge" : "Bias: Hold / Range trade";
    return { bias, conf, msg: `Momentum ${m >= 0 ? "+" : ""}${m.toFixed(2)}% • Vol ${v.toFixed(2)}%`, action };
  }

  function renderAI() {
    const p = predictionFor(state.selectedSymbol);
    selectedAIPrediction.innerHTML = `<div class="pred-item"><strong>${state.selectedSymbol}: ${p.bias}</strong><p>${p.msg} • Confidence ${p.conf.toFixed(0)}%</p><p>${p.action}</p></div>`;
    categoryAIPredictions.innerHTML = "";
    Object.entries(assets).forEach(([cat, list]) => {
      const vals = list.map((sym) => predictionFor(sym));
      const score = vals.reduce((a, p2) => a + (p2.bias === "Bullish" ? p2.conf : p2.bias === "Bearish" ? -p2.conf : 0), 0) / (vals.length || 1);
      const label = score > 8 ? "Bullish" : score < -8 ? "Bearish" : "Mixed";
      const suggestion = label === "Bullish" ? "Overweight leaders" : label === "Bearish" ? "Reduce risk / hedge" : "Mean-reversion tactics";
      const div = document.createElement("div");
      div.className = "pred-item";
      div.innerHTML = `<strong>${cat.toUpperCase()}: ${label}</strong><p>AI aggregate score ${score.toFixed(2)} • ${suggestion}</p>`;
      categoryAIPredictions.appendChild(div);
    });
  }

  function countryKeywords(country) {
    return [country, ...(keywordAliases[country] || [])];
  }

  function renderAnnouncements() {
    const rows = state.headlines.length ? state.headlines : [
      { title: "Fallback Announcement: Liquidity monitor normal", link: "#", date: new Date().toISOString() },
      { title: "Fallback News: Risk assets mixed into close", link: "#", date: new Date().toISOString() }
    ];
    announcementFeed.innerHTML = "";
    rows.slice(0, 16).forEach((h) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${h.link}" target="_blank" rel="noreferrer">${h.title}</a><p>${new Date(h.date).toLocaleString()}</p>`;
      announcementFeed.appendChild(li);
    });
  }

  function countryRateBasket(country) {
    const c = country.toLowerCase();
    if (c.includes("united") || c.includes("canada") || c.includes("mexico")) return ["SPY", "^GSPC", "^IXIC", "OIL"];
    if (c.includes("germany") || c.includes("france") || c.includes("italy") || c.includes("spain") || c.includes("europe")) return ["DAX", "FTSE", "EURUSD"];
    if (c.includes("japan") || c.includes("korea") || c.includes("china") || c.includes("india") || c.includes("australia")) return ["USDJPY", "AUDUSD", "BTCUSDT"];
    if (c.includes("saudi") || c.includes("uae") || c.includes("qatar") || c.includes("oman") || c.includes("kuwait")) return ["OIL", "XAUUSD", "USDJPY"];
    if (c.includes("south africa") || c.includes("zambia") || c.includes("botswana")) return ["XAUUSD", "XPTUSD", "COPPER"];
    return ["SPY", "OIL", "EURUSD"];
  }

  function renderRegionRates() {
    const basket = countryRateBasket(state.selectedRegion);
    const line = basket.map((s) => {
      const q = state.quotes[s];
      return q ? `${s}:${q.price.toFixed(2)} (${q.movePct >= 0 ? "+" : ""}${q.movePct.toFixed(2)}%)` : `${s}:--`;
    }).join(" • ");
    regionRateLine.textContent = `Rates: ${line || "Loading…"}`;
  }

  function renderRegionNews() {
    const country = state.selectedRegion;
    selectedRegionTitle.textContent = `${country} Feed`;
    const kws = countryKeywords(country);
    const filtered = state.headlines.filter((h) => kws.some((k) => h.title.toLowerCase().includes(k.toLowerCase()))).slice(0, 8);
    const rows = filtered.length ? filtered : state.headlines.slice(0, 6);
    regionNews.innerHTML = rows.length ? rows.map((h) => `<li><a href="${h.link}" target="_blank" rel="noreferrer">${h.title}</a></li>`).join("") : "<li><p>No country items yet.</p></li>";
    renderRegionRates();
  }

  async function loadHeadlineFeeds() {
    try {
      const urls = [
        encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,GC%3DF,CL%3DF,BTC-USD,EURUSD%3DX&region=US&lang=en-US"),
        encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,TSLA,MSFT,GLD,SLV,DX-Y.NYB&region=US&lang=en-US")
      ];
      const [r1, r2] = await Promise.all(urls.map((u) => fetch(`https://api.allorigins.win/raw?url=${u}`)));
      const [x1, x2] = await Promise.all([r1.text(), r2.text()]);
      const parse = (x) => {
        const d = new DOMParser().parseFromString(x, "text/xml");
        return [...d.querySelectorAll("item")].map((i) => ({ title: i.querySelector("title")?.textContent || "Headline", link: i.querySelector("link")?.textContent || "#", date: i.querySelector("pubDate")?.textContent || new Date().toISOString() }));
      };
      state.headlines = [...parse(x1), ...parse(x2)].slice(0, 50);
    } catch {
      state.headlines = [
        { title: "Fallback: Federal Reserve comments support dollar", link: "#", date: new Date().toISOString() },
        { title: "Fallback: Oil steadies as inventory outlook shifts", link: "#", date: new Date().toISOString() },
        { title: "Fallback: Gold firm as real yields drift lower", link: "#", date: new Date().toISOString() },
        { title: "Fallback: Crypto breadth improves into close", link: "#", date: new Date().toISOString() }
      ];
      setStamp("degraded headlines mode");
    }
    renderAnnouncements();
    renderRegionNews();
  }

  async function loadMarketQuotes() {
    try {
      const [eq, fx, metal] = await Promise.all([
        fetch("https://financialmodelingprep.com/api/v3/quote/SPY?apikey=demo"),
        fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,AUD"),
        fetch("https://api.metals.live/v1/spot")
      ]);
      const eqData = await eq.json();
      if (Array.isArray(eqData) && eqData[0]) upsertQuote("SPY", Number(eqData[0].price), Number(eqData[0].changesPercentage || 0));
      const fxData = await fx.json();
      const rates = fxData?.rates || {};
      if (rates.EUR) upsertQuote("EURUSD", 1 / Number(rates.EUR), 0);
      if (rates.GBP) upsertQuote("GBPUSD", 1 / Number(rates.GBP), 0);
      if (rates.JPY) upsertQuote("USDJPY", Number(rates.JPY), 0);
      if (rates.AUD) upsertQuote("AUDUSD", 1 / Number(rates.AUD), 0);
      const mData = await metal.json();
      const g = mData.find((x) => Object.keys(x)[0] === "gold");
      const s = mData.find((x) => Object.keys(x)[0] === "silver");
      const p = mData.find((x) => Object.keys(x)[0] === "platinum");
      if (g?.gold) upsertQuote("XAUUSD", Number(g.gold), 0);
      if (s?.silver) upsertQuote("XAGUSD", Number(s.silver), 0);
      if (p?.platinum) upsertQuote("XPTUSD", Number(p.platinum), 0);
    } catch { setStamp("degraded quote mode"); }
  }

  function startBinance() {
    const stream = "btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker/solusdt@ticker";
    try {
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);
      ws.onmessage = (e) => { const d = JSON.parse(e.data)?.data; if (!d?.s) return; upsertQuote(d.s, Number(d.c), Number(d.P)); };
      ws.onclose = () => setTimeout(startBinance, 4000);
    } catch {}
  }

  function startSyntheticDrift() {
    setInterval(() => {
      Object.entries(state.quotes).forEach(([s, q]) => {
        const drift = (Math.random() - 0.5) * 0.0045;
        upsertQuote(s, q.price * (1 + drift), q.movePct + drift * 100);
      });
    }, 2200);
  }

  assetSearch.addEventListener("input", (e) => { state.search = e.target.value; renderAssets(); });
  countrySearch.addEventListener("input", (e) => {
    state.countryFilter = e.target.value;
    populateCountries(state.countryFilter);
    renderRegionNews();
  });
  countrySelect.addEventListener("change", () => { state.selectedRegion = countrySelect.value; renderRegionNews(); });

  regionChips.forEach((btn) => {
    btn.addEventListener("click", () => {
      const country = btn.dataset.region;
      state.selectedRegion = country;
      countrySelect.value = country;
      countrySearch.value = "";
      populateCountries("");
      renderRegionNews();
    });
  });

  function init() {
    seedFallback();
    populateCountries();
    countrySelect.value = state.selectedRegion;
    initAdvancedChart(state.selectedSymbol);
    renderAssets(); renderIndicators(); renderSignals(); renderAI(); renderAnnouncements(); renderRegionNews();
    loadHeadlineFeeds(); loadMarketQuotes(); startBinance(); startSyntheticDrift();
    setInterval(loadHeadlineFeeds, 70000); setInterval(loadMarketQuotes, 30000);
  }

  init();
})();
