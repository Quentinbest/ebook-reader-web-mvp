export type BookFormat = "epub" | "pdf";

export interface BookMeta {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  coverUrl?: string;
  fileSize: number;
  createdAt: number;
  updatedAt: number;
  lastReadAt?: number;
}

export interface ReadingProgress {
  bookId: string;
  locator: string;
  percent: number;
  updatedAt: number;
}

export type AnnotationColor = "yellow" | "green" | "blue" | "pink";

export interface Annotation {
  id: string;
  bookId: string;
  locator: string;
  quote: string;
  note?: string;
  color: AnnotationColor;
  createdAt: number;
  updatedAt: number;
}

export interface ReaderPreferences {
  fontFamily: "serif" | "sans";
  fontSize: number;
  lineHeight: number;
  pageMargin: number;
  theme: "light" | "dark" | "sepia";
}

export interface BookFileRecord {
  id: string;
  blob: Blob;
}

export interface BookTextIndex {
  bookId: string;
  entries: SearchEntry[];
  updatedAt: number;
}

export interface SearchEntry {
  locator: string;
  text: string;
}

export interface SearchResult {
  locator: string;
  excerpt: string;
}

export interface TelemetryEvent {
  name:
    | "book_import_started"
    | "book_import_succeeded"
    | "book_import_failed"
    | "reader_opened"
    | "reading_progress_saved"
    | "annotation_created"
    | "search_executed"
    | "app_error";
  ts: number;
  payload: Record<string, string | number | boolean | null>;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: 1.7,
  pageMargin: 24,
  theme: "light"
};
