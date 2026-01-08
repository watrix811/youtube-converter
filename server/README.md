# バックエンドAPI

YouTubeから動画をダウンロードするためのバックエンドAPIサーバーです。

## 必要な環境

### yt-dlpのインストール

バックエンドAPIは`yt-dlp`を使用して動画をダウンロードします。以下のコマンドでインストールしてください：

```bash
# pipを使用
pip install yt-dlp

# または、homebrewを使用（macOS）
brew install yt-dlp
```

インストールが完了したか確認：
```bash
yt-dlp --version
```

## 起動方法

### バックエンドサーバーのみ起動
```bash
npm run dev:server
```

### フロントエンドとバックエンドを同時に起動
```bash
npm run dev:all
```

サーバーは `http://localhost:3001` で起動します。

## APIエンドポイント

### 動画情報取得
```
GET /api/video/info?url=<YouTubeのURL>
```

### 動画ダウンロード（音声のみ）
```
GET /api/video/download?url=<YouTubeのURL>&format=mp3&bitrate=128k
```

パラメータ:
- `url`: YouTubeのURL（必須）
- `format`: 出力形式（mp3, m4a, wavなど、デフォルト: mp3）
- `bitrate`: ビットレート（128k, 192k, 320kなど、デフォルト: 128k）

## 注意事項

- ダウンロードしたファイルは一時的に`server/temp/`ディレクトリに保存されます
- 1時間経過した古いファイルは自動的に削除されます
- 大量のリクエストを処理する場合は、適切なレート制限を実装することを推奨します

