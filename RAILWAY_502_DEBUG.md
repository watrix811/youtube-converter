# Railway 502エラーのデバッグ手順

## 現在の設定状況

✅ **Root Directory**: `/server` - 正しく設定されています
✅ **Public Networking**: `youtube-converter.up.railway.app` → Port 8080 - 正しく設定されています
✅ **Dockerfile Path**: `Dockerfile` - 正しく設定されています
✅ **サーバー起動**: ログで `Server is running on http://0.0.0.0:8080` が確認できています

## 502エラーの原因を特定する手順

### 1. HTTP Logsの確認（最重要）

1. Railwayのダッシュボードでサービスを開く
2. **「HTTP Logs」**タブを開く
3. 以下を確認：
   - リクエストが来ているか
   - エラーレスポンスの詳細
   - ステータスコード（502など）

### 2. 実際のAPIエンドポイントにアクセス

ブラウザまたはcurlで以下にアクセス：

```
https://youtube-converter.up.railway.app/api/health
```

エラーメッセージの詳細を確認してください。

### 3. Deploy Logsでエラーがないか再確認

1. **「Deploy Logs」**タブを開く
2. 最新のログを確認
3. 以下を確認：
   - `✅ Server is running` が表示されているか
   - `❌` で始まるエラーメッセージがないか
   - アプリケーションがクラッシュしていないか

### 4. 考えられる原因

#### 原因1: アプリケーションがリクエストを受け付けていない
- **確認方法**: HTTP Logsでリクエストが来ているか確認
- **解決方法**: アプリケーションの起動を確認

#### 原因2: ルーティングの問題
- **確認方法**: `/api/health`に直接アクセスしてエラーを確認
- **解決方法**: エンドポイントのパスを確認

#### 原因3: CORSの問題
- **確認方法**: ブラウザのコンソールでエラーを確認
- **解決方法**: CORS設定を確認（既に設定済み）

#### 原因4: Railwayのルーティング設定
- **確認方法**: Public Networkingの設定を再確認
- **解決方法**: ポート番号が正しいか確認（8080）

## テスト方法

### curlでテスト

```bash
curl https://youtube-converter.up.railway.app/api/health
```

### ブラウザでテスト

```
https://youtube-converter.up.railway.app/api/health
```

正常な場合のレスポンス：
```json
{"status":"ok","message":"Server is running"}
```

## 次のステップ

1. **HTTP Logs**を確認して、リクエストが来ているか確認
2. 実際にAPIエンドポイントにアクセスして、エラーの詳細を確認
3. エラーメッセージを共有していただければ、具体的な解決策を提案します

