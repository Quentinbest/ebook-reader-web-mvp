import { useEffect, useMemo, useState } from "react";
import { findActiveTocId, findTocPathIds, isTocMatch } from "../lib/toc";
import type { TocItem } from "../types/contracts";

type TocPanelProps = {
  open: boolean;
  bookTitle?: string;
  items: TocItem[];
  currentHref?: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  onNavigate: (href: string) => void;
  onClose: () => void;
};

function TocTreeItem({
  item,
  depth,
  expanded,
  disabled,
  currentHref,
  onToggle,
  onNavigate
}: {
  item: TocItem;
  depth: number;
  expanded: Set<string>;
  disabled: boolean;
  currentHref?: string;
  onToggle: (id: string) => void;
  onNavigate: (href: string) => void;
}): JSX.Element {
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expanded.has(item.id);
  const active = isTocMatch(item.href, currentHref);
  const canNavigate = Boolean(item.href) && !disabled;

  return (
    <li className={`toc-item ${active ? "is-active" : ""}`} data-toc-id={item.id}>
      <div className="toc-item__row" style={{ paddingLeft: `${(depth - 1) * 12}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="toc-item__toggle"
            aria-label={isExpanded ? "折叠章节" : "展开章节"}
            onClick={() => onToggle(item.id)}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="toc-item__spacer" aria-hidden>
            •
          </span>
        )}
        <button
          type="button"
          className="toc-item__link"
          disabled={!canNavigate}
          onClick={() => {
            if (!item.href) {
              return;
            }
            onNavigate(item.href);
          }}
        >
          {item.title}
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <ul className="toc-list" role="group">
          {item.children?.map((child) => (
            <TocTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              disabled={disabled}
              currentHref={currentHref}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function TocPanel({
  open,
  bookTitle,
  items,
  currentHref,
  loading,
  error,
  disabled,
  onNavigate,
  onClose
}: TocPanelProps): JSX.Element | null {
  const activeId = useMemo(() => findActiveTocId(items, currentHref), [items, currentHref]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      return;
    }

    const defaultExpanded = new Set<string>();
    for (const root of items) {
      defaultExpanded.add(root.id);
    }

    if (activeId) {
      for (const id of findTocPathIds(items, activeId)) {
        defaultExpanded.add(id);
      }
    }

    setExpanded(defaultExpanded);
  }, [activeId, items, open]);

  useEffect(() => {
    if (!open || !activeId) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const target = document.querySelector(`[data-toc-id="${activeId}"]`);
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [activeId, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="toc-overlay" onClick={onClose}>
      <aside className="toc-drawer" aria-label="目录面板" onClick={(event) => event.stopPropagation()}>
        <header className="toc-drawer__header">
          <div>
            <h3>目录</h3>
            {bookTitle ? <p>{bookTitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="关闭目录">
            关闭
          </button>
        </header>

        <section className="toc-drawer__body">
          {disabled ? <p className="toc-hint">正在加载…</p> : null}
          {loading ? <p className="toc-hint">目录加载中...</p> : null}
          {!loading && error ? <p className="toc-error">{error}</p> : null}
          {!loading && !error && !items.length ? <p className="toc-hint">本书未提供目录</p> : null}

          {!loading && !error && items.length ? (
            <ul className="toc-list" role="tree">
              {items.map((item) => (
                <TocTreeItem
                  key={item.id}
                  item={item}
                  depth={1}
                  expanded={expanded}
                  disabled={disabled}
                  currentHref={currentHref}
                  onToggle={(id) => {
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) {
                        next.delete(id);
                      } else {
                        next.add(id);
                      }
                      return next;
                    });
                  }}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
