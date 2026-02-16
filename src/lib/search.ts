import { getBookIndex } from "./db";
import type { SearchResult } from "../types/contracts";

function excerpt(text: string, query: string): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index < 0) {
    return text.slice(0, 120);
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 80);
  return text.slice(start, end);
}

export async function searchBook(bookId: string, query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const index = await getBookIndex(bookId);
  if (!index) {
    return [];
  }

  return index.entries
    .filter((entry) => entry.text.toLowerCase().includes(trimmed.toLowerCase()))
    .slice(0, 60)
    .map((entry) => ({ locator: entry.locator, excerpt: excerpt(entry.text, trimmed) }));
}
