import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldScore, scoreCandidate } from "./score";
import type { Asset } from "./types";

const laptop: Asset = {
  recordId: "rec1",
  assetId: "A-001",
  category: "Laptop",
  brand: "Dell",
  model: "Latitude 5520",
  site: "Perth Depot",
  lifecycleStatus: "Active",
  condition: "Good",
};

test("a brand that contains the other counts as a full match", () => {
  assert.equal(fieldScore("Dell", "Dell Inc"), 1);
});

test("short fragments do not get the containment shortcut", () => {
  assert.ok(fieldScore("Pro", "MacBook Pro") < 1);
});

test("right brand, model one digit off, lands between 0.8 and 0.9", () => {
  const r = scoreCandidate({ brand: "Dell Inc", model: "Latitude5530" }, laptop);
  assert.ok(r.score > 0.8 && r.score < 0.9, `got ${r.score}`);
});

test("a different kind of asset scores low", () => {
  const r = scoreCandidate({ brand: "Pelican", model: "1450 case" }, laptop);
  assert.ok(r.score < 0.4, `got ${r.score}`);
});

test("missing clues are skipped, not punished", () => {
  const r = scoreCandidate({ brand: "Dell" }, laptop);
  assert.equal(r.score, 1);
  assert.deepEqual(r.fieldsUsed, ["brand"]);
});