import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'transform-html',
      transformIndexHtml(html) {
        // 環境変数からフロントエンドURLを取得（オプション）
        // 環境変数が設定されていない場合は、プレースホルダーをそのまま残す
        const frontendUrl = process.env.VITE_FRONTEND_URL || '';
        if (frontendUrl) {
          // URLの末尾にスラッシュがある場合は削除
          const cleanUrl = frontendUrl.replace(/\/$/, '');
          return html.replace(/%VITE_FRONTEND_URL%/g, cleanUrl);
        }
        // 環境変数が設定されていない場合は、プレースホルダーをそのまま返す
        // （現在はindex.htmlで固定URLを使用しているため、この処理は不要）
        return html;
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