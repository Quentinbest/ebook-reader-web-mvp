import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const ReaderPage = lazy(() => import("./pages/ReaderPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));

export default function App(): JSX.Element {
  return (
    <Suspense fallback={<p className="loading">页面加载中...</p>}>
      <Routes>
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="/notes/:bookId" element={<NotesPage />} />
        <Route path="*" element={<Navigate to="/library" replace />} />
      </Routes>
    </Suspense>
  );
}
