import { useRef, useState } from "react";
import type { DragEventHandler } from "react";
import { ImportIcon } from "./icons/BooksIcons";

type FileDropZoneProps = {
  onFiles: (files: File[]) => void;
  isLoading?: boolean;
  variant?: "empty" | "compact";
};

export default function FileDropZone({
  onFiles,
  isLoading = false,
  variant = "empty"
}: FileDropZoneProps): JSX.Element {
  const [isDragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) {
      onFiles(files);
    }
  };

  if (variant === "compact") {
    return (
      <div className="drop-zone drop-zone--compact">
        <button
          type="button"
          className="books-button books-button--secondary"
          disabled={isLoading}
          data-testid="library-import-trigger"
          onClick={() => inputRef.current?.click()}
        >
          <ImportIcon />
          {isLoading ? "导入中..." : "导入书籍"}
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept=".epub,.pdf"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) {
              onFiles(files);
              event.currentTarget.value = "";
            }
          }}
        />
      </div>
    );
  }

  return (
    <section className={`drop-zone drop-zone--empty ${isDragging ? "is-dragging" : ""}`}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click();
          }
        }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-zone__icon" aria-hidden>
          <ImportIcon />
        </div>
        <h2>导入你的电子书</h2>
        <p>拖拽文件到这里，或点击选择本地 EPUB / PDF。</p>
        <button type="button" className="books-button" disabled={isLoading}>
          {isLoading ? "导入中..." : "选择文件"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept=".epub,.pdf"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) {
            onFiles(files);
            event.currentTarget.value = "";
          }
        }}
      />
    </section>
  );
}
