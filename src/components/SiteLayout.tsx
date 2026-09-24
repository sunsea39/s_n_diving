import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';

function PageNotice() {
  const { configured } = useAppData();
  return configured ? null : (
    <p className="notice">Supabase が未設定です。現在は同梱資料のみ表示しています。</p>
  );
}

export function SiteLayout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            S×N_Diving
          </Link>
          <nav className="desktop-nav" aria-label="メインメニュー">
            <NavLink to="/" end>
              ホーム
            </NavLink>
            <NavLink to="/docs">資料</NavLink>
            <NavLink to="/board">掲示板</NavLink>
            <NavLink to="/more">その他</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <PageNotice />
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          S×N_Diving ・ 仲間内専用ページです。URL の取り扱いに注意してください
        </div>
      </footer>
      <nav className="bottom-tabs" aria-label="モバイルメニュー">
        <NavLink to="/" end>
          ホーム
        </NavLink>
        <NavLink to="/docs">資料</NavLink>
        <NavLink to="/board">掲示板</NavLink>
        <NavLink to="/more">その他</NavLink>
      </nav>
    </div>
  );
}
