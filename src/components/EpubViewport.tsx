import { useEffect, useMemo, useRef, useState } from "react";
import ePub from "epubjs";
import { buildTocTree } from "../lib/toc";
import type { ReaderPreferences, TocItem } from "../types/contracts";

type EpubViewportProps = {
  blob: Blob;
  preferences: ReaderPreferences;
  layoutMode: "single" | "multi";
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

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
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
  layoutMode,
  targetLocator,
  onLocationChange,
  onTocLoaded,
  onTocError,
  onNavigationError,
  onReadyChange
}: EpubViewportProps): JSX.Element {
  const PAGE_TURN_COOLDOWN_MS = 220;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);
  const locationTaskTimerRef = useRef<number | null>(null);
  const lastPageTurnAtRef = useRef(0);
  const busyRef = useRef(true);
  const callbacksRef = useRef({
    onLocationChange,
    onTocLoaded,
    onTocError,
    onNavigationError,
    onReadyChange
  });
  const [busy, setBusy] = useState(true);

  const themeStyles = useMemo(() => getThemeStyles(preferences), [preferences]);
  busyRef.current = busy;

  function turnPage(direction: "next" | "prev"): boolean {
    if (busyRef.current || !renditionRef.current) {
      return false;
    }

    if (direction === "next") {
      renditionRef.current.next();
      return true;
    }

    renditionRef.current.prev();
    return true;
  }

  function turnPageWithCooldown(direction: "next" | "prev"): boolean {
    const now = Date.now();
    if (now - lastPageTurnAtRef.current < PAGE_TURN_COOLDOWN_MS) {
      return false;
    }

    const turned = turnPage(direction);
    if (turned) {
      lastPageTurnAtRef.current = now;
    }
    return turned;
  }

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
    const boundDocs = new Set<Document>();
    setBusy(true);
    callbacksRef.current.onReadyChange(false);

    const book = ePub(blob as any);
    const rendition = book.renderTo(container, {
      width: "100%",
      height: "100%",
      flow: "paginated",
      spread: layoutMode === "single" ? "none" : "auto"
    });

    bookRef.current = book;
    renditionRef.current = rendition;
    locationsReadyRef.current = false;

    const onRelocated = (location: any) => {
      const locator = location?.start?.cfi;
      if (!locator) {
        return;
      }

      let percent = 0;
      if (locationsReadyRef.current) {
        const mapped = Number(book.locations.percentageFromCfi(locator));
        percent = Number.isFinite(mapped) ? Math.round(mapped * 100) : 0;
      } else {
        const fallback = Number(location?.start?.percentage);
        if (Number.isFinite(fallback)) {
          percent = fallback <= 1 ? Math.round(fallback * 100) : Math.round(fallback);
        }
      }
      percent = Math.max(0, Math.min(100, percent));
      const href = location?.start?.href;
      callbacksRef.current.onLocationChange({ locator, percent, href });
    };

    const onWheel = (event: WheelEvent): void => {
      if (Math.abs(event.deltaY) < 6) {
        return;
      }

      const direction = event.deltaY > 0 ? "next" : "prev";
      if (turnPageWithCooldown(direction)) {
        event.preventDefault();
      }
    };

    const onDocKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown") {
        if (turnPageWithCooldown("next")) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowUp") {
        if (turnPageWithCooldown("prev")) {
          event.preventDefault();
        }
      }
    };

    const bindInputEvents = (doc: Document | null | undefined): void => {
      if (!doc || boundDocs.has(doc)) {
        return;
      }
      doc.addEventListener("wheel", onWheel, { passive: false });
      doc.addEventListener("keydown", onDocKeyDown);
      boundDocs.add(doc);
    };

    const unbindInputEvents = (): void => {
      for (const doc of boundDocs) {
        doc.removeEventListener("wheel", onWheel);
        doc.removeEventListener("keydown", onDocKeyDown);
      }
      boundDocs.clear();
    };

    const onRendered = (_section: any, view: any): void => {
      bindInputEvents(view?.document);
    };

    const initialize = async (): Promise<void> => {
      await book.ready;

      try {
        const tocEntries = buildTocTree(book.navigation?.toc ?? []);
        callbacksRef.current.onTocLoaded(tocEntries);
      } catch {
        callbacksRef.current.onTocError("目录加载失败");
      }

      rendition.themes.default({ body: themeStyles } as any);
      await rendition.display();
      rendition.on("relocated", onRelocated);
      rendition.on("rendered", onRendered);
      const runtimeRendition = rendition as any;
      if (typeof runtimeRendition.getContents === "function") {
        const contents = runtimeRendition.getContents();
        if (Array.isArray(contents)) {
          for (const content of contents) {
            bindInputEvents(content?.document);
          }
        }
      }

      if (active) {
        setBusy(false);
        callbacksRef.current.onReadyChange(true);
      }

      // Generate chapter locations after first paint to avoid blocking initial EPUB render.
      locationTaskTimerRef.current = window.setTimeout(() => {
        void book.locations
          .generate(1200)
          .then(() => {
            locationsReadyRef.current = true;
          })
          .catch(() => {
            locationsReadyRef.current = false;
          });
      }, 0);
    };

    initialize().catch(() => {
      if (active) {
        setBusy(false);
        callbacksRef.current.onReadyChange(false);
      }
    });

    return () => {
      active = false;
      if (locationTaskTimerRef.current) {
        window.clearTimeout(locationTaskTimerRef.current);
      }
      rendition.off("relocated", onRelocated);
      rendition.off("rendered", onRendered);
      unbindInputEvents();
      book.destroy();
      bookRef.current = null;
      renditionRef.current = null;
      locationsReadyRef.current = false;
      callbacksRef.current.onReadyChange(false);
    };
  }, [blob]);

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

  useEffect(() => {
    if (!renditionRef.current || typeof renditionRef.current.spread !== "function") {
      return;
    }
    renditionRef.current.spread(layoutMode === "single" ? "none" : "auto");
  }, [layoutMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown") {
        if (turnPageWithCooldown("next")) {
          event.preventDefault();
        }
      } else if (event.key === "ArrowUp") {
        if (turnPageWithCooldown("prev")) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy]);

  return (
    <section className="reader-viewport">
      <div className="reader-controls-inline">
        {busy ? <span>正在渲染 EPUB...</span> : null}
      </div>
      <div className="reader-content-stage">
        <button
          type="button"
          className="reader-page-turn reader-page-turn--left"
          aria-label="上一页"
          disabled={busy}
          onClick={() => turnPage("prev")}
        >
          {"<"}
        </button>
        <div
          className="epub-container"
          ref={containerRef}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) < 6) {
              return;
            }

            const direction = event.deltaY > 0 ? "next" : "prev";
            if (turnPageWithCooldown(direction)) {
              event.preventDefault();
            }
          }}
        />
        <button
          type="button"
          className="reader-page-turn reader-page-turn--right"
          aria-label="下一页"
          disabled={busy}
          onClick={() => turnPage("next")}
        >
          {">"}
        </button>
      </div>
    </section>
  );
}
