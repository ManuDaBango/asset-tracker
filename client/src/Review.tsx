import { useState } from "react";

type Asset = {
  assetId: string;
  category: string;
  brand: string;
  model: string;
  site: string;
  lifecycleStatus: string;
  department?: string;
  miscSpec?: string;
};

type Item = {
  recordId: string;
  receivedAt?: string;
  channel: string;
  reporterName: string;
  reporterRole: string;
  site: string;
  description: string;
  barcode?: string;
  assetId?: string;
  category?: string;
  brand?: string;
  model?: string;
  miscSpec?: string;
  quantity?: number;
  reportedStatus?: string;
  condition?: string;
  department?: string;
  reviewReason?: string;
  photoUrl?: string;
  matchedAsset?: Asset;
};

type Action = "approve" | "reject";

// One label + value line. Shows nothing when the value is empty.
function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function Card({ item, onDecide }: { item: Item; onDecide: (action: Action, note: string) => void }) {
  const [note, setNote] = useState("");
  const a = item.matchedAsset;
  const department = item.department ?? a?.department;

  return (
    <section className="card">
      <h2>
        {item.description}{" "}
        <small>
          {item.reporterName} ({item.reporterRole}) via {item.channel}
        </small>
      </h2>
      <p>
        <strong>Why it is here:</strong> {item.reviewReason ?? "Not recorded (older report)"}
      </p>
      <p className="dept">
        <strong>Department to contact:</strong> {department ?? "Unknown"}
      </p>

      <div className="cols">
        <div>
          <h3>Reporter says</h3>
          <dl>
            <Row label="Site" value={item.site} />
            <Row label="Barcode" value={item.barcode} />
            <Row label="Asset ID" value={item.assetId} />
            <Row label="Category" value={item.category} />
            <Row label="Brand" value={item.brand} />
            <Row label="Model" value={item.model} />
            <Row label="Misc spec" value={item.miscSpec} />
            <Row label="Quantity" value={item.quantity} />
            <Row label="Status" value={item.reportedStatus} />
            <Row label="Condition" value={item.condition} />
            <Row label="Department" value={item.department} />
          </dl>
        </div>
        <div>
          <h3>Register says</h3>
          {a ? (
            <dl>
              <Row label="Asset ID" value={a.assetId} />
              <Row label="Category" value={a.category} />
              <Row label="Brand" value={a.brand} />
              <Row label="Model" value={a.model} />
              <Row label="Site" value={a.site} />
              <Row label="Status" value={a.lifecycleStatus} />
              <Row label="Department" value={a.department} />
              <Row label="Misc spec" value={a.miscSpec} />
            </dl>
          ) : (
            <p>No matching asset in the register.</p>
          )}
        </div>
      </div>

      {item.photoUrl && <img src={item.photoUrl} alt="Photo from the report" />}

      <label>
        Note (optional)
        <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button disabled={!a} onClick={() => onDecide("approve", note)}>
        {a ? `Approve: verify ${a.assetId}` : "Approve (needs a matched asset)"}
      </button>{" "}
      <button onClick={() => onDecide("reject", note)}>Reject</button>
    </section>
  );
}

export default function Review() {
  const [passcode, setPasscode] = useState(() => sessionStorage.getItem("passcode") ?? "");
  const [reviewer, setReviewer] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setMessage("");
    try {
      const response = await fetch("/api/review", { headers: { "x-review-passcode": passcode } });
      const data = await response.json();
      if (!response.ok) {
        setItems(null);
        setMessage(data.error ?? "Could not load the queue");
        return;
      }
      sessionStorage.setItem("passcode", passcode);
      setItems(data);
    } catch {
      setMessage("Could not reach the server");
    }
  }

  async function decide(item: Item, action: Action, note: string) {
    if (!reviewer.trim()) {
      setMessage("Enter your name first");
      return;
    }
    try {
      const response = await fetch(`/api/review/${item.recordId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-review-passcode": passcode },
        body: JSON.stringify({ action, reviewer, note }),
      });
      const data = await response.json();
      if (response.ok) await load();
      setMessage(data.message ?? data.error ?? "Something went wrong");
    } catch {
      setMessage("Could not reach the server");
    }
  }

  return (
    <main>
      <h1>Review queue</h1>
      <label>
        Passcode
        <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} />
      </label>
      <label>
        Your name
        <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
      </label>
      <button onClick={load}>{items ? "Refresh" : "Open queue"}</button>
      {message && <p>{message}</p>}

      {items && items.length === 0 && <p>Nothing waiting for review.</p>}
      {items?.map((item) => (
        <Card key={item.recordId} item={item} onDecide={(action, note) => decide(item, action, note)} />
      ))}
    </main>
  );
}