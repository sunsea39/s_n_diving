import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { supabase } from '../lib/supabase';
import { ThemePicker, ThemeToggleButton } from './ThemeControls';
import {
  AccidentIcon,
  BoardIcon,
  CloseIcon,
  DocsIcon,
  HomeIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MenuIcon
} from './icons';

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
          <CloseIcon />
        </button>
        <nav>
          <Link to="/" onClick={close}>
            <HomeIcon />
            ホーム
          </Link>
          <Link to="/docs" onClick={close}>
            <DocsIcon />
            資料
          </Link>
          <Link to="/accidents" onClick={close}>
            <AccidentIcon />
            事故事例
          </Link>
          <Link to="/board" onClick={close}>
            <BoardIcon />
            掲示板
          </Link>
          <Link to="/#news" onClick={close}>
            <InfoIcon />
            お知らせ
          </Link>
        </nav>
        <hr />
        {isBoardMember ? (
          <button onClick={() => void leave()}>
            <KeyIcon />
            掲示板から退出
          </button>
        ) : (
          <Link to="/join" onClick={close}>
            <KeyIcon />
            合言葉を入力
          </Link>
        )}
        <Link to="/more" onClick={close}>
          <InfoIcon />
          このサイトについて
        </Link>
        {isAdmin ? (
          <>
            <Link to="/admin" onClick={close}>
              <LockIcon />
              管理画面
            </Link>
            <button onClick={() => void logout()}>
              <LockIcon />
              ログアウト
            </button>
          </>
        ) : (
          <Link to="/admin/login" onClick={close}>
            <LockIcon />
            管理者ログイン
          </Link>
        )}
        <ThemePicker className="drawer-theme-picker" />
      </aside>
    </>
  );
}
export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const location = useLocation();
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="app-shell">
      <header className="site-header" data-scrolled={scrolled || undefined}>
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
          <ThemeToggleButton />
          <button
            ref={trigger}
            className="menu-button"
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
            aria-controls="site-drawer"
          >
            <MenuIcon />
          </button>
        </div>
      </header>
      <Drawer open={open} close={close} trigger={trigger} />
      <main key={location.pathname} className="route-main">
        <PageNotice />
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">N×S_Diving ・ ダイビング情報の共有サイト</div>
      </footer>
      <nav className="bottom-tabs" aria-label="モバイルメニュー">
        <NavLink to="/" end>
          <span className="tab-icon">
            <HomeIcon />
          </span>
          <span>ホーム</span>
        </NavLink>
        <NavLink to="/docs">
          <span className="tab-icon">
            <DocsIcon />
          </span>
          <span>資料</span>
        </NavLink>
        <NavLink to="/accidents">
          <span className="tab-icon">
            <AccidentIcon />
          </span>
          <span>事故事例</span>
        </NavLink>
        <NavLink to="/board">
          <span className="tab-icon">
            <BoardIcon />
          </span>
          <span>掲示板</span>
        </NavLink>
      </nav>
    </div>
  );
}
