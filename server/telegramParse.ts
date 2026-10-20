export type ParsedMessage = {
    site?: string;
    barcode?: string;
    description: string;
  };
  
  export function parseTelegramText(text: string): ParsedMessage {
    let site: string | undefined;
    let barcode: string | undefined;
    const rest: string[] = [];
  
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      const siteMatch = line.match(/^site\s*:\s*(.+)$/i);
      const codeMatch = line.match(/^(?:code|barcode|id)\s*:\s*(.+)$/i);
  
      if (siteMatch) {
        site = siteMatch[1].trim();
      } else if (codeMatch) {
        barcode = codeMatch[1].trim();
      } else if (line !== "") {
        rest.push(line);
      }
    }
  
    return { site, barcode, description: rest.join(" ") };
  }