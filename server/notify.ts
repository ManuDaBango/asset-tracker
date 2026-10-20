import { fetchBotUsers } from "./airtable";
import { sendMessage } from "./telegram";

export async function alertManagers(text: string): Promise<void> {
  const users = await fetchBotUsers();
  for (const user of users) {
    if (user.receivesAlerts) {
      await sendMessage(user.telegramId, text);
    }
  }
}