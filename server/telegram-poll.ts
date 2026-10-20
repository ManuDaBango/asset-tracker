import "dotenv/config";
import { getUpdates, sendMessage } from "./telegram";
import { handleUpdate } from "./telegramBot";

async function main() {
  console.log("Telegram bot is listening (polling). Press Ctrl+C to stop.");
  let offset = 0;

  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handleUpdate(update);
        } catch (error) {
          console.error("Could not handle update", update.update_id, error);
          const chatId = update.message?.chat.id;
          if (chatId !== undefined) {
            await sendMessage(chatId, "Sorry, something went wrong on our side. Please try again shortly.").catch(() => {});
          }
        }
      }
    } catch (error) {
      console.error("Polling problem, retrying in 5 seconds:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main();