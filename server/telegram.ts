import type { Photo } from "./types";

type TelegramMessage = {
  message_id: number;
  from?: { id: number };
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number; height: number }[];
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

function botUrl(method: string): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN in .env");
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function getUpdates(offset: number): Promise<TelegramUpdate[]> {
  const response = await fetch(botUrl("getUpdates"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offset, timeout: 30, allowed_updates: ["message"] }),
  });
  const data = (await response.json()) as {
    ok: boolean;
    result?: TelegramUpdate[];
    description?: string;
  };
  if (!data.ok) {
    throw new Error(`Telegram said: ${data.description}`);
  }
  return data.result ?? [];
}

export async function sendMessage(chatId: number | string, text: string): Promise<void> {
  const response = await fetch(botUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!response.ok) {
    throw new Error(`Telegram said ${response.status}: ${await response.text()}`);
  }
}

export async function downloadPhoto(fileId: string): Promise<Photo> {
  const infoResponse = await fetch(botUrl("getFile"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const info = (await infoResponse.json()) as {
    ok: boolean;
    result?: { file_path?: string };
    description?: string;
  };
  const path = info.result?.file_path;
  if (!info.ok || !path) {
    throw new Error(`Telegram said: ${info.description ?? "no file path"}`);
  }

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${path}`);
  if (!fileResponse.ok) {
    throw new Error(`Telegram file download failed with status ${fileResponse.status}`);
  }
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  return { mediaType: "image/jpeg", base64: bytes.toString("base64") };
}