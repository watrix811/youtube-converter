# YouTube変換ツール

YouTubeの動画を音声ファイル（MP3、M4A、WAV）に変換するWebアプリケーションです。

## 機能

- YouTubeのURLから音声をダウンロード
- MP3、M4A、WAV形式に対応
- ビットレート設定可能（64k〜320k）
- 進捗表示（ダウンロード・変換）
- ローカルファイルの変換も対応（オプション）

## 技術スタック

### フロントエンド
- React
- Vite
- Tailwind CSS
- FFmpeg.wasm（クライアントサイド変換用）

### バックエンド
- Node.js
- Express
- yt-dlp（YouTubeダウンロード用）
- ffmpeg（音声変換用）

## セットアップ

### 開発環境

```bash
# 依存関係のインストール
npm install

# バックエンドサーバーの起動
npm run dev:server

# フロントエンドの起動（別ターミナル）
npm run dev

# または、両方を同時に起動
npm run dev:all
```

### 必要なツール

- Node.js 18以上
- Python 3.12以上（yt-dlp用）
- ffmpeg

## デプロイ

詳細は以下のドキュメントを参照：

- [Railwayデプロイ手順](./RAILWAY_DEPLOY.md)
- [GitHubセットアップ手順](./GITHUB_SETUP.md)

## ライセンス

© WATRIX Ltd. All rights reserved.
