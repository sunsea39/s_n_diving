# N×S_Diving 改修仕様 v2.4

**セキュリティの前提**（v2.2 と同じ）：権限判定は NULL を返さない（`coalesce(…, false)`）、PL/pgSQL は `if auth.uid() is null or not coalesce(public.is_owner(), false) then raise …`、新しい関数は `revoke execute … from public, anon`、`storage.objects.owner_id` は text。**秘密の値（VAPID 秘密鍵・Webhook 用の秘密）をリポジトリに書かない。**

新しい migration：`supabase/migrations/20260930000000_v2_4.sql`（追加で実行、再実行しても安全）。

## 1. アイコン：バンダナ → ヘアバンド、茶色を追加、色ボタンを小さく

- 原画は Claude が更新済み：`docs/assets/diver-avatar-preview.html`（`headband()`、`PALETTE.headband` 8 色＝茶・赤・紺・ティール・黄・ピンク・黒・白。プリセットの 4 種もヘアバンドに）
- `accessory` の値は `'none' | 'mask' | 'headband'`、色は `headbandColor`。旧データ `accessory:'bandana'` と `bandanaColor` は読み込み時に headband として扱い、保存時は新形式
- `DiverAvatar.tsx` を原画どおりに更新（パス・座標・色・描画順は変えない）。画面の表記は「ヘアバンド」
- `valid_avatar_style` を更新：`accessory in ('none','mask','headband','bandana')`、`headbandColor` と `bandanaColor` の許可リストに `brown` を追加
- 編集画面の **色の選択ボタン（小物の色、髪・肌・スーツ・背景の色すべて）を小さく**：見た目 24px の丸（タップ領域は 36px を確保、間隔 6px）。選択中は外側に 2px のリング（`--teal`）＋中央に小さなチェック

## 2. ハンバーガーメニューを右から左へスライド

- **不具合の原因（Claude が特定済み）**：`src/styles/motion.css` の
  ```css
  html.theme-ready *, … { transition-duration: var(--motion-theme); transition-property: background-color, border-color, color, fill, stroke, box-shadow; }
  ```
  がすべての要素の `transition` を上書きし、ドロワーの `transform` の遷移が消えている（一瞬で出る）
- 対応：テーマの色の遷移は **テーマを切り替えている間だけ** 有効にする
  - テーマ切替時に `html` に `theme-switching` を付け、`var(--motion-theme)` ＋ 50ms 後に外す
  - セレクタを `html.theme-switching, html.theme-switching * …` に変更（`theme-ready` による常時の上書きはやめる）
- ドロワー：画面右の外（`translateX(100%)`）から左へ 420ms でスライドインし、閉じるときは右へスライドアウト。背面の幕はフェード。開いている間の要素は、ドロワー表示後に 1 行ずつ 40ms 間隔で右から 12px フェードイン（`prefers-reduced-motion` では無し）
- 同じ上書きで効いていなかった他の遷移（ボタンのホバー、タブのピル、折りたたみ等）も直ることを確認

## 3. ホーム冒頭の言葉を左から右へ

- トップのヒーロー：kicker → 見出し → リード → ボタン の順に、**左から右へ現れる**
  - 各要素：`clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)`（左から右へ文字が見えていく）＋ `translateX(-16px)` → `0`、600ms、`cubic-bezier(.22,.61,.36,1)`
  - 間隔 180ms ずつ
  - 初期状態でも内容は DOM にあり、アニメーションが無い環境（reduced-motion、印刷）では最初から表示
- ページ文言（page_texts）が後から読み込まれて差し替わっても、アニメーションが二重に走らないこと

## 4. 管理画面はアニメーション無し

- `/admin` 以下を表示している間は `html` に `admin-mode` を付け、`html.admin-mode *` で `animation: none !important; transition: none !important;`
- ドロワーの開閉も管理画面では即時（ドロワーはサイト共通なので、管理画面にいる間だけ即時でよい）
- 管理画面から一般ページへ戻ったらアニメーションが戻る

