import { useEffect, useMemo, useRef, useState } from "react";
import { CloseIcon } from "./icons/BooksIcons";
import { findActiveTocId, findTocPathIds, isTocMatch } from "../lib/toc";
import type { TocItem } from "../types/contracts";

type TocPanelProps = {
  open: boolean;
  mode?: "drawer" | "content";
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

function resolveTocMetaLabel(href: string | undefined, fallbackOrder: number | undefined): string {
  if (!href) {
    return fallbackOrder ? String(fallbackOrder) : "";
  }

  const pdfPage = href.match(/^pdf:page:(\d+)$/i);
  if (pdfPage) {
    return `p.${pdfPage[1]}`;
  }

  const normalized = href.replace(/[#?].*$/, "");
  const chapterLike = normalized.match(/(?:chapter|ch|part|sec|section|book|vol|volume)[^\d]{0,3}(\d{1,4})/i);
  if (chapterLike) {
    return `Ch.${chapterLike[1]}`;
  }

  return fallbackOrder ? `#${fallbackOrder}` : "";
}

function TocTreeItem({
  item,
  depth,
  metaLabelMap,
  orderMap,
  activeOrder,
  expanded,
  disabled,
  currentHref,
  onToggle,
  onNavigate
}: {
  item: TocItem;
  depth: number;
  metaLabelMap: Map<string, string>;
  orderMap: Map<string, number>;
  activeOrder?: number;
  expanded: Set<string>;
  disabled: boolean;
  currentHref?: string;
  onToggle: (id: string) => void;
  onNavigate: (href: string) => void;
}): JSX.Element {
  const hasChildren = Boolean(item.children?.length);
  const isExpanded = expanded.has(item.id);
  const active = isTocMatch(item.href, currentHref);
  const order = orderMap.get(item.id);
  const nearActive = !active && order && activeOrder ? Math.abs(order - activeOrder) <= 2 : false;
  const metaLabel = metaLabelMap.get(item.id) ?? "";

  return (
    <li
      className={`toc-item ${active ? "is-active" : ""} ${nearActive ? "is-near-active" : ""}`.trim()}
      data-toc-target={item.id}
    >
      <div className="toc-item__row" style={{ paddingLeft: `${(depth - 1) * 14}px` }}>
        {hasChildren ? (
          <button
            type="button"
            className="toc-item__toggle"
            aria-label={isExpanded ? "折叠章节" : "展开章节"}
            onClick={() => onToggle(item.id)}
          >
            {isExpanded ? "−" : "+"}
          </button>
        ) : (
          <span className="toc-item__spacer" aria-hidden>
            •
          </span>
        )}

        <button
          type="button"
          className="toc-item__link"
          disabled={!item.href || disabled}
          onClick={() => {
            if (item.href) {
              onNavigate(item.href);
            }
          }}
          title={item.title}
        >
          {item.title}
        </button>

        <span className="toc-item__meta">{metaLabel}</span>
      </div>

      {hasChildren && isExpanded ? (
        <ul className="toc-list">
          {item.children?.map((child) => (
            <TocTreeItem
              key={child.id}
              item={child}
              depth={depth + 1}
              metaLabelMap={metaLabelMap}
              orderMap={orderMap}
              activeOrder={activeOrder}
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
  mode = "content",
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
  const bodyRef = useRef<HTMLDivElement | null>(null);
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

  const metaLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (nodes: TocItem[]): void => {
      for (const node of nodes) {
        const order = orderMap.get(node.id);
        map.set(node.id, resolveTocMetaLabel(node.href, order));
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };
    walk(items);
    return map;
  }, [items, orderMap]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const activeOrder = activeId ? orderMap.get(activeId) : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = new Set<string>();
    for (const root of items) {
      next.add(root.id);
    }
    if (activeId) {
      for (const id of findTocPathIds(items, activeId)) {
        next.add(id);
      }
    }
    setExpanded(next);
  }, [activeId, items, open]);

  useEffect(() => {
    if (!open || !activeId) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      const target = bodyRef.current?.querySelector(`[data-toc-target="${activeId}"]`) as HTMLElement | null;
      target?.scrollIntoView({ block: "nearest" });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [activeId, open]);

  if (!open) {
    return null;
  }

  const coverLabel = (bookTitle || "目录").trim().charAt(0) || "目";

  const content = (
    <section className="toc-panel">
      <div className="toc-panel__book">
        <div className="toc-panel__cover" aria-hidden>
          {bookCoverUrl ? <img src={bookCoverUrl} alt="" loading="lazy" /> : coverLabel}
        </div>
        <div className="toc-panel__book-meta">
          <strong>{bookTitle || "当前书籍"}</strong>
          <span>{bookAuthor || "本地阅读"}</span>
        </div>
      </div>

      <div className="toc-panel__body" ref={bodyRef}>
        {loading ? <p className="loading">目录加载中...</p> : null}
        {error ? <p className="error-banner">{error}</p> : null}
        {!loading && !error && !items.length ? <p className="empty-hint">该书暂无目录结构。</p> : null}

        <ul className="toc-list">
          {items.map((item) => (
            <TocTreeItem
              key={item.id}
              item={item}
              depth={1}
              metaLabelMap={metaLabelMap}
              orderMap={orderMap}
              activeOrder={activeOrder}
              expanded={expanded}
              disabled={disabled}
              currentHref={currentHref}
              onToggle={(id) =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                })
              }
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>
    </section>
  );

  if (mode === "content") {
    return content;
  }

  return (
    <div className="toc-drawer-layer" onClick={onClose}>
      <aside className="reader-mobile-panel" aria-label="目录面板" onClick={(event) => event.stopPropagation()}>
        <header className="reader-mobile-panel__header">
          <h3>目录</h3>
          <button type="button" aria-label="关闭" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        {content}
      </aside>
    </div>
  );
}
