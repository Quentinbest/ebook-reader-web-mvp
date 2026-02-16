import type { TocItem } from "../types/contracts";

type OutlineNode = {
  title?: string;
  dest?: unknown;
  items?: OutlineNode[];
};

type PdfDocumentLike = {
  getOutline: () => Promise<OutlineNode[] | null>;
  getDestination: (name: string) => Promise<unknown>;
  getPageIndex: (ref: unknown) => Promise<number>;
};

function normalizeTitle(title?: string): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : "未命名章节";
}

function cacheKeyForRef(ref: unknown): string | null {
  if (!ref || typeof ref !== "object") {
    return null;
  }

  const maybeRef = ref as { num?: number; gen?: number };
  if (typeof maybeRef.num === "number") {
    return `${maybeRef.num}:${maybeRef.gen ?? 0}`;
  }

  return null;
}

async function resolvePageNumber(
  doc: PdfDocumentLike,
  dest: unknown,
  refCache: Map<string, number>
): Promise<number | null> {
  let explicitDest: unknown = null;

  if (Array.isArray(dest)) {
    explicitDest = dest;
  } else if (typeof dest === "string" && dest.trim()) {
    explicitDest = await doc.getDestination(dest.trim()).catch(() => null);
  }

  if (!Array.isArray(explicitDest) || !explicitDest.length) {
    return null;
  }

  const first = explicitDest[0];

  if (typeof first === "number" && Number.isFinite(first)) {
    return first + 1;
  }

  const key = cacheKeyForRef(first);
  if (key && refCache.has(key)) {
    return refCache.get(key) ?? null;
  }

  try {
    const index = await doc.getPageIndex(first);
    if (Number.isInteger(index) && index >= 0) {
      const pageNumber = index + 1;
      if (key) {
        refCache.set(key, pageNumber);
      }
      return pageNumber;
    }
  } catch {
    // Ignore invalid destinations and return null.
  }

  return null;
}

async function mapOutlineNodes(
  doc: PdfDocumentLike,
  nodes: OutlineNode[],
  level: number,
  parentId: string,
  refCache: Map<string, number>
): Promise<TocItem[]> {
  const result: TocItem[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const id = `${parentId}-${level}-${index + 1}`;

    const pageNumber = await resolvePageNumber(doc, node.dest, refCache);
    const href = pageNumber ? `pdf:page:${pageNumber}` : "";

    const children = node.items?.length
      ? await mapOutlineNodes(doc, node.items, level + 1, id, refCache)
      : undefined;

    result.push({
      id,
      title: normalizeTitle(node.title),
      href,
      level,
      children
    });
  }

  return result;
}

export async function extractPdfToc(doc: PdfDocumentLike): Promise<TocItem[]> {
  const outline = await doc.getOutline().catch(() => null);
  if (!outline?.length) {
    return [];
  }

  const refCache = new Map<string, number>();
  return mapOutlineNodes(doc, outline, 1, "pdf-toc", refCache);
}
