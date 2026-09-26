# N×S_Diving 改修仕様 v1.3

| # | 変更 |
|---|---|
| 1 | 「ダイビング入門」資料（The Diving Manual の要約・言い換え版）を、章ごとの資料として作成 |
| 2 | 機材の折りたたみが、閉じても一部見えている不具合を直す |
| 3 | ヘッダーを画面上部に固定する |

## 1. ダイビング入門の資料

### 1-1. 元データと著作権の扱い（重要）

- 元データは **`../diving_manual_site_design.md`**（リポジトリの 1 つ上のフォルダ、`C:\Users\rescu\ダイビング_claude\diving_manual_site_design.md`）の **§6（6-S〜6-A）と §7-1（絶対に守るルール）**。ここの文章はすでに要約・言い換え済み
- **PDF（The_Diving_Manual_202507.pdf）は読まない・使わない**。文章・図・表を PDF から写さない
- 同ファイル §11「元資料で気づいた点」の調整（安全停止は「6m付近（6〜3m）で1〜3分、ダイブコンピューターの指示に従う」に統一、飛行機は「24時間を目安にダイブコンピューターの表示に従う」、英語の誤記を直す 等）を反映する
- 各資料の末尾の注意書き（`disclaimer`）は §12 の文をそのまま使う
- 応急手当・医療の内容は手順を細かく書かず、講習・医療機関へ誘導する（§6-A-2 の方針どおり）

### 1-2. 公開リポジトリに入れない

GitHub のリポジトリは公開（Public）なので、この資料の本文はリポジトリにコミットしない。

- 資料データは **`private/manual/`** に置く（`.gitignore` に `private/` を追加）
  - `private/manual/*.json`：1 資料 1 ファイル（`gear-signs.json` と同じ形式：slug, title, category, summary, icon, status, sort_order, body）
  - `private/manual/manual-seed.sql`：上記 JSON から生成する SQL（docs に upsert。`on conflict (slug) do update`）
- 生成スクリプト：`scripts/generate-manual-seed.mjs`（`private/manual/*.json` を読んで `private/manual/manual-seed.sql` を書く。`private/` が無ければ何もせず終了）。既存の `generate-seed.mjs` の SQL 生成部分を共通化してよい
- README に「ダイビング入門の資料は `private/manual/manual-seed.sql` を SQL Editor で実行して登録する。公開リポジトリには含めない」と書く

### 1-3. 資料の分け方（1 章 = 1 資料）

| slug | タイトル | 元（§6） |
|---|---|---|
| `basics-start` | はじめに：スクーバダイビングってなに？ | 6-S |
| `basics-ch1` | 第1章 水の中はこんな世界 | 6-1 |
| `basics-ch2` | 第2章 基本スキル | 6-2 |
| `basics-ch3` | 第3章 体の中で起きること | 6-3 |
| `basics-ch4` | 第4章 器材の役割と選び方 | 6-4 |
| `basics-ch5` | 第5章 海を知る | 6-5 |
| `basics-ch6` | 第6章 これからのダイビング | 6-6 |
| `basics-appendix` | 付録：計画・応急手当・心得 | 6-A（「BSACについて」は短い紹介と公式サイトへのリンクのみ） |
| `basics-rules` | 絶対に守るルール | 7-1 |

- `category`：すべて `ダイビング入門`。`sort_order`：10, 11, … の順（機材の劣化サインは 1 のまま先頭）
- `summary`：各章の内容を 1〜2 文で
- `icon`：第4章は `regulator`、ほかは空（テキストのみのカード）
- `status`：`published`

### 1-4. 各ページ（元の `####`）のブロックへの置き換え

章の中の 1 ページ分を、次の並びにする：

