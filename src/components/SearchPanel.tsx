import { useState } from "react";
import type { FormEvent } from "react";
import type { SearchResult } from "../types/contracts";

type SearchPanelProps = {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onPick: (locator: string) => void;
};

export default function SearchPanel({ onSearch, onPick }: SearchPanelProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    try {
      setResults(await onSearch(query));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h3>书内检索</h3>
      <form onSubmit={submit} className="search-form">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="输入关键词"
          aria-label="关键词"
        />
        <button type="submit" disabled={loading}>
          {loading ? "检索中..." : "检索"}
        </button>
      </form>
      <ul className="search-results">
        {results.map((result) => (
          <li key={`${result.locator}_${result.excerpt.slice(0, 12)}`}>
            <button type="button" onClick={() => onPick(result.locator)}>
              <strong>{result.locator}</strong>
              <span>{result.excerpt}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
