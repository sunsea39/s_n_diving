# N×S_Diving 実装仕様 v1.1

## 1. 概要

- 表示名: **N×S_Diving**。URL、リポジトリ名、localStorage キー、Supabase オブジェクト名は s_n_diving のまま。
- コンセプト: **ダイビング情報の共有サイト**。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにする。
- 技術: Vite / React 18 / TypeScript strict / React Router v6 / Supabase。
- URL: GitHub Pages の /s_n_diving/。BrowserRouter は import.meta.env.BASE_URL を basename に使う。

## 2. デザイン

- ライトテーマ固定。color-scheme: light とし、ダークモード用 prefers-color-scheme は使わない。
- トークン: navy #0B3C5D、teal #1B998B、ink #4F5B62、red #D64527、amber #D98E04、panel #EEF5F6、line #D5E6EA、field-border #A8C4CC、ground #FFFFFF。
- ネイビーの面は主ボタン、NEXT DIVE、選択中チップだけ。ヘッダー、フッター、タブバー、ヒーロー、管理メニューは白または panel。
- 入力欄は白、1.5px の field border、ティールのフォーカスリング。危険度の「● 即中止」の点は常に赤。
- モバイル優先。600px 未満は下部タブ（ホーム / 資料 / 事故事例 / 掲示板）、1024px 未満は右側ハンバーガードロワー、1024px 以上は横並びナビ。

## 3. ルーティング

| パス | 内容 |
| --- | --- |
| / | ヒーロー、NEXT DIVE、お知らせ、資料、事故事例新着、掲示板新着 |
| /docs, /docs/:slug | 資料一覧とブロック形式の資料詳細 |
| /accidents, /accidents/:slug | 事故事例の一覧・詳細 |
| /board*, /join | 合言葉で保護した掲示板 |
| /more | このサイトについて、退出とログイン導線 |
| /admin/* | 管理画面（資料、事故事例、お知らせ、掲示板、設定） |

ヘッダーのドロワーはホーム、資料、事故事例、掲示板、お知らせ、合言葉/退出、サイトについて、管理への導線を持つ。Esc、背景、閉じるボタン、リンク選択、ルート変更で閉じ、開いている間は body のスクロールを停止する。

## 4. 資料データ

docs.body は JSONB の intro、blocks、disclaimer。Block は heading / text / callout / signs / cards / steps / checklist / table / image / qa / links の union。

- legacy の sections / habits 本文は normalizeDocBody() で text、signs、習慣見出し、3列 cards に正規化して表示する。
- blocks は src/components/blocks/ の専用コンポーネントで描画する。
- checklist の状態は doc:{slug}:check の localStorage のみを使う。
- 画像は docs-images の公開 URL または /img/...。lazy load、最大幅 100%。
- 管理者はテンプレートを選択し、ブロックのフォーム編集、追加、削除、移動、複製、プレビューができる。画像は長辺 1600px の JPEG に縮小してアップロードする。

## 5. 事故事例データ

accidents は slug、タイトル、発生日/表示用時期、場所、スタイル、結果、タグ、概要、timeline、causes、lessons、関連資料 slug、sources、status、更新情報を持つ。

- public の select は status = published または is_admin()、書き込みは is_admin() のみ。
- 一覧は結果・タグで絞り込み、発生日が新しい順。詳細は事実、経過、原因、防止ポイント、関連資料、出典、注意書きを表示する。
- 事故事例は本人の言葉で要約し、出典リンクを必須とする。氏名など個人を特定できる情報は扱わない。

## 6. セキュリティと設定

- 匿名サインインも authenticated であるため、管理者権限は必ず public.is_admin() で判定する。
- settings.passcode_hash はクライアントに公開しない。設定画面は admin-only の passcode_is_set() で未設定だけを確認する。
- settings の公開値は public_settings の disclaimer のみ。
- docs-images は public read、admin write。board-images は非公開で、既存の owner 比較は auth.uid()::text を使う。
- threads/posts の列単位 UPDATE grants は Phase 1 のまま維持する。

## 7. Supabase 適用順

1. 初回は supabase/migrations/20260924000000_phase1.sql。
2. v1.1 は supabase/migrations/20260926000000_accidents_and_blocks.sql。
3. node scripts/generate-seed.mjs で生成した supabase/seed.sql。

v1.1 migration と seed は再実行安全。seed の事故事例は 【記入例・架空】 と明示した draft だけで、公開しない。

## 8. アイコンと品質

public/icons/logo.svg と favicon.svg は差し替え可能な仮コンパス。ヘッダーは 28px の logo.svg を使う。最終 PNG（192 / 512 / apple touch）は支給後に manifest の icons へ追加する。

すべてのページは noindex, nofollow。title は ページ名 | N×S_Diving。
