# N×S_Diving 改修仕様 v1.2

`docs/DESIGN.md`（v1.1）からの変更点。実装後、DESIGN.md も更新すること。

| # | 変更 |
|---|---|
| 1 | 下部タブ（ホーム／資料／事故事例／掲示板）に **アイコン** を付ける |
| 2 | **ライト／ダーク** を利用者ごとに切り替えられるようにする |
| 3 | トップのコンセプト部分に **イラスト**（`docs/assets/hero-scene.svg`）を入れる |
| 4 | サイト全体に **アニメーション** |

## 1. タブのアイコン

- `src/components/icons.tsx` にインライン SVG のアイコン部品を作る（外部ライブラリは使わない）。24×24 の viewBox、`stroke="currentColor"`、線幅 2、角丸（`stroke-linecap/linejoin="round"`）、`fill="none"`、`aria-hidden="true"`
  - `HomeIcon`：家
  - `DocsIcon`：開いた本
  - `AccidentIcon`：三角の注意マーク（！）
  - `BoardIcon`：吹き出し 2 つ
  - ほかに `MenuIcon`（3 本線）、`CloseIcon`（×）、`SunIcon`、`MoonIcon`、`InfoIcon`（i）、`KeyIcon`（鍵）、`LockIcon`（管理者）
- 下部タブ：アイコン（22px）を上、ラベル（11px）を下に縦並び。タブ 1 つの高さ 56px ＋ `env(safe-area-inset-bottom)`
- 選択中のタブ：色 `--teal`、アイコンの背景にピル（幅 52px・高さ 28px・角丸・`--teal` の 14% 透過）が出る
- ハンバーガーメニュー（ドロワー）の各項目にも同じアイコンを左に付ける（揃えのため 20px）
- ヘッダーのハンバーガーボタン、閉じるボタンも `MenuIcon` / `CloseIcon` に置き換え

## 2. ライト／ダーク切り替え

### 2-1. 仕組み

- 設定は 3 つ：**ライト**（初期値）／**ダーク**／**端末に合わせる**
  - 初期値はライト（v1.1 で「明るい配色」を要望されたため）
- 保存先：`localStorage` のキー `ns-theme`（`light` | `dark` | `system`）。読み書きは try/catch
- `<html data-theme="light|dark">` を付け替える。`system` のときは `matchMedia('(prefers-color-scheme: dark)')` を監視して反映
- **ちらつき防止**：`index.html` の `<head>` に、React より前に実行する小さなインラインスクリプトを置き、保存値から `data-theme` を先に付ける
- `<meta name="theme-color">` も切り替える（ライト `#FFFFFF`、ダーク `#0E1A22`）
- `color-scheme` を data-theme に合わせる

### 2-2. 切り替えの場所

- ハンバーガーメニューの下部に「表示」セグメント（ライト／ダーク／端末に合わせる、3 択のボタン）
- 1024px 以上のヘッダー右端に、太陽／月のアイコンボタン（押すたびにライト⇔ダーク。`aria-label`「ダークモードにする」「ライトモードにする」）
- `/more`（このサイトについて）にも同じ 3 択

### 2-3. ダークの配色（「青すぎる」印象を避ける：ネイビーではなく墨色寄りの濃紺グレーを地に）

```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --ground: #0E1A22;      /* 地：青みを抑えた墨色 */
  --panel:  #16252F;      /* パネル */
  --panel-2:#1E313D;
  --line:   #2A3F4C;
  --field-border: #4A6473;
  --navy:   #E6EEF1;      /* 見出しの文字色（反転） */
  --ink:    #B9C6CC;      /* 本文 */
  --muted:  #8697A0;
  --teal:   #3CC2B2;
  --red:    #F07A5F;
  --amber:  #F0B23A;
  --button-bg: #3CC2B2;   /* 主ボタンはティールに（紺の面を増やさない） */
  --button-fg: #0E1A22;
  --hero-card-bg: #16252F;/* NEXT DIVE カード */
}
```

- ライト側にも `--button-bg: #0B3C5D; --button-fg: #FFFFFF; --hero-card-bg: #0B3C5D;` を追加し、主ボタン・NEXT DIVE カードはこれらのトークンを使う
- 直書きの色（`#fff` など）は全部トークンに置き換える。入力欄の背景は `--field-bg`（ライト `#FFFFFF`／ダーク `#0B151C`）
- 機材イラスト（PNG）は明るい円背景つきなので、ダークでもそのまま（円が浮くのは許容）
- 画像以外に、ダークで読めない箇所がないか全画面を確認すること（危険度の赤・黄、バッジ、注意ボックス、管理画面の表、フォーム、ドロワー、幕）

