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

function normalizeSingleImagePage(doc: Document): void {
  const body = doc.body;
  if (!body) {
    return;
  }

  const images = Array.from(body.querySelectorAll("img")) as HTMLImageElement[];
  if (images.length !== 1) {
    return;
  }

  const textLength = (body.textContent ?? "").replace(/\s+/g, "").length;
  if (textLength > 30) {
    return;
  }

  const image = images[0];
  image.style.width = "auto";
  image.style.height = "auto";
  image.style.maxWidth = "100%";
  image.style.maxHeight = "100%";
  image.style.objectFit = "contain";
  image.style.display = "block";
  image.style.margin = "0 auto";

  body.style.padding = "0";
  body.style.margin = "0";
  body.style.height = "100%";
  body.style.display = "flex";
  body.style.alignItems = "center";
  body.style.justifyContent = "center";
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

    try {
      const resolvedCanonical = book.resolve(pathPart, true);
      if (typeof resolvedCanonical === "string" && resolvedCanonical) {
        candidates.push(`${resolvedCanonical}${hash}`);
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

      if (typeof book?.resolve === "function") {
        try {
          const resolvedItem = book.resolve(itemHref, false);
          if (typeof resolvedItem === "string" && resolvedItem) {
            candidates.push(`${resolvedItem}${hash}`);
          }
        } catch {
          // Ignore and continue collecting candidates.
        }

        try {
          const resolvedItemCanonical = book.resolve(itemHref, true);
          if (typeof resolvedItemCanonical === "string" && resolvedItemCanonical) {
            candidates.push(`${resolvedItemCanonical}${hash}`);
          }
        } catch {
          // Ignore and continue collecting candidates.
        }
      }
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
  const [progressPercent, setProgressPercent] = useState(0);

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

  function jumpToStart(): void {
    if (!renditionRef.current || busyRef.current) {
      return;
    }
    void renditionRef.current.display();
  }

  function jumpToEnd(): void {
    if (!renditionRef.current || !bookRef.current || busyRef.current) {
      return;
    }

    const book = bookRef.current as any;
    if (locationsReadyRef.current && typeof book?.locations?.cfiFromPercentage === "function") {
      try {
        const cfi = book.locations.cfiFromPercentage(0.999);
        if (typeof cfi === "string" && cfi) {
          void renditionRef.current.display(cfi);
          return;
        }
      } catch {
        // Fall back to last spine item.
      }
    }

    const spineItems = Array.isArray(book?.spine?.spineItems) ? book.spine.spineItems : [];
    const lastItem = spineItems[spineItems.length - 1];
    if (lastItem?.href) {
      void renditionRef.current.display(lastItem.href);
    }
  }

  async function jumpToPercent(nextPercent: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(nextPercent)));
    if (!renditionRef.current || !bookRef.current || busyRef.current) {
      return;
    }

    const book = bookRef.current as any;
    if (!locationsReadyRef.current || typeof book?.locations?.cfiFromPercentage !== "function") {
      callbacksRef.current.onNavigationError("正在加载…");
      return;
    }

    try {
      const cfi = book.locations.cfiFromPercentage(clamped / 100);
      if (typeof cfi === "string" && cfi) {
        await renditionRef.current.display(cfi);
      }
    } catch {
      callbacksRef.current.onNavigationError("无法跳转到该位置");
    }
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
      setProgressPercent(percent);
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
      const renderedDoc = view?.document as Document | undefined;
      if (renderedDoc) {
        normalizeSingleImagePage(renderedDoc);
      }
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
            const contentDoc = content?.document as Document | undefined;
            if (contentDoc) {
              normalizeSingleImagePage(contentDoc);
            }
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
      if (sanitized.toLowerCase() === "start") {
        try {
          await renditionRef.current.display();
        } catch {
          if (!cancelled) {
            callbacksRef.current.onNavigationError("无法跳转到该章节");
          }
        }
        return;
      }

      if (sanitized.toLowerCase() === "end") {
        const spineItems = Array.isArray(bookRef.current?.spine?.spineItems) ? bookRef.current.spine.spineItems : [];
        const lastItem = spineItems[spineItems.length - 1];
        if (!lastItem?.href) {
          if (!cancelled) {
            callbacksRef.current.onNavigationError("无法跳转到该章节");
          }
          return;
        }
        try {
          await renditionRef.current.display(lastItem.href);
        } catch {
          if (!cancelled) {
            callbacksRef.current.onNavigationError("无法跳转到该章节");
          }
        }
        return;
      }

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

  const canPrev = progressPercent > 1 && !busy;
  const canNext = progressPercent < 99 && !busy;

  return (
    <section className="reader-viewport reader-viewport--with-bottom-bar">
      <div className="reader-content-stage">
        {busy ? <p className="loading reader-stage-loading">正在渲染 EPUB...</p> : null}
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
      </div>

      <div className="pdf-bottom-bar" role="group" aria-label="翻页及页码">
        <div className="pdf-bottom-bar__cluster">
          <button type="button" className="pdf-icon-btn" aria-label="第一页" disabled={!canPrev} onClick={jumpToStart}>
            «
          </button>
          <button type="button" className="pdf-icon-btn" aria-label="上一页" disabled={!canPrev} onClick={() => turnPage("prev")}>
            ‹
          </button>
          <button type="button" className="pdf-icon-btn is-muted" aria-label="占位按钮" disabled>
            ↶
          </button>
          <button type="button" className="pdf-icon-btn is-muted" aria-label="占位按钮" disabled>
            ↷
          </button>
        </div>

        <span className="pdf-page-indicator" aria-live="polite">
          {Math.round(progressPercent)} / 100
        </span>

        <input
          type="range"
          className="pdf-progress-slider"
          aria-label="阅读进度"
          min={0}
          max={100}
          value={Math.round(progressPercent)}
          disabled={busy || !locationsReadyRef.current}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isNaN(next)) {
              void jumpToPercent(next);
            }
          }}
        />

        <div className="pdf-bottom-bar__cluster pdf-bottom-bar__cluster--right">
          <button type="button" className="pdf-icon-btn pdf-icon-btn--headset" aria-label="听书（即将上线）" disabled>
            🎧
          </button>
          <button type="button" className="pdf-icon-btn" aria-label="下一页" disabled={!canNext} onClick={() => turnPage("next")}>
            ›
          </button>
          <button type="button" className="pdf-icon-btn" aria-label="最后一页" disabled={!canNext} onClick={jumpToEnd}>
            »
          </button>
          <span className="pdf-page-indicator-secondary" aria-hidden>
            {Math.round(progressPercent)} / 100
          </span>
        </div>
      </div>
    </section>
  );
}