1. `heading`：ページ名（例「圧力」。元見出しの `（/ch1/pressure）` は消す）
2. `callout`（tone `info`、title「3行まとめ」）：3 行まとめを `- ` の箇条書きで
3. `text`：「本文の要点」。箇条書きはそのまま `- `。**太字** はそのまま `**…**` で残す（§1-5 で表示対応）
4. 元に `<Rule …>` があれば `callout`（tone `danger`、title「絶対に守るルール」）
5. 元に注意（`<Callout type="caution">` 相当や「注意」）があれば `callout`（tone `caution`）
6. 元に `<Steps>` や番号付きの手順があれば `steps`
7. 元に表があれば `table`
8. 「クイズ例」は `qa`（title は付けられないので直前に `heading`「確認クイズ」は置かない。q に選択肢を「（A／B／C）」で含め、a に正解と一言の理由）
- 「図解」「インタラクティブ」「関連」の行は **入れない**（図は未制作のため）。ただし図の説明に書かれた数値の要点が本文に無い場合は、本文の箇条書きに 1 行で足してよい
- ページとページの間の区切りは `heading` があるので不要
- 章の最初に `text` で章の導入（元の章見出し直下の説明があれば）

### 1-5. 表示の追加対応

- `text` / `callout` / `steps` / `qa` の本文で **`**太字**`** を太字表示（それ以外のマークダウンは解釈しない。HTML は必ずエスケープ）
- 資料一覧（`/docs`）を **カテゴリごとのグループ** にする（見出し＝カテゴリ名、`sort_order` 順）。上部にカテゴリの絞り込みチップ（すべて／機材／ダイビング入門…）
- 長い資料のために：
  - 目次チップ（`heading` から自動生成、既存）を **横スクロール** のまま、スクロールしてもヘッダーの下に **固定（sticky）**
  - 画面右下に「▲ 上へ」ボタン（600px 以上スクロールしたら表示、フェード）
- トップの「資料」セクションは、カテゴリごとに 1 件目を出すのではなく **最新更新の 4 件**

## 2. 折りたたみの不具合

- 症状：資料（機材）の各機材セクションを閉じても、中身の一部が見えたまま
- 原因想定：`grid-template-rows: 0fr` のアニメーションで、内側の要素に `min-height: 0` と `overflow: hidden` が無い（または padding / gap が内側に残る）
- 対応：
  - 開閉部分の構造を「外側 `display:grid; grid-template-rows: 0fr → 1fr`」＋「内側 1 つの `div`（`min-height: 0; overflow: hidden`）」にし、padding は内側のさらに内側の要素に付ける
  - 閉じているときは内側に `visibility: hidden`（アニメーション終了後）と `inert` 属性を付け、フォーカスや読み上げが中に入らないようにする
  - `prefers-reduced-motion` では即時開閉
  - Q&A（details）も同じ問題が無いか確認
- テスト：開閉状態で中身の高さが 0 になることを確認できる純粋関数があればテスト。無ければ手動確認でよい（Claude が確認する）

## 3. ヘッダーの固定

- `.site-header` を `position: sticky; top: 0; z-index: 30;`。上に `padding-top: env(safe-area-inset-top)` を加える
- 背景は `--ground` を 92% 不透明＋`backdrop-filter: blur(8px)`（未対応ブラウザは不透明）。下に 1px の `--line`
- スクロールしてヘッダーの下に内容が入り始めたら、薄い影を付ける（`IntersectionObserver` か scroll で `data-scrolled` を付与）
- ページ内アンカー（`#equipment-1` など）へ移動したとき見出しがヘッダーに隠れないよう、`scroll-margin-top`（ヘッダー高さ＋目次チップの高さ＋ 8px）を見出し・機材セクションに付ける
- 目次チップの sticky（§1-5）はヘッダーの直下に来るよう `top` をヘッダー高さに合わせる（CSS 変数 `--header-h`）
- ドロワーを開いたときも崩れないこと

## 4. 品質

- Vitest：太字の解釈（エスケープ込み）、カテゴリのグループ化と並び、manual seed 生成（JSON → SQL の upsert 文）
- `npm run lint`（警告 0）、`npx tsc -b`
- `node scripts/generate-manual-seed.mjs` を実行して `private/manual/manual-seed.sql` を生成しておく
- 生成した資料 JSON の文章が §6 の内容から大きく外れていないこと（要約の追加・創作はしない）
- DESIGN.md を v1.3 に更新