## 3. トップのイラスト

- 原画：`docs/assets/hero-scene.svg`（Claude 作成）。これを **React コンポーネント `src/components/HeroScene.tsx` にする**。図形・座標は変えない。class 名（`hs-*`）をそのまま使い、色はファイル内の `<style>` ではなく **CSS 変数** で与える（テーマ切り替えに追従させるため）
  - ライト：原画の `<style>` の色そのまま
  - ダーク：空 `#16252F`、太陽 `#D9B45A`（少し暗く）、海 上 `#137A70` → 中 `#0F5560` → 深 `#08293C`、奥の波 `#2E8C82`、光 opacity .06、魚 `#9FB6BF`、魚（黄）`#D9B45A`、岩 `#061C2A`、ブイ `#E6EEF1`、旗・サンゴは原画のまま
  - グラデーション ID は重複しないよう `useId()` で一意にする
- 配置：ヒーロー（kicker・見出し・リード・ボタン）の **下** に、横幅いっぱいの帯として置く
  - 高さ：スマホ 150px、600px 以上 200px、1024px 以上 240px。`preserveAspectRatio="xMidYMid slice"` のまま
  - 角丸 16px、`overflow: hidden`。本文の横余白の中に収める（画面端まで広げない）
  - 帯の下に NEXT DIVE カードを **少し重ねる**（`margin-top: -28px`、左右 16px 内側、`position: relative`）と、イラストとつながって見える
- `role="img"` と `aria-label`（原画の文言）を維持
- 将来写真に差し替えられるよう、コンポーネントは `src` を受け取ったら `<img>`（`object-fit: cover`）を描くようにしておく（今は使わない）

## 4. アニメーション

方針：**控えめで、海の動きを感じさせる**。すべて `prefers-reduced-motion: reduce` のときは無効（遷移は即時、ループは停止）。`transform` と `opacity` だけを動かす。

| 対象 | 動き |
|---|---|
| ページ遷移 | ルートが変わるたびに `main` の中身が 12px 下から上へフェードイン（220ms、ease-out）。`key={location.pathname}` で再生 |
| 一覧のカード（資料・事故事例・掲示板・お知らせ・トップの各セクション） | 表示時に 1 枚ずつ 40ms ずつ遅らせてフェードイン＋ 8px 上昇（最大 8 枚まで遅延、以降は同時）。**初期状態は見えている**こと：アニメーションは `@keyframes` の `from` でだけ透明にし、JS で隠さない |
| カードのホバー（マウスのみ `@media (hover:hover)`） | 2px 浮き上がり＋影が少し濃く（150ms） |
| ボタン・タブ・チップの押下 | `:active` で `scale(.97)`（80ms） |
| 下部タブの選択ピル | 選択が変わると、ピルが横幅 0→52px に広がる（180ms） |
| ハンバーガー | 既存のスライド（220ms）に加え、アイコンが 3 本線→× に変形（180ms） |
| 資料の機材セクション（折りたたみ） | 開閉で高さをアニメーション（`grid-template-rows: 0fr → 1fr` の手法、200ms）。＋／− は 90° 回転 |
| Q&A ブロック | `details` の開閉で中身をフェードイン |
| トップのイラスト | 奥の波・手前の波がゆっくり横に流れる（12s / 18s ループ、`translateX` で 1 周期分＝波の幅 200px / 240px を移動して継ぎ目なし）。泡が下から上へ上昇して消える（4〜7s、泡ごとに遅延をずらす）。魚の群れが左右にゆっくり漂う（10s、±12px の往復）。光の帯の opacity がゆっくり揺れる（6s）。ブイが上下に 3px 揺れる（4s） |
| テーマ切り替え | `background-color` と `color` を 200ms で遷移（ただしページ読み込み直後は遷移させない：初回描画後にクラスを付けて有効化） |
| トースト的な完了メッセージ（「保存しました」等） | フェードイン |

- アニメーション用 CSS は `src/styles/motion.css` に分ける（`styles.css` から import）
- 画面外のループ（イラスト）は、`IntersectionObserver` で見えていない間は `animation-play-state: paused`

## 5. テスト・品質

- Vitest：テーマ設定の読み書き（不正値・localStorage 例外時にライトへフォールバック）、`system` 時の解決ロジック
- `npm run lint`（警告 0）、`npx tsc -b`
- 既存の挙動・セキュリティ要件は変えない
- README に「表示の切り替え」を 1 行追記
