import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { ThemePicker } from '../components/ThemeControls';
import { usePageTitle } from '../lib/pageTitle';

export function MorePage() {
  usePageTitle('その他');
  const { isEditor, user } = useAppData();

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
          {user ? (
            <Link className="button" to="/mypage">
              マイページ
            </Link>
          ) : (
            <Link className="button" to="/login">
              ログイン
            </Link>
          )}
          {!user && (
            <Link className="button-secondary" to="/signup">
              新規登録
            </Link>
          )}
          {isEditor && (
            <Link className="button-secondary" to="/admin">
              管理画面
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
