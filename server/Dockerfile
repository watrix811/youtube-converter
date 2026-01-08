FROM node:20-slim

# Python 3.12とffmpegをインストール
RUN apt-get update && apt-get install -y \
    python3.12 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# yt-dlpをインストール
RUN pip3 install yt-dlp

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
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "index.js"]

