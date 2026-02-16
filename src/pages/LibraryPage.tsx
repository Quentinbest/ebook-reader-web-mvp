import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import BookCard from "../components/BookCard";
import FileDropZone from "../components/FileDropZone";
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
      subtitle="Web 优先 · 本地离线阅读 MVP"
      rightSlot={<OfflineBadge />}
    >
      <section className="library-layout">
        <TelemetryNotice
          value={telemetryOptIn}
          onChange={async (next) => {
            setOptIn(next);
            await setTelemetryOptIn(next);
          }}
        />

        <FileDropZone onFiles={(files) => void handleFiles(files)} isLoading={busy} />

        {error ? <p className="error-banner">{error}</p> : null}

        <section className="book-grid" aria-label="我的书架">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={(id) => void handleDelete(id)} />
          ))}
          {!books.length ? <p className="empty-hint">暂无书籍，先导入一本 EPUB 或 PDF 开始阅读。</p> : null}
        </section>
      </section>
    </AppShell>
  );
}
