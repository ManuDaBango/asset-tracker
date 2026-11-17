import { useState } from "react";

type Asset = {
  recordId: string;
  assetId: string;
  category: string;
  brand: string;
  model: string;
  siteLocation: string;
  lifecycleStatus: string;
  condition: string;
  description?: string;
  lastVerified?: string;
  lastVerifiedBy?: string;
};

export default function AuditView() {
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem("auditPasscode") ?? "");
  const [auditorName, setAuditorName] = useState("");
  const [siteCompany, setSiteCompany] = useState("");
  const [items, setItems] = useState<Asset[] | null>(null);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setMessage("");
    if (!siteCompany.trim()) {
      setMessage("Enter the client/company name first");
      return;
    }
    try {
      const response = await fetch(`/api/audit?site=${encodeURIComponent(siteCompany.trim())}`, {
        headers: { "x-audit-passcode": passcode },
      });
      const data = await response.json();
      if (!response.ok) {
        setItems(null);
        setMessage(data.error ?? "Could not load that site");
        return;
      }
      sessionStorage.setItem("auditPasscode", passcode);
      setItems(data);
    } catch {
      setMessage("Could not reach the server");
    }
  }

  async function markVerified(asset: Asset) {
    if (!auditorName.trim()) {
      setMessage("Enter your name first");
      return;
    }
    setBusyId(asset.recordId);
    setMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "Web",
          reporterName: auditorName.trim(),
          reporterRole: "Auditor",
          site: siteCompany.trim(),
          description: "Verified during audit",
          assetId: asset.assetId,
          quantity: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not verify that asset");
        return;
      }
      setMessage(`${asset.assetId} verified.`);
      await load();
    } catch {
      setMessage("Could not reach the server");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main>
      <h1>Audit a site</h1>
      <label>
        Passcode
        <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
      </label>
      <label>
        Your name
        <input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} />
      </label>
      <label>
        Client / company (as recorded in the register)
        <input value={siteCompany} onChange={(e) => setSiteCompany(e.target.value)} />
      </label>
      <button onClick={load}>{items ? "Refresh" : "Load site"}</button>
      {message && <p>{message}</p>}

      {items && items.length === 0 && <p>No assets recorded at that site.</p>}
      {items?.map((asset) => (
        <section className="card" key={asset.recordId}>
          <h2>{asset.assetId} — {asset.category}</h2>
          <p>{asset.description || `${asset.brand} ${asset.model}`.trim()}</p>
          <dl>
            <dt>Location</dt><dd>{asset.siteLocation || "Not recorded"}</dd>
            <dt>Status</dt><dd>{asset.lifecycleStatus}</dd>
            <dt>Condition</dt><dd>{asset.condition}</dd>
            <dt>Last verified</dt>
            <dd>{asset.lastVerified ? new Date(asset.lastVerified).toLocaleDateString() : "Never"}{asset.lastVerifiedBy ? ` by ${asset.lastVerifiedBy}` : ""}</dd>
          </dl>
          <button disabled={busyId === asset.recordId} onClick={() => markVerified(asset)}>
            {busyId === asset.recordId ? "Saving..." : "Mark verified today"}
          </button>
        </section>
      ))}
    </main>
  );
}