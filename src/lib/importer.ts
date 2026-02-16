import { putBook, putBookIndex } from "./db";
import { stableHash } from "./id";
import { track } from "./telemetry";
import type { BookFormat, BookMeta } from "../types/contracts";

function detectFormat(file: File): BookFormat {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".epub")) {
    return "epub";
  }
  if (lower.endsWith(".pdf")) {
    return "pdf";
  }
  throw new Error("仅支持 EPUB 或 PDF 文件。");
}

export async function importBook(file: File): Promise<BookMeta> {
  const format = detectFormat(file);
  const startedAt = performance.now();

  await track("book_import_started", {
    format,
    file_size: file.size
  });

  try {
    const { buildBookIndex, readEpubMetadata } = await import("./textIndexer");
    const id = await stableHash(`${file.name}:${file.size}:${file.lastModified}`);
    const metadata =
      format === "epub"
        ? await readEpubMetadata(file)
        : { title: file.name.replace(/\.pdf$/i, ""), author: undefined };

    const now = Date.now();
    const book: BookMeta = {
      id,
      title: metadata.title,
      author: metadata.author,
      format,
      fileSize: file.size,
      createdAt: now,
      updatedAt: now
    };

    const index = await buildBookIndex(id, format, file);

    await putBook(book, file);
    await putBookIndex(index);

    await track("book_import_succeeded", {
      format,
      parse_ms: Math.round(performance.now() - startedAt)
    });

    return book;
  } catch (error) {
    await track("book_import_failed", {
      format,
      error_code: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }
}
