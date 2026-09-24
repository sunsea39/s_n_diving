# S×N_Diving

仲間内でダイビングの安全情報を共有する、スマホ最優先の Web アプリです。公開 URL は `https://<専用GitHubアカウント>.github.io/s_n_diving/` を想定しています。

## 初回セットアップ

1. 専用 GitHub アカウントで `s_n_diving` リポジトリを作成して push し、Pages の Source を「GitHub Actions」に設定します。
2. Supabase プロジェクトを作成します。Authentication で **Anonymous sign-ins** を有効にし、SQL Editor で `supabase/migrations/20260924000000_phase1.sql`、続けて `supabase/seed.sql` を実行します。`npm run generate:seed` で JSON から seed SQL を再生成できます。
3. 最初の管理者を Supabase で招待し、招待を受けたユーザーの UUID を使って SQL Editor で `insert into public.admins (user_id, display_name, role) values ('UUID', '表示名', 'owner');` を実行します。
4. 管理者としてログイン後、管理画面の「設定」で最初の合言葉を設定します。SQL から設定する場合も、管理者としてログインしたセッションで `select public.set_passcode('合言葉');` を実行します。合言葉を変えると掲示板メンバーは再入力が必要です。
5. GitHub リポジトリの Secrets に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定します。
6. ローカル開発では `.env.example` を参考に `.env` を作成し、`npm install`、`npm run dev` を実行します。
7. デプロイ後、仲間に `https://<専用GitHubアカウント>.github.io/s_n_diving/` を送ります。URL は仲間内だけで扱ってください。

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
