# N×S_Diving 改修仕様 v2.2

オーナーからの修正依頼（2026-09-27）をまとめたもの。記号：S＝サイト全体、A＝管理画面、D＝資料、X＝事故事例、M＝マイページ。

**セキュリティの前提（v2.0.1 の教訓）**：権限判定の関数・RPC は NULL を返さないこと（`coalesce(…, false)`）。PL/pgSQL の権限チェックは `if auth.uid() is null or not coalesce(public.is_owner(), false) then raise …`。新しく作る関数は `revoke execute … from public, anon` し、必要なロールにだけ `grant`。`storage.objects.owner_id` は text。

新しい migration：`supabase/migrations/20260928000000_v2_2.sql`（既存 DB に追加で実行、再実行しても安全）。

---

## S. サイト全体

### S-1. 各ページ冒頭の文言を管理画面で編集

- テーブル `page_texts(key text pk, kicker text, title text, lead text, updated_at, updated_by)`
  - key：`home`（トップのヒーロー）、`docs`（資料一覧）、`accidents`（事故事例一覧）、`board`（掲示板）、`news`（お知らせ一覧があれば）、`more`（このサイトについて）
  - 文字数：kicker ≤ 40、title ≤ 60、lead ≤ 300（lead は改行可）
  - RLS：select は anon・authenticated 全員、insert/update は `is_owner()`
  - 初期値を migration で insert（`on conflict do nothing`）。**いま画面に出ている文言をそのまま**初期値にする
- 画面：各ページはこのテーブルの値を表示。取得前・未設定時はコード内の既定値（同じ文言）を表示し、ちらつかないようにする
- 管理画面に「ページの文言」（owner のみ）：ページごとのカードに kicker／title／lead の入力欄、プレビュー、保存

### S-2. アカウントアイコンの位置

- スマホ・タブレット（ハンバーガー表示時）：ヘッダー右端に **［アカウントアイコン］［ハンバーガー］** の順で、間隔 6px。アイコンはハンバーガーと同じ 44×44px のタップ領域（見た目は 30px の丸）
- PC（ハンバーガー非表示）：ヘッダー右端（テーマ切替ボタンの右）
- 未ログイン時はアイコンの位置に何も出さない（ログインはドロワーから）

### S-3. フッター

- 「仲間内専用ページです」を削除（「N×S_Diving ・ ダイビング情報の共有サイト」だけ）

### S-4. チップ（絞り込みボタン）の選択状態を読みやすく（D-1・X-1 と共通）

- 症状：選択中のチップが塗りつぶしになり、文字が背景と同じ色で読めない
- すべてのチップ（資料のカテゴリ、機材の「すべて／即中止のみ」、事故事例の結果・タグ、掲示板のカテゴリ、管理画面の絞り込み）で共通のクラス `.chip` / `.chip[aria-pressed="true"]` にそろえる
  - 未選択：背景 `--ground`、枠 `--line`、文字 `--navy`
  - 選択中：背景 `--chip-on-bg`、文字 `--chip-on-fg`、枠なし。ライト `#0B3C5D` / `#FFFFFF`、ダーク `#3CC2B2` / `#0E1A22`
  - 「即中止のみ」の ● は、選択中は白（ライト）／地の色（ダーク）にして背景に埋もれないようにする
- 選択状態は `aria-pressed` で表す。コントラスト比 4.5 以上を満たすこと

---

## A. 管理画面

### A-1. お知らせのカテゴリ

- `news` に列を追加：`category text not null default 'other' check in ('dive','other')`、`staff text not null default ''`（担当）、`dive_start date null`、`dive_end date null`（`dive_end >= dive_start`）、`place text not null default ''`
  - 既存行：`next_dive_at` があれば `category='dive'`、`dive_start = (next_dive_at at time zone 'Asia/Tokyo')::date`、`place = coalesce(next_dive_place,'')`
  - 旧列 `next_dive_at` / `next_dive_place` は残すが使わない
- 編集画面：最初に **カテゴリ（ダイビングの予定／その他）** を選ぶ。選択に応じて入力欄が切り替わる
  - **ダイビングの予定**：タイトル、担当、本文、予定日（任意・**開始日〜終了日**。終了日は空欄なら 1 日。カレンダー入力 2 つ、終了日は開始日以降のみ選べる）、場所（任意）、公開日
  - **その他**：タイトル、本文。公開日は保存時の日時（入力欄は出さない）
- トップの NEXT DIVE：`category='dive'` かつ `coalesce(dive_end, dive_start) >= 今日（JST）` のうち `dive_start` が最も近い 1 件。表示例「10/11(日)〜10/12(月) ・ 白浜」「担当：〇〇」。1 日だけなら「10/11(日)」
- お知らせ一覧・詳細にもカテゴリのラベル（ダイビング／その他）と、ダイビングなら日程・場所・担当

### A-2. 資料の並び替え

