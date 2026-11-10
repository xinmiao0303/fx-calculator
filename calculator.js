"use strict";

const moneyFormat = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const form = document.getElementById("converter");
const amount = document.getElementById("amount");
const bankGbp = document.getElementById("bank-gbp");
const bankUsd = document.getElementById("bank-usd");
const wiseRate = document.getElementById("wise-rate");
const viaRates = document.getElementById("via-rates");
const directRates = document.getElementById("direct-rates");
const poundsResult = document.getElementById("pounds-result");
const pounds = document.getElementById("pounds");
const result = document.getElementById("result");
const resultQuote = document.getElementById("result-quote");

function resetResult() {
  const viaPounds = form.elements.route.value === "via-gbp";
  viaRates.hidden = viaRates.disabled = !viaPounds;
  directRates.hidden = directRates.disabled = viaPounds;
  poundsResult.hidden = !viaPounds;
  pounds.value = "待计算";
  result.value = "待计算";
  resultQuote.hidden = true;
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const viaPounds = form.elements.route.value === "via-gbp";
  const cny = amount.valueAsNumber;
  const purchasePrice = (viaPounds ? bankGbp : bankUsd).valueAsNumber;
  const dollarsPerPound = viaPounds ? wiseRate.valueAsNumber : 1;
  if (!(purchasePrice > 0) || !(dollarsPerPound > 0)) {
    resultQuote.textContent = "汇率必须大于 0。";
    resultQuote.hidden = false;
    return;
  }

  const converted = cny / (purchasePrice / 100);
  const usd = converted * dollarsPerPound;
  if (!Number.isFinite(usd)) {
    resultQuote.textContent = "金额或汇率超出范围，请核对输入。";
    resultQuote.hidden = false;
    return;
  }

  if (viaPounds) pounds.value = moneyFormat.format(converted);
  result.value = moneyFormat.format(usd);
  resultQuote.textContent = viaPounds ? "按所填兴业英镑购汇价与 Wise 报价换算" : "按所填兴业美元购汇价换算";
  resultQuote.hidden = false;
});

form.addEventListener("input", resetResult);
resetResult();
