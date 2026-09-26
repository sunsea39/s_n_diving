# N×S_Diving 改修仕様 v1.1

`docs/DESIGN.md`（Phase 1 仕様）からの変更点。ここに書かれていないことは DESIGN.md のまま。
実装後、DESIGN.md も本書の内容に合わせて更新すること（コンセプト・名称・配色・ルーティング・データ設計）。

## 0. 変更の一覧

| # | 変更 |
|---|---|
| 1 | サイト名を **N×S_Diving** に変更（URL・リポジトリ名 `s_n_diving` はそのまま） |
| 2 | コンセプト変更：**ダイビング情報の共有サイト** |
| 3 | 配色を設計書のモックアップどおりの **ライトテーマ固定** に。ダークモード廃止。ネイビーの面積を減らす |
| 4 | 管理画面の「新しい合言葉」入力欄が見えない問題を解消（入力欄のコントラスト不足） |
| 5 | 資料を **ブロック形式** にして、機材以外の資料もさまざまなレイアウトで作れるようにする |
| 6 | **事故事例** ページ（事案ごと）を新設 |
| 7 | スマホ・タブレットのヘッダー右に **ハンバーガーメニュー** |
| 8 | アイコン差し替えの受け口（`public/icons/`、favicon・manifest・ヘッダーロゴ） |

## 1. 名称

- 表示名はすべて `N×S_Diving`（ヘッダー、`<title>` の「ページ名 | N×S_Diving」、manifest の name/short_name、フッター、README、index.html）
- ロゴ表記: `N<span>×</span>S_Diving`（× をティール）
- URL・リポジトリ名・localStorage キー・Supabase のオブジェクト名は変更しない

## 2. コンセプトと文言

> ダイビング情報の共有サイト。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにしたい。

- トップのヒーロー（パネルではなく白地に直接）:
  - kicker「ダイビング情報の共有サイト」
  - h1「知って潜れば、海はもっと楽しい。」
  - リード「機材のこと、事故から学べること、仲間の経験。理解を深めて、安全に楽しく潜るための情報をここで共有します。」
- `/more` の「このサイトについて」も上記コンセプトに合わせて書き換え
- `<meta name="description">` も同様

## 3. 配色・見た目（設計書モックアップ準拠）

- **ライトテーマ固定**。`prefers-color-scheme: dark` のブロックを削除し、`color-scheme: light` を明示
- トークンは DESIGN.md §3 の light 値のみ。加えて `--field-border: #A8C4CC`（入力欄の枠）
- ネイビー（`--navy`）を **面** で使うのは次だけ：主ボタン、トップの NEXT DIVE カード、選択中のチップ。それ以外（ヘッダー、フッター、タブバー、ヒーロー、見出し帯、管理画面サイドメニュー）は **白地または `--panel`（#EEF5F6）**。ネイビーは見出しの文字色として使う
- ヘッダーとタブバー：白背景＋下（上）に 1px の `--line`
- 管理画面のメニュー：白地のチップ（現状どおり）。ネイビーの帯にしない
- トップページのレイアウトはモックアップどおり：ヒーロー → NEXT DIVE（ネイビーのカード）→ お知らせ（パネル）→ 資料（イラスト付きタイル 2 列）→ 事故事例の新着 → 掲示板の新着
- 入力欄（input / textarea / select）：背景 `#FFFFFF`、枠 `1.5px solid var(--field-border)`、フォーカス時は枠 `--teal`＋フォーカスリング。パネル（#EEF5F6）上でも輪郭がはっきり見えること
- 危険度チップ「● 即中止のみ」の ● は常に `--red`

## 4. 合言葉の入力欄（不具合）

- 原因想定：ダークモードで入力欄の背景・枠がパネルと同化して見えない。§3 のライト固定＋入力欄スタイルで解消する
- あわせて設定画面の改善：
  - 入力欄に `id` と `autoComplete="new-password"`、プレースホルダ「8文字以上」
  - 「表示する」チェックで type を text に切り替えられる
  - 確認用にもう一度入力する欄を追加し、一致しなければエラー
  - 現在合言葉が未設定（掲示板に誰も入れない状態）なら、その旨を黄色の注意ボックスで表示（`settings.passcode_hash is null` を返す RPC `passcode_is_set()` を追加。管理者のみ実行可、boolean を返す）

## 5. 資料のブロック形式

### 5-1. データ

`docs.body` を次の形にする（jsonb）：

