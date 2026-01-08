import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'transform-html',
      transformIndexHtml(html) {
        // 環境変数からフロントエンドURLを取得
        // Railwayでは環境変数VITE_FRONTEND_URLを設定する必要があります
        // 例: https://youtube-converter-frontend.up.railway.app
        const frontendUrl = process.env.VITE_FRONTEND_URL;
        if (!frontendUrl) {
          throw new Error(
            '❌ VITE_FRONTEND_URL環境変数が設定されていません。\n' +
            'Railwayのフロントエンドサービスの「Variables」タブで以下の環境変数を設定してください：\n' +
            '  VARIABLE_NAME: VITE_FRONTEND_URL\n' +
            '  VALUE: https://your-frontend-url.up.railway.app\n' +
            '\n' +
            'OGP画像のURLは絶対URLである必要があるため、この環境変数は必須です。'
          );
        }
        // URLの末尾にスラッシュがある場合は削除
        const cleanUrl = frontendUrl.replace(/\/$/, '');
        return html.replace(/%VITE_FRONTEND_URL%/g, cleanUrl);
      },
    },
  ],
  base: '/', // Railwayでホスティングする場合はルートパス
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'], // Viteの最適化から除外
  },
  server: {
    headers: {
      // FFmpeg.wasmをマルチスレッドで動かすための設定
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      // CDNからのリソース読み込みを許可
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})