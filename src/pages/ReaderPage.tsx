import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AnnotationPanel from "../components/AnnotationPanel";
import AppShell from "../components/AppShell";
import OfflineBadge from "../components/OfflineBadge";
import ReaderSettingsPanel from "../components/ReaderSettingsPanel";
import SearchPanel from "../components/SearchPanel";
import {
  getAnnotations,
  getBook,
  getBookBlob,
  getBookIndex,
  getReaderPreferences,
  getReadingProgress,
  putAnnotation,
  putReadingProgress,
  setReaderPreferences,
  deleteAnnotation
} from "../lib/db";
import { createId } from "../lib/id";
import { searchBook } from "../lib/search";
import { track } from "../lib/telemetry";
import type {
  Annotation,
  AnnotationColor,
  BookMeta,
  ReaderPreferences,
  SearchResult
} from "../types/contracts";
import { DEFAULT_READER_PREFERENCES } from "../types/contracts";

const EpubViewport = lazy(() => import("../components/EpubViewport"));
const PdfViewport = lazy(() => import("../components/PdfViewport"));

export default function ReaderPage(): JSX.Element {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [book, setBook] = useState<BookMeta | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_READER_PREFERENCES);
  const [currentLocator, setCurrentLocator] = useState("start");
  const [currentPercent, setCurrentPercent] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [targetLocator, setTargetLocator] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestedLocator = useMemo(() => searchParams.get("locator") ?? undefined, [searchParams]);

  const refreshAnnotations = useCallback(async () => {
    setAnnotations(await getAnnotations(bookId));
  }, [bookId]);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const [bookMeta, fileBlob, progress, prefs, notes, index] = await Promise.all([
          getBook(bookId),
          getBookBlob(bookId),
          getReadingProgress(bookId),
          getReaderPreferences(),
          getAnnotations(bookId),
          getBookIndex(bookId)
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
      <div className={`reader-page theme-${preferences.theme}`}>
        <section className="reader-main">
          <Suspense fallback={<p className="loading">阅读器加载中...</p>}>
            {book.format === "epub" ? (
              <EpubViewport
                blob={blob}
                preferences={preferences}
                targetLocator={targetLocator}
                onLocationChange={({ locator, percent }) => {
                  setCurrentLocator(locator);
                  setCurrentPercent(percent);
                }}
              />
            ) : (
              <PdfViewport
                blob={blob}
                preferences={preferences}
                pageCount={pageCount}
                targetLocator={targetLocator}
                onLocationChange={({ locator, percent }) => {
                  setCurrentLocator(locator);
                  setCurrentPercent(percent);
                }}
              />
            )}
          </Suspense>
        </section>

        <aside className="reader-side">
          <ReaderSettingsPanel preferences={preferences} onChange={(next) => void onPreferencesChange(next)} />
          <SearchPanel
            onSearch={runSearch}
            onPick={(locator) => {
              setTargetLocator(locator);
              setCurrentLocator(locator);
            }}
          />
          <AnnotationPanel
            currentLocator={currentLocator}
            annotations={annotations}
            onCreate={createAnnotation}
            onLocate={(locator) => {
              setTargetLocator(locator);
            }}
            onDelete={async (id) => {
              await deleteAnnotation(id);
              await refreshAnnotations();
            }}
          />
        </aside>
      </div>
    </AppShell>
  );
}
