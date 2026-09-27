# N×S_Diving

## v2.9 migration

Apply `supabase/migrations/20261002000000_v2_9.sql` after v2.8. It is additive and re-runnable. It adds per-user `content_reads`, batch accident-publication notifications, the owner-only `set_accidents_status` RPC, and the five additional document icons.

The migration preserves `profiles.notifications_seen_at` only as the notification baseline; it does not migrate old read state. Existing unread events before that timestamp stay treated as read. Apply it through the Supabase SQL Editor or the project migration workflow, then refresh browser sessions so the new table and RPC grants are available.

## v2.8 migration

Apply `supabase/migrations/20261001000000_v2_8.sql` after v2.4. It is additive and re-runnable. It adds `docs.home_featured` and an advisory-lock-protected database trigger that limits home-featured documents to four. No additional grants or policies are required.

After applying the migration, owners can select up to four documents with **ホームに表示** in `/admin/docs`. The home page shows those published documents in `sort_order`; when none are selected, it falls back to the newest four published documents.

## v2.4 migration and push delivery

Apply `supabase/migrations/20260930000000_v2_4.sql` after v2.3. It is additive and re-runnable. It adds headband avatars, in-app notification events, per-user push subscriptions, delivery triggers, and the five-minute notification cron job.

Before publishing notifications, deploy the `send-push` Edge Function with **Verify JWT disabled**, then configure these Edge Function secrets in the Supabase Dashboard: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and `PUSH_WEBHOOK_SECRET`. Do not commit the private VAPID key or webhook secret. Store the deployed function URL and the same webhook secret in Supabase Vault as `ns_push_function_url` and `ns_push_webhook_secret`; `private/push-setup.sql` is ignored by Git and contains only the local placeholders. Enable `pg_net` and `pg_cron` for the project before applying the migration. The public VAPID key is built into `src/lib/push.ts`.

The service worker is scoped to `/s_n_diving/`. On iPhone, users must open the installed Home Screen web app before enabling notifications. The My Page notification tab includes registration, cancellation, and a per-user test notification.

## v2.3 migration

Apply `supabase/migrations/20260929000000_v2_3.sql` after the existing migrations (including v2.2), using the Supabase SQL Editor or the project migration workflow. It is additive and re-runnable. It adds the v2.3 avatar accessory validation and limits dive-schedule news to approved members; public “other” news remains public after publication. Refresh browser sessions after applying it.

Owners can import accident examples at `/admin/accidents` with **CSV で取り込む**. Download the template first; files accept UTF-8 (with or without BOM) and Shift_JIS, up to 200 rows and 1 MB. Review the per-row preview before importing. Do not include names or other personally identifying information.

ダイビング情報の共有サイトです。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにするスマホ最優先の Web アプリです。公開 URL は `https://<専用GitHubアカウント>.github.io/s_n_diving/` を想定しています。

表示テーマはライト（既定）・ダーク・端末に合わせるから選べ、設定はこのブラウザに保存されます。

アイコンは `public/icons/` の最終ファイルをそのまま使い、同じ名前・用途（favicon、Apple touch icon、manifest の any / maskable）を保って置き換えます。フッターのサンゴ礁は `src/components/FooterScene.tsx` の SVG と砂色の文字帯で構成しており、原画を差し替える際は図形・座標と `ft-*` class を維持し、テーマ色は `src/styles.css` の `--ft-*` CSS 変数で更新してください。

資料詳細では「PDF・印刷」から、ブラウザの印刷機能を使って検索可能な PDF を保存できます。カード（A6/A7、A4 タイルまたは単票、要点のみ／本文つき）と A4 全文を選べ、設定は localStorage の `ns-print` に保存されます。事故事例は A4 全文で印刷できます。

## 初回セットアップ

1. 専用 GitHub アカウントで `s_n_diving` リポジトリを作成して push し、Pages の Source を「GitHub Actions」に設定します。
2. Supabase プロジェクトを作成します。SQL Editor で migration をファイル名順に実行します（v2.4、v2.8、v2.9 を含む `supabase/migrations/` の全ファイル）。最後に `supabase/seed.sql` を実行します。migration は既存 DB への追加・再実行に対応しています。`node scripts/generate-seed.mjs` で JSON から seed SQL を再生成できます。
3. Authentication → Providers → Email で **Confirm email を OFF** にし、Authentication → Providers で **Anonymous sign-ins を OFF** にします。
4. ダイビング入門の資料を登録する場合は、ローカルの `private/manual/manual-seed.sql` を SQL Editor で実行します。この資料本文は公開リポジトリには含めません。
5. 最初の管理者は既存の `admins` 行から migration が owner に移行します。新規サイトでは最初の登録後、SQL Editor で対象の `profiles.role` を `owner` に設定してください。以後の承認・権限変更は `/admin/members` で行います。権限の正本は `profiles.role` です。
6. GitHub リポジトリの Secrets に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定します。
7. ローカル開発では `.env.example` を参考に `.env` を作成し、`npm install`、`npm run dev` を実行します。
8. デプロイ後、仲間に `https://<専用GitHubアカウント>.github.io/s_n_diving/` を送ります。URL は仲間内だけで扱ってください。

掲示板は、メール＋パスワードで登録したアカウントを owner が承認する方式です。合言葉と匿名サインインは使いません。

## 開発コマンド

```sh
npm install
npm run lint
npm test
npm run build
```

印刷カードの分割、要点フィルタ、A4 タイル計算は Vitest で検証しています。印刷ではブラウザの送信先で「PDF として保存」を選んでください。

`VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定していない場合、アプリは「Supabase が未設定です」と表示し、同梱の機材資料だけをローカル表示します。

## セキュリティに関するメモ

- 権限は DB の `is_owner()` / `is_editor()` / `is_member()` で判定し、画面表示だけには依存しません。`is_admin()` は owner と同義です。
- `profiles` は本人の編集可能列を DB の列単位 GRANT で制限します。メール一覧は owner 専用 RPC からのみ取得します。
- 掲示板画像は非公開、アバターは公開 Storage バケットです。アバターは本人のフォルダだけを変更できます。
- 事故事例は報道・公的報告書をそのまま転載せず、自分の言葉で要約して必ず出典をリンクしてください。当事者の氏名や個人を特定できる情報は掲載しません。

## 料金・運用メモ

- Supabase 無料プランの目安は月間アクティブユーザー 50,000 人、DB 500 MB、ファイル 1 GB、転送量 5 GB/月です。仲間内の規模では通常この範囲に収まります。
- アイコンは 512px、掲示板画像は 1600px に縮小して保存します。無料プランは上限を超えても自動課金されず、有料化は手動です。
- 標準メール送信は使いません。将来メール再設定を追加する場合は Gmail などの SMTP を設定できます。
