import type { TocItem } from "../types/contracts";

type RawTocItem = {
  href?: string;
  label?: string;
  subitems?: RawTocItem[];
};

function safeDecode(input: string): string {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

function normalizePath(path: string): string {
  return safeDecode(path)
    .replace(/^\.\//, "")
    .replace(/^\//, "")
    .replace(/\\/g, "/")
    .toLowerCase();
}

export function normalizeHref(href: string): string {
  const [rawPath, rawHash] = href.split("#");
  const path = normalizePath(rawPath ?? "");
  const hash = rawHash ? `#${safeDecode(rawHash).toLowerCase()}` : "";
  return `${path}${hash}`;
}

function pathOnly(href: string): string {
  return normalizeHref(href).split("#")[0] ?? "";
}

function normalizeTitle(title?: string): string {
  const cleaned = title?.trim();
  return cleaned ? cleaned : "未命名章节";
}

function toId(base: string): string {
  return base
    .replace(/[^a-z0-9-_]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export function buildTocTree(rawItems: RawTocItem[], level = 1, parentId = "toc"): TocItem[] {
  return rawItems.map((item, index) => {
    const href = item.href ?? "";
    const fallbackId = `${parentId}-${level}-${index + 1}`;
    const id = toId(`${fallbackId}-${href || item.label || "chapter"}`) || fallbackId;
    const children = item.subitems?.length ? buildTocTree(item.subitems, level + 1, id) : undefined;

    return {
      id,
      title: normalizeTitle(item.label),
      href,
      level,
      children
    } satisfies TocItem;
  });
}

export function isTocMatch(itemHref: string, currentHref?: string): boolean {
  if (!itemHref || !currentHref) {
    return false;
  }

  const normalizedItem = normalizeHref(itemHref);
  const normalizedCurrent = normalizeHref(currentHref);

  if (normalizedItem === normalizedCurrent) {
    return true;
  }

  return pathOnly(normalizedItem) === pathOnly(normalizedCurrent);
}

export function findActiveTocId(items: TocItem[], currentHref?: string): string | null {
  for (const item of items) {
    if (isTocMatch(item.href, currentHref)) {
      return item.id;
    }

    if (item.children?.length) {
      const nested = findActiveTocId(item.children, currentHref);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function findTocPathIds(items: TocItem[], targetId: string): string[] {
  for (const item of items) {
    if (item.id === targetId) {
      return [item.id];
    }

    if (item.children?.length) {
      const nested = findTocPathIds(item.children, targetId);
      if (nested.length) {
        return [item.id, ...nested];
      }
    }
  }

  return [];
}
