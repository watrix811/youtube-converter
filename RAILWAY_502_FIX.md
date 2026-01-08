# Railway 502エラーの解決方法

## 現在の状況

ログを見ると、サーバーは正常に起動しています：
- ✅ `Server is running on http://0.0.0.0:8080`
- ✅ `PORT environment variable: 8080`
- ✅ エラーメッセージなし

しかし、502エラーが発生している場合、RailwayのPublic Networking設定に問題がある可能性があります。

## 解決手順

### 1. Public Networkingの設定確認

1. Railwayのダッシュボードでプロジェクトを開く
2. サービス（youtube-converter）をクリック
3. **「Settings」**タブを開く
4. **「Networking」**セクションを確認

### 2. Generate Domainの設定

1. **「Networking」**セクションで**「Generate Domain」**をクリック
2. ポート番号を確認：
   - Railwayが自動設定したポート（8080など）を使用
   - または、`PORT`環境変数の値を確認
3. **「Generate Domain」**ボタンをクリック

### 3. ポート番号の確認方法

Railwayは自動的に`PORT`環境変数を設定します。ログで確認：
```
PORT environment variable: 8080
```

この値（8080）をPublic Networkingの設定で使用してください。

### 4. 環境変数の確認

1. **「Variables」**タブを開く
2. `PORT`環境変数が設定されているか確認
3. 設定されていない場合は、Railwayが自動設定しているので問題ありません

### 5. 再デプロイ

設定を変更した後、再デプロイが必要な場合があります：
1. **「Deployments」**タブを開く
2. 最新のデプロイの**「Redeploy」**をクリック

## 確認事項

### ✅ 正常に動作している場合のログ

```
✅ Server is running on http://0.0.0.0:8080
PORT environment variable: 8080
```

### ❌ 問題がある場合のログ

- エラーメッセージが表示されている
- サーバーが起動していない
- ポート番号が表示されていない

## 動作確認

設定が完了したら、以下のURLで動作確認：

```
https://youtube-converter-production.up.railway.app/api/health
```

以下のレスポンスが返れば正常：
```json
{"status":"ok","message":"Server is running"}
```

## トラブルシューティング

### 502エラーが続く場合

1. **HTTP Logs**を確認
   - リクエストが来ているか
   - エラーレスポンスが返っているか

2. **Deploy Logs**を確認
   - サーバーが起動しているか
   - エラーメッセージがないか

3. **Public Networking**の設定を再確認
   - ポート番号が正しいか
   - Domainが生成されているか

4. **Railwayのサポートに問い合わせ**
   - 上記を確認しても解決しない場合

