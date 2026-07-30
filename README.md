# Workforce Hub

日々の作業時間を記録し、月ごとの工数・収入見込み・案件別の状況を確認できるワークログアプリです。アルバイト、副業、業務委託、少人数チームでの稼働管理を想定しています。

フロントエンドだけで完結させず、React、Expressによる自作REST API、MySQL、Dockerまで含めて構成しています。

## できること

- 作業日・プロジェクト・作業時間・内容を15分単位で記録
- 記録済み工数を編集し、再提出する
- 月ごとの工数一覧、収入見込み、承認済み工数を確認
- 時給／固定月収を切り替え、収入見込みを確認
- カレンダー上で日ごとの工数と金額を振り返る
- 管理者がプロジェクトを登録・編集・完了・停止・削除
- 管理者がメンバーの工数を承認・差し戻し
- JWTログインとロール（member / manager / admin）ごとの権限制御
- PCではサイドメニュー、スマホでは下部ナビに切り替わるレスポンシブUI

## 画面の考え方

初期案では「ダッシュボード」「工数管理」など、管理者視点の名称が中心でした。実際に使う人が最初に迷わないよう、利用者の行動に沿って以下へ整理しました。

| 画面 | 目的 |
| --- | --- |
| 作業を記録 | その日に働いた時間と内容を入力する |
| 工数・収入一覧 | 月単位で工数と収入見込みを振り返る |
| 作業カレンダー | 日ごとの稼働を時系列で見る |
| プロジェクト登録・確認 | 管理者が案件・単価・状態を管理する |
| What is Workforce Hub | アプリの目的と利用の流れを理解する |

## 技術構成

| 区分 | 技術 |
| --- | --- |
| フロントエンド | React 19 / Vite / TypeScript / CSS |
| バックエンド | Node.js / Express / TypeScript / Zod |
| 認証 | JSON Web Token（JWT） / bcryptjs |
| データベース | MySQL 8.4 / mysql2 |
| 開発環境 | Docker Compose |
| グラフ | Recharts |

```text
React (client)
   │ HTTP + Bearer JWT
   ▼
Express REST API (server)
   │ SQL
   ▼
MySQL 8.4 (Docker)
```

## API・データベースで意識したこと

- クライアント側だけで権限を隠すのではなく、APIでも管理者権限を検証
- メンバーは自分の工数だけ、管理者は全メンバーの工数を取得できるようSQL条件を分岐
- 工数を編集した場合は承認済みのままにせず、`submitted`（確認待ち）へ戻す
- 作業記録があるプロジェクトは削除できないようにし、履歴を残すため「完了」へ変更する運用にした
- `JOIN` / `GROUP BY` / `CASE` を用い、案件別・メンバー別の集計APIを用意
- DBの日本語文字化けと日付のUTCずれを検証時に発見し、`SET NAMES utf8mb4` と `dateStrings` 設定で修正

## AIを使った開発について

このアプリは、AI（Codex）と対話しながら開発しました。コードの作成・修正の大部分はAIに依頼しています。

一方で、何を作るか、どんな名前なら初めての人にも伝わるか、どの画面が使いづらいかは、実際に画面を確認しながら要望・フィードバックとして繰り返し調整しました。例えば「工数管理」より「作業を記録」の方が行動が分かりやすいこと、月次一覧やカレンダーが必要なこと、ボタンの押下感や通知が必要なことを、画面を見ながら具体化しています。

また、AIの出力をそのまま終わりにせず、以下を実施しました。

- DockerでMySQLを起動し、初期データ投入とログインAPIを確認
- フロントエンドの本番ビルド、バックエンドのTypeScript型チェックを実行
- 日本語表示、日付、権限、プロジェクト追加・更新・削除の挙動を確認
- モバイル幅での下部ナビ表示を確認

「AIに任せて速く作る」だけでなく、動かして気づいた不具合を要件へ戻し、修正と検証を繰り返すことを意識しました。

## ローカル起動

前提: Node.js 20以上、Docker Desktop

```bash
git clone https://github.com/koseit22/workforce-hub.git
cd workforce-hub
npm install
npm --prefix client install
npm --prefix server install
cp server/.env.example server/.env
npm run db:up
npm --prefix server run seed
```

別々のターミナルで起動します。

```bash
npm run dev:server
```

```bash
npm run dev:client
```

`http://localhost:5173` を開きます。

| 権限 | メールアドレス | パスワード |
| --- | --- | --- |
| 管理者 | `manager@example.com` | `demo1234` |
| メンバー | `member@example.com` | `demo1234` |

既に作成済みのDBに案件単価カラムを追加する場合は、以下を一度だけ実行します。

```bash
docker compose exec -T mysql mysql -uworkforce -pworkforce_pass workforce_hub < db/migrations/001_add_project_hourly_rate.sql
```

## 主なAPI

- `POST /api/auth/login` — JWTを発行
- `GET` / `POST` / `PATCH` / `DELETE /api/projects` — プロジェクト管理（管理者）
- `GET` / `POST /api/timesheets` — 工数取得・提出
- `PATCH /api/timesheets/:id` — 工数の編集・再提出
- `PATCH /api/timesheets/:id/approve` — 承認・差し戻し（管理者）
- `GET /api/dashboard/summary` — プロジェクト・メンバー別集計（管理者）

## 今後の改善候補

- ユーザー招待、パスワードリセット
- 月次締めとCSV出力
- プロジェクトごとの単価を月次の金額計算へ反映
- 通知履歴、監査ログ検索
- 本番用の環境変数管理、DBマイグレーション管理