## 5. 資料：「要点だけ表示」ボタン

- 資料詳細の目次チップの並びの先頭に **「要点だけ」トグル**（`aria-pressed`、チップと同じ見た目）
- オンのとき表示するブロック：`heading`、`callout`（3行まとめ・絶対に守るルール・注意）、`signs`、`checklist`、`image`（図は残す）。隠すブロック：`text`、`table`、`qa`、`steps`、`cards`、`links`
  - 見出しの直後に `callout` が無い区切りは、見出しだけが並ばないよう「要点なし」の区切りごと隠す
- 状態は URL の `?view=summary` と localStorage（`ns-doc-view`）に保存。ブックマークからの移動・印刷ページにも引き継ぐ（印刷の「要点のみ」と同じ判定関数を使い回す）
- Vitest：ブロック列 → 要点のみの抽出

## 6. 通知（サイト内の未読マーク ＋ プッシュ通知）

### 6-1. 何を通知するか

- **お知らせ**が公開されたとき（`published_at <= now()` になった時点。公開日時を未来にしたものは、その日時が来たときに通知）
  - `category='dive'` は承認済みの仲間（is_member）だけに
  - `category='other'` も通知の対象はログインしている承認済みの仲間（未ログインの人には通知の仕組み自体が無い）
- **事故事例**が公開（`status='published'`）になったとき
- 同じ記事で 2 回以上通知しない（`notified_at` 列）。公開後の編集では通知しない

### 6-2. データベース

```
notification_events(
  id bigint identity pk,
  kind text check in ('news','accident'),
  ref_id uuid not null,
  audience text not null check in ('members'),   -- 将来の拡張用。今は members のみ
  title text not null,                           -- 例「お知らせ：11月 串本ツアー」
  body text not null default '',                 -- 本文の先頭 80 字など
  url text not null,                             -- 例 '/news/<id>'、'/accidents/<slug>'（サイト内のパス）
  created_at timestamptz default now(),
  unique (kind, ref_id)
)
push_subscriptions(
  id uuid pk default gen_random_uuid(),
  user_id uuid not null → auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz default now(),
  last_success_at timestamptz null
)
news / accidents に列 notified_at timestamptz null を追加（既存の公開済みの行は migration で now() を入れておき、過去分を一斉通知しない）
profiles に列 notifications_seen_at timestamptz not null default now()
```

- RLS：
  - `notification_events`：select は `is_member()` のみ。insert/update/delete はクライアント不可（関数のみ）
  - `push_subscriptions`：本人の行だけ select/insert/delete（`is_member()` かつ `user_id = auth.uid()`）
  - `profiles.notifications_seen_at`：本人が更新できるよう列単位の GRANT に追加
- 関数 `emit_due_notifications()`（security definer、クライアントから実行不可）：公開済みで `notified_at is null` のお知らせ・事故事例について `notification_events` に insert（`on conflict do nothing`）し、`notified_at = now()`
  - news / accidents の insert・update トリガーから呼ぶ（公開日時が現在以前のもの）
  - **pg_cron** で 5 分ごとに呼ぶ（未来の公開日時のお知らせのため）：`select cron.schedule('ns-emit-notifications', '*/5 * * * *', $$select public.emit_due_notifications()$$)`（既にあれば作り直す）
- `notification_events` の insert トリガー（security definer）：**pg_net** で Edge Function を呼ぶ
  - `net.http_post(url := <関数URL>, headers := jsonb_build_object('Content-Type','application/json','x-push-secret', <秘密>), body := jsonb_build_object('event_id', new.id))`
  - 関数 URL と秘密は **Supabase Vault** から読む（`vault.decrypted_secrets` の name = `ns_push_function_url` / `ns_push_webhook_secret`）。どちらかが無ければ何もしない（プッシュ未設定でも未読マークは動く）
  - Vault への登録 SQL はリポジトリに入れない。Claude が `private/push-setup.sql` として別に用意する
- `create extension if not exists pg_net; create extension if not exists pg_cron;`（Supabase で使える）

