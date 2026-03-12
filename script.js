(() => {
  if (window.__PROJECTX_TERMINAL_BOOTED__) {
    console.warn("ProjectX terminal already initialized; skipping duplicate script execution.");
    return;
  }
  window.__PROJECTX_TERMINAL_BOOTED__ = true;

const lastUpdated = document.getElementById("last-updated");
const announcementFeed = document.getElementById("announcement-feed");
const regionNews = document.getElementById("region-news");
const selectedRegionTitle = document.getElementById("selected-region-title");
const assetList = document.getElementById("asset-list");
const indicatorBox = document.getElementById("indicator-box");
const selectedAIPrediction = document.getElementById("selected-ai-prediction");
const categoryAIPredictions = document.getElementById("category-ai-predictions");
const regionPins = [...document.querySelectorAll('.region-pin')];

const assets = {
  indices:["SPY","^GSPC","^IXIC"],
  commodities:["OIL","NATGAS"],
  forex:["EURUSD","GBPUSD","USDJPY"],
  cryptos:["BTCUSDT","ETHUSDT","BNBUSDT"],
  metals:["XAUUSD","XAGUSD"]
};

const symbolToTV = {
  SPY:"AMEX:SPY", "^GSPC":"FOREXCOM:SPXUSD", "^IXIC":"FOREXCOM:NSXUSD",
  OIL:"TVC:USOIL", NATGAS:"TVC:NATGAS", EURUSD:"FX:EURUSD", GBPUSD:"FX:GBPUSD", USDJPY:"FX:USDJPY",
  BTCUSDT:"BINANCE:BTCUSDT", ETHUSDT:"BINANCE:ETHUSDT", BNBUSDT:"BINANCE:BNBUSDT", XAUUSD:"TVC:GOLD", XAGUSD:"TVC:SILVER"
};

const fallback = { SPY:[520,0.2], "^GSPC":[5200,0.1], "^IXIC":[16600,0.15], OIL:[78,-0.3], NATGAS:[2.45,0.4], EURUSD:[1.08,0.1], GBPUSD:[1.27,-0.08], USDJPY:[149.5,0.2], BTCUSDT:[64000,0.8], ETHUSDT:[3200,0.6], BNBUSDT:[580,-0.4], XAUUSD:[2350,0.3], XAGUSD:[28.2,0.2] };

const state = { quotes:{}, histories:{}, headlines:[], selectedRegion:"North America", selectedSymbol:"SPY" };

const regionKeywords = {
  "North America":["US","Federal Reserve","Wall Street","Treasury"],
  "South America":["Brazil","LatAm","Argentina","Chile"],
  "Europe":["Europe","ECB","Euro","UK"],
  "Middle East":["Middle East","OPEC","Oil","Gulf"],
  "Asia-Pacific":["Asia","China","Japan","BoJ"],
  "Africa":["Africa","South Africa","EMEA"]
};

function setStamp(msg="") { lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}${msg?` • ${msg}`:""}`; }

function seedFallback(){ Object.entries(fallback).forEach(([s,[p,m]])=>upsertQuote(s,p,m)); }

function upsertQuote(symbol, price, movePct=0){
  if(!Number.isFinite(price)) return;
  state.quotes[symbol]={price,movePct};
  state.histories[symbol]=state.histories[symbol]||[];
  state.histories[symbol].push(price);
  if(state.histories[symbol].length>120) state.histories[symbol].shift();
  renderAssets(); renderIndicators(); renderAI(); setStamp();
}

function startFallbackTicker(){
  setInterval(()=>{
    Object.entries(state.quotes).forEach(([s,q])=>{
      const drift=(Math.random()-0.5)*0.005;
      upsertQuote(s, q.price*(1+drift), q.movePct+drift*100);
    });
  },2200);
}

function initAdvancedChart(symbol="SPY"){
  const container = document.getElementById("tv-advanced-chart");
  if(!container) return;
  container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
  const script = document.createElement("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
  script.async = true;
  script.innerHTML = JSON.stringify({
    autosize:true, symbol:symbolToTV[symbol]||"AMEX:SPY", interval:"60", timezone:"Etc/UTC", theme:"dark", style:"1", locale:"en", allow_symbol_change:true,
    studies:["MASimple@tv-basicstudies","ExponentialMovingAverage@tv-basicstudies","RSI@tv-basicstudies","MACD@tv-basicstudies"]
  });
  container.appendChild(script);
}

function renderAssets(){
  const rows=[];
  Object.entries(assets).forEach(([cat,list])=> list.forEach(sym=>rows.push({cat,sym,q:state.quotes[sym]||{price:0,movePct:0}})));
  assetList.innerHTML="";
  rows.forEach((r)=>{
    const dir=r.q.movePct>=0?"up":"down";
    const sign=r.q.movePct>=0?"+":"";
    const el=document.createElement("article");
    el.className=`asset-item ${r.sym===state.selectedSymbol?"active":""}`;
    el.innerHTML=`<div class="sym">${r.sym}</div><div class="cat">${r.cat.toUpperCase()}</div><div class="px">${r.q.price?r.q.price.toFixed(4):"--"}</div><div class="${dir}">${sign}${r.q.movePct.toFixed(2)}%</div>`;
    el.onclick=()=>{ state.selectedSymbol=r.sym; initAdvancedChart(r.sym); renderAssets(); renderIndicators(); renderAI(); };
    assetList.appendChild(el);
  });
}

function sma(arr,n){ if(arr.length<n) return null; return arr.slice(-n).reduce((a,b)=>a+b,0)/n; }
function ema(arr,n){ if(arr.length<n) return null; let k=2/(n+1), e=arr[arr.length-n]; for(let i=arr.length-n+1;i<arr.length;i++) e=arr[i]*k+e*(1-k); return e; }
function rsi(arr,n=14){ if(arr.length<n+1) return null; let gains=0,loss=0; for(let i=arr.length-n;i<arr.length;i++){const d=arr[i]-arr[i-1]; if(d>=0) gains+=d; else loss-=d;} if(loss===0) return 100; const rs=(gains/n)/(loss/n); return 100-(100/(1+rs)); }

function renderIndicators(){
  const s=state.selectedSymbol, h=state.histories[s]||[];
  const last=h.at(-1)||state.quotes[s]?.price||0;
  const s20=sma(h,20), e20=ema(h,20), r14=rsi(h,14);
  const momentum = h.length>10 ? ((h.at(-1)-h.at(-10))/h.at(-10))*100 : 0;
  indicatorBox.innerHTML=`<h3>${s} Indicator Snapshot</h3>
  <div class="ind-row"><span>Last</span><strong>${last.toFixed(4)}</strong></div>
  <div class="ind-row"><span>SMA(20)</span><strong>${s20? s20.toFixed(4):"N/A"}</strong></div>
  <div class="ind-row"><span>EMA(20)</span><strong>${e20? e20.toFixed(4):"N/A"}</strong></div>
  <div class="ind-row"><span>RSI(14)</span><strong>${r14? r14.toFixed(2):"N/A"}</strong></div>
  <div class="ind-row"><span>10-period Momentum</span><strong class="${momentum>=0?"up":"down"}">${momentum>=0?"+":""}${momentum.toFixed(2)}%</strong></div>`;
}

function predictionFor(sym){
  const h=state.histories[sym]||[];
  if(h.length<15) return {bias:"Neutral", conf:52, msg:"Collecting data"};
  const m=((h.at(-1)-h.at(-12))/h.at(-12))*100;
  const bias=m>0.4?"Bullish":m<-0.4?"Bearish":"Sideways";
  const conf=Math.min(92,Math.max(55,60+Math.abs(m)*4));
  return {bias,conf,msg:`Momentum ${m>=0?"+":""}${m.toFixed(2)}%`};
}

function renderAI(){
  const p=predictionFor(state.selectedSymbol);
  selectedAIPrediction.innerHTML=`<div class="pred-item"><strong>${state.selectedSymbol}: ${p.bias}</strong><p>${p.msg} • Confidence ${p.conf.toFixed(0)}%</p></div>`;

  categoryAIPredictions.innerHTML="";
  Object.entries(assets).forEach(([cat,list])=>{
    const scores=list.map(sym=>predictionFor(sym).conf * (predictionFor(sym).bias==="Bullish"?1:predictionFor(sym).bias==="Bearish"?-1:0));
    const avg=scores.reduce((a,b)=>a+b,0)/(scores.length||1);
    const label=avg>10?"Bullish":avg<-10?"Bearish":"Mixed";
    const div=document.createElement("div");
    div.className="pred-item";
    div.innerHTML=`<strong>${cat.toUpperCase()}: ${label}</strong><p>AI aggregate score ${avg.toFixed(2)}</p>`;
    categoryAIPredictions.appendChild(div);
  });
}

function renderAnnouncements(){
  const rows = state.headlines.length ? state.headlines : [
    {title:"Fallback Announcement: Liquidity monitor normal",link:"#",date:new Date().toISOString()},
    {title:"Fallback News: Risk assets mixed into close",link:"#",date:new Date().toISOString()}
  ];
  announcementFeed.innerHTML="";
  rows.slice(0,14).forEach(h=>{
    const li=document.createElement("li");
    li.innerHTML=`<a href="${h.link}" target="_blank" rel="noreferrer">${h.title}</a><p>${new Date(h.date).toLocaleString()}</p>`;
    announcementFeed.appendChild(li);
  });
}

function renderRegionNews(){
  const r=state.selectedRegion;
  selectedRegionTitle.textContent=`${r} Feed`;
  const kws=regionKeywords[r]||[];
  const filtered=state.headlines.filter(h=>kws.some(k=>h.title.toLowerCase().includes(k.toLowerCase()))).slice(0,8);
  const rows=filtered.length?filtered:state.headlines.slice(0,6);
  regionNews.innerHTML = rows.length ? rows.map(h=>`<li><a href="${h.link}" target="_blank" rel="noreferrer">${h.title}</a></li>`).join("") : "<li><p>No regional items yet.</p></li>";
}

regionPins.forEach(btn=>btn.addEventListener('click',()=>{state.selectedRegion=btn.dataset.region; renderRegionNews();}));

async function loadHeadlineFeeds(){
  try {
    const urls = [
      encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,SPY,GC%3DF,CL%3DF,BTC-USD,EURUSD%3DX&region=US&lang=en-US"),
      encodeURIComponent("https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,TSLA,MSFT,GLD,SLV&region=US&lang=en-US")
    ];
    const [r1,r2]=await Promise.all(urls.map(u=>fetch(`https://api.allorigins.win/raw?url=${u}`)));
    const [x1,x2]=await Promise.all([r1.text(),r2.text()]);
    const parse=(x)=>{const d=new DOMParser().parseFromString(x,"text/xml"); return [...d.querySelectorAll('item')].map(i=>({title:i.querySelector('title')?.textContent||"Headline",link:i.querySelector('link')?.textContent||"#",date:i.querySelector('pubDate')?.textContent||new Date().toISOString()}));};
    state.headlines=[...parse(x1),...parse(x2)].slice(0,40);
  } catch {
    state.headlines=[
      {title:"Fallback: Federal Reserve comments support dollar",link:"#",date:new Date().toISOString()},
      {title:"Fallback: Oil steadies as inventory outlook shifts",link:"#",date:new Date().toISOString()},
      {title:"Fallback: Gold firm as real yields drift lower",link:"#",date:new Date().toISOString()},
      {title:"Fallback: Crypto breadth improves into close",link:"#",date:new Date().toISOString()}
    ];
    setStamp("degraded headlines mode");
  }
  renderAnnouncements(); renderRegionNews();
}

