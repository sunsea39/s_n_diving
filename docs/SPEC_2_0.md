# N×S_Diving 改修仕様 v2.0 — 個人アカウント

利用者一人ひとりがアカウントを作り、マイページを編集できるようにする。
合言葉方式は廃止し、**「誰でも登録 → メインの管理者が承認」** に置き換える。

## 0. 決定事項（オーナー確認済み）

| 項目 | 決定 |
|---|---|
| ログイン方法 | **メール＋パスワード**（確認メールは使わない。Supabase の標準メールは実運用に使えないため） |
| 登録の条件 | **誰でも登録できる → メインの管理者が承認するまで「承認待ち」** |
| サブ管理者ができること | **お知らせの作成・編集**、**掲示板の投稿管理**（非表示・削除） |
| メインの管理者だけができること | 資料・事故事例の編集、アカウントの承認・権限付与・利用停止・仮パスワード設定、注意書きなどの設定 |
| マイページの項目 | 表示名、アイコン画像、自己紹介・ひとこと、ダイビング経験、自分の投稿一覧、機材メモ（本人のみ閲覧） |

## 1. 役割（role）

| role | 意味 | 掲示板 | 管理画面 |
|---|---|---|---|
| `pending` | 登録直後・承認待ち | × | × |
| `member` | 承認済みの仲間 | 閲覧・投稿 | × |
| `editor` | サブ管理者 | 閲覧・投稿・投稿管理 | お知らせ、投稿管理 |
| `owner` | メインの管理者 | 同上 | すべて |
| `suspended` | 利用停止 | × | × |

- 資料・事故事例・トップ・お知らせの **閲覧** は今までどおりログイン不要（URL を知っていれば見られる）
- owner は複数いてよい。最後の 1 人の owner を降格・停止することはできない。自分自身の role は変えられない

## 2. データベース（新 migration：`supabase/migrations/20260927000000_accounts.sql`、既存 DB に追加で実行・再実行しても安全）

### 2-1. テーブル

```
profiles(
  id uuid pk references auth.users(id) on delete cascade,
  role text not null default 'pending' check in ('pending','member','editor','owner','suspended'),
  display_name text not null check 1〜20文字,
  avatar_path text null,                 -- avatars バケット内のパス
  bio text not null default '' check ≤ 200文字,
  license text not null default '',      -- 例「BSAC オーシャンダイバー」（≤ 60）
  dive_count int null check (dive_count is null or dive_count between 0 and 100000),
  favorite_areas text not null default '', -- よく潜る海（≤ 100）
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_at timestamptz null,
  approved_by uuid null references auth.users(id)
)

gear_notes(                              -- 機材メモ（本人だけ）
  id uuid pk default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null (≤ 60),             -- 例「レギュレーター（1st/2nd）」
  maker_model text not null default '' (≤ 80),
  purchased_on date null,
  last_service_on date null,             -- 最後のオーバーホール・点検
  next_service_on date null,             -- 次の予定
  memo text not null default '' (≤ 500),
  created_at, updated_at
)
```

### 2-2. 既存からの移行

- `admins` テーブルの全員を `profiles` に **role = 'owner'** で作成（`display_name` は admins.display_name、空なら「管理者」）。`on conflict (id) do update set role = 'owner'`
- 既存の `auth.users` のうち匿名ユーザー（`is_anonymous = true`）は profiles を作らない
- 新規ユーザー作成時のトリガー（`auth.users` の after insert、security definer）：匿名でなければ profiles を `pending` で作る。`display_name` は `raw_user_meta_data->>'display_name'`（なければメールの @ より前、20 文字まで）

### 2-3. 判定関数（すべて `stable security definer set search_path = public, pg_temp`）

- `current_role_name()`：`profiles.role`（無ければ null）
- `is_owner()`：role = 'owner'
- `is_editor()`：role in ('editor','owner')
- `is_member()`：role in ('member','editor','owner')
- **既存関数の再定義**（既存のポリシーを書き換えずに済ませるため）：
  - `is_admin()` → `is_owner()` と同じ（資料・事故事例・設定・docs-images は owner だけ）
  - `is_board_member()` → `is_member()` と同じ
