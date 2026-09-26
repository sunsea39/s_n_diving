import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { ThemePicker } from '../components/ThemeControls';
import { usePageTitle } from '../lib/pageTitle';
import { supabase } from '../lib/supabase';

export function MorePage() {
  usePageTitle('その他');
  const { isAdmin, isBoardMember, refreshSession } = useAppData();

  const leaveBoard = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    await refreshSession();
  };

  return (
    <>
      <p className="kicker">その他</p>
      <h1>このサイトについて</h1>
      <p className="lead">
        ダイビング情報の共有サイト。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにしたい。
      </p>
      <div className="panel form-panel">
        <ThemePicker className="more-theme-picker" />
        <div className="button-row">
          {isBoardMember ? (
            <button className="button-secondary" onClick={() => void leaveBoard()}>
              掲示板から退出
            </button>
          ) : (
            <Link className="button" to="/join">
              合言葉を入力
            </Link>
          )}
          <Link className="button-secondary" to={isAdmin ? '/admin' : '/admin/login'}>
            {isAdmin ? '管理画面' : '管理者ログイン'}
          </Link>
        </div>
      </div>
    </>
  );
}
