import { fetchAssets, createReport, updateAsset, updateReport, createEvent, uploadPhoto } from "./airtable";
import { findExactMatch } from "./match";
import type { MatchResult } from "./match";
import { decide } from "./decide";
import { alertManagers } from "./notify";
import { extractLabel } from "./extract";
import type { LabelFields, Photo, ReportInput } from "./types";

export type PipelineResult = {
  id: string;
  outcome: "verified" | "needs_review";
  matchedAssetId?: string;
  wasMissing?: boolean;
};

export async function processReport(input: ReportInput, photo?: Photo): Promise<PipelineResult> {
  const assets = await fetchAssets();

  // Read the photo, if there is one. A failure here must not lose the report.
  let label: LabelFields | undefined;
  if (photo) {
    try {
      label = await extractLabel(photo);
    } catch (error) {
      console.error("Could not read photo", error);
    }
  }

  // Try the typed code first, then each code read from the photo.
  let match: MatchResult = findExactMatch(input.barcode, assets);
  if (match.kind === "none") {
    match = findExactMatch(input.assetId, assets);
  }
  let matchedFromPhoto = false;
  if (match.kind === "none" && label) {
    for (const code of [label.assetId, label.barcode, label.serial]) {
      const found = findExactMatch(code, assets);
      if (found.kind === "exact") {
        match = found;
        matchedFromPhoto = true;
        break;
      }
    }
  }

  // Save the raw report (and photo) first, so nothing a reporter sends is lost.
  const reportId = await createReport(input, match, label);
  if (photo) {
    try {
      await uploadPhoto(reportId, photo);
    } catch (error) {
      console.error("Could not store photo", error);
    }
  }

  const decision = decide(input, match, { matchedFromPhoto, confidence: label?.confidence });

  if (decision.action === "verify") {
    await updateAsset(decision.asset.recordId, {
      "Last verified": new Date().toISOString(),
      "Last verified by": input.reporterName,
      "Site": input.site,
      ...(decision.wasMissing ? { "Lifecycle status": "Active" } : {}),
    });
    await createEvent({
      type: decision.wasMissing ? "Found (was Missing)" : "Sighting verified",
      reportRecordId: reportId,
      assetRecordId: decision.asset.recordId,
      actor: input.reporterName,
      note: input.description,
    });
    await updateReport(reportId, { "Processing status": "Processed" });

    if (decision.wasMissing) {
      try {
        await alertManagers(
          `Found: ${decision.asset.assetId} (${decision.asset.category}) was flagged Missing. ` +
            `Sighted by ${input.reporterName} at ${input.site}.`,
        );
      } catch (error) {
        console.error("Could not send manager alert", error);
      }
    }

    return {
      id: reportId,
      outcome: "verified",
      matchedAssetId: decision.asset.assetId,
      wasMissing: decision.wasMissing,
    };
  }

  await createEvent({
    type: "Sent to review",
    reportRecordId: reportId,
    assetRecordId: match.kind === "exact" ? match.asset.recordId : undefined,
    actor: input.reporterName,
    note: decision.reason,
  });
  await updateReport(reportId, { "Processing status": "Needs review", "Review reason": decision.reason });
  return { id: reportId, outcome: "needs_review" };
}