- `admins` テーブルは残すが、今後は参照しない（README に「profiles.role で管理」と書く）

### 2-4. ポリシーの変更

- `news`：書き込みを `is_editor()` に変更（閲覧は今まで通り）
- `threads` / `posts`：
  - 閲覧・投稿：`is_member()`
  - 本人の編集・削除：`is_member() and author_uid = auth.uid()`
  - 他人の投稿の非表示・削除：`is_editor()`（旧 is_admin）
  - 列単位の UPDATE 権限（title, body, hiyari, hidden / body, hidden）は維持
- `board-images` の Storage ポリシー：読み書き `is_member()`、他人の画像の削除は `is_editor()`
- `profiles`：
  - select：本人は自分の行すべて。`is_member()` は他の **承認済み（member/editor/owner）** の行の公開項目。`is_owner()` は全員（pending・suspended を含む）
  - update：本人は自分の行の `display_name, avatar_path, bio, license, dive_count, favorite_areas` だけ（列単位の GRANT）。role・approved_* は RPC 経由のみ
  - insert / delete：クライアントからは不可（トリガーと auth の cascade のみ）
- `gear_notes`：本人の行だけ select/insert/update/delete（`user_id = auth.uid()`）。pending でも使えてよい
- Storage バケット `avatars`（public 読み取り、2 MiB、image/jpeg と image/webp）：書き込み・削除は本人のフォルダ `{auth.uid()}/` のみ。`storage.objects.owner_id` は text なので `auth.uid()::text` と比較すること

### 2-5. RPC（owner 専用。先頭で `is_owner()` を確認し、違えば例外）

- `set_member_role(p_user uuid, p_role text)`：承認（pending→member）、サブ管理者の付与・解除（member⇔editor）、owner 付与、利用停止（→suspended）、再開。承認時は `approved_at/approved_by` を記録。自分自身は変更不可、最後の owner は降格・停止不可
- `admin_set_password(p_user uuid, p_password text)`：仮パスワードを設定（8 文字以上）。`auth.users.encrypted_password = crypt(p_password, gen_salt('bf'))`、`updated_at = now()`。自分自身には使えない（自分はマイページで変更）
- `list_members()`：owner 用の一覧（id, email, role, display_name, avatar_path, created_at, approved_at, last_sign_in_at）。`auth.users` の email を返すのでこの RPC だけで扱う

### 2-6. 合言葉方式の廃止

- `join_board` と `set_passcode` の実行権限を `authenticated` から取り消す（関数は残す）
- `/join` は `/login` へリダイレクト。管理画面の設定から合言葉の項目を削除（注意書き文言の設定は残す）
- 匿名ログインは使わなくなる（README に「Authentication で Anonymous sign-ins をオフに」と書く）

## 3. 画面

### 3-1. 新規登録・ログイン

| パス | 内容 |
|---|---|
| `/signup` | 表示名、メール、パスワード（8 文字以上、表示切替）、確認用パスワード。送信で `auth.signUp`（`options.data.display_name`）。完了後 `/pending` へ |
| `/login` | メール、パスワード。`next` パラメータで戻り先（`/board…`・`/mypage…`・`/admin…` のみ許可） |
| `/pending` | 「登録ありがとうございます。管理者の承認をお待ちください。」承認されると自動で案内（ページを開き直すと反映）。ログアウトボタン |
| `/suspended` | 「このアカウントは利用停止中です。管理者にお問い合わせください。」 |

- パスワードを忘れたとき：ログイン画面に「パスワードを忘れた場合は、管理者に仮パスワードの設定を依頼してください」と表示
- 登録には **Supabase の「Confirm email」をオフ** にしておく必要がある（README に手順）
- 既存の `/admin/login` は `/login?next=/admin` にリダイレクト

### 3-2. マイページ（`/mypage`、ログイン必須。pending でも「プロフィール」と「機材メモ」は使える）

タブで切り替え（スマホは横スクロールのタブ）：

