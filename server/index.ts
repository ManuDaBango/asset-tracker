import "dotenv/config";
import express from "express";
import { fetchAssets, fetchReviewQueue } from "./airtable";
import { processReport } from "./pipeline";
import { parseReportInput, parsePhoto } from "./validate";
import { resolveReview } from "./review";
import path from "node:path";

const app = express();
app.use(express.json({ limit: "10mb" }));

// req and res are the same idea as request and response, just shorter.
app.get("/health", (req, res) => {
  res.send("Asset tracker is alive");
});

// when someone asks for this URL, run this function
app.get("/api/assets", async (req, res) => {
  try {
    const assets = await fetchAssets();
    res.json(assets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load assets" });
  }
});

app.post("/api/reports", async (req, res) => {
  const parsed = parseReportInput(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const photoCheck = parsePhoto(req.body?.photo);
  if (!photoCheck.ok) {
    res.status(400).json({ error: photoCheck.error });
    return;
  }

  try {
    const result = await processReport(parsed.value, photoCheck.photo);
    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save report" });
  }
});

// Reviewer pages need a shared passcode. Demo-grade protection until real logins arrive in Step 11.
// If REVIEW_PASSCODE is not set, nobody gets in: failing closed is safer than failing open.
function requireReviewer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = process.env.REVIEW_PASSCODE;
  if (!expected || req.header("x-review-passcode") !== expected) {
    res.status(401).json({ error: "Wrong or missing passcode" });
    return;
  }
  next();
}

app.get("/api/review", requireReviewer, async (req, res) => {
  try {
    const [items, assets] = await Promise.all([fetchReviewQueue(), fetchAssets()]);
    res.json(
      items.map((item) => ({
        ...item,
        matchedAsset: assets.find((a) => a.recordId === item.matchedAssetRecordId),
      })),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not load the review queue" });
  }
});

app.post("/api/review/:id/decision", requireReviewer, async (req, res) => {
  const action = req.body?.action;
  const reviewer = typeof req.body?.reviewer === "string" ? req.body.reviewer.trim() : "";
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";
  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be approve or reject" });
    return;
  }
  if (!reviewer) {
    res.status(400).json({ error: "Reviewer name is required" });
    return;
  }
  try {
    const result = await resolveReview(String(req.params.id), action, reviewer, note);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ message: result.message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save the decision" });
  }
});

// Serve the built form and review page. Created by `npm run build`.
app.use(express.static(path.join(process.cwd(), "client", "dist")));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});

