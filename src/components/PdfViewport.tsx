import { useEffect, useMemo, useState } from "react";
import type { ReaderPreferences } from "../types/contracts";

type PdfViewportProps = {
  blob: Blob;
  preferences: ReaderPreferences;
  pageCount: number;
  targetLocator?: string;
  onLocationChange: (payload: { locator: string; percent: number }) => void;
};

function locatorToPage(locator?: string): number | null {
  if (!locator) {
    return null;
  }
  const match = locator.match(/pdf:page:(\d+)/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export default function PdfViewport({
  blob,
  preferences,
  pageCount,
  targetLocator,
  onLocationChange
}: PdfViewportProps): JSX.Element {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const next = locatorToPage(targetLocator);
    if (next && next > 0) {
      setPage(next);
    }
  }, [targetLocator]);

  useEffect(() => {
    const percent = pageCount > 0 ? Math.round((page / pageCount) * 100) : page;
    onLocationChange({ locator: `pdf:page:${page}`, percent: Math.min(percent, 100) });
  }, [onLocationChange, page, pageCount]);

  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const pageStyle = {
    fontFamily: preferences.fontFamily === "serif" ? "Merriweather, serif" : "IBM Plex Sans, sans-serif"
  };

  return (
    <section className="reader-viewport" style={pageStyle}>
      <div className="reader-controls-inline">
        <label>
          页码
          <input
            type="number"
            min={1}
            max={Math.max(pageCount, 1)}
            value={page}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isNaN(next) && next > 0) {
                setPage(next);
              }
            }}
          />
          <span>/ {pageCount || "?"}</span>
        </label>
        <label>
          缩放
          <input
            type="range"
            min={50}
            max={200}
            step={10}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
          <span>{zoom}%</span>
        </label>
      </div>
      <iframe
        title="PDF Reader"
        className="pdf-frame"
        src={`${objectUrl}#page=${page}&zoom=${zoom}`}
      />
    </section>
  );
}
