import { CHANNELS, ROLES, DEPARTMENTS, REPORTED_STATUSES, CONDITIONS } from "./types";
import type { Channel, ReporterRole, ReportInput, Photo, PhotoMediaType } from "./types";

type ParseResult =
  | { ok: true; value: ReportInput }
  | { ok: false; error: string };

// Text box: trimmed text, or undefined when blank or missing.
function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// Dropdown: blank is fine, anything not on the list is rejected.
function optionalChoice<T extends string>(
  value: unknown,
  allowed: readonly T[],
): { ok: true; value: T | undefined } | { ok: false } {
  const text = optionalText(value);
  if (text === undefined) return { ok: true, value: undefined };
  const found = allowed.find((option) => option === text);
  return found ? { ok: true, value: found } : { ok: false };
}

export function parseReportInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  const channel = b.channel as Channel;
  if (!CHANNELS.includes(channel)) {
    return { ok: false, error: `channel must be one of: ${CHANNELS.join(", ")}` };
  }

  const reporterRole = b.reporterRole as ReporterRole;
  if (!ROLES.includes(reporterRole)) {
    return { ok: false, error: `reporterRole must be one of: ${ROLES.join(", ")}` };
  }

  const reporterName = typeof b.reporterName === "string" ? b.reporterName.trim() : "";
  const site = typeof b.site === "string" ? b.site.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!reporterName || !site || !description) {
    return { ok: false, error: "reporterName, site and description are required" };
  }

  const barcode = optionalText(b.barcode);
  const assetId = optionalText(b.assetId);
  const category = optionalText(b.category);
  const brand = optionalText(b.brand);
  const model = optionalText(b.model);
  const miscSpec = optionalText(b.miscSpec);

  const status = optionalChoice(b.status, REPORTED_STATUSES);
  if (!status.ok) {
    return { ok: false, error: `status must be one of: ${REPORTED_STATUSES.join(", ")}` };
  }
  const department = optionalChoice(b.department, DEPARTMENTS);
  if (!department.ok) {
    return { ok: false, error: `department must be one of: ${DEPARTMENTS.join(", ")}` };
  }
  const condition = optionalChoice(b.condition, CONDITIONS);
  if (!condition.ok) {
    return { ok: false, error: `condition must be one of: ${CONDITIONS.join(", ")}` };
  }

  let quantity: number | undefined;
  if (b.quantity !== undefined) {
    if (typeof b.quantity !== "number" || !Number.isInteger(b.quantity) || b.quantity < 1 || b.quantity > 10000) {
      return { ok: false, error: "quantity must be a whole number from 1 to 10000" };
    }
    quantity = b.quantity;
  }

  return {
    ok: true,
    value: {
      channel, reporterName, reporterRole, site, description,
      barcode, assetId, status: status.value, quantity, category, brand, model, miscSpec,
      department: department.value, condition: condition.value,
    },
  };
}

export const PHOTO_TYPES: readonly PhotoMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BASE64_LENGTH = 6_500_000; // roughly a 4.8 MB image

// added after photo in Step 9
export function parsePhoto(
  value: unknown,
): { ok: true; photo?: Photo } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true };
  }
  if (typeof value !== "object") {
    return { ok: false, error: "photo must be an object" };
  }
  const v = value as Record<string, unknown>;
  const mediaType = v.mediaType as PhotoMediaType;
  if (!PHOTO_TYPES.includes(mediaType)) {
    return { ok: false, error: `photo type must be one of: ${PHOTO_TYPES.join(", ")}` };
  }
  if (typeof v.base64 !== "string" || v.base64.length === 0) {
    return { ok: false, error: "photo data is missing" };
  }
  if (v.base64.length > MAX_BASE64_LENGTH) {
    return { ok: false, error: "photo is too large" };
  }
  return { ok: true, photo: { mediaType, base64: v.base64 } };
}