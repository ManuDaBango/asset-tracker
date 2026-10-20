import type { Asset, Confidence, ReportInput } from "./types";
import type { MatchResult } from "./match";

export type Decision =
  | { action: "verify"; asset: Asset; wasMissing: boolean }
  | { action: "review"; reason: string };

export type PhotoContext = { matchedFromPhoto: boolean; confidence?: Confidence };

export function decide(input: ReportInput, match: MatchResult, photo?: PhotoContext): Decision {
  if (input.reporterRole === "Client") {
    return { action: "review", reason: "Client reports are always reviewed" };
  }
  if (match.kind === "none") {
    return { action: "review", reason: "No matching asset found" };
  }
  if ((input.quantity ?? 1) > 1) {
    return {
      action: "review",
      reason: `Report covers ${input.quantity} items, which cannot verify a single asset record`,
    };
  }
  if (match.asset.lifecycleStatus === "Disposed") {
    return { action: "review", reason: "Asset is recorded as disposed" };
  }
  if (photo?.matchedFromPhoto && photo.confidence !== "High") {
    return {
      action: "review",
      reason: `Matched from a photo read with ${photo.confidence ?? "unknown"} confidence`,
    };
  }
  return {
    action: "verify",
    asset: match.asset,
    wasMissing: match.asset.lifecycleStatus === "Missing",
  };
}