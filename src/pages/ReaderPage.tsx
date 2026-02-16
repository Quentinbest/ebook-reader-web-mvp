import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AnnotationPanel from "../components/AnnotationPanel";
import AppShell from "../components/AppShell";
import OfflineBadge from "../components/OfflineBadge";
import ReaderSettingsPanel from "../components/ReaderSettingsPanel";
import SearchPanel from "../components/SearchPanel";
import TocPanel from "../components/TocPanel";
import {
  deleteAnnotation,
  getAnnotations,
  getBook,
  getBookBlob,
  getBookIndex,
  getBookToc,
  getReaderPreferences,
  getReadingProgress,
  putAnnotation,
  putBookToc,
  putReadingProgress,
  setReaderPreferences
} from "../lib/db";
import { createId } from "../lib/id";
import { searchBook } from "../lib/search";
import { track } from "../lib/telemetry";
import type {
  Annotation,
  AnnotationColor,
  BookMeta,
  ReaderPreferences,
  SearchResult,
  TocItem
} from "../types/contracts";
import { DEFAULT_READER_PREFERENCES, TOC_CACHE_VERSION } from "../types/contracts";

const EpubViewport = lazy(() => import("../components/EpubViewport"));
const PdfViewport = lazy(() => import("../components/PdfViewport"));
type ReaderTool = "settings" | "search" | "annotation" | "layout";
type PageLayoutMode = "single" | "multi";