async function loadMarketQuotes(){
  try {
    const [eq,fx,metal] = await Promise.all([
      fetch("https://financialmodelingprep.com/api/v3/quote/SPY?apikey=demo"),
      fetch("https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY"),
      fetch("https://api.metals.live/v1/spot")
    ]);
    const eqData = await eq.json();
    if(Array.isArray(eqData)&&eqData[0]) upsertQuote("SPY", Number(eqData[0].price), Number(eqData[0].changesPercentage||0));

    const fxData = await fx.json();
    const rates=fxData?.rates||{};
    if(rates.EUR) upsertQuote("EURUSD", 1/Number(rates.EUR), 0);
    if(rates.GBP) upsertQuote("GBPUSD", 1/Number(rates.GBP), 0);
    if(rates.JPY) upsertQuote("USDJPY", Number(rates.JPY), 0);

    const mData = await metal.json();
    const g=mData.find(x=>Object.keys(x)[0]==="gold");
    const s=mData.find(x=>Object.keys(x)[0]==="silver");
    if(g?.gold) upsertQuote("XAUUSD", Number(g.gold), 0);
    if(s?.silver) upsertQuote("XAGUSD", Number(s.silver), 0);
  } catch { setStamp("degraded quote mode"); }
}

function startBinance(){
  const stream="btcusdt@ticker/ethusdt@ticker/bnbusdt@ticker";
  try{
    const ws=new WebSocket(`wss://stream.binance.com:9443/stream?streams=${stream}`);
    ws.onmessage=(e)=>{const d=JSON.parse(e.data)?.data; if(!d?.s) return; upsertQuote(d.s, Number(d.c), Number(d.P));};
    ws.onclose=()=>setTimeout(startBinance,4000);
  }catch{}
}

function startSyntheticDrift(){ setInterval(()=>{Object.entries(state.quotes).forEach(([s,q])=>{const drift=(Math.random()-0.5)*0.004; upsertQuote(s,q.price*(1+drift),q.movePct+drift*100);});},2400); }

function init(){
  seedFallback();
  initAdvancedChart(state.selectedSymbol);
  renderAssets(); renderIndicators(); renderAI(); renderAnnouncements(); renderRegionNews();
  loadHeadlineFeeds(); loadMarketQuotes(); startBinance(); startSyntheticDrift();
  setInterval(loadHeadlineFeeds,70000);
  setInterval(loadMarketQuotes,30000);
}

init();

})();
