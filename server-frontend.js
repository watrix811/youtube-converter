import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 静的ファイルを配信（distディレクトリ）
// Railwayではプロジェクトルートが/appになるため、distは/app/dist
let distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  // フォールバック: 親ディレクトリのdistを探す
  const altPath = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(altPath)) {
    distPath = altPath;
  } else {
    console.error('❌ dist directory not found!');
    console.error(`Tried paths: ${path.join(__dirname, 'dist')}, ${altPath}`);
    process.exit(1);
  }
}
console.log(`📁 Serving files from: ${distPath}`);
app.use(express.static(distPath));

// SPA用：すべてのルートをindex.htmlにリダイレクト
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend server is running on http://0.0.0.0:${PORT}`);
  console.log(`Serving files from: ${distPath}`);
});
