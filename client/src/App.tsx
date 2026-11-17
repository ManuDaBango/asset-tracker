import { useState } from "react";
import type { FormEvent } from "react";

const ROLES = ["Employee", "Auditor", "Client"] as const;
type Role = (typeof ROLES)[number];
const DEPARTMENTS = ["Operations", "Finance", "Workshop", "IT", "Marketing"] as const;
const CONDITIONS = ["New", "Good", "Fair", "Needs R&M", "Damaged", "End of life", "Missing", "Disposed"] as const;

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

// Reads the ID from an address like /a/AST-000123. Returns "" if there isn't one.
function assetIdFromPath(): string {
  const match = window.location.pathname.match(/^\/a\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export default function App() {
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] = useState<Role>("Employee");
  const [site, setSite] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState(assetIdFromPath);
  const [quantity, setQuantity] = useState("1");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
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
          assetId,
          quantity: quantity.trim() ? Number(quantity) : undefined,
          category,
          brand,
          model,
          serial,
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
      // Tell the alt108 website (if it is showing this app in a frame) to refresh the register
      window.parent.postMessage({ type: "asset-report-submitted" }, "*");
      setDescription("");
      setAssetId("");
      setQuantity("1");
      setCategory("");
      setBrand("");
      setModel("");
      setSerial("");
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
      <header className="page-header">
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 4H8a4 4 0 0 0-4 4v12l20.6 20.6a4 4 0 0 0 5.65 0l9.95-9.95a4 4 0 0 0 0-5.65L20 4Z" stroke="#0d9488" strokeWidth="3" strokeLinejoin="round"/>
          <circle cx="14" cy="14" r="3" fill="#0d9488"/>
          <path d="M16 30l6 6 10-10" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <h1>Report an asset</h1>
          <p>Spot it, scan it, sorted — takes under a minute.</p>
        </div>
      </header>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          Start here: photo of the label or asset (optional)
          <input
            key={fileKey}
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </label>

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
          Site (Client, Branch, Suburb etc)
          <input value={site} onChange={(e) => setSite(e.target.value)} />
        </label>

        <label>
          Asset ID (optional)
          <input value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        </label>

        <label>
          Category (optional)
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>

        <fieldset className="describe-asset">
          <legend>Describe the Asset</legend>

          <label>
            Brand (optional)
            <input value={brand} onChange={(e) => setBrand(e.target.value)} />
          </label>

          <label>
            Model (optional)
            <input value={model} onChange={(e) => setModel(e.target.value)} />
          </label>

          <label>
            Serial number (optional, from the manufacturer's tag)
            <input value={serial} onChange={(e) => setSerial(e.target.value)} />
          </label>

          <label>
            Description (detailed): size, colour, fittings, condition — anything that tells it apart from a similar one
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </fieldset>

        <label>
          Quantity
          <input type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        {Number(quantity) > 1 && (
          <p>More than one item will be sent for review. For expensive items, report each one separately with its own photo.</p>
        )}

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