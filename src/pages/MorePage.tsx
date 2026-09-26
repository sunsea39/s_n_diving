import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { ThemePicker } from '../components/ThemeControls';
import { usePageTitle } from '../lib/pageTitle';
import { PageHeading } from '../components/PageHeading';

export function MorePage() {
  usePageTitle('その他');
  const { isEditor, user } = useAppData();

  return (
    <>
      <PageHeading page="more" />
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
