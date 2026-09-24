# S×N_Diving 実装仕様（Phase 1）

設計書（画面イメージ付き）: https://claude.ai/artifact/5bSPakY8xAXhribKsN9crC

仲間内でダイビングの安全情報を共有する Web アプリ。専用 URL を仲間に送って使う。

- 表示名: `S×N_Diving`（画面上）／ URL・ファイル名: `s_n_diving`
- 公開 URL: `https://<専用GitHubアカウント>.github.io/s_n_diving/`
- 対象: スマホ最優先、タブレット・PC 対応。日本語 UI のみ。

## 1. 確定した方針

| 項目 | 決定 |
|---|---|
| 掲示板の入口 | **合言葉方式**（仲間はアカウント登録不要） |
| 資料・トップ | URL を知っていれば誰でも閲覧可（ログイン不要） |
| 管理者 | メール＋パスワードでログイン。招待制。`admins` テーブルに載っている人だけが管理者 |
| 配信 | GitHub Pages（専用アカウント、リポジトリ名 `s_n_diving`） |
| バックエンド | Supabase（Postgres / Auth / Storage）。Edge Function は使わない（RPC で完結させる） |

## 2. 技術スタック

- Vite + React 18 + TypeScript（strict）、React Router v6
  - `vite.config.ts` の `base: '/s_n_diving/'`
  - `<BrowserRouter basename={import.meta.env.BASE_URL}>`
  - GitHub Pages の SPA 対策: ビルド後に `dist/index.html` を `dist/404.html` にコピー
- `@supabase/supabase-js` v2
- CSS はプレーン CSS（CSS 変数でトークン定義）。UI ライブラリは使わない
- テスト: Vitest（純粋ロジック：資料フィルタ、画像縮小サイズ計算、日付表示、入力バリデーション）
- Lint: ESLint + Prettier
- 環境変数: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`（`.env.example` を用意。`.env` は git 管理外）
- 環境変数が未設定のときは、トップに「Supabase が未設定です」という案内を出し、資料だけは同梱の seed JSON（`supabase/seed/gear-signs.json`）から表示できるようにする（ローカル確認用のフォールバック）

## 3. デザイントークン（添付スライド「ダイビング機材 劣化・寿命のサイン」から抽出）

```css
--navy:  #0B3C5D;  /* 見出し・主ボタン */
--teal:  #1B998B;  /* ラベル（kicker）・リンク・選択中 */
--ink:   #4F5B62;  /* 本文 */
--red:   #D64527;  /* ● 使用を中止してすぐ点検・交換（level: stop） */
--amber: #D98E04;  /* ● 早めに点検・交換を検討（level: check） */
--panel: #EEF5F6;  /* パネル背景 */
--line:  #D5E6EA;  /* 罫線 */
--ground:#FFFFFF;
```

ダークモード（`prefers-color-scheme: dark` に追従）:
`--ground:#08202F; --panel:#0F2E40; --line:#1D4A63; --navy:#E4F0F3; --teal:#3CC2B2; --ink:#B7C7CE; --red:#F07A5F; --amber:#F0B23A;`

- フォント: Noto Sans JP（Google Fonts）→ fallback `Meiryo, "Hiragino Sans", system-ui, sans-serif`
- 本文 16px / 行間 1.8。ページ見出し 22–28px 900、機材見出し 17px 700、ラベルは teal 13px 700 letter-spacing .08em
- パネル: 背景 `--panel`、角丸 14px、**影なし**（フラット）。アクセントの縦線・帯は使わない
- イラスト: `public/img/{regulator,hose,bcd,computer,mask,fin,wetsuit,tank}.png`（円背景つき正方形 800px）。一覧 64px、詳細 96–120px
- 症状行: `●`（red / amber）＋症状（太字 navy）、下に「→ 理由」を ink で
- タップ領域は最低 44×44px。フォーカスリングを必ず表示。`prefers-reduced-motion` を尊重

### ブレークポイント

- 〜599px: 1 カラム。**下部固定タブ**（ホーム／資料／掲示板／その他）。`env(safe-area-inset-bottom)` を考慮
- 600〜1023px: 2 カラムのカード。上部ナビに切替
- 1024px〜: 最大幅 960px 中央寄せ
- 管理画面: 1024px 以上はサイドメニュー、それ未満は上部の横スクロールタブ

## 4. ルーティング