- 管理画面の資料一覧に「並び替え」モード：
  - 各行に **ドラッグ用のつまみ**（ポインター操作、スマホの長押しドラッグにも対応）と **↑↓ ボタン**（キーボード・細かい調整用）
  - カテゴリごとのまとまりの中で並び替える（見出しでカテゴリを区切る）
  - 「並び順を保存」で確定、「元に戻す」で取り消し。保存前に離れようとしたら警告
- 保存は owner 専用 RPC `reorder_docs(p_ids uuid[])`：配列の順に `sort_order = 10, 20, 30…` を振り直す（1 トランザクション）

### A-3. メンバー管理画面のはみ出し

- 表を `overflow-x: auto` の専用の入れ物に入れ、**表の部分だけ左右にスクロール**できるようにする（ページ全体は横にはみ出さない）
- スクロールできることが分かるよう、右端に薄いグラデーションの影（スクロールしきったら消える）
- スマホでも表のまま（カード化はしない）。1 列目（アイコン＋表示名）は `position: sticky; left: 0` で固定
- 同じ入れ物を資料一覧・事故事例一覧・投稿管理など、管理画面の他の表にも使う

### A-4. 事故事例のタグ

- タグの候補に **「不明」** を追加（最後に）

---

## D. 資料

### D-1. 機材の絞り込みボタン

- S-4 のとおり

### D-2. 資料を開いたとき一番上から表示

- 症状：資料を開くと途中から表示される
- 対応：
  - ルート（パス）が変わったら `window.scrollTo(0, 0)`（URL に `#` があるときだけ、その見出しへスクロール）
  - `history.scrollRestoration = 'manual'`
  - 折りたたみや目次チップの初期化でフォーカスを移さない（`focus()` を使うなら `{ preventScroll: true }`）
  - 戻るボタンで一覧に戻ったときは、一覧のスクロール位置を復元してよい（sessionStorage に保存）

### D-3. ブックマーク

- テーブル `bookmarks(id uuid pk, user_id uuid → auth.users on delete cascade, doc_slug text not null, anchor text not null default '', label text not null (≤ 80), created_at, unique(user_id, doc_slug, anchor))`
  - RLS：本人の行だけ select/insert/delete（pending・member・editor・owner。suspended は不可 → `current_role_name() in (…)` で判定）
- 付けられる単位：**資料全体**（anchor 空）と **見出しごとの区切り**（`heading` ブロック）、**機材セクション**（`signs` の各機材）
  - 見出しの anchor は見出し文字列から作る安定した ID（例：`sec-` ＋ 文字列の短いハッシュ）。目次チップ・ページ内リンクも同じ ID を使う
- 画面：
  - 資料タイトルの右にブックマークボタン（しおりのアイコン。付いていれば塗り）
  - 各見出し・各機材セクションの右端に小さなブックマークボタン
  - ログインしていないときは押すと「ログインするとブックマークできます」とログインへ案内
  - 付けた／外したら短いトースト表示
- マイページに「ブックマーク」タブ：資料ごとにまとめて一覧（資料名 → その中のブックマーク）。タップで `/docs/:slug#anchor` へ移動し、その位置までスクロール（ヘッダー・目次の高さを考慮）。削除ボタン

---

## X. 事故事例

### X-1. 絞り込みボタン

- S-4 のとおり

---

## M. マイページ

### M-1. プロフィールの表示と編集を分ける

- 「プロフィール」タブは **表示が基本**：アイコン（大きめ 96px）、名前、自己紹介、**経験本数**（M-3 の合計）、**最後にダイビングした日**（ダイビング記録の最新日。無ければ「まだ記録がありません」）
- 下部の「プロフィールを編集」ボタン → 編集画面（同じタブ内で切り替え、またはモーダル）：アイコン（M-2）、名前、自己紹介。保存／キャンセル
- 仲間のプロフィール（`/members/:id`）も同じ表示部品を使う（経験本数・最後にダイビングした日・ライセンス・好きな海）

### M-2. アイコン：画像アップロード または ダイバーのイラスト

- 選択肢は 2 つ：**写真・画像をアップロード**（既存）／**ダイバーのイラストを選ぶ**
- イラストの部品と色は Claude が作成済み：`docs/assets/diver-avatar-preview.html` の `PALETTE`・`HAIR`・`FACE`・`diver()` を **そのまま** React コンポーネント `src/components/DiverAvatar.tsx` に移す（パス・座標・色・描画順・円のクリップを変えない。clipPath の ID は `useId()`）
- 選び方（編集画面）：
  - 上段に **プリセット 12 種**（見本ファイルの `PRESETS`）を並べ、タップで選択
  - その下に「自分で組み合わせる」：髪形（6）、髪の色（6）、肌の色（5）、表情（4）、ウェットスーツの色（4）、背景（6）、マスクあり／なし。各項目は小さな見本付きのボタン群。上に大きなプレビュー
