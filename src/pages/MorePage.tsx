import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
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
        仲間内でダイビングの安全情報や気づきを共有し、事故を未然に防ぐためのページです。
      </p>
      <div className="panel form-panel">
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
