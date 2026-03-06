import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AnnotationPanel from "../components/AnnotationPanel";
import AppShell from "../components/AppShell";
import OfflineBadge from "../components/OfflineBadge";
import ReaderSettingsPanel from "../components/ReaderSettingsPanel";
import SearchPanel from "../components/SearchPanel";
import TocPanel from "../components/TocPanel";
import UtilityPaneHost from "../components/UtilityPaneHost";
import { AaIcon, ChevronLeftIcon, ChevronRightIcon, NoteIcon, SearchIcon, SlidersIcon } from "../components/icons/BooksIcons";
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

type ReaderPaneKind = "toc" | "search" | "settings" | "annotations" | null;
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

  const [tocEntries, setTocEntries] = useState<TocItem[]>([]);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocError, setTocError] = useState<string | null>(null);
  const [tocNeedsCache, setTocNeedsCache] = useState(false);
  const [epubReady, setEpubReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<ReaderPaneKind>(null);
  const [pageLayout, setPageLayout] = useState<PageLayoutMode>(() => {
    const raw = window.localStorage.getItem("reader_page_layout");
    return raw === "multi" ? "multi" : "single";
  });
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1081px)").matches);

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
    const media = window.matchMedia("(min-width: 1081px)");
    const apply = (): void => setIsDesktop(media.matches);
    apply();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    media.addListener(apply);
    return () => media.removeListener(apply);
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
        setActivePane((prev) => (prev === "toc" ? null : "toc"));
        return;
      }

      if (event.key === "Escape") {
        setActivePane(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      setActivePane(null);
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

  function togglePane(next: Exclude<ReaderPaneKind, null>): void {
    setActivePane((prev) => (prev === next ? null : next));
  }

  function triggerPageTurn(direction: "prev" | "next"): void {
    const key = direction === "next" ? "ArrowDown" : "ArrowUp";
    window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  }

  function navigateToLocator(locator: string): void {
    setTargetLocator(locator);
    setCurrentHref(locator);
    setActivePane(null);
  }

  const handleTocNavigate = (href: string): void => {
    if (book?.format === "epub" && !epubReady) {
      showNotice("正在加载…");
      return;
    }
    if (book?.format === "pdf" && !/^pdf:page:\d+$/i.test(href)) {
      showNotice("无法跳转到该章节");
      return;
    }

    navigateToLocator(href);
  };

  if (loading) {
    return (
      <AppShell title="阅读器" subtitle="正在加载书籍..." toolbarTrailing={<OfflineBadge />} shellKind="reader">
        <p className="loading">加载中...</p>
      </AppShell>
    );
  }

  if (error || !book || !blob) {
    return (
      <AppShell title="阅读器" subtitle="加载失败" toolbarTrailing={<OfflineBadge />} shellKind="reader">
        <p className="error-banner">{error ?? "未知错误"}</p>
        <button type="button" className="books-button" onClick={() => navigate("/library")}>返回书架</button>
      </AppShell>
    );
  }

  const tocDisabled = book.format === "epub" ? !epubReady && !tocEntries.length : tocLoading;
  const subtitle = `${book.author || "本地阅读"} · ${pageLayout === "single" ? "单页版式" : "双页版式"}`;
  const paneTheme = preferences.theme;
  const readerActions = [
    {
      key: "toc",
      label: "目录",
      icon: <SlidersIcon />,
      testId: "reader-action-toc",
      onClick: () => togglePane("toc")
    },
    {
      key: "search",
      label: "检索",
      icon: <SearchIcon />,
      testId: "reader-action-search",
      onClick: () => togglePane("search")
    },
    {
      key: "settings",
      label: "显示",
      icon: <AaIcon />,
      testId: "reader-action-settings",
      onClick: () => togglePane("settings")
    },
    {
      key: "annotations",
      label: "批注",
      icon: <NoteIcon />,
      testId: "reader-action-annotations",
      onClick: () => togglePane("annotations")
    }
  ] as const;

  const paneConfig =
    activePane === "toc"
      ? {
          title: "目录",
          width: 360 as const,
          headerActions: tocDisabled ? <span className="books-chip">加载中</span> : null,
          content: (
            <TocPanel
              open
              mode="content"
              bookTitle={book.title}
              bookAuthor={book.author}
              bookCoverUrl={book.coverUrl}
              items={tocEntries}
              currentHref={currentHref}
              loading={tocLoading}
              error={tocError}
              disabled={tocDisabled}
              onClose={() => setActivePane(null)}
              onNavigate={handleTocNavigate}
            />
          )
        }
      : activePane === "search"
        ? {
            title: "书内检索",
            width: 420 as const,
            headerActions: null,
            content: (
              <SearchPanel
                onSearch={runSearch}
                onPick={(locator) => {
                  navigateToLocator(locator);
                }}
              />
            )
          }
        : activePane === "settings"
          ? {
              title: "显示",
              width: 360 as const,
              headerActions: null,
              content: (
                <ReaderSettingsPanel
                  preferences={preferences}
                  pageLayout={pageLayout}
                  onChange={(next) => void onPreferencesChange(next)}
                  onPageLayoutChange={setPageLayout}
                />
              )
            }
          : activePane === "annotations"
            ? {
                title: "批注",
                width: 420 as const,
                headerActions: (
                  <Link className="books-link-button" to={`/notes/${book.id}`}>
                    打开批注页
                  </Link>
                ),
                content: (
                  <AnnotationPanel
                    currentLocator={currentLocator}
                    annotations={annotations}
                    onCreate={createAnnotation}
                    onDelete={async (id) => {
                      await deleteAnnotation(id);
                      await refreshAnnotations();
                    }}
                    onLocate={(locator) => navigateToLocator(locator)}
                  />
                )
              }
            : null;

  return (
    <AppShell
      title={book.title}
      subtitle={subtitle}
      shellKind="reader"
      toolbarLeading={
        <button
          type="button"
          className="books-button books-button--ghost"
          data-testid="reader-action-back"
          onClick={() => navigate("/library")}
        >
          <ChevronLeftIcon />
          返回书架
        </button>
      }
      toolbarTrailing={
        <div className="reader-toolbar-actions" data-testid="reader-toolbar">
          {readerActions.map((action) => (
            <button
              key={action.key}
              type="button"
              className={`books-button books-button--ghost ${activePane === action.key ? "is-active" : ""}`}
              data-testid={action.testId}
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
          <div className="reader-inline-progress" title={`阅读进度 ${Math.round(currentPercent)}%`}>
            <span aria-hidden>{Math.round(currentPercent)}%</span>
            <div className="reader-inline-progress__track" aria-hidden>
              <span style={{ width: `${Math.max(0, Math.min(100, Math.round(currentPercent)))}%` }} />
            </div>
          </div>
          <OfflineBadge />
        </div>
      }
      sidebar={
        <>
          <section className="books-sidebar-group">
            <h2>当前书籍</h2>
            <p className="books-sidebar-group__title">{book.title}</p>
            <p>{book.author || "未知作者"}</p>
          </section>
          <section className="books-sidebar-group books-sidebar-group--muted">
            <h2>阅读状态</h2>
            <p>{book.format.toUpperCase()} · {Math.round(currentPercent)}% 已读</p>
            <p>{pageLayout === "single" ? "单页版式" : "双页版式"} · {annotations.length} 条批注</p>
            <p>{currentLocator === "start" ? "从开头开始" : `当前位置：${currentLocator}`}</p>
          </section>
        </>
      }
      contentClassName="books-reader-shell"
    >
      <div className={`reader-workspace ${isDesktop && activePane ? "has-pane" : ""}`.trim()}>
        <section className={`reader-page theme-${preferences.theme}`}>
          {isDesktop ? (
            <>
              <button
                type="button"
                className="reader-edge-hit reader-edge-hit--left"
                aria-label="上一页"
                onClick={() => triggerPageTurn("prev")}
              />
              <button
                type="button"
                className="reader-edge-hit reader-edge-hit--right"
                aria-label="下一页"
                onClick={() => triggerPageTurn("next")}
              />
              <button
                type="button"
                className="reader-page-arrow reader-page-arrow--left"
                data-testid="reader-page-arrow-left"
                aria-label="上一页"
                onClick={() => triggerPageTurn("prev")}
              >
                <ChevronLeftIcon />
              </button>
              <button
                type="button"
                className="reader-page-arrow reader-page-arrow--right"
                data-testid="reader-page-arrow-right"
                aria-label="下一页"
                onClick={() => triggerPageTurn("next")}
              >
                <ChevronRightIcon />
              </button>
            </>
          ) : null}

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
        </section>

        {isDesktop && paneConfig ? (
          <UtilityPaneHost
            open
            title={paneConfig.title}
            width={paneConfig.width}
            theme={paneTheme}
            headerActions={paneConfig.headerActions}
            onClose={() => setActivePane(null)}
          >
            {paneConfig.content}
          </UtilityPaneHost>
        ) : null}
      </div>

      {!isDesktop && paneConfig ? (
        <div className="reader-mobile-panel-wrap">
          <section className={`reader-mobile-panel theme-${preferences.theme}`}>
            <header className="reader-mobile-panel__header">
              <div className="reader-mobile-panel__title">
                <h3>{paneConfig.title}</h3>
                {paneConfig.headerActions}
              </div>
              <button type="button" className="books-button books-button--ghost" aria-label="关闭" onClick={() => setActivePane(null)}>
                ×
              </button>
            </header>
            <div className="reader-mobile-panel__body">{paneConfig.content}</div>
          </section>
        </div>
      ) : null}

      {notice ? <div className="reader-toast">{notice}</div> : null}
    </AppShell>
  );
}
