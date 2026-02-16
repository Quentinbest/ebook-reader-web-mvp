import { useEffect, useMemo, useRef, useState } from "react";
import { extractPdfToc } from "../lib/pdfToc";
import type { ReaderPreferences, TocItem } from "../types/contracts";

type PdfViewportProps = {
  blob: Blob;
  preferences: ReaderPreferences;
  layoutMode: "single" | "multi";
  pageCount: number;
  targetLocator?: string;
  onLocationChange: (payload: { locator: string; percent: number }) => void;
  onTocLoaded: (entries: TocItem[]) => void;
  onTocError: (message: string) => void;
  onNavigationError: (message: string) => void;
};

type PdfModule = typeof import("pdfjs-dist");

function locatorToPage(locator?: string): number | null {
  if (!locator) {
    return null;
  }
  const match = locator.match(/pdf:page:(\d+)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

export default function PdfViewport({
  blob,
  preferences,
  layoutMode,
  pageCount,
  targetLocator,
  onLocationChange,
  onTocLoaded,
  onTocError,
  onNavigationError
}: PdfViewportProps): JSX.Element {
  const PAGE_TURN_COOLDOWN_MS = 220;
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [doc, setDoc] = useState<any | null>(null);
  const [docPageCount, setDocPageCount] = useState(0);
  const [docLoading, setDocLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasPrimaryRef = useRef<HTMLCanvasElement | null>(null);
  const canvasSecondaryRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRefs = useRef<any[]>([]);
  const lastPageTurnAtRef = useRef(0);
  const callbacksRef = useRef({
    onLocationChange,
    onTocLoaded,
    onTocError,
    onNavigationError
  });

  const effectivePageCount = docPageCount || pageCount || 1;

  function turnPage(direction: "next" | "prev"): boolean {
    if (!doc || docLoading || rendering) {
      return false;
    }

    setPage((prev) => {
      if (direction === "next") {
        return clamp(prev + 1, 1, effectivePageCount);
      }
      return clamp(prev - 1, 1, effectivePageCount);
    });
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
      onNavigationError
    };
  }, [onLocationChange, onNavigationError, onTocError, onTocLoaded]);

  useEffect(() => {
    if (!targetLocator) {
      return;
    }

    const next = locatorToPage(targetLocator);
    if (next && next > 0) {
      setPage(next);
      return;
    }

    if (targetLocator.startsWith("pdf:")) {
      callbacksRef.current.onNavigationError("无法跳转到该章节");
    }
  }, [targetLocator]);

  useEffect(() => {
    const percent = effectivePageCount > 0 ? Math.round((page / effectivePageCount) * 100) : page;
    callbacksRef.current.onLocationChange({
      locator: `pdf:page:${page}`,
      percent: Math.min(percent, 100)
    });
  }, [effectivePageCount, page]);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any | null = null;

    async function loadDocument(): Promise<void> {
      setDocLoading(true);
      setError(null);
      setDoc(null);
      setDocPageCount(0);

      try {
        const pdfjs: PdfModule = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

        const loadingData = await blob.arrayBuffer();
        loadingTask = pdfjs.getDocument({ data: loadingData });
        const pdf = await loadingTask.promise;

        if (cancelled) {
          await pdf.destroy();
          return;
        }

        setDoc(pdf);
        setDocPageCount(pdf.numPages || 0);
        setPage((prev) => clamp(prev, 1, Math.max(1, pdf.numPages || 1)));

        const tocEntries = await extractPdfToc(pdf);
        if (!cancelled) {
          callbacksRef.current.onTocLoaded(tocEntries);
        }
      } catch {
        if (!cancelled) {
          setError("PDF 加载失败");
          callbacksRef.current.onTocError("目录加载失败");
        }
      } finally {
        if (!cancelled) {
          setDocLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
      if (loadingTask?.destroy) {
        void loadingTask.destroy();
      }
    };
  }, [blob]);

  useEffect(() => {
    if (!doc || !canvasPrimaryRef.current || !frameRef.current) {
      return;
    }

    let cancelled = false;

    const cancelRenderTasks = () => {
      for (const task of renderTaskRefs.current) {
        if (task?.cancel) {
          task.cancel();
        }
      }
      renderTaskRefs.current = [];
    };

    async function renderCanvas(targetPage: number, canvas: HTMLCanvasElement, widthBudget: number): Promise<void> {
      const pdfPage = await doc.getPage(targetPage);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = widthBudget / Math.max(1, baseViewport.width);
      const finalScale = fitScale * (zoom / 100);
      const viewport = pdfPage.getViewport({ scale: finalScale });

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) {
        throw new Error("canvas_context_missing");
      }

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const task = pdfPage.render({
        canvasContext: context,
        viewport
      });
      renderTaskRefs.current.push(task);
      await task.promise;
    }

    async function renderPage(): Promise<void> {
      setRendering(true);
      setError(null);

      try {
        cancelRenderTasks();

        const containerWidth = Math.max(1, frameRef.current?.clientWidth ?? 1);
        const twoPage = layoutMode === "multi";
        const gap = 16;
        const widthBudget = twoPage ? Math.max(240, (containerWidth - gap) / 2) : containerWidth;

        const firstPage = clamp(page, 1, Math.max(1, doc.numPages || 1));
        await renderCanvas(firstPage, canvasPrimaryRef.current!, widthBudget);

        const secondPageNumber = firstPage + 1;
        const shouldRenderSecond = twoPage && secondPageNumber <= Math.max(1, doc.numPages || 1);

        if (canvasSecondaryRef.current) {
          if (shouldRenderSecond) {
            await renderCanvas(secondPageNumber, canvasSecondaryRef.current, widthBudget);
            canvasSecondaryRef.current.style.display = "block";
          } else {
            canvasSecondaryRef.current.style.display = "none";
          }
        }
      } catch (reason: any) {
        if (!cancelled && reason?.name !== "RenderingCancelledException") {
          setError("PDF 渲染失败");
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      cancelRenderTasks();
    };
  }, [doc, layoutMode, page, zoom]);

  useEffect(() => {
    return () => {
      if (!doc || !doc.destroy) {
        return;
      }
      void doc.destroy();
    };
  }, [doc]);

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
  }, [doc, docLoading, rendering, effectivePageCount]);

  const pageStyle = useMemo(
    () => ({
      fontFamily: preferences.fontFamily === "serif" ? "Merriweather, serif" : "IBM Plex Sans, sans-serif"
    }),
    [preferences.fontFamily]
  );

  return (
    <section className="reader-viewport" style={pageStyle}>
      <div className="reader-controls-inline">
        <button type="button" onClick={() => turnPage("prev")}>
          上一页
        </button>
        <button type="button" onClick={() => turnPage("next")}>
          下一页
        </button>
        <label>
          页码
          <input
            type="number"
            min={1}
            max={Math.max(effectivePageCount, 1)}
            value={page}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isNaN(next) && next > 0) {
                setPage(clamp(next, 1, Math.max(effectivePageCount, 1)));
              }
            }}
          />
          <span>/ {effectivePageCount || "?"}</span>
        </label>
        <label>
          缩放
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <span>{zoom}%</span>
        </label>
      </div>

      <div
        className="pdf-frame"
        ref={frameRef}
        onWheel={(event) => {
          if (Math.abs(event.deltaY) < 6) {
            return;
          }

          const direction = event.deltaY > 0 ? "next" : "prev";
          if (turnPageWithCooldown(direction)) {
            event.preventDefault();
          }
        }}
      >
        {docLoading || rendering ? <p className="loading">正在渲染 PDF...</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        <div className={`pdf-canvas-group ${layoutMode === "multi" ? "is-multi" : "is-single"}`}>
          <canvas
            ref={canvasPrimaryRef}
            style={{
              display: error ? "none" : "block",
              margin: "0 auto"
            }}
          />
          <canvas
            ref={canvasSecondaryRef}
            style={{
              display: "none",
              margin: "0 auto"
            }}
          />
        </div>
      </div>
    </section>
  );
}
