import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import BookCard from "../components/BookCard";
import FileDropZone from "../components/FileDropZone";
import { ClockIcon, LibraryIcon, SearchIcon, TagIcon } from "../components/icons/BooksIcons";
import OfflineBadge from "../components/OfflineBadge";
import TelemetryNotice from "../components/TelemetryNotice";
import { deleteBook, getBooks, getTelemetryOptIn, setTelemetryOptIn } from "../lib/db";
import type { BookMeta } from "../types/contracts";

export default function LibraryPage(): JSX.Element {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telemetryOptIn, setOptIn] = useState(true);
  const [collection, setCollection] = useState<"library" | "recent" | "tags">("library");

  async function refresh(): Promise<void> {
    setBooks(await getBooks());
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

  return (
    <AppShell
      title="Ebook Reader"
      subtitle="Books 风格 · 本地离线阅读"
      rightSlot={<OfflineBadge />}
      toolbar={
        <label className="books-chip books-icon-label">
          <SearchIcon />
          搜索书籍
        </label>
      }
      sidebar={
        <section className="books-collections" aria-label="书架分组">
          <h3>资料库</h3>
          <button
            type="button"
            className={`books-collection-btn ${collection === "library" ? "is-active" : ""}`}
            onClick={() => setCollection("library")}
          >
            <LibraryIcon />
            书库
          </button>
          <button
            type="button"
            className={`books-collection-btn ${collection === "recent" ? "is-active" : ""}`}
            onClick={() => setCollection("recent")}
          >
            <ClockIcon />
            最近阅读
          </button>
          <button
            type="button"
            className={`books-collection-btn ${collection === "tags" ? "is-active" : ""}`}
            onClick={() => setCollection("tags")}
          >
            <TagIcon />
            标签（占位）
          </button>
        </section>
      }
    >
      <section className="library-layout books-library">
        <div className="books-library-toolbar books-library-panel">
          <h2>我的书架</h2>
          <span className="books-chip">{books.length} 本书</span>
        </div>

        <TelemetryNotice
          value={telemetryOptIn}
          onChange={async (next) => {
            setOptIn(next);
            await setTelemetryOptIn(next);
          }}
        />

        <div className="books-library-panel">
          <FileDropZone onFiles={(files) => void handleFiles(files)} isLoading={busy} />
        </div>

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="book-grid books-library-panel" aria-label="我的书架">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={(id) => void handleDelete(id)} />
          ))}
          {!books.length ? <p className="empty-hint">暂无书籍，先导入一本 EPUB 或 PDF 开始阅读。</p> : null}
        </section>
      </section>
    </AppShell>
  );
}
