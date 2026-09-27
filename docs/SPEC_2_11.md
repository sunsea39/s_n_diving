# N×S_Diving 改修仕様 v2.11 — 団体とライセンスを管理画面で編集

**セキュリティの前提**（v2.2 と同じ）：権限判定は NULL を返さない（`coalesce(…, false)`）、PL/pgSQL は `if auth.uid() is null or not coalesce(public.is_owner(), false) then raise …`、新しい関数は `revoke execute … from public, anon`、必要なロールにだけ grant。

新しい migration：`supabase/migrations/20261003000000_v2_11.sql`（追加で実行、再実行しても安全）。

## 1. データ

```
license_orgs(
  id uuid pk default gen_random_uuid(),
  name text not null unique check 1〜30文字,
  sort_order int not null default 0,
  allow_free_text boolean not null default false,   -- 「その他」のように自由入力にする団体
  created_at, updated_at
)
license_ranks(
  id uuid pk default gen_random_uuid(),
  org_id uuid not null references license_orgs(id) on delete cascade,
  name text not null check 1〜60文字,
  sort_order int not null default 0,
  unique (org_id, name),
  created_at, updated_at
)
```
- 初期データ：今の 4 団体とランク（`src/content/licenses.ts` と同じ文字列・同じ順）＋「その他」（`allow_free_text = true`、ランクなし）。`on conflict do nothing`
- RLS：select は anon・authenticated 全員。insert / update / delete は `is_owner()` のみ

## 2. 保存時のチェックを一覧（DB）に合わせる

- 今の CHECK 制約 `profiles_licenses_check`（決め打ちの一覧）を **削除** し、代わりに `profiles` の before insert / update トリガー（security definer）で検証する
  - `licenses` は配列・5 件まで・各要素は `{ org, rank }`
  - **新しく追加された要素だけ**（`old.licenses` に同じ `{org, rank}` が無いもの）を一覧と照合する：`org` が `license_orgs.name` に存在し、`allow_free_text` なら rank は 1〜60 文字、そうでなければ `license_ranks` にその団体の rank が存在すること
  - 既に登録済みの要素は、一覧から消えていてもそのまま保存できる（プロフィールの他の項目を直したときに弾かれないように）
  - 違反時のメッセージ：「選べないライセンスが含まれています（団体：◯◯、ランク：◯◯）」
- `valid_licenses` 関数は使わなくなる（残してよいが、どこからも呼ばない）

## 3. 管理用の RPC（owner 専用）

- 団体・ランクの **追加・並び替え・削除** は、テーブルへの直接の insert / update / delete（RLS で owner のみ）でよい
- **名前の変更は RPC** で、登録済みのプロフィールも一緒に書き換える：
  - `rename_license_org(p_org_id uuid, p_name text)`：団体名を変え、`profiles.licenses` の中の同じ団体名も新しい名前に置き換える（1 トランザクション）
  - `rename_license_rank(p_rank_id uuid, p_name text)`：ランク名を変え、その団体・旧ランク名の要素を新しい名前に置き換える
  - 同名が既にあればエラー
- 削除したとき、登録済みのプロフィールからは消さない（表示は残る）

## 4. 管理画面「ライセンス」（owner のみ、メニューに追加）

- 団体ごとのカード（並び順どおり）：
  - 団体名（編集ボタン → その場で入力して保存。名前を変えると登録済みの人の表示も変わる旨を小さく表示）、↑↓ で並び替え、「自由入力にする」のチェック、削除（確認ダイアログ：「ランクもすべて削除されます。登録済みの人のライセンスは残ります。」）
  - ランクの一覧：名前（編集）、↑↓、削除（確認ダイアログ）
  - 「＋ ランクを追加」（入力欄＋追加）。自由入力の団体ではランクの一覧を出さない
- 画面の下に「＋ 団体を追加」
- 各ランク・団体に、それを登録している人数を小さく表示（`list_members` とは別に、owner 専用 RPC `license_usage()` で `{org, rank, count}` を返す。個人名は返さない）
- 並び替えの保存は ↑↓ を押すたびに即時保存（2 行の sort_order を入れ替える）。失敗したら元に戻してエラー表示
- アニメーションなし（管理画面の方針どおり）

## 5. マイページの選び方

- 団体のタブとランクのタブは **DB の一覧（`license_orgs` / `license_ranks`、並び順どおり）** から作る。読み込みに失敗したときだけ `src/content/licenses.ts` の定数を使う
- `allow_free_text` の団体は、ランクのタブの代わりに自由入力欄＋追加
- 登録済みで一覧に無くなったライセンスは、タグに「（現在の一覧にありません）」と小さく表示し、そのまま残せる（外すこともできる）

## 6. 品質

- Vitest：一覧からタブを作る処理（並び順・自由入力）、一覧に無い登録済みライセンスの表示判定、名前変更時の置き換え（純粋関数にできる部分）
- v2.10 の「定数と DB の許可リストが一致する」テストは、**migration の初期データと定数が一致する** テストに置き換える
- `npm run lint`（警告 0）、`npx tsc -b`
- README（v2.11 の migration 手順）・DESIGN.md 更新
