import type { CSSProperties, ReactNode } from "react";
import { CloseIcon } from "./icons/BooksIcons";

type UtilityPaneHostProps = {
  open: boolean;
  title: string;
  width: 360 | 420;
  theme: "light" | "dark" | "sepia";
  onClose: () => void;
  headerActions?: ReactNode;
  children: ReactNode;
};

export default function UtilityPaneHost({
  open,
  title,
  width,
  theme,
  onClose,
  headerActions,
  children
}: UtilityPaneHostProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <aside
      className="utility-pane"
      data-theme={theme}
      data-testid="reader-utility-pane"
      style={{ "--utility-pane-width": `${width}px` } as CSSProperties}
    >
      <header className="utility-pane__header">
        <div className="utility-pane__heading">
          <h2>{title}</h2>
          {headerActions ? <div className="utility-pane__header-actions">{headerActions}</div> : null}
        </div>
        <button type="button" className="utility-pane__close" aria-label="关闭" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="utility-pane__body">{children}</div>
    </aside>
  );
}
