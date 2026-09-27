# N×S_Diving 改修仕様 v2.9

**セキュリティの前提**（v2.2 と同じ）：権限判定は NULL を返さない（`coalesce(…, false)`）、PL/pgSQL は `if auth.uid() is null or not coalesce(public.is_owner(), false) then raise …`、新しい関数は `revoke execute … from public, anon`、必要なロールにだけ grant。

新しい migration：`supabase/migrations/20261002000000_v2_9.sql`（追加で実行、再実行しても安全）。

## 1. 既読の仕組み（ベルの通知と、事故事例の未確認／確認済み）

### 1-1. データ

```
content_reads(
  user_id uuid not null → auth.users on delete cascade,
  kind text not null check in ('news','accident','accident_batch'),
  ref_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
)
```
- RLS：本人の行だけ select / insert / delete（`user_id = auth.uid()` かつ role が pending / member / editor / owner。suspended は不可）。update は不要（upsert は `on conflict do nothing`）
- `profiles.notifications_seen_at` は **「これより前の通知はすべて既読」という基準日時** として使い続ける（migration では変更しない＝今ある通知は既読扱いのまま）

### 1-2. 既読になるタイミング（画面側）

- `/news/:id` を開いた → `('news', id)` を既読に
- `/accidents/:slug` を開いた → `('accident', 事故事例の id)` を既読に
- `/accidents`（一覧）を開いた → 未読の `accident_batch` 通知をすべて既読に（§2 の一括公開の通知）
- 既読の登録は失敗しても画面は止めない（ログインしていなければ何もしない）

### 1-3. ベルのお知らせパネル

- **未読の通知だけ** を表示：`notification_events` のうち `created_at > notifications_seen_at` かつ `content_reads` に同じ `(kind, ref_id)` が無いもの（最新 20 件）。バッジの数も同じ条件
- **個々の記事を開くと、その通知はパネルから消える**（パネルを開いただけでは既読にしない。今の「開いたら全部既読」はやめる）
- 各行の先頭に種類のラベル：**【お知らせ】**（ティール）／**【事故事例】**（赤系）。`accident_batch` も【事故事例】
- 未読が無いときは「新しいお知らせはありません」
- パネルの下に小さく **「すべて既読にする」**（`notifications_seen_at = now()` を保存）

### 1-4. 事故事例の未確認／確認済み（ログインしている人だけ）

- 一覧（`/accidents`）とトップの「事故事例の新着」のカードに：
  - **未確認**：カードの右上に「未確認」のバッジ（塗り：ライト `#D64527` 地に白文字、ダーク `#F07A5F` 地に濃い文字）、タイトルを太字、カードの背景をほんのり色付け（ライト `#FFF4F1`、ダーク `#2A1F1F`）
  - **確認済み**：「確認済み」の控えめなバッジ（枠線のみ、`--muted`）。背景は通常
  - 色だけに頼らず文字のバッジを必ず付ける
- 一覧の上部に「未確認 N 件」と、絞り込みチップに **「未確認のみ」** を追加
- 詳細ページを開いた時点で確認済みになる（戻ったとき一覧に反映）
- 未ログインのときは何も表示しない（今まで通り）

## 2. 事故事例の管理画面：チェックして一括で公開／非公開

- 管理画面の事故事例一覧の各行の左に **チェックボックス**、表の見出しに **「すべて選択」**（今表示している行だけ）
- 1 件以上選ぶと、上部（スマホでは画面下に固定）に操作バー：「N 件を選択中」「**公開する**」「**非公開（下書き）にする**」「選択を解除」
- 押すとページ内の確認ダイアログ：「N 件を公開します。」＋公開の場合は「仲間への通知は、まとめて 1 回だけ送られます。」
- owner 専用 RPC `set_accidents_status(p_ids uuid[], p_status text)`：
  - `p_status in ('published','draft')` 以外はエラー。対象が存在しない ID はエラー
  - **公開で 2 件以上** のとき：該当行の `notified_at` を先に `now()` にして個別の通知を止め、`notification_events` に **1 件だけ** `kind='accident_batch'`、`ref_id=gen_random_uuid()`、`title='事故事例を N 件追加しました'`、`body`＝先頭 3 件のタイトルを「、」でつないで 80 字まで、`url='/accidents'` を insert（既存のトリガーでプッシュ通知が 1 回送られる）
  - **公開で 1 件** のときは今まで通り（個別の通知）
  - 非公開にしても `notified_at` は消さない（再公開で再通知しない）
  - `notification_events.kind` の check 制約に `'accident_batch'` を追加
- 結果をトーストで表示し、一覧を再読み込み
- 一括操作は資料・お知らせには不要

## 3. 資料のアイコンを追加

- 画像は Claude が作成済み：`public/img/note.png`（ノート）、`first-aid.png`（赤十字）、`camera.png`（カメラ）、`caution.png`（注意マーク）、`fish.png`（魚）。既存の機材イラストと同じ 800px・円背景
- アイコンの選択肢に追加（表示名：ノート／赤十字／カメラ／注意マーク／魚）。資料の一覧用アイコン、機材セクションのイラスト、`cards` ブロックのアイコンの選択肢すべて
- 選択肢は **見本の画像つき** のボタン（今の select の文字だけなら、小さな画像付きのボタン群に変える）
- DB：`docs_icon_check` を作り直して 5 つを許可（`drop constraint if exists` → `add constraint`）

## 4. 品質

- Vitest：未読通知の判定（基準日時・既読行・種類）、事故事例カードの未確認／確認済みの判定、一括操作の選択ロジック
- `npm run lint`（警告 0）、`npx tsc -b`
- README（v2.9 の migration 手順）・DESIGN.md 更新
