import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
  sidebar?: ReactNode;
  toolbar?: ReactNode;
  contentClassName?: string;
};

const navItems = [
  { to: "/library", label: "书架" }
];

export default function AppShell({
  title,
  subtitle,
  children,
  rightSlot,
  sidebar,
  toolbar,
  contentClassName
}: AppShellProps): JSX.Element {
  const location = useLocation();

  return (
    <div className={`app-shell books-shell ${contentClassName ?? ""}`.trim()}>
      <header className="books-toolbar">
        <div className="books-traffic-lights" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="books-toolbar__title">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="books-toolbar__actions">
          {toolbar}
          {rightSlot}
        </div>
      </header>

      <div className="books-workspace">
        {sidebar ? <aside className="books-sidebar">{sidebar}</aside> : null}
        <section className="books-main">
          <nav className="app-nav books-nav" aria-label="主导航">
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
          <main className="books-content">{children}</main>
        </section>
      </div>
    </div>
  );
}
