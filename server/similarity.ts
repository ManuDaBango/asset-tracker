// Lowercase and keep only letters and digits, so "Latitude 5520" == "latitude5520".
export function normaliseText(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  
  // "dell" -> ["de", "el", "ll"]
  function bigrams(s: string): string[] {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
    return out;
  }
  
  // Returns 0 (nothing alike) to 1 (identical after normalising).
  export function similarity(a: string, b: string): number {
    const x = normaliseText(a);
    const y = normaliseText(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
  
    const bx = bigrams(x);
    const by = bigrams(y);
    const total = bx.length + by.length;
    if (total === 0) return 0;
  
    // Count the pairs in x, then "spend" them as we find them in y.
    const available = new Map<string, number>();
    for (const g of bx) available.set(g, (available.get(g) ?? 0) + 1);
  
    let shared = 0;
    for (const g of by) {
      const left = available.get(g) ?? 0;
      if (left > 0) {
        shared++;
        available.set(g, left - 1);
      }
    }
    return (2 * shared) / total;
  }