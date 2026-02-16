import { useEffect, useMemo, useRef, useState } from "react";
import ePub from "epubjs";
import type { ReaderPreferences } from "../types/contracts";

type EpubViewportProps = {
  blob: Blob;
  preferences: ReaderPreferences;
  targetLocator?: string;
  onLocationChange: (payload: { locator: string; percent: number }) => void;
};

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
  onLocationChange
}: EpubViewportProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [busy, setBusy] = useState(true);
  const [toc, setToc] = useState<Array<{ href: string; label: string }>>([]);

  const themeStyles = useMemo(() => getThemeStyles(preferences), [preferences]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    setBusy(true);
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
      onLocationChange({ locator, percent });
    };

    const initialize = async (): Promise<void> => {
      await book.ready;
      setToc(book.navigation?.toc ?? []);
      await book.locations.generate(1200);
      rendition.themes.default({
        body: themeStyles
      } as any);
      await rendition.display();
      rendition.on("relocated", onRelocated);
      if (active) {
        setBusy(false);
      }
    };

    initialize().catch(() => {
      if (active) {
        setBusy(false);
      }
    });

    return () => {
      active = false;
      rendition.off("relocated", onRelocated);
      book.destroy();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [blob, onLocationChange, themeStyles]);

  useEffect(() => {
    if (!renditionRef.current || !targetLocator) {
      return;
    }
    void renditionRef.current.display(targetLocator);
  }, [targetLocator]);

  useEffect(() => {
    if (!renditionRef.current) {
      return;
    }
    renditionRef.current.themes.default({
      body: themeStyles
    } as any);
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
        {toc.length ? (
          <label>
            章节
            <select
              onChange={(event) => {
                const href = event.target.value;
                if (!href) {
                  return;
                }
                void renditionRef.current?.display(href);
              }}
              defaultValue=""
            >
              <option value="" disabled>
                跳转章节
              </option>
              {toc.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {busy ? <span>正在渲染 EPUB...</span> : null}
      </div>
      <div className="epub-container" ref={containerRef} />
    </section>
  );
}
