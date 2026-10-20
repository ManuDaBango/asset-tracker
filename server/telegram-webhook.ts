import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const [command, baseUrl] = process.argv.slice(2);

async function call(method: string, body: object): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(method, "->", await response.text());
}

async function main(): Promise<void> {
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");

  if (command === "set") {
    if (!secret) throw new Error("Missing TELEGRAM_WEBHOOK_SECRET in .env");
    if (!baseUrl || !baseUrl.startsWith("https://")) {
      throw new Error("Usage: npm run telegram:webhook -- https://your-app.onrender.com");
    }
    await call("setWebhook", {
      url: `${baseUrl.replace(/\/$/, "")}/telegram/webhook`,
      secret_token: secret,
      allowed_updates: ["message"],
    });
  } else if (command === "delete") {
    await call("deleteWebhook", {});
  } else if (command === "info") {
    await call("getWebhookInfo", {});
  } else {
    throw new Error("Use: set, delete or info");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});