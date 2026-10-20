import { fetchBotUsers } from "./airtable";
import { processReport } from "./pipeline";
import { parseReportInput } from "./validate";
import { parseTelegramText } from "./telegramParse";
import { sendMessage, downloadPhoto } from "./telegram";
import type { TelegramUpdate } from "./telegram";
import type { Photo } from "./types";

const HELP = [
  "To report an asset, send a message like this (a photo caption works too):",
  "",
  "site: Perth Airport",
  "code: AST-0003",
  "Yellow baggage tug near gate 4",
  "",
  "The site line is required. A code or a short description is needed too.",
].join("\n");

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message || !message.from) {
    return;
  }

  const chatId = message.chat.id;
  const senderId = String(message.from.id);

  const users = await fetchBotUsers();
  const user = users.find((u) => u.telegramId === senderId);
  if (!user) {
    await sendMessage(
      chatId,
      `Sorry, you are not registered yet. Ask your administrator to add your Telegram ID: ${senderId}`,
    );
    return;
  }

  const text = message.text ?? message.caption ?? "";
  if (text.trim() === "" || text.trim().startsWith("/")) {
    await sendMessage(chatId, HELP);
    return;
  }

  const parsed = parseTelegramText(text);
  if (!parsed.site) {
    await sendMessage(chatId, `I need a site line.\n\n${HELP}`);
    return;
  }
  const base =
    parsed.description ||
    (parsed.barcode ? "Sighting reported via Telegram" : message.photo ? "Photo report via Telegram" : "");
  if (!base) {
    await sendMessage(chatId, `Please add a short description, a code or a photo.\n\n${HELP}`);
    return;
  }
  const description = base;

  const checked = parseReportInput({
    channel: "Telegram",
    reporterName: user.name,
    reporterRole: user.role,
    site: parsed.site,
    description,
    barcode: parsed.barcode,
  });
  if (!checked.ok) {
    await sendMessage(chatId, `Could not file your report: ${checked.error}`);
    return;
  }

  let photo: Photo | undefined;
  if (message.photo && message.photo.length > 0) {
    try {
      photo = await downloadPhoto(message.photo[message.photo.length - 1].file_id);
    } catch (error) {
      console.error("Could not download photo", error);
    }
  }

  const result = await processReport(checked.value, photo);
  if (result.outcome === "verified") {
    await sendMessage(
      chatId,
      `Thanks ${user.name}. Asset ${result.matchedAssetId} has been verified.` +
        (result.wasMissing ? " It was flagged Missing and is now marked Active." : ""),
    );
  } else {
    await sendMessage(chatId, "Report received and sent for review.");
  }
}