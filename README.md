# N×S_Diving

ダイビング情報の共有サイトです。仲間どうしで知識や経験を共有し、より理解を深めて、安全に楽しく潜れるようにするスマホ最優先の Web アプリです。公開 URL は `https://<専用GitHubアカウント>.github.io/s_n_diving/` を想定しています。

表示テーマはライト（既定）・ダーク・端末に合わせるから選べ、設定はこのブラウザに保存されます。

## 初回セットアップ

1. 専用 GitHub アカウントで `s_n_diving` リポジトリを作成して push し、Pages の Source を「GitHub Actions」に設定します。
2. Supabase プロジェクトを作成します。Authentication で **Anonymous sign-ins** を有効にし、SQL Editor で `supabase/migrations/20260924000000_phase1.sql`、続けて `supabase/migrations/20260926000000_accidents_and_blocks.sql`、最後に `supabase/seed.sql` を実行します。v1.1 の migration と seed は再実行しても安全です。`node scripts/generate-seed.mjs` で JSON から seed SQL を再生成できます。
3. 最初の管理者を Supabase で招待し、招待を受けたユーザーの UUID を使って SQL Editor で `insert into public.admins (user_id, display_name, role) values ('UUID', '表示名', 'owner');` を実行します。
4. 管理者としてログイン後、管理画面の「設定」で最初の合言葉を設定します。SQL から設定する場合も、管理者としてログインしたセッションで `select public.set_passcode('合言葉');` を実行します。合言葉を変えると掲示板メンバーは再入力が必要です。
5. GitHub リポジトリの Secrets に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定します。
6. ローカル開発では `.env.example` を参考に `.env` を作成し、`npm install`、`npm run dev` を実行します。
7. デプロイ後、仲間に `https://<専用GitHubアカウント>.github.io/s_n_diving/` を送ります。URL は仲間内だけで扱ってください。

合言葉は **8文字以上** を推奨します。匿名サインインの作成頻度も抑えたい場合は、Supabase Dashboard の **Authentication → Rate Limits** で匿名サインインのレート制限を厳しくしてください。

## 開発コマンド

```sh
npm install
npm run lint
npm test
npm run build
```

`VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定していない場合、アプリは「Supabase が未設定です」と表示し、同梱の機材資料だけをローカル表示します。

## セキュリティに関するメモ

- 匿名サインインも Postgres では `authenticated` ロールです。管理者権限は必ず `public.is_admin()` の結果で判定します。
- `settings.passcode_hash` に直接 SELECT を許可していません。クライアントに返すのは公開用の注意書きだけです。
- 掲示板画像は非公開 Storage バケットに保存し、表示時に signed URL を使います。
- `join_board` RPC は `ok`（参加成功）、`wrong`（合言葉違い）、`locked`（試行回数上限）、`not_set`（合言葉未設定）を返します。`wrong` の記録はトランザクション内で確定するため、10分間の個人・全体ロックアウトが有効です。
- 事故事例は報道・公的報告書をそのまま転載せず、自分の言葉で要約して必ず出典をリンクしてください。当事者の氏名や個人を特定できる情報は掲載しません。
