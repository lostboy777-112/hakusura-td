# Supabase連携の手順

ハクスラTDは、未設定でもこの端末内でランキングを保存して遊べます。Supabaseを設定すると、ランキングがオンラインで共有され、ベスト記録がクラウドにも保存されます。

## 1. プロジェクトを作る

1. [supabase.com](https://supabase.com) でアカウントを作り、**New project** を押します。
2. 名前（例: hakusura-td）とデータベースパスワードを決めて作成します（無料プランで十分です）。
3. 左メニューの **Settings → API** を開き、**Project URL** と **anon public** キーを控えます。
   - `service_role` キーは絶対に使わないでください（管理者権限のキーです）。ゲームに入れるのは **anonキーだけ** です。

無料プランの注意: 1週間アクセスがないプロジェクトは自動で一時停止します。止まったら管理画面で **Resume project** を押せばデータごと復活します。

## 2. テーブルとポリシーを作る

左メニューの **SQL Editor** で、次をそのまま実行します。

```sql
-- スコアランキング
create table if not exists public.loot_td_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) <= 20),
  score integer not null check (score >= 0),
  wave integer not null check (wave >= 0),
  kills integer not null check (kills >= 0),
  created_at timestamptz not null default now()
);
alter table public.loot_td_scores enable row level security;
create policy "scores are readable by anyone"
  on public.loot_td_scores for select to anon using (true);
create policy "scores are insertable by anyone"
  on public.loot_td_scores for insert to anon with check (true);

-- クラウドセーブ（ベスト記録）
create table if not exists public.loot_td_saves (
  player_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.loot_td_saves enable row level security;
create policy "saves are readable by anyone"
  on public.loot_td_saves for select to anon using (true);
create policy "saves are insertable by anyone"
  on public.loot_td_saves for insert to anon with check (true);
create policy "saves are updatable by anyone"
  on public.loot_td_saves for update to anon using (true) with check (true);
```

## 3. ゲームに設定する

1. ゲームを開き、**⚙ 設定** を押します。
2. **プロジェクトURL** と **anonキー** を貼り、「保存して接続テスト」を押します。
3. 「✅ 接続できました」と出れば完了です。設定はこの端末の中だけに保存されます。

## セキュリティの考え方

- anonキーは公開が前提のキーです。守るのはキーではなく、上の **RLSポリシー** です（このポリシーでは「ランキングの閲覧と登録」「セーブの保存」しかできません。他のテーブルには触れません）。
- 個人で楽しむ範囲では、スコアの改ざん対策までは入れていません。本格的に公開する場合は、Supabase Authでのログイン必須化や、スコア検証用のEdge Functionが必要です。
- セーブはプレイヤーID（端末ごとに自動生成されるUUID）を鍵にしています。UUIDを知っている人はそのセーブを読めます。家計簿のような重要なデータは入れないでください（このゲームのセーブはベスト記録だけです）。