| パス | 画面 | 権限 |
|---|---|---|
| `/` | トップ：次回予定（ヒーロー）、お知らせ（ピン留め優先・最新3件）、資料カード、掲示板の新着3件（合言葉未入力なら「合言葉を入れて見る」ボタン） | 誰でも |
| `/docs` | 資料一覧（カード：イラスト・タイトル・概要・更新日） | 誰でも |
| `/docs/:slug` | 資料詳細（下記 5 章） | 誰でも（published のみ） |
| `/news/:id` | お知らせ詳細 | 誰でも |
| `/join` | 合言葉入力 ＋ 表示名 | 誰でも |
| `/board` | スレッド一覧（カテゴリ絞り込み、最終投稿順） | 掲示板メンバー |
| `/board/new` | 新規スレッド | 掲示板メンバー |
| `/board/:id` | スレッド詳細・返信 | 掲示板メンバー |
| `/admin/login` | 管理者ログイン | 誰でも |
| `/admin` | ダッシュボード（公開中資料数・下書き数・今週の投稿数） | 管理者 |
| `/admin/docs`, `/admin/docs/new`, `/admin/docs/:id` | 資料の一覧・作成・編集 | 管理者 |
| `/admin/news`, `/admin/news/new`, `/admin/news/:id` | お知らせ | 管理者 |
| `/admin/board` | 投稿の管理（非表示／再表示／削除） | 管理者 |
| `/admin/settings` | 合言葉の変更、管理者一覧（表示のみ）、注意書き文言 | 管理者 |
| `*` | 404 | 誰でも |

掲示板メンバーでない人が `/board*` に来たら `/join?next=...` へ。管理者でない人が `/admin*` に来たら `/admin/login` へ。

## 5. 資料詳細画面

- ヘッダ: kicker（category）＋タイトル＋ intro
- 凡例: ● 赤「使用を中止してすぐ点検・交換」／ ● 黄「早めに点検・交換を検討」
- フィルタチップ: 「すべて」「● 即中止のみ」
- 機材セクションは **折りたたみ**（スマホでは最初の1つだけ開く。タブレット以上は全て開き2列）
  - イラスト、`no name`、sub、症状リスト、「交換・点検の目安」ボックス（白背景）
- 末尾: 「機材を長持ちさせる 3つの習慣」（habits）と disclaimer（常に表示）
- 機材ごとのページ内アンカー（目次チップ）

## 6. 掲示板

- カテゴリ: `hiyari`（ヒヤリハット：赤系のチップで強調）/ `plan`（計画）/ `gear`（機材）/ `chat`（雑談）
- ヒヤリハットの新規投稿は、本文の代わりに 3 項目のテンプレート: 「何が起きた？」「なぜ起きた？」「次はどうする？」（`threads.hiyari` jsonb に保存、表示も 3 見出しで）
- 表示名は `localStorage` に記憶（最大 20 文字）
- 画像: スレッド・返信ごとに 1 枚まで。ブラウザで長辺 1600px の JPEG（品質 0.8）に縮小してからアップロード
- 自分の投稿（`author_uid = auth.uid()`）は編集・削除できる
- 本文はプレーンテキスト（改行のみ反映、URL は自動リンク、HTML は必ずエスケープ）
- 文字数上限: タイトル 60、本文 4000、返信 2000

## 7. 認証と合言葉のしくみ

1. `/join` で合言葉と表示名を入力
2. セッションがなければ `supabase.auth.signInAnonymously()`
3. RPC `join_board(p_passcode text)` を呼ぶ（SECURITY DEFINER）
   - `pgcrypto` の `crypt()` で `settings.passcode_hash` と照合
   - 失敗は `join_attempts` に記録し、同じ uid で 10 分に 5 回失敗したら拒否
   - 成功したら `board_members(user_id, passcode_version)` を upsert
4. 掲示板の RLS は `is_board_member()`（= `board_members` に現在の `passcode_version` で登録済み、または `is_admin()`）で判定
5. 管理者が合言葉を変更すると `passcode_version` が増え、全員が合言葉を再入力する必要がある

**重要:** 匿名ユーザーも Postgres 上は `authenticated` ロールになる。管理者権限は必ず `is_admin()`（`admins` に `auth.uid()` があるか）で判定し、`authenticated` であることを権限の根拠にしない。

管理者ログインは `signInWithPassword`。管理者の追加は Phase 1 では Supabase ダッシュボードで招待 → `admins` に 1 行追加（README に手順を書く）。

## 8. データベース（`supabase/migrations/` に SQL で）

