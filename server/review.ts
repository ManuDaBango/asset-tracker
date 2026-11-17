import { fetchAssets, fetchReviewQueue, updateAsset, updateReport, createEvent, createAsset } from "./airtable";
import { alertManagers } from "./notify";

// "Bechtel, Welshpool" -> updates both fields. "Welshpool" alone -> updates both with the same text.
function splitSite(site: string): { "Site: Company": string; "Site: Location": string } {
  const [company, location] = site.includes(",") ? site.split(/,\s*/, 2) : [site, site];
  return { "Site: Company": company, "Site: Location": location ?? company };
}

export type ReviewAction = "approve" | "reject";

export type ReviewOutcome =
  | { ok: true; message: string }
  | { ok: false; status: number; error: string };

export async function resolveReview(
  reportRecordId: string,
  action: "approve" | "reject" | "approve_new",
  reviewer: string,
  note: string,
  newAssetId?: string,
): Promise<ReviewOutcome> {
  // Look the report up ourselves rather than trusting the browser's version of it.
  const [queue, assets] = await Promise.all([fetchReviewQueue(), fetchAssets()]);
  const item = queue.find((i) => i.recordId === reportRecordId);
  if (!item) {
    return {
      ok: false,
      status: 404,
      error: "That report is not waiting for review. Someone may have handled it already.",
    };
  }

  if (action === "reject") {
    await createEvent({
      type: "Report rejected",
      reportRecordId: item.recordId,
      assetRecordId: item.matchedAssetRecordId,
      actor: reviewer,
      note: note || "Rejected in review",
    });
    await updateReport(item.recordId, { "Processing status": "Rejected" });
    return { ok: true, message: "Report rejected." };
  }
  if (action === "approve_new") {
    const id = (newAssetId ?? "").trim();
    if (!id) {
      return { ok: false, status: 400, error: "Enter an Asset ID before approving this as a new asset." };
    }
    if (assets.some((a) => a.assetId === id)) {
      return { ok: false, status: 400, error: `${id} already exists in the register.` };
    }
    const assetRecordId = await createAsset({
      "Asset ID": id,
      "Category": item.category ?? "",
      "Brand": item.brand ?? "",
      "Model": item.model ?? "",
      "Serial number": item.serial ?? "",
      "Description": item.description,
      ...splitSite(item.site),
      "Condition": item.condition ?? "Fair",
      "Lifecycle status": "Active",
      "Sourced": "Found unregistered",
      "Tagged": false,
      "Last verified": new Date().toISOString(),
      "Last verified by": reviewer,
    });
    await createEvent({
      type: "Found unregistered",
      reportRecordId: item.recordId,
      assetRecordId,
      actor: reviewer,
      note: note || "Added to the register from an unmatched report",
    });
    await updateReport(item.recordId, { "Processing status": "Processed", "Matched asset": [assetRecordId] });
    return { ok: true, message: `${id} added to the register.` };
  }
  // Approve means: the reviewer agrees this was a real sighting of the matched asset.
  const asset = assets.find((a) => a.recordId === item.matchedAssetRecordId);
  if (!asset) {
    return { ok: false, status: 400, error: "There is no matched asset to verify. Reject the report instead." };
  }

  // A Disposed asset keeps its status here. Changing that is a deliberate edit in Airtable.
  const wasMissing = asset.lifecycleStatus === "Missing";
  await updateAsset(asset.recordId, {
    "Last verified": new Date().toISOString(),
    "Last verified by": item.reporterName,
    ...splitSite(item.site),
    ...(wasMissing ? { "Lifecycle status": "Active" } : {}),
  });
  await createEvent({
    type: wasMissing ? "Found (was Missing)" : "Sighting verified",
    reportRecordId: item.recordId,
    assetRecordId: asset.recordId,
    actor: reviewer,
    note: note ? `Approved in review: ${note}` : "Approved in review",
  });
  await updateReport(item.recordId, { "Processing status": "Processed" });

  if (wasMissing) {
    try {
      await alertManagers(
        `Found: ${asset.assetId} (${asset.category}) was flagged Missing. ` +
          `Sighted by ${item.reporterName} at ${item.site}. Approved by ${reviewer}.`,
      );
    } catch (error) {
      console.error("Could not send manager alert", error);
    }
  }
  return {
    ok: true,
    message: wasMissing ? `${asset.assetId} verified and marked Active (it was Missing).` : `${asset.assetId} verified.`,
  };
}