### 6-3. Edge Function `send-push`

- `supabase/functions/send-push/index.ts`（Deno。`npm:web-push@3.6.7` と `npm:@supabase/supabase-js@2`）。オーナーが Supabase のダッシュボードのエディタに貼り付けてデプロイする前提（README に手順）。**Verify JWT はオフ**にして、自前で認証する
- 2 つの呼ばれ方：
  1. **DB からの通知**：ヘッダー `x-push-secret` が環境変数 `PUSH_WEBHOOK_SECRET` と一致（定数時間比較）するときだけ。`event_id` のイベントを読み、対象（今は承認済みの仲間全員）の `push_subscriptions` に送信
  2. **テスト通知**：`Authorization: Bearer <ユーザーのアクセストークン>` を `auth.getUser()` で検証し、その人が承認済みなら、その人の購読だけに「テスト通知」を送る
- 送信内容（JSON）：`{ title, body, url: 'https://sunsea39.github.io/s_n_diving' + event.url, tag: kind + ':' + ref_id }`
- 404 / 410 が返った購読は削除。成功したら `last_success_at` を更新
- 環境変数：`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`VAPID_SUBJECT`、`PUSH_WEBHOOK_SECRET`（Claude が用意し、オーナーがダッシュボードの Secrets に登録）。`SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` は Edge Function に最初から入っている
- CORS：サイトのオリジン（`https://sunsea39.github.io`）とローカル開発のみ許可

### 6-4. サービスワーカーと購読

- `public/sw.js`（スコープ `/s_n_diving/`）：`push` で `showNotification(title, { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag, data: { url } })`、`notificationclick` で既存のタブがあればフォーカスして移動、無ければ開く。キャッシュ（オフライン）はしない
- VAPID 公開鍵はフロントの定数 `src/lib/push.ts` に：`BLLJbbEOqCZ7KMHFDnh9miQw6uVatsh1h_e48vLCMcsafhrIPvbGETDhXQtYRHvyyYBp7N_sg82rtt586sqWnU4`（公開してよい値）
- マイページに **「通知」タブ**：
  - プッシュ通知のオン／オフ。オン：`Notification.requestPermission()` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` → `push_subscriptions` に upsert。オフ：`unsubscribe()` → 行を削除
  - 対応状況の表示：非対応ブラウザ／通知が拒否されている（設定から許可する方法）／**iPhone でホーム画面に追加していない**（`navigator.standalone` が false の iOS）ときは「Safari の共有ボタン →『ホーム画面に追加』→ 追加したアイコンから開いて、ここでオンにしてください」を図入りで案内
  - 「テスト通知を送る」ボタン（6-3 の 2）
  - この端末以外の購読数（「ほかに 2 台で通知を受け取っています」）

### 6-5. サイト内の未読マーク（ベル）

- ヘッダーの **アカウントアイコンの左** にベル（承認済みの仲間だけ）。未読があれば右上に件数のバッジ（9 件超は「9+」）
  - 未読 = `notification_events.created_at > profiles.notifications_seen_at`
- ベルを押すと **お知らせパネル**（ドロワーと同じ右からのパネル、またはヘッダー下のポップオーバー）：最新 20 件（種類のアイコン、タイトル、日時、未読は太字＋点）。項目を押すとそのページへ。パネルを開いた時点で `notifications_seen_at = now()` を保存
- 起動時とページ移動時、またはタブが前面に戻ったときに未読数を取り直す（Realtime は使わない）
- 管理画面では表示のみ（アニメーション無し）

## 7. 品質

- Vitest：アバター旧データの変換、要点のみの抽出、未読数の計算、iOS のホーム画面判定、push の base64url→Uint8Array 変換
- `npm run lint`（警告 0）、`npx tsc -b`
- README：v2.4 の migration、`private/push-setup.sql`（Claude が用意）の実行、Edge Function のデプロイ手順（ダッシュボードで新規作成 → コード貼り付け → Verify JWT オフ → Secrets 登録）、pg_cron の確認方法
- DESIGN.md 更新
