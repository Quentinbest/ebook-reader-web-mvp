import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  sidebar?: ReactNode;
  toolbarLeading?: ReactNode;
  toolbarTrailing?: ReactNode;
  contentClassName?: string;
  shellKind?: "library" | "reader" | "notes";
};

const navItems = [{ to: "/library", label: "书架" }];

export default function AppShell({
  title,
  subtitle,
  children,
  sidebar,
  toolbarLeading,
  toolbarTrailing,
  contentClassName,
  shellKind = "library"
}: AppShellProps): JSX.Element {
  const location = useLocation();

  return (
    <div className={`app-shell books-shell books-shell--${shellKind}`.trim()}>
      <div className="books-layout">
        <aside className="books-sidebar" aria-label="应用侧边栏">
          <div className="books-sidebar__brand">
            <span className="books-sidebar__eyebrow">Desktop Reader</span>
            <strong>Ebook Reader</strong>
          </div>

          <nav className="books-sidebar__nav" aria-label="主导航">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={location.pathname.startsWith(item.to) ? "is-active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {sidebar ? <div className="books-sidebar__content">{sidebar}</div> : null}
        </aside>

        <section className="books-main">
          <header className="books-toolbar">
            <div className="books-toolbar__leading">
              {toolbarLeading ? <div className="books-toolbar__slot">{toolbarLeading}</div> : null}
              <div className="books-toolbar__title">
                <h1>{title}</h1>
                {subtitle ? <p>{subtitle}</p> : null}
              </div>
            </div>
            {toolbarTrailing ? <div className="books-toolbar__trailing">{toolbarTrailing}</div> : null}
          </header>

          <main className={`books-content ${contentClassName ?? ""}`.trim()}>{children}</main>
        </section>
      </div>
    </div>
  );
}
