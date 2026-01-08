FROM node:20-slim

# Python 3とffmpegをインストール
# Debian Bookwormではpython3.11が利用可能（yt-dlpはPython 3.10以上で動作）
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# yt-dlpをインストール
# --break-system-packagesフラグが必要（Python 3.11+のexternally-managed-environment対策）
RUN pip3 install --break-system-packages yt-dlp

WORKDIR /app

# 依存関係をインストール
COPY package.json ./
RUN npm install

# アプリケーションをコピー
COPY . .

# 一時ディレクトリを作成
RUN mkdir -p temp && chmod 755 temp

EXPOSE 3001

# ヘルスチェック用のエンドポイントを確認
# Railwayは自動的にPORT環境変数を設定するため、環境変数を使用
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || '3001') + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]