```ts
type DocBody = {
  intro: string;
  blocks: Block[];
  disclaimer: string;
};

type Block =
  | { type: 'heading'; text: string }                                   // 小見出し（h2）
  | { type: 'text'; text: string }                                      // 段落。空行で段落分け、行頭「- 」で箇条書き
  | { type: 'callout'; tone: 'info' | 'caution' | 'danger'; title: string; text: string } // 注意ボックス
  | { type: 'signs'; sections: EquipmentSection[] }                     // 既存の機材×症状（凡例・即中止フィルタ・折りたたみ付き）
  | { type: 'cards'; columns: 2 | 3; items: { icon?: string; title: string; text: string }[] } // カード並び
  | { type: 'steps'; items: { title: string; text: string }[] }         // 番号付き手順
  | { type: 'checklist'; title: string; items: { text: string; level?: 'stop' | 'check' }[] } // チェックリスト
  | { type: 'table'; headers: string[]; rows: string[][] }              // 表（横スクロール）
  | { type: 'image'; src: string; alt: string; caption: string }        // 画像（src は docs-images の公開URL or /img/xxx.png）
  | { type: 'qa'; items: { q: string; a: string }[] }                   // Q&A（details/summary）
  | { type: 'links'; items: { label: string; url: string }[] };         // 参考リンク（外部は新しいタブ）
```

- 旧形式（`sections` / `habits` を直接持つ body）を読み込んだら、表示時に `[text(intro)?, signs(sections), heading('機材を長持ちさせる 3つの習慣'), cards(habits)]` へ変換する関数 `normalizeDocBody()` を用意（Vitest でテスト）
- `supabase/seed/gear-signs.json` を新形式に書き換え（本文テキストは一字一句変えない。habits は `cards` 3 列、見出しは「機材を長持ちさせる 3つの習慣」）。`scripts/generate-seed.mjs` で `supabase/seed.sql` を再生成
- チェックリストのチェック状態は端末の localStorage のみに保存（`doc:{slug}:check`）。「チェックをリセット」ボタン
- `docs` に列 `cover` を追加せず、既存の `icon` を「一覧用アイコン」として使う。アイコン候補に汎用アイコンを追加：`public/img/` に既存 8 点、加えて **テキストのみのカード**（アイコンなし）も選べるようにする

### 5-2. 表示

- 各ブロックは専用コンポーネント（`src/components/blocks/`）。レスポンシブ：`cards` はスマホ 1 列、600px 以上で指定列数
- 目次：`heading` と `signs` の各機材からページ内目次チップを自動生成
- 画像は `loading="lazy"`、最大幅 100%

### 5-3. 管理画面の資料エディタ

- 「新しい資料」作成時にテンプレートを選ぶ：
  - **白紙**
  - **機材チェック型**（signs＋cards）
  - **手順型**（text＋steps＋callout）
  - **Q&A型**（text＋qa＋links）
  - **チェックリスト型**（text＋checklist）
- ブロックの追加（種類を選ぶメニュー）・削除・上下移動・複製
- 各ブロックはフォームで編集（JSON を手で書かせない）。signs は既存の機材セクションエディタを流用
- 画像ブロック：ファイルを選ぶとブラウザで長辺 1600px の JPEG に縮小し、Storage バケット `docs-images`（公開読み取り・管理者のみ書き込み）にアップロードして URL を入れる
- プレビュータブ、未保存警告は現状どおり

## 6. 事故事例

### 6-1. 目的と注意

事故の事例を 1 件ずつ整理し、「なぜ起きたか」「どうすれば防げたか」を学ぶページ。
- 報道・公的報告書などを元にする場合は **自分の言葉で要約**し、出典を必ずリンクする（本文の転載はしない）
- 当事者の氏名・個人が特定できる情報は書かない（管理画面の入力欄の下に注意書きを表示）

### 6-2. データ（新しい migration ファイル `supabase/migrations/20260926000000_accidents_and_blocks.sql`）

```
accidents(
  id uuid pk default gen_random_uuid(),
  slug text unique (docs と同じ形式チェック),
  title text not null,                    -- 例「ボートダイビング中の漂流」
  occurred_on date null,                  -- 発生日
  occurred_label text not null default '',-- 表示用「2024年7月」など（日付が曖昧な場合）
  location text not null default '',      -- 「沖縄県・慶良間」など
  dive_style text not null default '',    -- ボート / ビーチ / ドリフト / ナイト / その他
  outcome text not null check in ('fatal','serious','minor','near_miss'), -- 死亡 / 重症 / 軽症 / ヒヤリ
  tags text[] not null default '{}',      -- エア切れ, 急浮上, 漂流, 機材トラブル, 体調・持病, 減圧症, バディ離れ, 視界不良, 海況, 海洋生物, その他
  summary text not null,                  -- 概要（一覧にも表示）
  timeline jsonb not null default '[]',   -- [{ "time": "10:05", "text": "..." }]
  causes jsonb not null default '[]',     -- ["..."] 考えられる原因
  lessons jsonb not null default '[]',    -- ["..."] 防ぐためのポイント
  related_doc_slugs text[] not null default '{}',
  sources jsonb not null default '[]',    -- [{ "label": "...", "url": "https://..." }]
  status text not null default 'draft' check in ('draft','published'),
  created_at, updated_at, updated_by uuid
)
```

