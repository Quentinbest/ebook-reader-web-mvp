import type {
  Annotation,
  BookFileRecord,
  BookMeta,
  BookTocCache,
  BookTextIndex,
  ReaderPreferences,
  ReadingProgress,
  TelemetryEvent
} from "../types/contracts";
import { DEFAULT_READER_PREFERENCES } from "../types/contracts";

const DB_NAME = "ebook_reader_mvp";
const DB_VERSION = 2;

type PreferenceRecord = {
  key: "reader_preferences" | "telemetry_opt_in";
  value: ReaderPreferences | boolean;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) {
        db.createObjectStore("books", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("progress")) {
        db.createObjectStore("progress", { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains("annotations")) {
        const store = db.createObjectStore("annotations", { keyPath: "id" });
        store.createIndex("bookId", "bookId", { unique: false });
      }
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("indexes")) {
        db.createObjectStore("indexes", { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains("toc")) {
        db.createObjectStore("toc", { keyPath: "bookId" });
      }
      if (!db.objectStoreNames.contains("telemetry")) {
        db.createObjectStore("telemetry", { keyPath: "ts" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  stores: string | string[],
  mode: IDBTransactionMode,
  run: (transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  return openDatabase().then((db) => {
    const transaction = db.transaction(stores, mode);
    return run(transaction);
  });
}

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putBook(meta: BookMeta, blob: Blob): Promise<void> {
  return tx(["books", "files"], "readwrite", async (transaction) => {
    transaction.objectStore("books").put(meta);
    const fileRecord: BookFileRecord = { id: meta.id, blob };
    transaction.objectStore("files").put(fileRecord);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  });
}

export async function getBooks(): Promise<BookMeta[]> {
  return tx("books", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("books").getAll());
    return (result as BookMeta[]).sort((a, b) => (b.lastReadAt ?? b.updatedAt) - (a.lastReadAt ?? a.updatedAt));
  });
}

export async function getBook(bookId: string): Promise<BookMeta | null> {
  return tx("books", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("books").get(bookId));
    return (result as BookMeta | undefined) ?? null;
  });
}

export async function getBookBlob(bookId: string): Promise<Blob | null> {
  return tx("files", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("files").get(bookId));
    return (result as BookFileRecord | undefined)?.blob ?? null;
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  return tx(["books", "files", "progress", "annotations", "indexes", "toc"], "readwrite", async (transaction) => {
    transaction.objectStore("books").delete(bookId);
    transaction.objectStore("files").delete(bookId);
    transaction.objectStore("progress").delete(bookId);
    transaction.objectStore("indexes").delete(bookId);
    transaction.objectStore("toc").delete(bookId);

    const annotationStore = transaction.objectStore("annotations");
    const index = annotationStore.index("bookId");
    const keyRange = IDBKeyRange.only(bookId);
    const cursorRequest = index.openCursor(keyRange);

    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve();
          return;
        }
        annotationStore.delete(cursor.primaryKey);
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  });
}

export async function putReadingProgress(progress: ReadingProgress): Promise<void> {
  await tx("progress", "readwrite", async (transaction) => {
    transaction.objectStore("progress").put(progress);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });

  const book = await getBook(progress.bookId);
  if (!book) {
    return;
  }

  await tx("books", "readwrite", async (transaction) => {
    transaction.objectStore("books").put({
      ...book,
      updatedAt: Date.now(),
      lastReadAt: Date.now()
    } satisfies BookMeta);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
  return tx("progress", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("progress").get(bookId));
    return (result as ReadingProgress | undefined) ?? null;
  });
}

export async function putAnnotation(annotation: Annotation): Promise<void> {
  return tx("annotations", "readwrite", async (transaction) => {
    transaction.objectStore("annotations").put(annotation);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function deleteAnnotation(annotationId: string): Promise<void> {
  return tx("annotations", "readwrite", async (transaction) => {
    transaction.objectStore("annotations").delete(annotationId);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function getAnnotations(bookId: string): Promise<Annotation[]> {
  return tx("annotations", "readonly", async (transaction) => {
    const index = transaction.objectStore("annotations").index("bookId");
    const annotations = (await toPromise(index.getAll(IDBKeyRange.only(bookId)))) as Annotation[];
    return annotations.sort((a, b) => b.updatedAt - a.updatedAt);
  });
}

export async function getReaderPreferences(): Promise<ReaderPreferences> {
  return tx("preferences", "readonly", async (transaction) => {
    const record = (await toPromise(
      transaction.objectStore("preferences").get("reader_preferences")
    )) as PreferenceRecord | undefined;

    if (!record) {
      return DEFAULT_READER_PREFERENCES;
    }

    return record.value as ReaderPreferences;
  });
}

export async function setReaderPreferences(preferences: ReaderPreferences): Promise<void> {
  return tx("preferences", "readwrite", async (transaction) => {
    transaction.objectStore("preferences").put({ key: "reader_preferences", value: preferences } satisfies PreferenceRecord);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function getTelemetryOptIn(): Promise<boolean> {
  return tx("preferences", "readonly", async (transaction) => {
    const record = (await toPromise(
      transaction.objectStore("preferences").get("telemetry_opt_in")
    )) as PreferenceRecord | undefined;
    if (!record) {
      return true;
    }
    return Boolean(record.value);
  });
}

export async function setTelemetryOptIn(optIn: boolean): Promise<void> {
  return tx("preferences", "readwrite", async (transaction) => {
    transaction.objectStore("preferences").put({ key: "telemetry_opt_in", value: optIn } satisfies PreferenceRecord);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function logTelemetryEvent(event: TelemetryEvent): Promise<void> {
  return tx("telemetry", "readwrite", async (transaction) => {
    transaction.objectStore("telemetry").put(event);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function putBookIndex(index: BookTextIndex): Promise<void> {
  return tx("indexes", "readwrite", async (transaction) => {
    transaction.objectStore("indexes").put(index);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function getBookIndex(bookId: string): Promise<BookTextIndex | null> {
  return tx("indexes", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("indexes").get(bookId));
    return (result as BookTextIndex | undefined) ?? null;
  });
}

export async function putBookToc(cache: BookTocCache): Promise<void> {
  return tx("toc", "readwrite", async (transaction) => {
    transaction.objectStore("toc").put(cache);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function getBookToc(bookId: string): Promise<BookTocCache | null> {
  return tx("toc", "readonly", async (transaction) => {
    const result = await toPromise(transaction.objectStore("toc").get(bookId));
    return (result as BookTocCache | undefined) ?? null;
  });
}
