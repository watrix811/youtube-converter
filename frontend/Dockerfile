FROM node:20-slim

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm install

# フロントエンドをビルド（環境変数を使用）
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_FRONTEND_URL=https://watrix.co.jp/mp3
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
COPY . .
RUN npm run build

# フロントエンドサーバーを起動
EXPOSE 3000

CMD ["node", "server-frontend.js"]
