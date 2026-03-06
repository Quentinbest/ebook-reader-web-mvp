import { Link } from "react-router-dom";
import type { BookMeta } from "../types/contracts";

type BookCardProps = {
  book: BookMeta;
  onDelete: (id: string) => void;
  progressPercent?: number;
};

const coverPalettes = [
  ["#6f7ed8", "#3346b7"],
  ["#d87b5f", "#b14d36"],
  ["#5a907b", "#2b6d54"],
  ["#b087cb", "#8052a6"],
  ["#cf8b46", "#9d5b16"]
] as const;

function formatDate(ts?: number): string {
  if (!ts) {
    return "未打开";
  }
  return new Date(ts).toLocaleDateString();
}

function paletteFor(book: BookMeta): readonly [string, string] {
  const seed = `${book.title}:${book.author ?? ""}`;
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return coverPalettes[hash % coverPalettes.length];
}

export default function BookCard({ book, onDelete, progressPercent = 0 }: BookCardProps): JSX.Element {
  const [from, to] = paletteFor(book);
  const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const fallbackTitle = book.title.length > 40 ? `${book.title.slice(0, 40).trim()}…` : book.title;
  const lastOpenedLabel = formatDate(book.lastReadAt);
  const statusLabel = progress > 0 ? `${progress}% 已读` : book.lastReadAt ? "已打开" : "未开始";

  return (
    <article className="book-card" data-testid="book-card">
      <Link
        className="book-card__cover"
        to={`/reader/${book.id}`}
        data-testid="book-card-open"
        aria-label={`打开《${book.title}》`}
        style={
          book.coverUrl
            ? undefined
            : {
                background: `linear-gradient(180deg, ${from}, ${to})`
              }
        }
      >
        {book.coverUrl ? (
          <img src={book.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className="book-card__cover-fallback" aria-hidden>
            <small>{book.author || "Local edition"}</small>
            <strong>{fallbackTitle}</strong>
            <em>{book.format.toUpperCase()}</em>
          </span>
        )}
      </Link>

      <div className="book-card__body">
        <div className="book-card__heading">
          <h3 title={book.title}>{book.title}</h3>
        </div>

        <div className="book-card__meta">
          <p className="book-card__author">{book.author || "未知作者"}</p>
          <span className="book-card__status" title={`最近打开 ${lastOpenedLabel}`}>{statusLabel}</span>
        </div>

        <div className="book-card__progress" aria-label={`阅读进度 ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="book-card__actions">
          <Link className="book-card__action-link" to={`/notes/${book.id}`}>批注</Link>
          <button type="button" className="books-button books-button--danger" onClick={() => onDelete(book.id)}>
            删除
          </button>
        </div>
      </div>
    </article>
  );
}
