import { useRef, useState } from "react";
import type { DragEventHandler } from "react";

type FileDropZoneProps = {
  onFiles: (files: File[]) => void;
  isLoading?: boolean;
};

export default function FileDropZone({ onFiles, isLoading = false }: FileDropZoneProps): JSX.Element {
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

  return (
    <section className={`drop-zone ${isDragging ? "is-dragging" : ""}`}>
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
        <h2>导入你的电子书</h2>
        <p>拖拽或点击选择文件，支持 EPUB / PDF</p>
        <button type="button" disabled={isLoading}>
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
