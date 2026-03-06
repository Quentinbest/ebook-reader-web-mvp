import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { ChevronLeftIcon, NoteIcon } from "../components/icons/BooksIcons";
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
    setNotes(annotations.sort((a, b) => b.updatedAt - a.updatedAt));
  }

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [bookId]);

  const latestLocator = useMemo(() => notes[0]?.locator ?? "暂无定位", [notes]);
  const notesSummaryLine = notes.length ? `${notes.length} 条批注 · 可回跳正文` : "等待新增";
  const notesSummaryLocator = notes.length ? `最近定位：${latestLocator}` : "回到阅读器新增批注后，会在这里形成工作区。";

  if (loading) {
    return (
      <AppShell title="批注管理" subtitle="加载中..." shellKind="notes" toolbarTrailing={<OfflineBadge />}>
        <p className="loading">加载中...</p>
      </AppShell>
    );
  }

  if (!book) {
    return (
      <AppShell title="批注管理" subtitle="书籍不存在" shellKind="notes" toolbarTrailing={<OfflineBadge />}>
        <p className="error-banner">该书不存在，可能已被删除。</p>
        <button type="button" className="books-button" onClick={() => navigate("/library")}>返回书架</button>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="批注管理"
      subtitle={book.title}
      shellKind="notes"
      toolbarLeading={
        <button type="button" className="books-button books-button--ghost" onClick={() => navigate(`/reader/${book.id}`)}>
          <ChevronLeftIcon />
          返回阅读器
        </button>
      }
      toolbarTrailing={<OfflineBadge />}
      sidebar={
        <>
          <section className="books-sidebar-group books-sidebar-group--notes-summary">
            <h2>批注工作区</h2>
            <p className="books-sidebar-group__title">{book.title}</p>
            <p className="books-sidebar-group__byline">{book.author || "本地阅读"}</p>
            <div className="books-sidebar-group__meta-line">
              <span>{notes.length} 条批注</span>
              <span>{notes.length ? "可回跳正文" : "等待新增"}</span>
            </div>
            <p className="books-sidebar-group__locator">
              {notes.length ? `最近定位：${latestLocator}` : "回到阅读器新增批注后，会在这里形成工作区。"}
            </p>
          </section>
        </>
      }
      contentClassName="books-notes-shell"
    >
      <div className="books-notes-layout">
        <section className="notes-mobile-summary" aria-label="批注摘要">
          <span className="notes-mobile-summary__eyebrow">批注工作区</span>
          <strong>{book.title}</strong>
          <p>{book.author || "本地阅读"}</p>
          <div className="notes-mobile-summary__meta">
            <span>{notesSummaryLine}</span>
            <span>{notesSummaryLocator}</span>
          </div>
        </section>

        <section className="notes-locator-rail" data-testid="notes-locator-rail">
          <header className="notes-section-header">
            <h2>定位目录</h2>
            <span className="books-chip">{notes.length} 条</span>
          </header>
          <div className="notes-locator-rail__list">
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                className="notes-locator-rail__item"
                onClick={() => navigate(`/reader/${book.id}?locator=${encodeURIComponent(note.locator)}`)}
              >
                <NoteIcon />
                <span className="notes-locator-rail__item-text">
                  <strong>{note.locator}</strong>
                  <small>{note.note?.trim() ? "含备注" : "仅引文"}</small>
                </span>
              </button>
            ))}
          </div>
          {!notes.length ? <p className="empty-hint">暂无批注。</p> : null}
        </section>

        <section className="notes-editor-list">
          <header className="notes-section-header">
            <h2>批注内容</h2>
            <span className="books-chip">点击定位回正文</span>
          </header>

          {notes.map((item) => (
            <article key={item.id} className="note-item">
              <header>
                <div className="note-item__header-meta">
                  <button type="button" className="books-link-button" onClick={() => navigate(`/reader/${book.id}?locator=${encodeURIComponent(item.locator)}`)}>
                    {item.locator}
                  </button>
                  <small>{new Date(item.updatedAt).toLocaleString()}</small>
                </div>
                <span className="books-chip">{item.color}</span>
              </header>
              <blockquote>{item.quote}</blockquote>
              <label className="settings-field">
                <span>备注</span>
                <textarea
                  aria-label="备注"
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
                  className="books-button"
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
                  className="books-button books-button--danger"
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
