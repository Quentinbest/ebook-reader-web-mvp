import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { SearchIcon } from "./icons/BooksIcons";
import type { SearchResult } from "../types/contracts";

type SearchPanelProps = {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onPick: (locator: string) => void;
};

function excerptLabel(result: SearchResult): string {
  const normalized = result.locator.replace(/^pdf:page:/i, "第 ").replace(/^epubcfi\(.+\)$/i, "定位");
  return normalized === result.locator ? `定位 ${result.locator}` : `${normalized} 页`;
}

export default function SearchPanel({ onSearch, onPick }: SearchPanelProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const hasResults = useMemo(() => results.length > 0, [results]);
  const statusLabel = loading ? "正在检索书内内容..." : searched ? `${results.length} 条结果` : "输入关键词后开始检索";

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    try {
      setResults(await onSearch(query.trim()));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="search-panel">
      <form onSubmit={submit} className="search-panel__form">
        <label className="search-panel__input">
          <SearchIcon />
          <span className="books-visually-hidden">关键词</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索当前书籍"
            aria-label="关键词"
          />
        </label>
        <button type="submit" className="books-button" disabled={loading}>
          {loading ? "检索中..." : "检索"}
        </button>
      </form>

      <p className="search-panel__status">{statusLabel}</p>
      {!loading && searched && !hasResults ? <p className="empty-hint">未找到相关内容。</p> : null}

      <ul className="search-results">
        {results.map((result) => (
          <li key={`${result.locator}_${result.excerpt.slice(0, 24)}`}>
            <button type="button" onClick={() => onPick(result.locator)}>
              <strong>{excerptLabel(result)}</strong>
              <span>{result.excerpt}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