```
admins(user_id uuid pk → auth.users, display_name text, role text check in ('owner','editor'), created_at)
settings(id int pk check (id = 1), passcode_hash text, passcode_version int default 1, disclaimer text, updated_at)
board_members(user_id uuid pk → auth.users, display_name text, passcode_version int, joined_at)
join_attempts(id bigserial, user_id uuid, success bool, created_at)
docs(id uuid pk, slug text unique, title text, category text, summary text, icon text, body jsonb,
     status text check in ('draft','published'), sort_order int, updated_at, updated_by uuid)
news(id uuid pk, title text, body text, next_dive_at timestamptz null, next_dive_place text null,
     pinned bool default false, published_at timestamptz, created_by uuid)
threads(id bigserial pk, category text check in ('hiyari','plan','gear','chat'), title text, body text,
        hiyari jsonb null, image_path text null, author_name text, author_uid uuid,
        reply_count int default 0, last_post_at timestamptz, hidden bool default false, created_at, updated_at)
posts(id bigserial pk, thread_id bigint → threads on delete cascade, body text, image_path text null,
      author_name text, author_uid uuid, hidden bool default false, created_at, updated_at)
```

- 関数: `is_admin()`, `is_board_member()`, `join_board(text)`, `set_passcode(text)`（管理者のみ・version を +1）
- トリガー: posts の insert/delete で `threads.reply_count` と `last_post_at` を更新／同一 uid の投稿は 1 分に 3 件まで（threads + posts 合算）／updated_at 自動更新
- RLS（全テーブル有効）:
  - `docs`: select は `status='published' or is_admin()`、書き込みは `is_admin()`
  - `news`: select 誰でも、書き込み `is_admin()`
  - `threads` / `posts`: select は `is_board_member() and (not hidden or is_admin())`、insert は `is_board_member() and author_uid = auth.uid()`、update/delete は本人または `is_admin()`（本人は `hidden` を変更不可）
  - `settings`: 直接の select は `is_admin()` のみ。`disclaimer` は公開用の view か RPC で返す（`passcode_hash` は絶対に外に出さない）
  - `admins`: select は `is_admin()`
  - `board_members`, `join_attempts`: クライアントから直接触らせない（RPC 経由）
- Storage: バケット `board-images`（非公開）。読み書きは `is_board_member()`、パスは `{auth.uid()}/{uuid}.jpg`、削除は本人または管理者。表示は signed URL
- `supabase/seed.sql`: `supabase/seed/gear-signs.json` の内容を `docs` に insert、`settings` に初期行（合言葉は README の手順で設定するまで `null` ＝ 掲示板に入れない）

## 9. 管理画面：資料エディタ

JSON を手で書かせない。フォームで:

- 基本情報: タイトル、slug（半角英数とハイフン）、カテゴリ、概要、一覧用アイコン、状態（下書き／公開）、並び順
- intro
- 機材セクション（追加・削除・上下移動）: 機材名、サブタイトル、イラスト（8 種から選択）、交換・点検の目安、症状（追加・削除・上下移動、各行: 赤/黄の切替・症状・理由）
- habits（追加・削除・上下移動）、disclaimer
- 「プレビュー」タブで公開画面と同じ部品で表示
- 保存時に未保存変更があるままページを離れようとしたら警告

## 10. 検索除け・その他

- 全ページ `<meta name="robots" content="noindex, nofollow">`
- `<title>`: 「ページ名 | S×N_Diving」
- `manifest.webmanifest` とアイコン（Phase 2 で PWA 化するための下準備。Service Worker は Phase 2）
- 画面下部フッター: 「S×N_Diving ・ 仲間内専用ページです。URL の取り扱いに注意してください」

## 11. GitHub Actions

- `.github/workflows/deploy.yml`: main への push で `npm ci` → `npm run lint` → `npm test` → `npm run build` → GitHub Pages へデプロイ（`actions/deploy-pages`）。Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `.github/workflows/keepalive.yml`: 週 1 回（月曜 03:00 JST）、Supabase REST の `docs` を 1 件 GET（無料プランの 7 日無アクセス停止を防ぐ）

## 12. README（日本語）に書くこと

1. 専用 GitHub アカウントでリポジトリ `s_n_diving` を作成し push、Pages を「GitHub Actions」に設定
2. Supabase プロジェクト作成 → Authentication で Anonymous sign-ins を有効化 → SQL Editor でマイグレーションと seed を実行
3. 最初の管理者: Supabase で招待 → `insert into admins ...` 
4. 最初の合言葉: 管理画面の設定から、または SQL で `select set_passcode('...')`（管理者としてログイン後）
5. GitHub Secrets の設定
6. ローカル開発: `.env` 作成 → `npm install` → `npm run dev`
7. 仲間に送る URL

## Phase 1 に含めないもの

PWA のオフライン対応、チェックリストモード、印刷用 PDF、出欠管理、個人アカウント、機材台帳、`diving_manual_site_design.md` / `equipment_care_site_design.md` の資料化（Phase 2 以降。著作権の確認が必要）。