1. **プロフィール**：アイコン（丸型。画像を選ぶ → ブラウザで中央を正方形に切り抜き 512px の JPEG に縮小 → `avatars/{uid}/avatar-{時刻}.jpg` にアップロード、古い画像は削除）、表示名、自己紹介・ひとこと（200 字、残り文字数表示）、保存ボタン
2. **ダイビング経験**：ライセンス（自由入力＋候補の datalist：BSAC／PADI／NAUI／SSI の代表的なランク）、経験本数、よく潜る海
3. **自分の投稿**：自分のスレッドと返信の一覧（新しい順、スレッドへのリンク）
4. **機材メモ**：一覧＋追加・編集・削除。次の点検日が 30 日以内または過ぎていれば黄色／赤のバッジ。資料「機材の劣化サイン」へのリンク
5. **アカウント**：パスワード変更（新しいパスワード＋確認）、ログアウト

- アイコンが無い人は、表示名の頭文字を丸の中に表示（色は名前から決まる 6 色のどれか）

### 3-3. 仲間のプロフィール

- `/members/:id`（`is_member()` のみ）：アイコン、表示名、自己紹介、ダイビング経験、最近の投稿 5 件
- 掲示板のスレッド・返信・一覧に **アイコン＋表示名** を出し、タップでプロフィールへ。表示名は profiles の最新値を使う（旧データで profiles が無い投稿は `author_name` を表示）

### 3-4. ヘッダー・メニュー

- ログイン中はヘッダー右（ハンバーガーの左）に小さなアイコン（28px）→ `/mypage`
- ドロワーの下段：未ログイン「ログイン」「新規登録」／ログイン中「マイページ」「ログアウト」、editor/owner は「管理画面」
- 掲示板・マイページ・管理画面の入口で、状態に応じて `/login`・`/pending`・`/suspended` へ案内

### 3-5. 管理画面

- メニューは role に応じて出し分け：
  - editor：概要、お知らせ、投稿管理
  - owner：概要、資料、事故事例、お知らせ、投稿管理、**メンバー**、設定
- 権限の無いページを直接開いたら「このページを開く権限がありません」
- **メンバー（`/admin/members`、owner のみ）**
  - 上部に「承認待ち N 人」。承認待ちのカード：アイコン・表示名・メール・登録日時、**承認**／**利用停止** ボタン
  - メンバー一覧（表。スマホではカード）：アイコン、表示名、メール、役割、登録日、最終ログイン
    - **「サブ管理者」チェックボックス**（member⇔editor。チェックで権限付与）
    - メニュー（…）：メインの管理者にする、利用停止／再開、仮パスワードを設定（ダイアログで入力、確認欄つき）
  - 絞り込み：すべて／承認待ち／メンバー／サブ管理者／メイン管理者／利用停止
  - 自分の行は操作不可（「あなた」のラベル）
  - 変更前に確認ダイアログ（ページ内のダイアログ。`window.confirm` は使わない）
- 概要（ダッシュボード）に「承認待ち N 人」を追加（owner のみ）

## 4. 料金・運用のメモ（README に追記）

- Supabase 無料プラン：月間アクティブユーザー 50,000 人、DB 500 MB、ファイル 1 GB、転送量 5 GB/月。仲間内の規模なら超えない
- 画像は縮小してから保存（アイコン 512px、掲示板 1600px）して容量を節約
- 無料プランは上限を超えても自動で課金されない（有料プランへの切り替えは手動）
- 標準のメール送信は使わない設計。将来メールで再設定したくなったら、Gmail の SMTP などを設定すれば追加できる

## 5. 品質

- Vitest：役割ごとのメニュー出し分け、戻り先（next）の検証、アイコンの切り抜きサイズ計算、機材メモの点検期限バッジの判定、頭文字アイコンの色決定
- `npm run lint`（警告 0）、`npx tsc -b`
- DESIGN.md・README 更新（セットアップ手順：migration 実行 → Confirm email オフ → Anonymous sign-ins オフ）
- 既存のセキュリティ要件を崩さない：権限はすべて DB の関数（is_owner / is_editor / is_member）で判定し、画面の出し分けだけに頼らない
