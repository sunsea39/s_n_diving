# N×S_Diving 実装仕様 v2.1

## v2.2

- Page headers use `page_texts`, with code defaults to avoid a first-render flash.
- Document anchors are deterministic (`sec-` plus a stable hash), shared by the TOC and bookmarks.
- `Avatar` is the sole renderer: uploaded image, validated diver illustration, then initials.
- Dive-log aggregates (`profiles.logged_dives` / `last_dived_on`) are database-maintained; clients cannot update them or `profiles.role`.
- Filter controls use `.chip` and `aria-pressed`, with explicit selected colors for both themes.
- Apply `20260928000000_v2_2.sql` after v2.0.1. It is additive and safe to run again.

## 1. 概要

- 表示名: **N×S_Diving**。URL、リポジトリ名、localStorage キー、Supabase オブジェクト名は s_n_diving のまま。
- コンセプト: **ダイビング情報の共有サイト**。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにする。
- 技術: Vite / React 18 / TypeScript strict / React Router v6 / Supabase。
- URL: GitHub Pages の /s_n_diving/。BrowserRouter は import.meta.env.BASE_URL を basename に使う。

## 2. デザインとテーマ

- テーマはライト（既定）/ ダーク / 端末に合わせるの 3 種。選択は localStorage の `ns-theme` に保存し、`<html data-theme="light|dark">` と `color-scheme` に反映する。初回描画前の `index.html` スクリプトも同じ規則で適用し、theme-color はライト #FFFFFF、ダーク #0E1A22 とする。
- ライトの主要トークンは navy #0B3C5D、teal #1B998B、ink #4F5B62、red #D64527、amber #D98E04、panel #EEF5F6、line #D5E6EA、field-border #A8C4CC、ground #FFFFFF。ダークは ground #0E1A22、panel #16252F、panel-2 #1E313D、line #2A3F4C、field-border #4A6473、navy #E6EEF1、ink #B9C6CC、muted #8697A0、teal #3CC2B2、red #F07A5F、amber #F0B23A を使う。
- 主ボタンは `--button-bg` / `--button-fg`、NEXT DIVE は `--hero-card-bg`、入力欄は `--field-bg` を使う。すべての面、境界線、バッジ、警告色をトークン化し、ダークテーマでもコントラストを確保する。
- モバイル優先。600px 未満は下部タブ（ホーム / 資料 / 事故事例 / 掲示板）のアイコン＋ラベル、1024px 未満は右側ハンバーガードロワー、1024px 以上は横並びナビとテーマ切替ボタン。ドロワーと `/more` では 3 種のテーマを選択できる。
- 下部タブは高さ 56px（safe area を加算）。選択中はティール色の 52×28px 相当のピルをアイコンの背面に表示する。アイコンは `src/components/icons.tsx` のインライン SVG（24px、currentColor）を用いる。
- トップはコピーの下に CSS 変数で着色する `HeroScene` を全幅・角丸 16px で表示し、NEXT DIVE カードを下端へ 28px 重ねる。高さはモバイル 150px、600px 以上 200px、1024px 以上 240px。
- ヘッダーは `--header-h`（64px と safe area）を基準に固定する。半透明の `--ground` と blur、スクロール後の薄い影を持ち、ドロワーより低い z-index に保つ。

## 3. ルーティング

