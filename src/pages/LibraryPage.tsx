import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import BookCard from "../components/BookCard";
import FileDropZone from "../components/FileDropZone";
import { ClockIcon, LibraryIcon, SearchIcon, TagIcon } from "../components/icons/BooksIcons";
import OfflineBadge from "../components/OfflineBadge";
import TelemetryNotice from "../components/TelemetryNotice";
import { deleteBook, getBooks, getReadingProgress, getTelemetryOptIn, setTelemetryOptIn } from "../lib/db";
import type { BookMeta } from "../types/contracts";

type CollectionKey = "library" | "recent" | "tags";

function matchesBook(book: BookMeta, query: string): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) {
    return true;
  }

  return [book.title, book.author ?? "", book.format]
    .join(" ")
    .toLowerCase()
    .includes(keyword);
}

export default function LibraryPage(): JSX.Element {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [progressByBook, setProgressByBook] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telemetryOptIn, setOptIn] = useState(true);
  const [collection, setCollection] = useState<CollectionKey>("library");
  const [query, setQuery] = useState("");

  async function refresh(): Promise<void> {
    const nextBooks = await getBooks();
    setBooks(nextBooks);

    const progressEntries = await Promise.all(
      nextBooks.map(async (book) => [book.id, (await getReadingProgress(book.id))?.percent ?? 0] as const)
    );
    setProgressByBook(Object.fromEntries(progressEntries));
  }

  useEffect(() => {
    void refresh();
    void getTelemetryOptIn().then(setOptIn);
  }, []);

  async function handleFiles(files: File[]): Promise<void> {
    setBusy(true);
    setError(null);

    try {
      const { importBook } = await import("../lib/importer");
      let lastImportedId: string | null = null;
      for (const file of files) {
        const book = await importBook(file);
        lastImportedId = book.id;
      }
      await refresh();
      if (lastImportedId) {
        navigate(`/reader/${lastImportedId}`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "导入失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(bookId: string): Promise<void> {
    if (!window.confirm("确认删除该书及其本地进度、批注？")) {
      return;
    }

    await deleteBook(bookId);
    await refresh();
  }

  const sortedBooks = useMemo(
    () =>
      [...books].sort((a, b) => {
        const left = a.lastReadAt ?? a.updatedAt ?? a.createdAt;
        const right = b.lastReadAt ?? b.updatedAt ?? b.createdAt;
        return right - left;
      }),
    [books]
  );

  const recentBooks = useMemo(
    () => sortedBooks.filter((book) => Boolean(book.lastReadAt)).sort((a, b) => (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0)),
    [sortedBooks]
  );

  const collectionBooks = useMemo(() => {
    if (collection === "recent") {
      return recentBooks;
    }
    if (collection === "tags") {
      return [];
    }
    return sortedBooks;
  }, [collection, recentBooks, sortedBooks]);

  const visibleBooks = useMemo(() => collectionBooks.filter((book) => matchesBook(book, query)), [collectionBooks, query]);
  const hasBooks = books.length > 0;
  const resultLabel = query.trim() ? `${visibleBooks.length} 条结果` : `${collectionBooks.length} 本书`;
  const currentCollectionLabel = collection === "library" ? "书库" : collection === "recent" ? "最近阅读" : "标签";

  return (
    <AppShell
      title="书架"
      subtitle="本地离线阅读"
      shellKind="library"
      toolbarTrailing={
        <div className="library-toolbar-actions">
          <label className="library-search" aria-label="搜索书籍">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索书名、作者或格式"
              data-testid="library-search-input"
            />
            {query ? (
              <button type="button" className="library-search__clear" onClick={() => setQuery("")}>
                清除
              </button>
            ) : null}
          </label>
          {hasBooks ? <FileDropZone onFiles={(files) => void handleFiles(files)} isLoading={busy} variant="compact" /> : null}
          <OfflineBadge />
        </div>
      }
      sidebar={
        <>
          <section className="books-sidebar-group" aria-label="书架分组">
            <h2>资料库</h2>
            <button
              type="button"
              className={`books-sidebar-group__button ${collection === "library" ? "is-active" : ""}`}
              onClick={() => setCollection("library")}
            >
              <LibraryIcon />
              书库
              <span>{sortedBooks.length}</span>
            </button>
            <button
              type="button"
              className={`books-sidebar-group__button ${collection === "recent" ? "is-active" : ""}`}
              onClick={() => setCollection("recent")}
            >
              <ClockIcon />
              最近阅读
              <span>{recentBooks.length}</span>
            </button>
            <button
              type="button"
              className={`books-sidebar-group__button ${collection === "tags" ? "is-active" : ""}`}
              onClick={() => setCollection("tags")}
            >
              <TagIcon />
              标签
              <span>占位</span>
            </button>
          </section>

          <section className="books-sidebar-group books-sidebar-group--muted">
            <h2>状态</h2>
            <p>{hasBooks ? `当前视图：${currentCollectionLabel}` : "导入一本书开始阅读。"}</p>
            <p>{query.trim() ? `搜索关键词：${query}` : "支持 EPUB / PDF，本地离线可读。"}</p>
          </section>
        </>
      }
      contentClassName="books-library-content"
    >
      <section className="library-layout books-library">
        <TelemetryNotice
          value={telemetryOptIn}
          onChange={async (next) => {
            setOptIn(next);
            await setTelemetryOptIn(next);
          }}
        />

        {error ? <p className="error-banner">{error}</p> : null}

        {!hasBooks ? (
          <section className="books-panel books-panel--empty">
            <div className="library-panel__header">
              <div>
                <h2>空书库</h2>
                <p>从本地导入 EPUB 或 PDF 后，会在这里生成桌面书架。</p>
              </div>
            </div>
            <FileDropZone onFiles={(files) => void handleFiles(files)} isLoading={busy} />
          </section>
        ) : (
          <>
            <section className="books-panel library-panel__header">
              <div>
                <h2>{currentCollectionLabel}</h2>
                <p>{query.trim() ? `关键词“${query}”的筛选结果` : "封面优先的桌面书架视图"}</p>
              </div>
              <span className="books-chip">{resultLabel}</span>
            </section>

            {collection === "tags" ? (
              <section className="books-panel books-panel--placeholder">
                <h3>标签视图暂未开放</h3>
                <p>本轮不引入新的标签领域模型，先统一书架、阅读和批注工作流。</p>
              </section>
            ) : visibleBooks.length ? (
              <section className="book-grid books-panel" aria-label="我的书架" data-testid="library-book-grid">
                {visibleBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    progressPercent={progressByBook[book.id] ?? 0}
                    onDelete={(id) => void handleDelete(id)}
                  />
                ))}
              </section>
            ) : (
              <section className="books-panel books-panel--placeholder">
                <h3>没有匹配结果</h3>
                <p>换一个关键词，或清空搜索回到完整书架。</p>
              </section>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
