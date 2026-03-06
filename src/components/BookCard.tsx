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
    return "从未阅读";
  }
  return new Date(ts).toLocaleDateString();
}

function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function paletteFor(book: BookMeta): readonly [string, string] {
  const seed = `${book.title}:${book.author ?? ""}`;
  const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return coverPalettes[hash % coverPalettes.length];
}

export default function BookCard({ book, onDelete, progressPercent = 0 }: BookCardProps): JSX.Element {
  const [from, to] = paletteFor(book);
  const progress = Math.max(0, Math.min(100, Math.round(progressPercent)));

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
        {book.coverUrl ? <img src={book.coverUrl} alt="" loading="lazy" /> : <span>{book.format.toUpperCase()}</span>}
      </Link>

      <div className="book-card__body">
        <div className="book-card__heading">
          <h3 title={book.title}>{book.title}</h3>
          <p>{book.author || "未知作者"}</p>
        </div>

        <div className="book-card__progress" aria-label={`阅读进度 ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="book-card__meta">
          <span>{progress > 0 ? `${progress}%` : "未开始"}</span>
          <span>{humanSize(book.fileSize)}</span>
          <span>{formatDate(book.lastReadAt)}</span>
        </div>

        <div className="book-card__actions">
          <Link to={`/notes/${book.id}`}>批注页</Link>
          <button type="button" className="books-button books-button--danger" onClick={() => onDelete(book.id)}>
            删除
          </button>
        </div>
      </div>
    </article>
  );
}