- RLS：select は `status = 'published' or is_admin()`（anon も可）、書き込みは `is_admin()`。updated_at トリガー
- Storage バケット `docs-images`（public = true、file_size_limit 3 MiB、image/jpeg のみ）。insert/update/delete は `is_admin()`
- RPC `passcode_is_set()`（§4）
- この migration は **既存 DB に追加で実行する** 前提。何度実行しても壊れないように `if not exists` / `drop policy if exists` / `on conflict` を使う
- `supabase/seed.sql` に **記入例（架空）** を 1 件だけ `status = 'draft'` で入れる：タイトル「【記入例・架空】ボートダイビングでのバディ離れ」。本文にも「この事例は記入例です（架空）」と明記。公開はしない

### 6-3. 画面

| パス | 内容 |
|---|---|
| `/accidents` | 事故事例一覧。カード：結果バッジ（死亡=赤、重症=赤の薄地、軽症=黄、ヒヤリ=ティール）、タイトル、発生時期・場所、タグ、概要 2 行。絞り込み：結果、タグ。並び：発生日の新しい順 |
| `/accidents/:slug` | 詳細：バッジ＋タイトル → 事実の表（発生時期・場所・スタイル・結果）→ 概要 → 経過（タイムライン、縦線ではなく時刻＋本文の 2 列）→ 考えられる原因（箇条書き）→ **防ぐためのポイント**（`--panel` の強調パネル、チェックアイコン付き）→ 関連資料（docs へのリンクカード）→ 出典リンク → 注意書き「事例は学びのために要約したものです。詳細は出典をご確認ください。」 |
| `/admin/accidents`、`/admin/accidents/new`、`/admin/accidents/:id` | 管理：一覧（状態・発生日）、フォーム編集（タイムライン・原因・ポイント・出典は行の追加/削除/上下移動、タグはチェックボックス、関連資料は公開中 docs から複数選択）、プレビュー、未保存警告 |

- トップに「事故事例の新着」2 件（公開済みがなければセクションごと非表示）
- 資料詳細の末尾に、その資料の slug を `related_doc_slugs` に含む事故事例へのリンク（あれば）

## 7. ナビゲーションとハンバーガーメニュー

- ヘッダー：左にロゴ（アイコン＋`N×S_Diving`）、**右にハンバーガーボタン**（1024px 未満で表示。1024px 以上は横並びナビ）
- ボタン：44×44px、3 本線のアイコン（CSS）、`aria-label="メニューを開く"`、`aria-expanded`、`aria-controls`
- メニュー：右からスライドするドロワー（幅 `min(80vw, 320px)`、白背景、左に薄い影、背面に半透明の幕）。項目：
  - ホーム / 資料 / 事故事例 / 掲示板 / お知らせ（最新へのリンク一覧は不要、トップのお知らせ位置へ）
  - 区切り線
  - 合言葉を入力（掲示板メンバーなら「掲示板から退出」）/ このサイトについて（`/more`）/ 管理者ログイン（管理者なら「管理画面」「ログアウト」）
- 閉じる：× ボタン、幕のタップ、Esc、リンク選択時、ルート変更時。開いている間は body のスクロールを止め、フォーカスをドロワー内に移し、閉じたらボタンに戻す。`prefers-reduced-motion` ならアニメーションなし
- 下部タブ（600px 未満）：**ホーム / 資料 / 事故事例 / 掲示板** の 4 つ（「その他」はハンバーガーへ移動）
- デスクトップの横並びナビ：ホーム / 資料 / 事故事例 / 掲示板 / このサイトについて / 管理

## 8. アイコンの受け口

- `public/icons/` に `logo.svg`（ヘッダー用）、`favicon.svg`、`icon-192.png`、`icon-512.png`、`apple-touch-icon.png` を置く想定。いまは **仮アイコン**（N と S を上下に置いた円形の簡易コンパス SVG。色はネイビーとティール）を `logo.svg` / `favicon.svg` として作成し、PNG は用意できるまで manifest から外しておく
- index.html に favicon と apple-touch-icon のリンク、manifest に icons を追加（PNG は後で差し替える前提でコメントを残す）
- ヘッダーのロゴは `logo.svg`（28px）＋テキスト

## 9. テスト・品質

- Vitest：`normalizeDocBody`（旧形式→新形式）、ブロックのバリデーション（空の見出し等）、事故事例の絞り込み・並び替え、結果ラベル／色のマッピング、ドロワーの開閉状態ロジックがあれば
- `npm run lint`（警告 0）、`npx tsc -b` が通ること
- 既存のセキュリティ要件（is_admin で判定、passcode_hash を出さない等）を崩さない

## 10. README

- 名称変更、コンセプト
- **追加の SQL 手順**：`supabase/migrations/20260926000000_accidents_and_blocks.sql` → `supabase/seed.sql` の順に SQL Editor で実行（どちらも再実行して安全）
- 事故事例を書くときの注意（要約・出典・個人情報）
