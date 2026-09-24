import { Route, Routes } from 'react-router-dom';
import { AdminGuard, BoardGuard } from './components/Guards';
import { SiteLayout } from './components/SiteLayout';
import { AppDataProvider } from './context/AppDataProvider';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { DocDetailPage } from './pages/DocDetailPage';
import { DocsPage } from './pages/DocsPage';
import { JoinPage } from './pages/JoinPage';
import { MorePage } from './pages/MorePage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TopPage } from './pages/TopPage';
import { AdminRoutes } from './pages/admin/AdminRoutes';
import { BoardPage } from './pages/board/BoardPage';
import { NewThreadPage } from './pages/board/NewThreadPage';
import { ThreadPage } from './pages/board/ThreadPage';

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<TopPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocDetailPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route
            path="/board"
            element={
              <BoardGuard>
                <BoardPage />
              </BoardGuard>
            }
          />
          <Route
            path="/board/new"
            element={
              <BoardGuard>
                <NewThreadPage />
              </BoardGuard>
            }
          />
          <Route
            path="/board/:id"
            element={
              <BoardGuard>
                <ThreadPage />
              </BoardGuard>
            }
          />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/*"
            element={
              <AdminGuard>
                <AdminRoutes />
              </AdminGuard>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AppDataProvider>
  );
}
