"use strict";

const rateUrl = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const refreshInterval = 60_000;
const rateFormat = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const moneyFormat = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFormat = new Intl.DateTimeFormat("zh-CN", { timeStyle: "medium", hour12: false });
const form = document.getElementById("converter");
const amount = document.getElementById("amount");
const calculate = document.getElementById("calculate");
const rateStatus = document.getElementById("rate-status");
const result = document.getElementById("result");
const resultQuote = document.getElementById("result-quote");
let quote;
let refreshing = false;
let lastRequest = 0;

async function refreshQuote() {
  if (refreshing) return;
  refreshing = true;
  lastRequest = Date.now();
  try {
    const response = await fetch(rateUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Quote request failed");
    const { data } = await response.json();
    const usdCny = Number(data?.rates?.CNY);
    const usdEur = Number(data?.rates?.EUR);
    if (data?.currency !== "USD" || !Number.isFinite(usdCny) || usdCny <= 0 ||
        !Number.isFinite(usdEur) || usdEur <= 0) {
      throw new Error("Invalid quote");
    }

    const rates = {
      "cny-eur": usdEur / usdCny,
      "eur-usd": 1 / usdEur,
      "cny-usd": 1 / usdCny,
    };
    if (!Object.values(rates).every(rate => Number.isFinite(rate) && rate > 0)) {
      throw new Error("Invalid cross rate");
    }
    quote = { usdPerCny: rates["cny-usd"], fetchedAt: Date.now() };
    for (const [id, rate] of Object.entries(rates)) {
      document.getElementById(id).textContent = rateFormat.format(rate);
    }
    rateStatus.textContent = `取数时间 ${timeFormat.format(quote.fetchedAt)}`;
    calculate.disabled = false;
  } catch {
    const previousQuote = quote ? `保留 ${timeFormat.format(quote.fetchedAt)} 的报价。` : "";
    calculate.disabled = true;
    rateStatus.textContent = `汇率更新失败。${previousQuote}页面将自动重试。`;
  } finally {
    refreshing = false;
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (calculate.disabled || !quote) return;
  if (Date.now() - quote.fetchedAt > 2 * refreshInterval) {
    rateStatus.textContent = "报价已过期，正在更新，请稍后重新计算。";
    calculate.disabled = true;
    refreshQuote();
    return;
  }

  const usd = amount.valueAsNumber * quote.usdPerCny;
  if (!Number.isFinite(usd)) {
    result.value = "金额超出范围";
    resultQuote.hidden = true;
    return;
  }
  result.value = moneyFormat.format(usd);
  resultQuote.textContent = `按 ${timeFormat.format(quote.fetchedAt)} 取得的报价换算`;
  resultQuote.hidden = false;
});

amount.addEventListener("input", () => {
  result.value = "待计算";
  resultQuote.hidden = true;
});

function refreshIfVisible() {
  if (!document.hidden && Date.now() - lastRequest >= refreshInterval) refreshQuote();
}

document.addEventListener("visibilitychange", refreshIfVisible);
setInterval(refreshIfVisible, refreshInterval);
refreshQuote();
