import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTelegramText } from "./telegramParse";

test("reads site, code and description from separate lines", () => {
  const r = parseTelegramText("site: Perth Airport\ncode: AST-0003\nYellow tug near gate 4");
  assert.equal(r.site, "Perth Airport");
  assert.equal(r.barcode, "AST-0003");
  assert.equal(r.description, "Yellow tug near gate 4");
});

test("is relaxed about case and spacing, and accepts barcode: and id:", () => {
  assert.equal(parseTelegramText("SITE :  Kwinana yard").site, "Kwinana yard");
  assert.equal(parseTelegramText("barcode: 9300001234567").barcode, "9300001234567");
  assert.equal(parseTelegramText("ID: AST-0001").barcode, "AST-0001");
});

test("plain text with no markers becomes the description", () => {
  const r = parseTelegramText("Saw a compactor outside the workshop");
  assert.equal(r.site, undefined);
  assert.equal(r.barcode, undefined);
  assert.equal(r.description, "Saw a compactor outside the workshop");
});

test("blank lines are ignored", () => {
  assert.equal(parseTelegramText("\n\nHello\n\n").description, "Hello");
});