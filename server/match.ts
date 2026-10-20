import type { Asset } from "./types";

export type MatchResult =
  | { kind: "exact"; asset: Asset; matchedOn: "Barcode" | "Asset ID" | "Serial" }
  | { kind: "none" };

  // normalise makes codes comparable
function normalise(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
// either an exact match or none. 
export function findExactMatch(code: string | undefined, assets: Asset[]): MatchResult {
  const wanted = normalise(code ?? "");

  // Empty-code guard is important otherwise it would match to a line with no barcode
  if (wanted === "") {
    return { kind: "none" };
  } 

  for (const asset of assets) {
    if (asset.barcode && normalise(asset.barcode) === wanted) {
      return { kind: "exact", asset, matchedOn: "Barcode" };
    }
    if (normalise(asset.assetId) === wanted) {
      return { kind: "exact", asset, matchedOn: "Asset ID" };
    }
    if (asset.serial && normalise(asset.serial) === wanted) {
      return { kind: "exact", asset, matchedOn: "Serial" };
    }
  }
  return { kind: "none" };
}