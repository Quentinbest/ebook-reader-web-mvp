import type { BookFormat, BookTextIndex, SearchEntry } from "../types/contracts";

const EPUB_TEXT_LIMIT = 1200;
const PDF_TEXT_LIMIT = 1600;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function trimText(text: string, size: number): string {
  if (text.length <= size) {
    return text;
  }
  return `${text.slice(0, size)}…`;
}

function parseXml(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

async function indexEpub(file: File): Promise<SearchEntry[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const files = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .filter((entry) => /\.(xhtml|html|htm)$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const entries: SearchEntry[] = [];

  for (const htmlFile of files) {
    const text = await htmlFile.async("string");
    const doc = parseXml(text);
    const bodyText = normalizeText(doc.documentElement?.textContent ?? "");
    if (!bodyText) {
      continue;
    }
    entries.push({
      locator: `epub:${htmlFile.name}`,
      text: trimText(bodyText, EPUB_TEXT_LIMIT)
    });
  }

  return entries;
}

async function indexPdf(file: File): Promise<SearchEntry[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const entries: SearchEntry[] = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = normalizeText(
      content.items
        .map((item) => ("str" in item ? String(item.str) : ""))
        .join(" ")
    );

    entries.push({
      locator: `pdf:page:${i}`,
      text: trimText(pageText, PDF_TEXT_LIMIT)
    });
  }

  return entries;
}

export async function buildBookIndex(bookId: string, format: BookFormat, file: File): Promise<BookTextIndex> {
  const entries = format === "epub" ? await indexEpub(file) : await indexPdf(file);
  return {
    bookId,
    entries,
    updatedAt: Date.now()
  };
}

export async function readEpubMetadata(file: File): Promise<{ title: string; author?: string }> {
  try {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const container = zip.file("META-INF/container.xml");
    if (!container) {
      return { title: file.name.replace(/\.epub$/i, "") };
    }

    const containerDoc = parseXml(await container.async("string"));
    const rootfilePath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
    if (!rootfilePath) {
      return { title: file.name.replace(/\.epub$/i, "") };
    }

    const opf = zip.file(rootfilePath);
    if (!opf) {
      return { title: file.name.replace(/\.epub$/i, "") };
    }

    const opfDoc = parseXml(await opf.async("string"));
    const title =
      opfDoc.querySelector("metadata > title")?.textContent?.trim() ||
      opfDoc.querySelector("dc\\:title")?.textContent?.trim() ||
      file.name.replace(/\.epub$/i, "");

    const author =
      opfDoc.querySelector("metadata > creator")?.textContent?.trim() ||
      opfDoc.querySelector("dc\\:creator")?.textContent?.trim() ||
      undefined;

    return { title, author };
  } catch {
    return { title: file.name.replace(/\.epub$/i, "") };
  }
}
