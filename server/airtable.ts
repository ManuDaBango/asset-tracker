import type { MatchResult } from "./match";
import { ROLES } from "./types";
import type { Asset, ReportInput, NewEvent, BotUser, ReporterRole, LabelFields, Photo, ReviewItem } from "./types";


type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

type AirtableListResponse = {
  records: AirtableRecord[];
};

function getConfig() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const token = process.env.AIRTABLE_TOKEN;
  if (!baseId || !token) {
    throw new Error("Missing AIRTABLE_BASE_ID or AIRTABLE_TOKEN in .env");
  }
  return { baseId, token };
}

export async function fetchAssets(): Promise<Asset[]> {
  const { baseId, token } = getConfig();
  
  const url = `https://api.airtable.com/v0/${baseId}/Assets`;
  console.log("Calling:", url);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as AirtableListResponse;
  return data.records.map(toAsset);
}

function toAsset(record: AirtableRecord): Asset {
  const f = record.fields;
  return {
    recordId: record.id,
    assetId: String(f["Asset ID"] ?? ""),
    category: String(f["Category"] ?? ""),
    brand: String(f["Brand"] ?? ""),
    model: String(f["Model"] ?? ""),
    site: String(f["Site"] ?? ""),
    lifecycleStatus: f["Lifecycle status"] as Asset["lifecycleStatus"],
    condition: f["Condition"] as Asset["condition"],
    barcode: f["Barcode"] ? String(f["Barcode"]) : undefined,
    serial: f["Serial number"] ? String(f["Serial number"]) : undefined,
    department: f["Department"] ? String(f["Department"]) : undefined,
    miscSpec: f["Misc spec"] ? String(f["Misc spec"]) : undefined,
  };
}

export async function createReport(input: ReportInput, match: MatchResult, label?: LabelFields): Promise<string> {
  const { baseId, token } = getConfig();

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/Asset_Reports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        "Channel": input.channel,
        "Reporter name": input.reporterName,
        "Reporter role": input.reporterRole,
        "Site": input.site,
        "Description": input.description,
        "Barcode": input.barcode ?? "",
        ...(input.assetId ? { "Asset ID": input.assetId } : {}),
        ...(input.status ? { "Reported Status": input.status } : {}),
        ...(input.quantity !== undefined ? { "Quantity": input.quantity } : {}),
        ...(input.category ? { "Category": input.category } : {}),
        ...(input.brand ? { "Brand": input.brand } : {}),
        ...(input.model ? { "Model": input.model } : {}),
        ...(input.miscSpec ? { "Misc spec": input.miscSpec } : {}),
        ...(input.department ? { "Department": input.department } : {}),
        ...(input.condition ? { "Condition": input.condition } : {}),
        "Processing status": "Received",
        "Match result": match.kind === "exact" ? "Exact" : "None",
        ...(match.kind === "exact" ? { "Matched asset": [match.asset.recordId] } : {}),
        ...(label
          ? { "Extracted fields": JSON.stringify(label, null, 2), "Extraction confidence": label.confidence }
          : {}),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

// added after creating decide.ts in Step 7. refer to notes.
async function airtableRequest(
  path: string,
  method: "POST" | "PATCH",
  fields: Record<string, unknown>,
): Promise<{ id: string }> {
  const { baseId, token } = getConfig();
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }
  return (await response.json()) as { id: string };
}

export async function updateAsset(recordId: string, fields: Record<string, unknown>): Promise<void> {
  await airtableRequest(`Assets/${recordId}`, "PATCH", fields);
}

export async function updateReport(recordId: string, fields: Record<string, unknown>): Promise<void> {
  await airtableRequest(`Asset_Reports/${recordId}`, "PATCH", fields);
}

export async function createEvent(e: NewEvent): Promise<string> {
  const fields: Record<string, unknown> = {
    "Event type": e.type,
    "Report": [e.reportRecordId],
    "Actor": e.actor,
    "Note": e.note,
  };
  if (e.assetRecordId) {
    fields["Asset"] = [e.assetRecordId];
  }
  const created = await airtableRequest("Events", "POST", fields);
  return created.id;
}

// created during Telegram bot
export async function fetchBotUsers(): Promise<BotUser[]> {
  const { baseId, token } = getConfig();
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/Users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as AirtableListResponse;

  const users: BotUser[] = [];
  for (const record of data.records) {
    const f = record.fields;
    const telegramId = String(f["Telegram ID"] ?? "").trim();
    const role = f["Role"] as ReporterRole;
    if (!telegramId || !ROLES.includes(role)) {
      continue;
    }
    users.push({
      name: String(f["Name"] ?? "").trim() || "Unknown",
      telegramId,
      role,
      receivesAlerts: f["Receives alerts"] === true,
    });
  }
  return users;
}

// added after step 9 photos
export async function uploadPhoto(reportRecordId: string, photo: Photo): Promise<void> {
  const { baseId, token } = getConfig();
  const extension = photo.mediaType.split("/")[1];
  const response = await fetch(
    `https://content.airtable.com/v0/${baseId}/${reportRecordId}/Photos/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: photo.mediaType,
        file: photo.base64,
        filename: `report-${reportRecordId}.${extension}`,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }
}

// added for the review screen
export async function fetchReviewQueue(): Promise<ReviewItem[]> {
  const { baseId, token } = getConfig();
  const params = new URLSearchParams({
    filterByFormula: '{Processing status}="Needs review"',
    "sort[0][field]": "Received at",
    "sort[0][direction]": "desc",
  });
  const response = await fetch(`https://api.airtable.com/v0/${baseId}/Asset_Reports?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Airtable said ${response.status}: ${await response.text()}`);
  }
  const data = (await response.json()) as AirtableListResponse;
  return data.records.map(toReviewItem);
}

function toReviewItem(record: AirtableRecord): ReviewItem {
  const f = record.fields;
  const text = (name: string) => (f[name] ? String(f[name]) : undefined);
  const matched = f["Matched asset"] as string[] | undefined;
  const photos = f["Photos"] as { url: string }[] | undefined;
  return {
    recordId: record.id,
    receivedAt: text("Received at"),
    channel: String(f["Channel"] ?? ""),
    reporterName: String(f["Reporter name"] ?? ""),
    reporterRole: String(f["Reporter role"] ?? ""),
    site: String(f["Site"] ?? ""),
    description: String(f["Description"] ?? ""),
    barcode: text("Barcode"),
    assetId: text("Asset ID"),
    category: text("Category"),
    brand: text("Brand"),
    model: text("Model"),
    miscSpec: text("Misc spec"),
    quantity: typeof f["Quantity"] === "number" ? f["Quantity"] : undefined,
    reportedStatus: text("Reported Status"),
    condition: text("Condition"),
    department: text("Department"),
    matchResult: String(f["Match result"] ?? ""),
    reviewReason: text("Review reason"),
    photoUrl: photos?.[0]?.url,
    matchedAssetRecordId: matched?.[0],
  };
}