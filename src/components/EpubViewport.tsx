import { useEffect, useMemo, useRef, useState } from "react";
import ePub from "epubjs";
import { buildTocTree } from "../lib/toc";
import type { ReaderPreferences, TocItem } from "../types/contracts";

type EpubViewportProps = {
  blob: Blob;
  preferences: ReaderPreferences;
  targetLocator?: string;
  onLocationChange: (payload: { locator: string; percent: number; href?: string }) => void;
  onTocLoaded: (entries: TocItem[]) => void;
  onTocError: (message: string) => void;
  onNavigationError: (message: string) => void;
  onReadyChange: (ready: boolean) => void;
};

function normalizePath(path: string): string {
  try {
    return decodeURIComponent(path).replace(/^\.?\//, "").toLowerCase();
  } catch {
    return path.replace(/^\.?\//, "").toLowerCase();
  }
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] ?? normalized;
}

function sanitizeTarget(target: string): string | null {
  const trimmed = target.trim();
  if (!trimmed) {
    return null;
  }
  if (/^javascript:/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}

function buildDisplayCandidates(target: string, book: any): string[] {
  const candidates = [target];
  if (target.startsWith("epubcfi(")) {
    return candidates;
  }

  const [pathPart, ...hashParts] = target.split("#");
  if (!pathPart) {
    return candidates;
  }

  const hash = hashParts.length ? `#${hashParts.join("#")}` : "";
  const normalizedTarget = normalizePath(pathPart);
  const targetBase = basename(pathPart);

  if (typeof book?.resolve === "function") {
    try {
      const resolved = book.resolve(pathPart, false);
      if (typeof resolved === "string" && resolved) {
        candidates.push(`${resolved}${hash}`);
      }
    } catch {
      // Continue with spine-based fallback.
    }
  }

  const spineItems = Array.isArray(book?.spine?.spineItems) ? book.spine.spineItems : [];
  for (const item of spineItems) {
    const itemHref = typeof item?.href === "string" ? item.href : "";
    if (!itemHref) {
      continue;
    }

    const normalizedItem = normalizePath(itemHref);
    const targetMatchesItem =
      normalizedItem === normalizedTarget ||
      normalizedItem.endsWith(`/${normalizedTarget}`) ||
      normalizedTarget.endsWith(`/${normalizedItem}`) ||
      basename(itemHref) === targetBase;

    if (targetMatchesItem) {
      candidates.push(`${itemHref}${hash}`);
    }
  }

  return unique(candidates);
}

function getThemeStyles(preferences: ReaderPreferences): Record<string, string> {
  const background =
    preferences.theme === "dark"
      ? "#141826"
      : preferences.theme === "sepia"
        ? "#f4ecd8"
        : "#fffefc";

  const color = preferences.theme === "dark" ? "#f3f4ff" : "#221f1b";
  const fontFamily = preferences.fontFamily === "serif" ? "Merriweather, serif" : "IBM Plex Sans, sans-serif";

  return {
    fontFamily,
    fontSize: `${preferences.fontSize}px`,
    lineHeight: String(preferences.lineHeight),
    padding: `${preferences.pageMargin}px`,
    color,
    background
  };
}

export default function EpubViewport({
  blob,
  preferences,
  targetLocator,
  onLocationChange,
  onTocLoaded,
  onTocError,
  onNavigationError,
  onReadyChange
}: EpubViewportProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const callbacksRef = useRef({
    onLocationChange,
    onTocLoaded,
    onTocError,
    onNavigationError,
    onReadyChange
  });
  const [busy, setBusy] = useState(true);

  const themeStyles = useMemo(() => getThemeStyles(preferences), [preferences]);

  useEffect(() => {
    callbacksRef.current = {
      onLocationChange,
      onTocLoaded,
      onTocError,
      onNavigationError,
      onReadyChange
    };
  }, [onLocationChange, onNavigationError, onReadyChange, onTocError, onTocLoaded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    setBusy(true);
    callbacksRef.current.onReadyChange(false);

    const book = ePub(blob as any);
    const rendition = book.renderTo(container, {
      width: "100%",
      height: "100%",
      flow: "paginated"
    });

    bookRef.current = book;
    renditionRef.current = rendition;

    const onRelocated = (location: any) => {
      const locator = location?.start?.cfi;
      if (!locator) {
        return;
      }

      const percent = Math.max(0, Math.min(100, Math.round(book.locations.percentageFromCfi(locator) * 100)));
      const href = location?.start?.href;
      callbacksRef.current.onLocationChange({ locator, percent, href });
    };

    const initialize = async (): Promise<void> => {
      await book.ready;

      try {
        const tocEntries = buildTocTree(book.navigation?.toc ?? []);
        callbacksRef.current.onTocLoaded(tocEntries);
      } catch {
        callbacksRef.current.onTocError("目录加载失败");
      }

      await book.locations.generate(1200);
      rendition.themes.default({ body: themeStyles } as any);
      await rendition.display();
      rendition.on("relocated", onRelocated);

      if (active) {
        setBusy(false);
        callbacksRef.current.onReadyChange(true);
      }
    };

    initialize().catch(() => {
      if (active) {
        setBusy(false);
        callbacksRef.current.onReadyChange(false);
      }
    });

    return () => {
      active = false;
      rendition.off("relocated", onRelocated);
      book.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      callbacksRef.current.onReadyChange(false);
    };
  }, [blob, themeStyles]);

  useEffect(() => {
    if (!renditionRef.current || !targetLocator) {
      return;
    }

    const sanitized = sanitizeTarget(targetLocator);
    if (!sanitized) {
      callbacksRef.current.onNavigationError("无法跳转到该章节");
      return;
    }

    let cancelled = false;

    const navigate = async (): Promise<void> => {
      const candidates = buildDisplayCandidates(sanitized, bookRef.current);

      for (const candidate of candidates) {
        try {
          await renditionRef.current.display(candidate);
          return;
        } catch {
          // Try next candidate.
        }
      }

      if (!cancelled) {
        callbacksRef.current.onNavigationError("无法跳转到该章节");
      }
    };

    void navigate();

    return () => {
      cancelled = true;
    };
  }, [targetLocator]);

  useEffect(() => {
    if (!renditionRef.current) {
      return;
    }

    renditionRef.current.themes.default({ body: themeStyles } as any);
  }, [themeStyles]);

  return (
    <section className="reader-viewport">
      <div className="reader-controls-inline">
        <button type="button" onClick={() => renditionRef.current?.prev()}>
          上一页
        </button>
        <button type="button" onClick={() => renditionRef.current?.next()}>
          下一页
        </button>
        {busy ? <span>正在渲染 EPUB...</span> : null}
      </div>
      <div className="epub-container" ref={containerRef} />
    </section>
  );
}
