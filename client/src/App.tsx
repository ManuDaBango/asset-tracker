import { useState } from "react";
import type { FormEvent } from "react";

const ROLES = ["Employee", "Auditor", "Client"] as const;
type Role = (typeof ROLES)[number];
const DEPARTMENTS = ["Operations", "Finance", "Workshop", "IT", "Marketing"] as const;
const STATUSES = ["Active", "Missing", "Disposed"] as const;
const CONDITIONS = ["New", "Good", "Fair", "Needs R&M", "Damaged", "End of life"] as const;

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; id: string; outcome: "verified" | "needs_review"; matchedAssetId?: string; wasMissing?: boolean }
  | { kind: "error"; message: string };

// added in Step 9: part 12
async function shrinkImage(file: File): Promise<{ mediaType: "image/jpeg"; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas not available");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", base64: dataUrl.split(",")[1] };
}


export default function App() {
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] = useState<Role>("Employee");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [barcode, setBarcode] = useState("");
  const [assetId, setAssetId] = useState("");
  const [reportedStatus, setReportedStatus] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [miscSpec, setMiscSpec] = useState("");
  const [department, setDepartment] = useState("");
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ kind: "sending" });

    let photo: { mediaType: "image/jpeg"; base64: string } | undefined;
    if (photoFile) {
      try {
        photo = await shrinkImage(photoFile);
      } catch {
        setStatus({ kind: "error", message: "Could not read that photo" });
        return;
      }
    }

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "Web",
          reporterName,
          reporterRole,
          site,
          description: description.trim() || (photoFile ? "Photo report" : ""),
          barcode,
          assetId,
          status: reportedStatus,
          quantity: quantity.trim() ? Number(quantity) : undefined,
          category,
          brand,
          model,
          miscSpec,
          department,
          condition,
          photo,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ kind: "error", message: data.error ?? "Something went wrong" });
        return;
      }
      setStatus({
        kind: "done",
        id: data.id,
        outcome: data.outcome,
        matchedAssetId: data.matchedAssetId,
        wasMissing: data.wasMissing,
      });
      setDescription("");
      setBarcode("");
      setAssetId("");
      setReportedStatus("");
      setQuantity("1");
      setCategory("");
      setBrand("");
      setModel("");
      setMiscSpec("");
      setDepartment("");
      setCondition("");
      setPhotoFile(null);
      setFileKey((k) => k + 1);
    } catch {
      setStatus({ kind: "error", message: "Could not reach the server" });
    }
  }

  return (
    <main>
      <h1>Report an asset</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Your name
          <input value={reporterName} onChange={(e) => setReporterName(e.target.value)} />
        </label>

        <label>
          Your role
          <select value={reporterRole} onChange={(e) => setReporterRole(e.target.value as Role)}>
            {ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>

        <label>
          Site
          <input value={site} onChange={(e) => setSite(e.target.value)} />
        </label>

        <label>
          Barcode (optional)
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </label>

        <label>
          Asset ID (optional)
          <input value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        </label>

        <label>
          Category (optional)
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>

        <label>
          Asset you are reporting
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <label>
          Brand (optional)
          <input value={brand} onChange={(e) => setBrand(e.target.value)} />
        </label>

        <label>
          Model (optional)
          <input value={model} onChange={(e) => setModel(e.target.value)} />
        </label>

        <label>
          Misc spec (optional): colour, lid type, wheels, anything else that identifies it
          <textarea rows={3} value={miscSpec} onChange={(e) => setMiscSpec(e.target.value)} />
        </label>

        <label>
          Quantity
          <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        {Number(quantity) > 1 && (
          <p>More than one item will be sent for review. For expensive items, report each one separately with its own photo.</p>
        )}

        <label>
          Status (what you see)
          <select value={reportedStatus} onChange={(e) => setReportedStatus(e.target.value)}>
            <option value="">Select...</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        <label>
          Condition
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="">Select...</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label>
          Department
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Select...</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Photo of the label or asset (optional)
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Sending..." : "Send report"}
        </button>
      </form>

      {status.kind === "done" && (
        <p className="ok">
          {status.outcome === "verified"
            ? `Thanks. Asset ${status.matchedAssetId} has been verified.${status.wasMissing ? " It was flagged Missing and is now marked Active." : ""}`
            : "Report received and sent for review."}
          {" "}Reference: {status.id}
        </p>
      )}
      {status.kind === "error" && <p className="bad">{status.message}</p>}
    </main>
  );
}