"use strict";

const rateUrl = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const refreshInterval = 60_000;
const rateFormat = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
const moneyFormat = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const timeFormat = new Intl.DateTimeFormat("zh-CN", { timeStyle: "medium", hour12: false });
const form = document.getElementById("converter");
const amount = document.getElementById("amount");
const manual = document.getElementById("manual");
const automaticRates = document.getElementById("automatic-rates");
const manualRates = document.getElementById("manual-rates");
const manualCnyGbp = document.getElementById("manual-cny-gbp");
const manualGbpUsd = document.getElementById("manual-gbp-usd");
const manualCnyUsd = document.getElementById("manual-cny-usd");
const viaRates = document.getElementById("via-rates");
const directRates = document.getElementById("direct-rates");
const calculate = document.getElementById("calculate");
const rateStatus = document.getElementById("rate-status");
const poundsResult = document.getElementById("pounds-result");
const pounds = document.getElementById("pounds");
const result = document.getElementById("result");
const resultQuote = document.getElementById("result-quote");
let quote;
let refreshing = false;
let lastRequest = 0;

function updateCalculateButton() {
  calculate.disabled = !manual.checked && !quote;
}

async function refreshQuote() {
  if (manual.checked || refreshing) return;
  refreshing = true;
  lastRequest = Date.now();
  if (!quote) rateStatus.textContent = "正在获取汇率…";
  try {
    const response = await fetch(rateUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error("Quote request failed");
    const { data } = await response.json();
    const cny = Number(data?.rates?.CNY);
    const gbp = Number(data?.rates?.GBP);
    const rates = { cnyGbp: gbp / cny, gbpUsd: 1 / gbp, cnyUsd: 1 / cny };
    if (data?.currency !== "USD" || !Object.values(rates).every(rate => Number.isFinite(rate) && rate > 0)) {
      throw new Error("Invalid quote");
    }
    quote = { ...rates, fetchedAt: Date.now() };
    document.getElementById("cny-gbp").textContent = rateFormat.format(rates.cnyGbp);
    document.getElementById("gbp-usd").textContent = rateFormat.format(rates.gbpUsd);
    document.getElementById("cny-usd").textContent = rateFormat.format(rates.cnyUsd);
    rateStatus.textContent = `取数时间 ${timeFormat.format(quote.fetchedAt)}`;
  } catch {
    quote = undefined;
    for (const id of ["cny-gbp", "gbp-usd", "cny-usd"]) {
      document.getElementById(id).textContent = "暂无";
    }
    rateStatus.textContent = "汇率获取失败，页面将自动重试。也可以手动输入汇率。";
  } finally {
    refreshing = false;
    updateCalculateButton();
  }
}

function resetResult() {
  const viaPounds = form.elements.route.value === "via-gbp";
  automaticRates.hidden = manual.checked;
  manualRates.hidden = !manual.checked;
  viaRates.hidden = viaRates.disabled = !manual.checked || !viaPounds;
  directRates.hidden = directRates.disabled = !manual.checked || viaPounds;
  poundsResult.hidden = !viaPounds;
  pounds.value = "待计算";
  result.value = "待计算";
  resultQuote.hidden = true;
  updateCalculateButton();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!manual.checked && !quote) return;
  if (!manual.checked && Date.now() - quote.fetchedAt > 2 * refreshInterval) {
    quote = undefined;
    updateCalculateButton();
    refreshQuote();
    return;
  }

  const viaPounds = form.elements.route.value === "via-gbp";
  const cny = amount.valueAsNumber;
  const rates = manual.checked ? {
    cnyGbp: manualCnyGbp.valueAsNumber,
    gbpUsd: manualGbpUsd.valueAsNumber,
    cnyUsd: manualCnyUsd.valueAsNumber,
  } : quote;
  const firstRate = viaPounds ? rates.cnyGbp : rates.cnyUsd;
  const secondRate = viaPounds ? rates.gbpUsd : 1;
  if (!(firstRate > 0) || !(secondRate > 0)) {
    resultQuote.textContent = "汇率必须大于 0。";
    resultQuote.hidden = false;
    return;
  }

  const converted = cny * firstRate;
  // The Coinbase legs share a snapshot, so both paths have the same USD cross rate.
  const usd = manual.checked ? converted * secondRate : cny * rates.cnyUsd;
  if (!Number.isFinite(converted) || !Number.isFinite(usd)) {
    resultQuote.textContent = "金额或汇率超出范围，请核对输入。";
    resultQuote.hidden = false;
    return;
  }

  if (viaPounds) pounds.value = moneyFormat.format(converted);
  result.value = moneyFormat.format(usd);
  resultQuote.textContent = manual.checked
    ? "按手动输入的汇率换算"
    : `按 ${timeFormat.format(quote.fetchedAt)} 取得的 Coinbase 汇率换算`;
  resultQuote.hidden = false;
});

form.addEventListener("input", resetResult);
manual.addEventListener("change", () => {
  if (!manual.checked && (!quote || Date.now() - lastRequest >= refreshInterval)) refreshQuote();
});

function refreshIfVisible() {
  if (!document.hidden && Date.now() - lastRequest >= refreshInterval) refreshQuote();
}

document.addEventListener("visibilitychange", refreshIfVisible);
setInterval(refreshIfVisible, refreshInterval);
resetResult();
refreshQuote();
