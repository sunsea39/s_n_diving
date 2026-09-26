import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../lib/supabase';

function PageNotice() {
  const { configured } = useAppData();
  return configured ? null : (
    <p className="notice">Supabase が未設定です。現在は同梱資料のみ表示しています。</p>
  );
}
function Drawer({
  open,
  close,
  trigger
}: {
  open: boolean;
  close: () => void;
  trigger: React.RefObject<HTMLButtonElement>;
}) {
  const { isAdmin, isBoardMember, refreshSession } = useAppData();
  const location = useLocation();
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const triggerElement = trigger.current;
    drawer.current?.querySelector<HTMLElement>('button, a')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.body.classList.add('drawer-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('drawer-open');
      window.removeEventListener('keydown', onKeyDown);
      triggerElement?.focus();
    };
  }, [close, open, trigger]);
  useEffect(() => {
    close();
  }, [location.pathname, close]);
  const leave = async () => {
    if (supabase) await supabase.auth.signOut();
    await refreshSession();
    close();
  };
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    await refreshSession();
    close();
  };
  return (
    <>
      <button
        className={'drawer-backdrop ' + (open ? 'open' : '')}
        aria-label="メニューを閉じる"
        tabIndex={open ? 0 : -1}
        onClick={close}
      />
      <aside
        ref={drawer}
        id="site-drawer"
        className={'site-drawer ' + (open ? 'open' : '')}
        aria-label="メニュー"
        aria-hidden={!open}
      >
        <button className="drawer-close" onClick={close} aria-label="メニューを閉じる">
          ×
        </button>
        <nav>
          <Link to="/" onClick={close}>
            ホーム
          </Link>
          <Link to="/docs" onClick={close}>
            資料
          </Link>
          <Link to="/accidents" onClick={close}>
            事故事例
          </Link>
          <Link to="/board" onClick={close}>
            掲示板
          </Link>
          <Link to="/#news" onClick={close}>
            お知らせ
          </Link>
        </nav>
        <hr />
        {isBoardMember ? (
          <button onClick={() => void leave()}>掲示板から退出</button>
        ) : (
          <Link to="/join" onClick={close}>
            合言葉を入力
          </Link>
        )}
        <Link to="/more" onClick={close}>
          このサイトについて
        </Link>
        {isAdmin ? (
          <>
            <Link to="/admin" onClick={close}>
              管理画面
            </Link>
            <button onClick={() => void logout()}>ログアウト</button>
          </>
        ) : (
          <Link to="/admin/login" onClick={close}>
            管理者ログイン
          </Link>
        )}
      </aside>
    </>
  );
}
export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <img src={import.meta.env.BASE_URL + 'icons/logo.svg'} alt="" />
            <span>
              N<span>×</span>S_Diving
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="メインメニュー">
            <NavLink to="/" end>
              ホーム
            </NavLink>
            <NavLink to="/docs">資料</NavLink>
            <NavLink to="/accidents">事故事例</NavLink>
            <NavLink to="/board">掲示板</NavLink>
            <NavLink to="/more">このサイトについて</NavLink>
            <NavLink to="/admin">管理</NavLink>
          </nav>
          <button
            ref={trigger}
            className="menu-button"
            onClick={() => setOpen(true)}
            aria-label="メニューを開く"
            aria-expanded={open}
            aria-controls="site-drawer"
          >
            <i />
            <i />
            <i />
          </button>
        </div>
      </header>
      <Drawer open={open} close={close} trigger={trigger} />
      <main>
        <PageNotice />
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">N×S_Diving ・ ダイビング情報の共有サイト</div>
      </footer>
      <nav className="bottom-tabs" aria-label="モバイルメニュー">
        <NavLink to="/" end>
          ホーム
        </NavLink>
        <NavLink to="/docs">資料</NavLink>
        <NavLink to="/accidents">事故事例</NavLink>
        <NavLink to="/board">掲示板</NavLink>
      </nav>
    </div>
  );
}
