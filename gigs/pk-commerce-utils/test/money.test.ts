import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPKR, parseAmount } from "../src/index.js";

test("formatPKR", () => {
  assert.equal(formatPKR(3200), "Rs 3,200");
  assert.equal(formatPKR(125000), "Rs 125,000");
  assert.equal(formatPKR(125000, { lakh: true }), "Rs 1,25,000");
  assert.equal(formatPKR(-500), "-Rs 500");
  assert.equal(formatPKR(99.5, { decimals: 2 }), "Rs 99.50");
});

test("parseAmount understands how customers write amounts", () => {
  const cases: [string, number][] = [
    ["3,200", 3200],
    ["Rs. 1500/-", 1500],
    ["1.5k", 1500],
    ["2 hazar", 2000],
    ["2 hazaar 500", 2500],
    ["dhai hazar", 2500],
    ["dedh sau", 150],
    ["sawa do sau", 225],
    ["paune 2 hazar", 1750],
    ["2 lakh 50 hazar", 250000],
    ["1,25,000", 125000],
    ["do darjan", 24],
    ["darjan", 12],
    ["teen", 3],
    ["PKR 850", 850],
  ];
  for (const [text, expected] of cases) assert.equal(parseAmount(text), expected, text);
  assert.equal(parseAmount("no amount here"), null);
  assert.equal(parseAmount(""), null);
});
