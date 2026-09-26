# N×S_Diving 改修仕様 v2.3

**セキュリティの前提**（v2.2 と同じ）：権限判定は NULL を返さない（`coalesce(…, false)`）、PL/pgSQL は `if auth.uid() is null or not coalesce(public.is_owner(), false) then raise …`、新しい関数は `revoke execute … from public, anon`、`storage.objects.owner_id` は text。

新しい migration：`supabase/migrations/20260929000000_v2_3.sql`（追加で実行、再実行しても安全）。

## 1. 管理画面：メンバー欄がスマホで横にはみ出す

- 症状：スマホで管理画面の「メンバー」を開くと、いちばん幅の広い要素にページ全体の幅が合わされ、はみ出す（v2.2 で表を横スクロールの入れ物に入れたが効いていない）
- 原因の見当：grid / flex の子要素の `min-width: auto` のせいで、入れ物がはみ出した表の幅まで広がっている
- 対応：
  - `.admin-layout` とその子、管理画面のメイン領域、表の入れ物の祖先すべてに `min-width: 0`（grid なら `grid-template-columns: minmax(0, 1fr)`）
  - 表の入れ物は `max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch`、表は `width: max-content; min-width: 100%`
  - 表以外（見出し、絞り込みチップ、承認待ちカード、ボタン行）は画面幅に収まり、折り返す。長いメールアドレスは `overflow-wrap: anywhere`
  - 管理画面の他の表（資料・事故事例・投稿管理・ページの文言）も同じく確認
- 確認方法：幅 375px で `document.documentElement.scrollWidth === innerWidth` になること（ページ全体が横にスクロールしない）。これを Playwright 等が無くても確かめられるよう、純粋な CSS の修正にとどめる

## 2. マイページ：ダイバーのイラストを増やす

- 原画は Claude が更新済み：`docs/assets/diver-avatar-preview.html`
  - 新しい部品 **バンダナ**（`bandana()`、7 色：赤・紺・ティール・黄・ピンク・黒・白。水玉つき、右側に結び目）
  - **小物** は `accessory = 'none' | 'mask' | 'bandana'`（マスクとバンダナはどちらか一方）。バンダナのときは `bandanaColor`
  - ウェットスーツが **ティール** のとき、首の V ラインは **ネイビー**（`#0B3C5D`）。それ以外は今までどおりティール
  - プリセットに 4 種（バンダナ）を追加して 16 種
- `src/components/DiverAvatar.tsx` を原画に合わせて更新（パス・座標・色・描画順は原画のまま）
- 旧データの `mask: true` は `accessory: 'mask'` として扱う（読み込み時に変換。保存時は新形式）
- 編集画面の「自分で組み合わせる」に **小物**（なし／マスク／バンダナ）を追加。バンダナを選ぶと **バンダナの色**（7 色の見本ボタン）が出る
- サーバー側の検証関数 `valid_avatar_style` を更新（`accessory` と `bandanaColor` の許可リスト。旧 `mask` も受け付ける）

## 3. 全体：ヘッダーのアイコンとハンバーガーを大きく

- ハンバーガーのボタン 48×48px、線のアイコン 28px（線幅 2.5）
- アカウントアイコン：見た目 38px の丸（タップ領域 48×48px）
- 2 つの間隔 4px。ヘッダーの高さが増える場合は `--header-h` も更新し、sticky の目次やアンカー位置のずれが無いこと

## 4. ホーム：NEXT DIVE はログインした仲間だけ

- **表示**：承認済みの仲間（member / editor / owner）にだけ NEXT DIVE の内容を表示
  - 未ログイン：NEXT DIVE のカードの位置に「次のダイビング予定は、ログインした仲間だけが見られます」と「ログイン」ボタン（カードの見た目は同じ、控えめに）
  - 承認待ち・利用停止：「承認されると次のダイビング予定が見られます」
- **データ側も制限**（画面で隠すだけでは API から読めてしまうため）：`news` の閲覧ポリシーを変更
  - `category = 'other'`（その他）：今までどおり誰でも閲覧（公開日時が来ていれば）
  - `category = 'dive'`（ダイビングの予定）：`is_member()` の人だけ閲覧（editor / owner は下書きも）
- お知らせ一覧・詳細も同じ規則（未ログインではダイビングの予定は出ない）。トップの「お知らせ」欄も同様

## 5. 事故事例：CSV で取り込む

- テンプレート（Claude 作成済み）：`public/templates/accidents-template.csv`（UTF-8 BOM 付き、Excel で開ける）。1 行目が見出し、2〜3 行目は **記入例（架空）**
- 列（見出しは日本語。列の順番が違っても見出し名で対応づける）：

| 見出し | 対応する項目 | 書き方 |
|---|---|---|
| slug | slug | 半角英数とハイフン。**同じ slug があれば上書き（更新）**、無ければ新規 |
| タイトル | title | 必須 |
| 発生日 | occurred_on | `2025-07-12` または `2025/7/12`。空欄可 |
| 発生時期（表示用） | occurred_label | 例「2025年7月」。空欄可 |
| 場所 | location | |
| スタイル | dive_style | ボート／ビーチ／ドリフト／ナイト／その他 |
| 結果 | outcome | 死亡／重症／軽症／ヒヤリ（→ fatal / serious / minor / near_miss）。必須 |
| タグ | tags | 「、」「,」「／」区切り。候補にないタグはエラー |
| 概要 | summary | |
| 経過 | timeline | セル内改行で 1 行 1 項目。行頭が `HH:MM` ならその後ろの空白までを時刻として分ける |
| 考えられる原因 | causes | セル内改行で 1 行 1 項目 |
| 防ぐためのポイント | lessons | セル内改行で 1 行 1 項目 |
| 関連資料 | related_doc_slugs | セル内改行または「、」区切りの資料 slug。存在しない slug は警告（取り込みは可） |
| 出典 | sources | セル内改行で 1 行 1 件、`ラベル | URL`（URL は https のみ） |
| 公開状態 | status | 公開／下書き。空欄は **下書き** |

- 文字コード：UTF-8（BOM あり・なし）と **Shift_JIS**（Excel で「CSV」保存したとき）の両方を読めるようにする（`TextDecoder('utf-8', { fatal: true })` で失敗したら `shift_jis`）
- CSV の解析は RFC 4180（ダブルクォート内の改行・カンマ・`""`）に対応する自前の小さな関数（外部ライブラリを追加しない）
- 画面（owner のみ）：管理画面「事故事例」に **「CSV で取り込む」**
  1. 「テンプレートをダウンロード」リンク（`templates/accidents-template.csv`）と、列の書き方の説明（上の表を短く）
  2. ファイルを選ぶ（またはドラッグ＆ドロップ）→ 読み込んで **プレビュー表**（行ごとに 新規／更新／エラー、エラー・警告の内容）
  3. エラーの行がある間は取り込みボタンを押せない（エラー行だけ除外して取り込む選択肢も用意）
  4. 「取り込む」→ 1 件ずつ upsert（`on conflict (slug)`）。結果（新規 N 件・更新 N 件・失敗 N 件）を表示
  - 上限 200 行／1 MB。個人名などを入れないよう、画面に注意書き（既存の事故事例フォームと同じ文言）
- 書き込みは既存の RLS（accidents は owner のみ）で守られる。追加の RPC は不要
- Vitest：CSV 解析（クォート・改行・BOM）、列の対応づけ、日付・結果・タグ・経過・出典の変換、エラー判定

## 6. 品質

- `npm run lint`（警告 0）、`npx tsc -b`
- DESIGN.md・README 更新（v2.3 の migration 手順、CSV 取り込みの使い方）
