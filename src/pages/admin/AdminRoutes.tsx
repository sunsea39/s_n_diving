import { useLocation } from 'react-router-dom';
import { Link, Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '../NotFoundPage';
import { AdminBoardPage } from './AdminBoardPage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminDocsListPage, AdminDocEditorPage } from './AdminDocsPage';
import { AdminNewsEditorPage, AdminNewsListPage } from './AdminNewsPage';
import { AdminSettingsPage } from './AdminSettingsPage';

function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const entries = [
    ['/admin', '概要'],
    ['/admin/docs', '資料'],
    ['/admin/news', 'お知らせ'],
    ['/admin/board', '投稿管理'],
    ['/admin/settings', '設定']
  ];

  return (
    <div className="admin-layout">
      <nav className="admin-tabs" aria-label="管理メニュー">
        {entries.map(([to, label]) => (
          <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<AdminDashboardPage />} />
        <Route path="docs" element={<AdminDocsListPage />} />
        <Route path="docs/new" element={<AdminDocEditorPage />} />
        <Route path="docs/:id" element={<AdminDocEditorPage />} />
        <Route path="news" element={<AdminNewsListPage />} />
        <Route path="news/new" element={<AdminNewsEditorPage />} />
        <Route path="news/:id" element={<AdminNewsEditorPage />} />
        <Route path="board" element={<AdminBoardPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AdminLayout>
  );
}
