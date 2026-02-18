import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { NoteIcon, SearchIcon } from "../components/icons/BooksIcons";
import OfflineBadge from "../components/OfflineBadge";
import { deleteAnnotation, getAnnotations, getBook, putAnnotation } from "../lib/db";
import type { Annotation, BookMeta } from "../types/contracts";

export default function NotesPage(): JSX.Element {
  const { bookId = "" } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState<BookMeta | null>(null);
  const [notes, setNotes] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh(): Promise<void> {
    const [bookMeta, annotations] = await Promise.all([getBook(bookId), getAnnotations(bookId)]);
    setBook(bookMeta);
    setNotes(annotations);
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <AppShell title="批注" subtitle="加载中..." rightSlot={<OfflineBadge />}>
        <p className="loading">加载中...</p>
      </AppShell>
    );
  }

  if (!book) {
    return (
      <AppShell title="批注" subtitle="书籍不存在" rightSlot={<OfflineBadge />}>
        <p className="error-banner">该书不存在，可能已被删除。</p>
        <button type="button" onClick={() => navigate("/library")}>返回书架</button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="批注管理"
      subtitle={book.title}
      toolbar={
        <span className="books-chip books-icon-label">
          <SearchIcon />
          批注检索（占位）
        </span>
      }
      sidebar={
        <section className="books-notes-sidebar">
          <h3>批注摘要</h3>
          <p className="books-icon-label">
            <NoteIcon />
            共 {notes.length} 条批注
          </p>
          <p>可在右侧编辑、删除，并跳回原文。</p>
        </section>
      }
      rightSlot={
        <div className="reader-top-actions">
          <OfflineBadge />
          <Link to={`/reader/${book.id}`}>回到阅读器</Link>
        </div>
      }
    >
      <div className="books-notes-layout">
        <section className="books-notes-sidebar">
          <h3>定位目录</h3>
          {notes.slice(0, 12).map((note) => (
            <button
              key={note.id}
              type="button"
              className="books-collection-btn"
              onClick={() => navigate(`/reader/${book.id}?locator=${encodeURIComponent(note.locator)}`)}
            >
              <NoteIcon />
              {note.locator}
            </button>
          ))}
          {!notes.length ? <p className="empty-hint">暂无批注</p> : null}
        </section>

        <section className="notes-page">
          {notes.map((item) => (
            <article key={item.id} className="note-item">
              <header>
                <button type="button" onClick={() => navigate(`/reader/${book.id}?locator=${encodeURIComponent(item.locator)}`)}>
                  {item.locator}
                </button>
                <small>{new Date(item.updatedAt).toLocaleString()}</small>
              </header>
              <blockquote>{item.quote}</blockquote>
              <label>
                备注
                <textarea
                  value={item.note ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    setNotes((prev) =>
                      prev.map((entry) => (entry.id === item.id ? { ...entry, note: next, updatedAt: Date.now() } : entry))
                    );
                  }}
                />
              </label>
              <div className="note-actions">
                <button
                  type="button"
                  onClick={async () => {
                    const latest = notes.find((entry) => entry.id === item.id);
                    if (!latest) {
                      return;
                    }
                    await putAnnotation({ ...latest, updatedAt: Date.now() });
                    await refresh();
                  }}
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteAnnotation(item.id);
                    await refresh();
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
          {!notes.length ? <p className="empty-hint">暂无批注。回到阅读器新增批注后会展示在这里。</p> : null}
        </section>
      </div>
    </AppShell>
  );
}
