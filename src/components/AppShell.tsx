import { Link, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

const navItems = [
  { to: "/library", label: "书架" }
];

export default function AppShell({ title, subtitle, children, rightSlot }: AppShellProps): JSX.Element {
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__left">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="app-header__right">{rightSlot}</div>
      </header>
      <nav className="app-nav" aria-label="主导航">
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
      <main>{children}</main>
    </div>
  );
}
