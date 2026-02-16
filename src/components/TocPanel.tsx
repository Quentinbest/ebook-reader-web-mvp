import { useEffect, useMemo, useState } from "react";
import { findActiveTocId, findTocPathIds, isTocMatch } from "../lib/toc";
import type { TocItem } from "../types/contracts";

type TocPanelProps = {
  open: boolean;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
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
  orderMap,
  expanded,
  disabled,
  currentHref,
  onToggle,
  onNavigate
}: {
  item: TocItem;
  depth: number;
  orderMap: Map<string, number>;
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
  const order = orderMap.get(item.id);

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
            if (!item.href && hasChildren) {
              onToggle(item.id);
              return;
            }
            if (!item.href || disabled) {
              return;
            }
            onNavigate(item.href);
          }}
          title={item.title}
        >
          {item.title}
        </button>
        <span className="toc-item__meta" aria-hidden>
          {order ?? ""}
        </span>
      </div>

      {hasChildren && isExpanded ? (
        <ul className="toc-list" role="group">
          {item.children?.map((child) => (
            <TocTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              orderMap={orderMap}
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
  bookAuthor,
  bookCoverUrl,
  items,
  currentHref,
  loading,
  error,
  disabled,
  onNavigate,
  onClose
}: TocPanelProps): JSX.Element | null {
  const activeId = useMemo(() => findActiveTocId(items, currentHref), [items, currentHref]);
  const orderMap = useMemo(() => {
    const map = new Map<string, number>();
    let index = 1;
    const walk = (nodes: TocItem[]): void => {
      for (const node of nodes) {
        map.set(node.id, index);
        index += 1;
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };
    walk(items);
    return map;
  }, [items]);
  const expandableIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (nodes: TocItem[]): void => {
      for (const node of nodes) {
        if (node.children?.length) {
          ids.push(node.id);
          walk(node.children);
        }
      }
    };
    walk(items);
    return ids;
  }, [items]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 980px)").matches);
  const allExpanded = expandableIds.length > 0 && expandableIds.every((id) => expanded.has(id));

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
    const media = window.matchMedia("(max-width: 980px)");
    const apply = (): void => setCompact(media.matches);
    apply();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }

    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);

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

  const coverLabel = (bookTitle || "目录").trim().charAt(0) || "目";
  const toggleExpandAll = (): void => {
    setExpanded((prev) => {
      if (allExpanded) {
        return new Set();
      }
      const next = new Set(prev);
      for (const id of expandableIds) {
        next.add(id);
      }
      return next;
    });
  };

  const scrollToTop = (): void => {
    const container = document.querySelector(".toc-drawer__body");
    container?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToActive = (): void => {
    if (!activeId) {
      return;
    }
    const target = document.querySelector(`[data-toc-id="${activeId}"]`);
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <div className={`toc-layer ${compact ? "is-compact" : "is-docked"}`} onClick={compact ? onClose : undefined}>
      <aside className="toc-drawer" aria-label="目录面板" onClick={(event) => event.stopPropagation()}>
        <header className="toc-drawer__toolbar">
          <div className="toc-toolbar-group">
            <button type="button" className="toc-toolbar-btn" onClick={scrollToTop} aria-label="回到目录顶部">
              ↑
            </button>
          </div>
          <h3>目录</h3>
          <div className="toc-toolbar-group toc-toolbar-group--right">
            <button type="button" className="toc-toolbar-btn" onClick={toggleExpandAll} aria-label={allExpanded ? "折叠全部章节" : "展开全部章节"}>
              {allExpanded ? "▣" : "▢"}
            </button>
            <button type="button" className="toc-toolbar-btn" onClick={onClose} aria-label="收起目录">
              ×
            </button>
          </div>
        </header>

        <section className="toc-drawer__book">
          <div className="toc-book__cover" aria-hidden>
            {bookCoverUrl ? (
              <img src={bookCoverUrl} alt="" loading="lazy" />
            ) : (
              coverLabel
            )}
          </div>
          <div className="toc-book__meta">
            <p className="toc-book__title">{bookTitle || "未命名书籍"}</p>
            <p className="toc-book__author">{bookAuthor || "未知作者"}</p>
          </div>
        </section>

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
                  orderMap={orderMap}
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

        <footer className="toc-drawer__footer">
          <div className="toc-footer-actions" role="toolbar" aria-label="目录操作栏">
            <button type="button" className="toc-footer-icon-btn" onClick={scrollToTop} aria-label="回到目录顶部">
              ⇡
            </button>
            <button
              type="button"
              className="toc-footer-icon-btn"
              onClick={scrollToActive}
              disabled={!activeId}
              aria-label="定位当前章节"
            >
              ◎
            </button>
            <button
              type="button"
              className="toc-footer-icon-btn"
              onClick={toggleExpandAll}
              aria-label={allExpanded ? "折叠全部章节" : "展开全部章节"}
            >
              {allExpanded ? "▤" : "▥"}
            </button>
            <button type="button" className="toc-footer-icon-btn" onClick={onClose} aria-label="收起目录">
              ✕
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
