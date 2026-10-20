import { test } from "node:test";
import assert from "node:assert/strict";
import { findExactMatch } from "./match";
import type { Asset } from "./types";

const sample: Asset[] = [
  { recordId: "rec1", assetId: "AST-0001", category: "Landfill compactor", brand: "Bomag", model: "BC 772", site: "Perth Depot", lifecycleStatus: "Active", condition: "Good", barcode: "9300001234567" },
  { recordId: "rec2", assetId: "AST-0003", category: "Baggage tug", brand: "Charlatte", model: "T135", site: "Perth Airport", lifecycleStatus: "Missing", condition: "Good" },
];

test("finds an asset by barcode", () => {
  const result = findExactMatch("9300001234567", sample);
  assert.equal(result.kind, "exact");
});

test("finds an asset by Asset ID, ignoring case and dashes", () => {
  const result = findExactMatch("ast0003", sample);
  assert.equal(result.kind, "exact");
});

test("returns none for an unknown code", () => {
  assert.equal(findExactMatch("NOPE-999", sample).kind, "none");
});

test("returns none for an empty code, even when an asset has no barcode", () => {
  assert.equal(findExactMatch("", sample).kind, "none");
  assert.equal(findExactMatch(undefined, sample).kind, "none");
});

test("an empty code never matches an asset with a blank Asset ID", () => {
  const withBlank: Asset[] = [
    { recordId: "rec3", assetId: "", category: "", brand: "", model: "", site: "", lifecycleStatus: "Unverified", condition: "Good" },
  ];
  assert.equal(findExactMatch("", withBlank).kind, "none");
});

// Manu: added while adding photos in Step 9
test("finds an asset by serial number", () => {
  const withSerial: Asset[] = [{ ...sample[0], serial: "SN-77-A1" }];
  const result = findExactMatch("sn77a1", withSerial);
  assert.equal(result.kind, "exact");
  if (result.kind === "exact") {
    assert.equal(result.matchedOn, "Serial");
  }
});