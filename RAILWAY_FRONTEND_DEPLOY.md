# Railwayでフロントエンドをデプロイする手順

## 概要

フロントエンドもRailwayでホスティングします。バックエンドAPIとは別のサービスとして作成します。

## ステップ1: フロントエンド用のサービスを作成

1. Railwayのダッシュボードでプロジェクトを開く
2. **「New」**をクリック → **「GitHub Repository」**を選択
3. 同じリポジトリ（`watrix811/youtube-converter`）を選択
4. 新しいサービスが作成されます

## ステップ2: フロントエンドサービスの設定

### 2-1. Root Directoryの設定

1. 作成されたサービスをクリック
2. **「Settings」**タブを開く
3. **「Root Directory」**を**空欄**にする（プロジェクトルートを使用）
4. 保存

### 2-2. Build設定

1. **「Settings」**タブの**「Build」**セクションを確認
2. **「Builder」**を**「Dockerfile」**に設定
3. **「Dockerfile Path」**に`frontend/Dockerfile`を入力

### 2-3. 環境変数の設定

1. **「Variables」**タブを開く
2. 以下の環境変数を追加：
   ```
   VITE_API_URL=https://youtube-converter.up.railway.app
   ```
   （バックエンドAPIのURLを設定）

## ステップ3: Public Networkingの設定

1. **「Settings」**タブの**「Networking」**セクションを開く
2. **「Generate Domain」**をクリック
3. ポート番号を入力（デフォルトは3000）
4. Domainが生成されます

## ステップ4: デプロイの確認

1. **「Deployments」**タブでデプロイの進行状況を確認
2. ログでエラーがないか確認
3. デプロイが完了したら、生成されたURLで動作確認

## 動作確認

フロントエンドのURLにアクセス：
```
https://your-frontend-app.up.railway.app
```

YouTubeのURLを入力して、バックエンドAPIと連携して動作するか確認してください。

## トラブルシューティング

### ビルドエラー

- `frontend/Dockerfile`が正しいパスにあるか確認
- `package.json`の`build`スクリプトが正しいか確認

### API接続エラー

- 環境変数`VITE_API_URL`が正しく設定されているか確認
- バックエンドAPIのURLが正しいか確認

### 404エラー

- `vite.config.js`の`base`が`/`に設定されているか確認
- SPA用のルーティング設定が正しいか確認

