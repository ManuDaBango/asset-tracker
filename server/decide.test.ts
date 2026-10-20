import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "./decide";
import type { Asset, Confidence, ReportInput } from "./types";
import type { MatchResult } from "./match";

const asset = (overrides: Partial<Asset> = {}): Asset => ({
  recordId: "rec1",
  assetId: "AST-0001",
  category: "Landfill compactor",
  brand: "Bomag",
  model: "BC 772",
  site: "Perth Depot",
  lifecycleStatus: "Active",
  condition: "Good",
  ...overrides,
});

const report = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  channel: "Web",
  reporterName: "Sam",
  reporterRole: "Auditor",
  site: "Perth Depot",
  description: "Seen it",
  ...overrides,
});

const exact = (a: Asset): MatchResult => ({ kind: "exact", asset: a, matchedOn: "Asset ID" });

test("a client report is always reviewed, even on an exact match", () => {
  const d = decide(report({ reporterRole: "Client" }), exact(asset()));
  assert.equal(d.action, "review");
});

test("an auditor's exact match is verified", () => {
  const d = decide(report(), exact(asset()));
  assert.equal(d.action, "verify");
  if (d.action === "verify") {
    assert.equal(d.wasMissing, false);
  }
});

test("a sighting of a Missing asset is verified and flagged as found", () => {
  const d = decide(report({ reporterRole: "Employee" }), exact(asset({ lifecycleStatus: "Missing" })));
  assert.equal(d.action, "verify");
  if (d.action === "verify") {
    assert.equal(d.wasMissing, true);
  }
});

test("no match goes to review", () => {
  assert.equal(decide(report(), { kind: "none" }).action, "review");
});

test("a Disposed asset goes to review", () => {
  const d = decide(report(), exact(asset({ lifecycleStatus: "Disposed" })));
  assert.equal(d.action, "review");
});

// added after step 9: photos
test("a match read from a photo with Medium confidence goes to review", () => {
  const d = decide(report(), exact(asset()), { matchedFromPhoto: true, confidence: "Medium" });
  assert.equal(d.action, "review");
});

test("a match read from a photo with High confidence is verified", () => {
  const d = decide(report(), exact(asset()), { matchedFromPhoto: true, confidence: "High" });
  assert.equal(d.action, "verify");
});

test("a report covering several items is reviewed even on an exact match", () => {
  const d = decide(report({ quantity: 4 }), exact(asset()));
  assert.equal(d.action, "review");
});