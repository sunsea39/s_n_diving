# N×S_Diving

ダイビング情報の共有サイトです。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにするスマホ最優先の Web アプリです。公開 URL は `https://<専用GitHubアカウント>.github.io/s_n_diving/` を想定しています。

表示テーマはライト（既定）・ダーク・端末に合わせるから選べ、設定はこのブラウザに保存されます。

資料詳細では「PDF・印刷」から、ブラウザの印刷機能を使って検索可能な PDF を保存できます。カード（A6/A7、A4 タイルまたは単票、要点のみ／本文つき）と A4 全文を選べ、設定は localStorage の `ns-print` に保存されます。事故事例は A4 全文で印刷できます。

## 初回セットアップ

1. 専用 GitHub アカウントで `s_n_diving` リポジトリを作成して push し、Pages の Source を「GitHub Actions」に設定します。
2. Supabase プロジェクトを作成します。SQL Editor で `supabase/migrations/20260924000000_phase1.sql`、`supabase/migrations/20260926000000_accidents_and_blocks.sql`、`supabase/migrations/20260927000000_accounts.sql`、最後に `supabase/seed.sql` をこの順で実行します。migration は既存 DB への追加・再実行に対応しています。`node scripts/generate-seed.mjs` で JSON から seed SQL を再生成できます。
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
