import { test } from "node:test";
import assert from "node:assert/strict";
import { similarity } from "./similarity"; // match your existing tests' import style

test("same text with different spacing/case is identical", () => {
  assert.equal(similarity("Latitude 5520", "latitude5520"), 1);
});

test("one digit different is still very similar", () => {
  const s = similarity("Latitude 5520", "Latitude 5530");
  assert.ok(s > 0.8 && s < 1, `got ${s}`);
});

test("unrelated text scores low", () => {
  assert.ok(similarity("Latitude 5520", "Pelican case") < 0.2);
});

test("empty text scores 0", () => {
  assert.equal(similarity("", "Dell"), 0);
});
