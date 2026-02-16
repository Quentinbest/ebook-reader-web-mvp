import { Link } from "react-router-dom";
import type { BookMeta } from "../types/contracts";

type BookCardProps = {
  book: BookMeta;
  onDelete: (id: string) => void;
};

function formatDate(ts?: number): string {
  if (!ts) {
    return "从未阅读";
  }
  return new Date(ts).toLocaleString();
}

function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BookCard({ book, onDelete }: BookCardProps): JSX.Element {
  return (
    <article className="book-card">
      <div className="book-card__cover" aria-hidden>
        <span>{book.format.toUpperCase()}</span>
      </div>
      <div className="book-card__meta">
        <h3 title={book.title}>{book.title}</h3>
        <p>{book.author || "未知作者"}</p>
        <p>大小: {humanSize(book.fileSize)}</p>
        <p>最近阅读: {formatDate(book.lastReadAt)}</p>
      </div>
      <div className="book-card__actions">
        <Link to={`/reader/${book.id}`}>继续阅读</Link>
        <Link to={`/notes/${book.id}`}>查看批注</Link>
        <button type="button" onClick={() => onDelete(book.id)}>
          删除
        </button>
      </div>
    </article>
  );
}