export default function ReaderPage(): JSX.Element {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [book, setBook] = useState<BookMeta | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_READER_PREFERENCES);
  const [currentLocator, setCurrentLocator] = useState("start");
  const [currentHref, setCurrentHref] = useState<string | undefined>(undefined);
  const [currentPercent, setCurrentPercent] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [targetLocator, setTargetLocator] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tocOpen, setTocOpen] = useState(false);
  const [tocEntries, setTocEntries] = useState<TocItem[]>([]);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);
  const [tocNeedsCache, setTocNeedsCache] = useState(false);
  const [epubReady, setEpubReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toolMenuOpen, setToolMenuOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ReaderTool | null>(null);
  const [pageLayout, setPageLayout] = useState<PageLayoutMode>(() => {
    const raw = window.localStorage.getItem("reader_page_layout");
    return raw === "multi" ? "multi" : "single";
  });

  const noticeTimerRef = useRef<number | null>(null);

  const requestedLocator = useMemo(() => searchParams.get("locator") ?? undefined, [searchParams]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
    }, 2200);
  }, []);

  const refreshAnnotations = useCallback(async () => {
    setAnnotations(await getAnnotations(bookId));
  }, [bookId]);

  useEffect(() => {
    window.localStorage.setItem("reader_page_layout", pageLayout);
  }, [pageLayout]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setTocOpen((prev) => !prev);
        return;
      }

      if (event.key === "Escape") {
        setTocOpen(false);
        setToolMenuOpen(false);
        setActiveTool(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setTocOpen(false);
      setToolMenuOpen(false);
      setActiveTool(null);
      setTocError(null);
      setCurrentHref(undefined);

      try {
        const [bookMeta, fileBlob, progress, prefs, notes, index, tocCache] = await Promise.all([
          getBook(bookId),
          getBookBlob(bookId),
          getReadingProgress(bookId),
          getReaderPreferences(),
          getAnnotations(bookId),
          getBookIndex(bookId),
          getBookToc(bookId)
        ]);

        if (!bookMeta || !fileBlob) {
          setError("书籍不存在或已损坏");
          return;
        }

        if (!active) {
          return;
        }

        setBook(bookMeta);
        setBlob(fileBlob);
        setAnnotations(notes);
        setPreferences(prefs);
        setPageCount(index?.entries.filter((entry) => entry.locator.startsWith("pdf:page:")).length ?? 0);

        const locator = requestedLocator ?? progress?.locator ?? "start";
        setCurrentLocator(locator);
        setTargetLocator(locator);
        setCurrentPercent(progress?.percent ?? 0);
        if (bookMeta.format === "pdf") {
          setCurrentHref(locator);
        }

        if (bookMeta.format === "epub") {
          const validTocCache = tocCache && tocCache.tocVersion === TOC_CACHE_VERSION;
          setTocEntries(validTocCache ? tocCache.entries : []);
          setTocLoading(!validTocCache);
          setTocNeedsCache(!validTocCache);
          setEpubReady(false);
        } else {
          setTocEntries([]);
          setTocLoading(true);
          setTocNeedsCache(false);
          setEpubReady(true);
        }

        await track("reader_opened", {
          book_id: bookMeta.id,
          format: bookMeta.format
        });
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "阅读器初始化失败");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [bookId, requestedLocator]);

  useEffect(() => {
    if (!book || !currentLocator) {
      return;
    }

    const timer = window.setTimeout(() => {
      void putReadingProgress({
        bookId: book.id,
        locator: currentLocator,
        percent: currentPercent,
        updatedAt: Date.now()
      });

      void track("reading_progress_saved", {
        percent: currentPercent,
        book_id: book.id
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [book, currentLocator, currentPercent]);

  async function createAnnotation(payload: {
    locator: string;
    quote: string;
    note?: string;
    color: AnnotationColor;
  }): Promise<void> {
    if (!book) {
      return;
    }

    const now = Date.now();
    await putAnnotation({
      id: createId("ann"),
      bookId: book.id,
      locator: payload.locator,
      quote: payload.quote,
      note: payload.note,
      color: payload.color,
      createdAt: now,
      updatedAt: now
    });

    await track("annotation_created", {
      book_id: book.id,
      color: payload.color
    });

    await refreshAnnotations();
  }

  async function runSearch(query: string): Promise<SearchResult[]> {
    if (!book) {
      return [];
    }

    const results = await searchBook(book.id, query);

    await track("search_executed", {
      keyword_len: query.trim().length,
      result_count: results.length
    });

    return results;
  }

  async function onPreferencesChange(next: ReaderPreferences): Promise<void> {
    setPreferences(next);
    await setReaderPreferences(next);
  }

  if (loading) {
    return (
      <AppShell title="阅读器" subtitle="正在加载书籍..." rightSlot={<OfflineBadge />}>
        <p className="loading">加载中...</p>
      </AppShell>
    );
  }

  if (error || !book || !blob) {
    return (
      <AppShell title="阅读器" subtitle="加载失败" rightSlot={<OfflineBadge />}>
        <p className="error-banner">{error ?? "未知错误"}</p>
        <button type="button" onClick={() => navigate("/library")}>
          返回书架
        </button>
      </AppShell>
    );
  }

  const subtitle = `${book.title} · ${Math.round(currentPercent)}%`;

  return (
    <AppShell
      title="阅读器"
      subtitle={subtitle}
      rightSlot={
        <div className="reader-top-actions">
          <OfflineBadge />
          <Link to={`/notes/${book.id}`}>批注页</Link>
        </div>
      }
    >
      <button
        type="button"
        className="toc-side-trigger"
        aria-pressed={tocOpen}
        onClick={() => setTocOpen((prev) => !prev)}
      >
        目录
      </button>

      <div className={`reader-page theme-${preferences.theme}`}>
        <section className={`reader-main reader-main--${pageLayout}`}>
          <Suspense fallback={<p className="loading">阅读器加载中...</p>}>
            {book.format === "epub" ? (
              <EpubViewport
                blob={blob}
                preferences={preferences}
                layoutMode={pageLayout}
                targetLocator={targetLocator}
                onLocationChange={({ locator, percent, href }) => {
                  setCurrentLocator(locator);
                  setCurrentPercent(percent);
                  if (href) {
                    setCurrentHref(href);
                  }
                }}
                onTocLoaded={(entries) => {
                  setTocEntries(entries);
                  setTocLoading(false);
                  setTocError(null);

                  if (tocNeedsCache) {
                    setTocNeedsCache(false);
                    void putBookToc({
                      bookId: book.id,
                      tocVersion: TOC_CACHE_VERSION,
                      entries,
                      updatedAt: Date.now()
                    });
                  }
                }}
                onTocError={(message) => {
                  setTocLoading(false);
                  setTocError((prev) => (tocEntries.length ? prev : message));
                  if (!tocEntries.length) {
                    showNotice(message);
                  }
                }}
                onNavigationError={showNotice}
                onReadyChange={setEpubReady}
              />
            ) : (
              <PdfViewport
                blob={blob}
                preferences={preferences}
                layoutMode={pageLayout}
                pageCount={pageCount}
                targetLocator={targetLocator}
                onLocationChange={({ locator, percent }) => {
                  setCurrentLocator(locator);
                  setCurrentPercent(percent);
                  setCurrentHref(locator);
                }}
                onTocLoaded={(entries) => {
                  setTocEntries(entries);
                  setTocLoading(false);
                  setTocError(null);
                }}
                onTocError={(message) => {
                  setTocLoading(false);
                  setTocError(message);
                  showNotice(message);
                }}
                onNavigationError={showNotice}
              />
            )}
          </Suspense>
        </section>
      </div>

      <div className="reader-tool-fab">
        {toolMenuOpen ? (
          <div className="reader-tool-fab__menu" role="menu" aria-label="阅读工具菜单">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveTool("settings");
                setToolMenuOpen(false);
              }}
            >
              阅读设置
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveTool("search");
                setToolMenuOpen(false);
              }}
            >
              书内检索
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveTool("annotation");
                setToolMenuOpen(false);
              }}
            >
              批注
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setActiveTool("layout");
                setToolMenuOpen(false);
              }}
            >
              页面布局
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="reader-tool-fab__trigger"
          aria-expanded={toolMenuOpen}
          onClick={() => setToolMenuOpen((prev) => !prev)}
        >
          功能
        </button>
      </div>

      {activeTool ? (
        <div className="reader-tool-overlay" onClick={() => setActiveTool(null)}>
          <aside className="reader-tool-drawer" onClick={(event) => event.stopPropagation()}>
            <header className="reader-tool-drawer__header">
              <h3>
                {activeTool === "settings"
                  ? "阅读设置"
                  : activeTool === "search"
                    ? "书内检索"
                    : activeTool === "annotation"
                      ? "批注"
                      : "页面布局"}
              </h3>
              <button type="button" onClick={() => setActiveTool(null)}>
                关闭
              </button>
            </header>
            <div className="reader-tool-drawer__content">
              {activeTool === "settings" ? (
                <ReaderSettingsPanel preferences={preferences} onChange={(next) => void onPreferencesChange(next)} />
              ) : null}
              {activeTool === "search" ? (
                <SearchPanel
                  onSearch={runSearch}
                  onPick={(locator) => {
                    setTargetLocator(locator);
                    setCurrentLocator(locator);
                    setActiveTool(null);
                  }}
                />
              ) : null}
              {activeTool === "annotation" ? (
                <AnnotationPanel
                  currentLocator={currentLocator}
                  annotations={annotations}
                  onCreate={createAnnotation}
                  onLocate={(locator) => {
                    setTargetLocator(locator);
                    setActiveTool(null);
                  }}
                  onDelete={async (id) => {
                    await deleteAnnotation(id);
                    await refreshAnnotations();
                  }}
                />
              ) : null}
              {activeTool === "layout" ? (
                <section className="layout-panel">
                  <p className="layout-panel__hint">选择阅读布局模式</p>
                  <div className="layout-panel__actions">
                    <button
                      type="button"
                      className={pageLayout === "single" ? "is-active" : undefined}
                      onClick={() => setPageLayout("single")}
                    >
                      单页阅读
                    </button>
                    <button
                      type="button"
                      className={pageLayout === "multi" ? "is-active" : undefined}
                      onClick={() => setPageLayout("multi")}
                    >
                      多页阅读
                    </button>
                  </div>
                </section>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      <TocPanel
        open={tocOpen}
        bookTitle={book.title}
        items={tocEntries}
        currentHref={currentHref}
        loading={tocLoading}
        error={tocError}
        disabled={book.format === "epub" ? !epubReady : tocLoading}
        onClose={() => setTocOpen(false)}
        onNavigate={(href) => {
          if (book.format === "epub" && !epubReady) {
            showNotice("正在加载…");
            return;
          }
          if (book.format === "pdf" && !/^pdf:page:\d+$/i.test(href)) {
            showNotice("无法跳转到该章节");
            return;
          }

          setTargetLocator(href);
          setCurrentHref(href);
          setTocOpen(false);
        }}
      />

      {notice ? <div className="reader-toast">{notice}</div> : null}
    </AppShell>
  );
}
