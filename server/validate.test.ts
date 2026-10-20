import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReportInput } from "./validate";

const base = {
  channel: "Web", reporterName: "Sam", reporterRole: "Employee",
  site: "Perth Depot", description: "Seen it",
};

test("a report with none of the new fields still passes", () => {
  assert.equal(parseReportInput(base).ok, true);
});

test("new fields are trimmed and passed through", () => {
  const r = parseReportInput({
    ...base, assetId: "  AST-0001 ", brand: "Camisco", model: "IN24455",
    miscSpec: "Red, wheeled, closed lid", department: "Operations",
    status: "Active", condition: "Good", quantity: 4,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.assetId, "AST-0001");
    assert.equal(r.value.department, "Operations");
    assert.equal(r.value.quantity, 4);
  }
});

test("blank dropdowns count as not provided", () => {
  assert.equal(parseReportInput({ ...base, department: "", status: "" }).ok, true);
});

test("a department that is not on the list is rejected", () => {
  assert.equal(parseReportInput({ ...base, department: "Catering" }).ok, false);
});

test("quantity must be a whole number of 1 or more", () => {
  for (const bad of [0, -2, 2.5, "4", null]) {
    assert.equal(parseReportInput({ ...base, quantity: bad }).ok, false, `accepted ${String(bad)}`);
  }
});