- 保存：`profiles.avatar_style jsonb`（例 `{"skin":"fair","hair":"short","hairColor":"black","face":"smile","suit":"navy","bg":"mist","mask":false}`）。値はサーバー側でも許可リストで検証（check 制約か RPC）。イラストを選んだら `avatar_path` を null に、画像をアップロードしたら `avatar_style` を null に
- 表示の優先順：`avatar_path`（画像）→ `avatar_style`（イラスト）→ 頭文字の丸
- 掲示板・ヘッダー・メンバー一覧など、アイコンを出す場所はすべて同じ `Avatar` 部品で

### M-3. ダイビング経験とダイビング記録

- `profiles` の列を変更・追加：
  - `licenses jsonb not null default '[]'`：`[{ "org": "BSAC", "rank": "スポーツダイバー" }]`（最大 5 件）
  - `dive_count`（既存）は **初期本数**（記録を付ける前までの経験本数）として使う。画面の名前は「初期の経験本数」
  - `logged_dives integer not null default 0`、`last_dived_on date null`：dive_logs から自動集計（トリガー。クライアントからは更新不可）
  - `favorite_areas`（既存）の画面の名前を **「好きな海」** に
  - 旧 `license` 列は残すが使わない（値があれば licenses に「その他」として移す）
- ライセンスの選択肢（団体 → ランク）：
  - **BSAC**：オーシャンダイバー／スポーツダイバー／ダイブリーダー／アドバンスドダイバー／ファーストクラスダイバー／インストラクター
  - **PADI**：オープン・ウォーター・ダイバー／アドバンスド・オープン・ウォーター・ダイバー／レスキュー・ダイバー／マスター・スクーバ・ダイバー／ダイブマスター／インストラクター
  - **NAUI**：スクーバダイバー／アドバンスドスクーバダイバー／レスキュースクーバダイバー／マスタースクーバダイバー／ダイブマスター／インストラクター
  - **SSI**：オープンウォーターダイバー／アドバンスドアドベンチャラー／ストレス＆レスキュー／アドバンスドオープンウォーターダイバー／マスターダイバー／ダイブガイド／ダイブマスター／インストラクター
  - 団体を選ぶとランクの選択肢が切り替わる。「＋ライセンスを追加」で複数登録可
- 新テーブル `dive_logs(id uuid pk, user_id uuid → auth.users on delete cascade, dived_on date not null, prefecture text not null, location text not null default '' (≤ 40), service text not null default '' (≤ 60), dives integer not null default 1 check between 1 and 10, comment text not null default '' (≤ 300), created_at, updated_at)`
  - `prefecture`：47 都道府県＋「海外」（check 制約の許可リスト。海外のときは location に国・地域名を書く想定で、入力欄のラベルを「国・地域／ポイント」に変える）
  - RLS：本人の行だけ select/insert/update/delete（suspended は不可）。他の人には見せない（合計本数と最後の日だけ profiles 経由で見える）
  - insert/update/delete のトリガーで `profiles.logged_dives = sum(dives)`、`last_dived_on = max(dived_on)` を再計算（security definer）
- 画面（「ダイビング経験」タブ）：
  - 上部に **表示**：ライセンス（団体・ランク）、経験本数の合計（＝初期本数＋記録の本数。内訳を小さく）、好きな海、最後にダイビングした日。右上の「編集」→ ライセンス・初期の経験本数・好きな海の編集画面
  - その下に **ダイビング記録**：「＋記録を追加」フォーム（潜った日（既定は今日）、場所＝都道府県のセレクト（地方ごとにグループ化、先頭に「海外」）、ロケーション（例：白浜）、使ったサービス（ショップ名など）、潜った本数（1〜10、既定 1）、コメント（任意））。一覧は新しい順、年ごとの見出し、各行に編集・削除
  - 表示例：「2026/09/20 ・ 和歌山県 白浜 ・ 2本 ・ 〇〇ダイビングサービス」

### M-4. 機材メモ：前回の点検からの経過

- 表示を「次回点検まで」から **「前回の点検から ○か月」** に変更（`last_service_on` から今日までの月数。1 か月未満は「1か月未満」）
- 色のバッジ：**12 か月以内＝緑**、**12 か月超〜18 か月以内＝黄**、**18 か月超＝赤**、未記録＝灰色「点検日の記録なし」
- `next_service_on` の入力欄と表示は外す（列は残す）
- 色だけに頼らず、バッジに文字（「良好」「そろそろ点検」「点検をおすすめ」）も入れる

---

## 品質

- Vitest：チップの選択状態、NEXT DIVE の選び方（連続日・終了日・JST 境界）、並び替えの sort_order 計算、ブックマーク anchor の生成（同じ文字列→同じ ID）、アバター設定の検証、経験本数の合計、機材メモの経過月とバッジ判定、スクロール位置の扱い（純粋関数にできる部分）
- `npm run lint`（警告 0）、`npx tsc -b`
- DESIGN.md・README 更新（新しい migration の実行手順を追記）
- 既存のセキュリティ要件を崩さない。新しいテーブルはすべて RLS 有効、権限は DB で判定