| パス | 内容 |
| --- | --- |
| / | ヒーロー、NEXT DIVE、お知らせ、資料、事故事例新着、掲示板新着 |
| /docs, /docs/:slug, /docs/:slug/print | 資料一覧、ブロック形式の資料詳細、印刷専用ページ |
| /accidents, /accidents/:slug, /accidents/:slug/print | 事故事例の一覧・詳細、A4 全文の印刷専用ページ |
| /board*, /members/:id | 承認済みメンバーだけの掲示板と仲間プロフィール |
| /signup, /login, /pending, /suspended, /mypage | 個人アカウント、承認待ち、利用停止、マイページ |
| /more | このサイトについて、テーマ選択、退出とログイン導線 |
| /admin/* | 管理画面（資料、事故事例、お知らせ、掲示板、設定） |

ヘッダーのドロワーはログイン状態に応じてログイン/新規登録またはマイページ/ログアウトを示す。editor/owner は管理画面も表示する。ログイン中はヘッダーに 28px のアバターを表示する。

## 4. 資料データ

docs.body は JSONB の intro、blocks、disclaimer。Block は heading / text / callout / signs / cards / steps / checklist / table / image / qa / links の union。

- `text`、`callout`、`steps`、`qa` は `**太字**` だけを React のテキストノードとして解釈する。HTML は挿入せずエスケープする。
- `/docs` はカテゴリ別に `sort_order` 順でまとめ、カテゴリチップで絞り込む。トップの資料欄はカテゴリ代表ではなく `updated_at` が新しい 4 件を表示する。
- 資料詳細の heading から目次チップを生成する。目次はヘッダー直下に sticky で保持し、見出しと機材セクションはヘッダーと目次分の scroll margin を持つ。600px を超えてスクロールすると「▲ 上へ」を表示する。
- `private/manual/*.json` はダイビング入門の非公開本文で、`scripts/generate-manual-seed.mjs` が docs upsert 用 `private/manual/manual-seed.sql` を生成する。`private/` がない環境では何も書き込まず終了する。

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

## 6. 個人アカウント、セキュリティと設定

- `profiles.role` は pending/member/editor/owner/suspended。新規の非匿名 auth user は trigger により pending で作られ、owner が `set_member_role` RPC で承認・権限変更する。最後の owner の降格・停止と自分自身の role 変更は DB で拒否する。
- member は掲示板、editor はお知らせと投稿管理、owner は資料・事故事例・設定・メンバー管理を含む全権限を持つ。画面のガードに加え、RLS と security-definer 判定関数で強制する。
- profiles の公開範囲は本人、承認済み会員、owner で異なる。gear_notes は本人専用。avatars は public read かつ本人フォルダのみ書き換え可能。
- `/mypage` はプロフィール、経験、自分の投稿、機材メモ、アカウントをタブで表示する。アイコンは中央正方形に切り抜き 512px JPEG に縮小する。

- Authentication の Confirm email と Anonymous sign-ins は OFF にする。
- settings の公開値は public_settings の disclaimer のみ。
- docs-images は public read、admin write。board-images は非公開で、既存の owner 比較は auth.uid()::text を使う。
- threads/posts の列単位 UPDATE grants は Phase 1 のまま維持する。

## 7. Supabase 適用順

1. 初回は supabase/migrations/20260924000000_phase1.sql。
2. v1.1 は supabase/migrations/20260926000000_accidents_and_blocks.sql。
3. v2.0 は supabase/migrations/20260927000000_accounts.sql。
4. node scripts/generate-seed.mjs で生成した supabase/seed.sql。

v1.1 migration と seed は再実行安全。seed の事故事例は 【記入例・架空】 と明示した draft だけで、公開しない。

## 8. アイコンと品質

最終アイコンは `public/icons/` の `logo.svg`、`favicon.svg`、`icon.svg`、`icon-192.png`、`icon-512.png`、`maskable-512.png`、`apple-touch-icon.png` を使用する。ヘッダーと印刷カードは同じ `logo.svg` を参照し、`index.html` は Vite の `/s_n_diving/` base パスで favicon と Apple touch icon を参照する。manifest には PNG の 192 / 512 を `any`、maskable-512 を `maskable` として登録する。アイコンを更新するときは同じファイル名・用途・サイズを保って `public/icons/` の該当ファイルだけを置き換える。

フッターは `FooterScene.tsx` の原画 SVG と、直下に続く `--ft-sand` の文字帯で構成する。原画を更新する場合は図形と座標を維持したまま `FooterScene.tsx` の SVG を差し替え、`ft-*` class の色は `styles.css` の `--ft-*` トークンで指定する。画像帯は 110 / 140 / 170px、文字帯はモバイルの下部タブと safe area を含む余白を取り、アニメーションは `motion.css` のトークン、reduced motion、IntersectionObserver に従う。

`src/styles/motion.css` は `:root` のモーショントークンを唯一の時間定義とする。ドロワー 420ms（専用イージング）、幕 360ms、メニューアイコン 320ms、ページ遷移 420ms、カード 560ms、スタガー 90ms（8枚目で上限）、波 22/32秒、泡 8〜12秒、魚 16秒、光 10秒、ブイ 6.5秒に加え、フッターの魚は 18 / 22秒、海藻は 7秒、泡は 9〜12秒、光は 11秒である。ホバー 150ms と押下 80ms は操作の応答性のため維持する。機材のアコーディオンは outer grid の `0fr/1fr` と、`min-height: 0; overflow: hidden` の単一 inner clip を使い、閉じた内容を inert・非表示にする。Q&A も同じ grid/clip 構造にする。ヒーローとフッターのアニメーションは IntersectionObserver で画面外なら停止し、`prefers-reduced-motion: reduce` ではすべて無効化する。テーマ色の遷移は初回描画後にだけ有効化する。

## 9. PDF・印刷

- 資料詳細と事故事例詳細には印刷専用ページへの導線を置く。印刷ページは `SiteLayout` の外にあり、ヘッダー、フッター、タブ、ドロワーを表示しない。すべて noindex のままにする。
- 資料の印刷設定は localStorage の `ns-print` に保存する。カード／通し（全文）、A6／A7、A4 タイル／カード単票、要点のみ／要点＋本文を選べ、ブラウザの `window.print()` で PDF 保存する。
- カードは intro の表紙、機材ごとの signs、見出しで区切った要点、cards ブロックから作る。カードごとに 10pt から A6 は 7pt、A7 は 6.5pt まで 0.5pt ずつ縮め、画像の読み込み後も収まらない場合は継続カードへ分割する。
- 印刷は常にライト配色で `print-color-adjust: exact` を指定する。全文は A4（14mm / 12mm 余白）、カード単票は A6/A7 の named `@page`、タイルは A4 の named `@page` を使う。全文の見出し・機材・callout はページ途中で不自然に切れないようにする。

すべてのページは noindex, nofollow。title は ページ名 | N×S_Diving。
