# Workforce Hub

シフト・稼働・工数をひとつにまとめる、チーム向け業務管理システムです。React のフロントエンドと、自作した Express REST API・MySQL を分けて構成しています。

## ポートフォリオとして見せたいポイント

- React + TypeScript で、メンバー・管理者で見えるデータと操作を切り替える画面を実装
- Express + TypeScript で REST API を自作し、JWT によるログイン認証と権限制御を実装
- MySQL のテーブル設計を行い、プロジェクト・ユーザー・シフト・工数・承認履歴を関連付け
- SQL の `JOIN` / `GROUP BY` / `CASE` を使い、プロジェクト別の予算対実績やメンバー別の稼働を集計
- 承認フロー（申請中・承認済み・差し戻し）を設け、実際の業務を想定した状態管理を実装

## 主な機能

- メンバー: シフト希望の申請、案件ごとの工数提出、自分の申請状況の確認
- 管理者: チーム全体の申請確認・承認・差し戻し、プロジェクト別工数の可視化
- 共通: JWT ログイン、ロール（member / manager / admin）に応じた API 権限管理

## 構成

```
client/  React + Vite + TypeScript
server/  Express + TypeScript + JWT
db/      MySQL 初期テーブル・マスタデータ
```

## ローカル起動手順

前提: Node.js 20 以上、Docker Desktop

```bash
cd workforce-hub
npm install
npm --prefix client install
npm --prefix server install
cp server/.env.example server/.env
npm run db:up
npm --prefix server run seed
```

ターミナルを2つ開き、以下をそれぞれ実行します。

```bash
npm run dev:server
npm run dev:client
```

ブラウザで `http://localhost:5173` を開きます。

| 権限 | メールアドレス | パスワード |
| --- | --- | --- |
| 管理者 | `manager@example.com` | `demo1234` |
| メンバー | `member@example.com` | `demo1234` |

## API の例

- `POST /api/auth/login` — JWT を発行
- `GET /api/projects` — プロジェクト一覧
- `GET` / `POST /api/timesheets` — 工数の取得・提出
- `PATCH /api/timesheets/:id/approve` — 工数の承認・差し戻し（管理者）
- `GET` / `POST /api/shifts` — シフトの取得・申請
- `PATCH /api/shifts/:id/approve` — シフトの承認・差し戻し（管理者）
- `GET /api/dashboard/summary` — 集計ダッシュボード（管理者）

## 今後の拡張候補

- ユーザー招待・パスワードリセット
- プロジェクトの作成・編集、CSV 出力
- 月次締め、通知、監査ログの検索
- 本番環境での環境変数管理とデータベースのマイグレーション
