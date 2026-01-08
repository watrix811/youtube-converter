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
        const frontendUrl = process.env.VITE_FRONTEND_URL || '';
        if (!frontendUrl) {
          console.warn('⚠️ VITE_FRONTEND_URLが設定されていません。OGP画像のURLが正しく表示されない可能性があります。');
        }
        return html.replace(/%VITE_FRONTEND_URL%/g, frontendUrl);
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