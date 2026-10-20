import type { Confidence, LabelFields } from "./types";

const CONFIDENCES: readonly Confidence[] = ["High", "Medium", "Low"];

function text(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed !== "" && trimmed.length <= 200 ? trimmed : undefined;
}

export function cleanLabelFields(input: unknown): LabelFields {
  const o = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const confidence = CONFIDENCES.includes(o.confidence as Confidence)
    ? (o.confidence as Confidence)
    : "Low";
  return {
    assetId: text(o.assetId),
    barcode: text(o.barcode),
    serial: text(o.serial),
    brand: text(o.brand),
    model: text(o.model),
    category: text(o.category),
    confidence,
    notes: text(o.notes) ?? "",
  };
}