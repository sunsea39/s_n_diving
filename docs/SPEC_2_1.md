# N×S_Diving 改修仕様 v2.1 — アイコンとフッター画像

| # | 変更 |
|---|---|
| 1 | アイコンを **案D「水面のコンパス」** の清書版に差し替え |
| 2 | フッターに **案D「サンゴ礁と魚」** の画像を入れる |

## 1. アイコン（Claude が作成済み。ファイルは `public/icons/` に配置済み）

| ファイル | 用途 |
|---|---|
| `logo.svg` | ヘッダーのロゴ（簡略版：文字と泡なし） |
| `favicon.svg` | ブラウザのタブ（簡略版） |
| `icon.svg` | 清書版（N・S の文字と泡あり） |
| `icon-192.png` / `icon-512.png` | manifest（purpose `any`、背景透過） |
| `maskable-512.png` | manifest（purpose `maskable`、白地に 70% の大きさ） |
| `apple-touch-icon.png` | iPhone のホーム画面（180px、白地） |

- `index.html`：`<link rel="icon" type="image/svg+xml" href="…/icons/favicon.svg">`、`<link rel="apple-touch-icon" href="…/icons/apple-touch-icon.png">`（base パス `/s_n_diving/` に注意。Vite の `%BASE_URL%` か相対パスで）
- `public/manifest.webmanifest`：icons に 192・512（any）と maskable-512（maskable）を登録。仮アイコンの記述やコメントを削除
- ヘッダーのロゴは `logo.svg` のまま（ファイルが差し替わるだけ）。ダーク表示でも輪郭が見えるよう、ダーク時はロゴに `filter: drop-shadow(0 0 0.5px rgba(255,255,255,.6))` を付ける
- 印刷カードのロゴも同じファイルを使っていることを確認

## 2. フッター画像

- 原画：`docs/assets/footer-reef.svg`（Claude 作成）。**React コンポーネント `src/components/FooterScene.tsx`** にする。図形・座標は変えない。class 名（`ft-*`）をそのまま使い、色は CSS 変数で与える（テーマ切り替えに追従）。グラデーション ID は `useId()` で一意に
- 色（ライトは原画の `<style>` のまま。**ダークはライトとはっきり差が出る深い夜の海**）：

| class / 変数 | ライト | ダーク |
|---|---|---|
| `ft-sea-top` | `#4DBBAE` | `#123C47` |
| `ft-sea-bottom` | `#1B998B` | `#0A2733` |
| `ft-ray`（opacity） | `#FFFFFF` .14 | `#FFFFFF` .05 |
| `ft-fish` | `#EEF5F6` | `#7F97A0` |
| `ft-fish-accent` | `#F3C969` | `#B89A4E` |
| `ft-bubble`（stroke, opacity） | `#FFFFFF` .8 | `#9FB6BF` .5 |
| `ft-sand` ＝ `--ft-sand` | `#E9DFC6` | `#2A2923` |
| `ft-sand-shade` | `#D9CCAA` | `#22211C` |
| `ft-coral` | `#D98E04` | `#9A6A14` |
| `ft-coral-round` | `#D64527` | `#9B3D29` |
| `ft-weed` | `#0E7A6E` | `#0B5A55` |
| `ft-rock`（opacity） | `#0B3C5D` .55 | `#051620` .7 |
| フッター文字 `--ft-text` | `#0B3C5D` | `#E6EEF1` |
| フッター補足文字 `--ft-text-sub` | `#4F5B62` | `#A9B8BE` |

- 構成：`<footer class="site-footer">` の中を「画像の帯」＋「文字の帯」の 2 段にする
  - 画像の帯：高さ スマホ 110px ／ 600px 以上 140px ／ 1024px 以上 170px、横幅は画面いっぱい（本文の余白の外まで）、`preserveAspectRatio="xMidYMax slice"` のまま
  - 文字の帯：背景 `--ft-sand`（画像の砂地とつながって見える）。中央寄せで「N×S_Diving ・ ダイビング情報の共有サイト」（太字、`--ft-text`）と「仲間内専用ページです」（小さく、`--ft-text-sub`）。上下 14px の余白。スマホは下部タブの高さ分（＋ safe-area）の余白を下に足す
  - 画像と文字の帯のあいだに隙間を作らない（`display:block`、行の高さの隙間に注意）
- `role="img"` と `aria-label`（原画の文言）を維持。装飾なので読み上げ順はフッター文字の前
- アニメーション（`motion.css` の変数でまとめる。reduced-motion で停止。画面外では `IntersectionObserver` で一時停止）：
  - 魚の群れ A：左右に ±14px の往復 18s、群れ B：±10px の往復 22s（逆位相）
  - 海藻：根元（`transform-origin` を各パスの根元の座標に）を軸に ±4° の揺れ 7s、グループ B は遅延 1.5s
  - 泡：下から上へ 40px 上昇してフェードアウト、9〜12s、泡ごとに遅延
  - 光：opacity が .6〜1 倍でゆっくり揺れる 11s
- 印刷ページ（`/…/print`）ではフッターを出さない（既存どおり）

## 3. 品質

- `npm run lint`（警告 0）、`npx tsc -b`
- DESIGN.md・README を更新（アイコン・フッターの差し替え方法を 1 段落）
