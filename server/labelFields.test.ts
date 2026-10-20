import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanLabelFields } from "./labelFields";

test("keeps clean values and trims them", () => {
  const r = cleanLabelFields({ assetId: "  AST-0003 ", brand: "Charlatte", confidence: "High", notes: "Tug" });
  assert.equal(r.assetId, "AST-0003");
  assert.equal(r.brand, "Charlatte");
  assert.equal(r.confidence, "High");
});

test("an unknown confidence becomes Low", () => {
  assert.equal(cleanLabelFields({ confidence: "Certain" }).confidence, "Low");
});

test("junk input and non-text values are ignored", () => {
  assert.equal(cleanLabelFields(null).confidence, "Low");
  assert.equal(cleanLabelFields({ assetId: 42 }).assetId, undefined);
});

test("over-long text is dropped", () => {
  assert.equal(cleanLabelFields({ model: "x".repeat(500) }).model, undefined);
});