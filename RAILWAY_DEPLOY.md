# Railwayデプロイ手順

## 前提条件

✅ RailwayとGitHubの接続が完了していること

## ステップ1: Railwayでプロジェクトを作成

1. Railwayのダッシュボードにアクセス
2. **「New Project」**をクリック
3. **「GitHub Repository」**を選択（画面に表示されているオプションから）
4. 接続済みのリポジトリ一覧が表示されるので、このプロジェクト（mp3）を選択
5. リポジトリを選択すると、自動的にデプロイが開始されます

## ステップ2: デプロイ設定

### 2-1. サービスタイプの選択

- **「Empty Service」**を選択（または自動検出された場合もOK）

### 2-2. ルートディレクトリの設定

Railwayの設定で以下を指定：

- **Root Directory**: `server`
- **Dockerfile Path**: `server/Dockerfile`（または`Dockerfile`）

### 2-3. 設定方法

1. 作成されたサービスをクリック
2. **「Settings」**タブを開く
3. **「Root Directory」**に`server`を入力
4. **「Dockerfile Path」**に`Dockerfile`を入力（または空欄のまま）

## ステップ3: 環境変数の設定（オプション）

通常は不要ですが、必要に応じて設定：

1. **「Variables」**タブを開く
2. 以下の環境変数を追加（必要に応じて）：
   - `PORT`: `3001`（Railwayが自動設定する場合は不要）
   - `YTDLP_PATH`: yt-dlpのパス（Dockerfileでインストールするため通常は不要）

## ステップ4: デプロイの確認

1. **「Deployments」**タブでデプロイの進行状況を確認
2. ログを確認してエラーがないかチェック
3. デプロイが完了したら、**「Settings」**タブの**「Generate Domain」**で公開URLを取得

## ステップ5: 動作確認

### 5-1. ヘルスチェック

```
https://your-app.railway.app/api/health
```

以下のレスポンスが返ればOK：
```json
{"status":"ok","message":"Server is running"}
```

### 5-2. 動画情報取得のテスト

```
https://your-app.railway.app/api/video/info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

## ステップ6: フロントエンドの設定

### 6-1. 環境変数の設定

フロントエンドのコードは既に修正済みです。RailwayのAPI URLを環境変数で設定します。

#### `.env.production`ファイルの作成

プロジェクトルートに`.env.production`ファイルを作成：

```env
VITE_API_URL=https://your-app.railway.app
```

**重要**: `your-app.railway.app`を実際のRailwayのURLに置き換えてください。

#### 開発環境用の`.env`ファイル（オプション）

開発環境でもRailwayのAPIを使用する場合：

```env
VITE_API_URL=https://your-app.railway.app
```

開発環境でローカルのAPIを使用する場合は、`.env`ファイルを作成しないか、空にしてください（`vite.config.js`のプロキシ設定が使用されます）。

#### `vite.config.js`の確認

本番環境では、`vite.config.js`の`proxy`設定は使用されません（ビルド後の静的ファイルのため）。
開発環境では、`VITE_API_URL`が設定されていない場合、プロキシ設定が使用されます。

### 6-2. ビルドとデプロイ

```bash
npm run build
```

`dist`ディレクトリの内容をhetemlなどのWebサーバーにアップロード。

## トラブルシューティング

### デプロイが失敗する場合

1. **ログを確認**
   - Railwayの**「Deployments」**タブでログを確認
   - エラーメッセージを確認

2. **Dockerfileの確認**
   - `server/Dockerfile`が正しいか確認
   - パスが正しいか確認

3. **package.jsonの確認**
   - `server/package.json`が存在するか確認
   - 依存関係が正しいか確認

### yt-dlpが見つからない場合

- Dockerfileで`pip3 install yt-dlp`が実行されているか確認
- ログでPythonとyt-dlpのインストールを確認

### ffmpegが見つからない場合

- Dockerfileで`apt-get install ffmpeg`が実行されているか確認
- ログでffmpegのインストールを確認

### ポートエラー

- Railwayは自動的に`PORT`環境変数を設定します
- `server/index.js`の`const PORT = process.env.PORT || 3001;`が正しく動作しているか確認

## 次のステップ

1. ✅ RailwayでのバックエンドAPIのデプロイ（完了）
2. フロントエンドのAPI URLを設定
3. フロントエンドをビルドしてhetemlにアップロード
4. 動作確認

## 参考

- [Railway Documentation](https://docs.railway.app/)
- [Railway Dockerfile Guide](https://docs.railway.app/deploy/dockerfiles)

