import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { clampNotificationPanelRight } from '../lib/notificationPanel';
import { requireSupabase, supabase } from '../lib/supabase';
import type { NotificationEvent } from '../types';
import { ThemePicker, ThemeToggleButton } from './ThemeControls';
import { Avatar } from './Avatar';
import { FooterScene } from './FooterScene';
import {
  AccidentIcon,
  BoardIcon,
  BellIcon,
  CloseIcon,
  DocsIcon,
  HomeIcon,
  InfoIcon,
  KeyIcon,
  LockIcon,
  MenuIcon
} from './icons';

function NotificationBell({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, profile, refreshSession } = useAppData();
  const location = useLocation();
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const bell = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const [panelRight, setPanelRight] = useState<number | null>(null);
  useEffect(() => {
    if (!user || !profile) {
      setEvents([]);
      return;
    }
    void requireSupabase()
      .from('notification_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setEvents((data as NotificationEvent[] | null) ?? []));
  }, [profile, user]);
  const closePanel = useCallback(
    (returnFocus = false) => {
      onOpenChange(false);
      if (returnFocus) requestAnimationFrame(() => bell.current?.focus({ preventScroll: true }));
    },
    [onOpenChange]
  );
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!panel.current?.contains(target) && !bell.current?.contains(target)) closePanel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closePanel, open]);
  useEffect(() => {
    closePanel();
  }, [closePanel, location.pathname]);
  useEffect(() => {
    if (!open) return;
    const updatePanelPosition = () => {
      const element = panel.current;
      const trigger = bell.current;
      const header = trigger?.closest<HTMLElement>('.header-inner');
      if (!element || !trigger || !header || window.innerWidth < 1024) {
        setPanelRight(null);
        return;
      }
      setPanelRight(
        clampNotificationPanelRight({
          triggerRight: trigger.getBoundingClientRect().right,
          headerRight: header.getBoundingClientRect().right,
          panelWidth: element.getBoundingClientRect().width,
          viewportWidth: window.innerWidth
        })
      );
    };
    const frame = requestAnimationFrame(updatePanelPosition);
    window.addEventListener('resize', updatePanelPosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePanelPosition);
    };
  }, [open]);
  if (!user || !profile) return null;
  const unread = events.filter((event) => event.created_at > profile.notifications_seen_at).length;
  const markSeen = () => {
    onOpenChange(!open);
    if (open || unread === 0) return;
    const seenAt = new Date().toISOString();
    void requireSupabase()
      .from('profiles')
      .update({ notifications_seen_at: seenAt })
      .eq('id', user.id)
      .then(() => refreshSession());
  };
  return (
    <div className="notification-menu">
      <button
        ref={bell}
        className="notification-bell"
        onClick={markSeen}
        aria-expanded={open}
        aria-label="お知らせ"
        aria-controls="notification-panel"
      >
        <BellIcon />
        {unread > 0 && <span className="notification-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <section
          ref={panel}
          id="notification-panel"
          className="notification-panel"
          aria-label="お知らせ一覧"
          style={
            panelRight === null
              ? undefined
              : ({ '--notification-panel-right': `${panelRight}px` } as CSSProperties)
          }
        >
          <div className="notification-panel-heading">
            <b>お知らせ</b>
            <button
              className="notification-panel-close"
              onClick={() => closePanel(true)}
              aria-label="お知らせを閉じる"
            >
              <CloseIcon />
            </button>
          </div>
          {events.length === 0 ? (
            <p>新しいお知らせはありません。</p>
          ) : (
            events.map((event) => (
              <Link key={event.id} to={event.url} onClick={() => onOpenChange(false)}>
                <strong>{event.title}</strong>
                {event.body && <span>{event.body}</span>}
                <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleDateString('ja-JP')}
                </time>
              </Link>
            ))
          )}
        </section>
      )}
    </div>
  );
}

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
  const { isEditor, user, refreshSession } = useAppData();
  const location = useLocation();
  const drawer = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const triggerElement = trigger.current;
    drawer.current?.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.body.classList.add('drawer-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('drawer-open');
      window.removeEventListener('keydown', onKeyDown);
      triggerElement?.focus({ preventScroll: true });
    };
  }, [close, open, trigger]);
  useEffect(() => {
    close();
  }, [location.pathname, close]);
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
        <Link to="/more" onClick={close}>
          <InfoIcon />
          このサイトについて
        </Link>
        {user ? (
          <>
            <Link to="/mypage" onClick={close}>
              <KeyIcon />
              マイページ
            </Link>
            {isEditor && (
              <Link to="/admin" onClick={close}>
                <LockIcon />
                管理画面
              </Link>
            )}
            <button onClick={() => void logout()}>
              <LockIcon />
              ログアウト
            </button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={close}>
              <LockIcon />
              ログイン
            </Link>
            <Link to="/signup" onClick={close}>
              <KeyIcon />
              新規登録
            </Link>
          </>
        )}
        <ThemePicker className="drawer-theme-picker" />
      </aside>
    </>
  );
}
export function SiteLayout() {
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const setNotificationPanelOpen = useCallback((isOpen: boolean) => {
    setNotificationOpen(isOpen);
    if (isOpen) setOpen(false);
  }, []);
  const location = useLocation();
  const { user, profile } = useAppData();
  useEffect(() => {
    document.documentElement.classList.toggle('admin-mode', location.pathname.startsWith('/admin'));
    return () => document.documentElement.classList.remove('admin-mode');
  }, [location.pathname]);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);
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
          <NotificationBell open={notificationOpen} onOpenChange={setNotificationPanelOpen} />
          {user && profile && (
            <Link className="header-avatar" to="/mypage">
              <Avatar
                name={profile.display_name}
                path={profile.avatar_path}
                style={profile.avatar_style}
                small
              />
            </Link>
          )}
          <button
            ref={trigger}
            className="menu-button"
            onClick={() => {
              setNotificationOpen(false);
              setOpen((current) => !current);
            }}
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={open}
            aria-controls="site-drawer"
          >
            <MenuIcon strokeWidth={2.5} />
          </button>
        </div>
      </header>
      <Drawer open={open} close={close} trigger={trigger} />
      <main key={location.pathname} className="route-main">
        <PageNotice />
        <Outlet />
      </main>
      <footer className="site-footer">
        <FooterScene />
        <div className="footer-text-band">
          <div className="footer-inner">
            <strong>N×S_Diving ・ ダイビング情報の共有サイト</strong>
          </div>
        </div>
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
