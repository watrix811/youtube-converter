# レンタルサーバーへの公開手順

## 前提条件

- Node.jsが利用可能なレンタルサーバー（バックエンドAPI用）
- フロントエンド用のWebサーバー（Apache/Nginxなど）
- Python 3.12以上（yt-dlp用）
- ffmpegがインストールされていること

## 1. フロントエンドのビルド

```bash
npm run build
```

ビルド後、`dist`ディレクトリに静的ファイルが生成されます。

## 2. アップロードするファイル

### フロントエンド（Webサーバー）

`dist`ディレクトリの内容を、レンタルサーバーの`/mp3/`ディレクトリにアップロード：

```
/mp3/
  ├── index.html
  ├── assets/
  │   ├── index-*.js
  │   └── index-*.css
  └── ...
```

### バックエンド（Node.jsサーバー）

`server`ディレクトリの内容をアップロード：

```
server/
  ├── index.js
  ├── package.json（必要に応じて）
  ├── temp/（空のディレクトリ、書き込み権限が必要）
  └── .gitignore
```

## 3. バックエンドサーバーの設定

### 必要なパッケージのインストール

サーバー上で：

```bash
cd server
npm install express cors
```

### 環境変数の設定

`.env`ファイルを作成（または環境変数を設定）：

```bash
PORT=3001
YTDLP_PATH=/path/to/yt-dlp  # 必要に応じて
```

### サーバーの起動

#### PM2を使用する場合（推奨）

```bash
npm install -g pm2
pm2 start server/index.js --name youtube-converter
pm2 save
pm2 startup  # 自動起動設定
```

#### systemdを使用する場合

`/etc/systemd/system/youtube-converter.service`を作成：

```ini
[Unit]
Description=YouTube Converter API Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/server
ExecStart=/usr/bin/node /path/to/server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

起動：

```bash
sudo systemctl enable youtube-converter
sudo systemctl start youtube-converter
```

## 4. リバースプロキシの設定

### Apacheの場合

`.htaccess`またはApache設定ファイルに追加：

```apache
# /mp3/へのリクエストをフロントエンドに
RewriteEngine On
RewriteBase /mp3/

# APIリクエストをバックエンドにプロキシ
RewriteCond %{REQUEST_URI} ^/mp3/api/
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# その他のリクエストはindex.htmlに
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /mp3/index.html [L]
```

`mod_proxy`と`mod_rewrite`が有効になっている必要があります。

### Nginxの場合

```nginx
location /mp3/ {
    alias /path/to/dist/;
    try_files $uri $uri/ /mp3/index.html;
    
    # CORSヘッダー（FFmpeg.wasm用）
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Resource-Policy cross-origin;
}

location /mp3/api/ {
    proxy_pass http://localhost:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## 5. 必要なツールのインストール

### yt-dlpのインストール

サーバー上で：

```bash
# Python 3.12以上が必要
python3.12 -m pip install yt-dlp

# または
pip3 install yt-dlp
```

### ffmpegのインストール

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# macOS (Homebrew)
brew install ffmpeg
```

## 6. ファイル権限の設定

```bash
# tempディレクトリに書き込み権限を付与
chmod 755 server/temp
chown your-user:your-group server/temp
```

## 7. 動作確認

1. フロントエンド: `https://your-domain.com/mp3/`
2. バックエンドAPI: `https://your-domain.com/mp3/api/health`

## トラブルシューティング

### 画像が表示されない

- `public/biglogo.png`が`dist`ディレクトリにコピーされているか確認
- パスが正しいか確認（`/mp3/biglogo.png`）

### APIに接続できない

- バックエンドサーバーが起動しているか確認
- ポート番号が正しいか確認
- ファイアウォール設定を確認

### yt-dlpが見つからない

- `server/index.js`の`ytdlpPaths`をサーバーの環境に合わせて修正
- Pythonのパスを確認

### ffmpegが見つからない

- `which ffmpeg`でパスを確認
- 環境変数`PATH`に含まれているか確認

