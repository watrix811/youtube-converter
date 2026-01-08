import express from 'express';
import cors from 'cors';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定
app.use(cors());
app.use(express.json());

// 一時ファイル保存用ディレクトリ
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 進捗情報を保存するオブジェクト
const progressStore = new Map(); // { taskId: { progress: 0-100, status: 'downloading'|'converting' } }

// クリーンアップ関数（古い一時ファイルを削除）
const cleanupOldFiles = () => {
  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1時間

  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`Deleted old file: ${file}`);
    }
  });
};

// 定期的にクリーンアップ（10分ごと）
setInterval(cleanupOldFiles, 10 * 60 * 1000);

// 動画情報取得エンドポイント
app.get('/api/video/info', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // yt-dlpのパスを取得
    // 環境に応じて適切なパスを選択
    const ytdlpPaths = [
      process.env.YTDLP_PATH, // 環境変数で指定されたパス
      'yt-dlp', // システムパスにある場合
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      // ローカル開発環境用（Docker環境では不要）
      '/Users/watrix/Library/Python/3.12/bin/yt-dlp',
      '/Users/watrix/Library/Python/3.9/bin/yt-dlp',
    ].filter(Boolean); // undefined/nullを除外
    
    let ytdlpPath = ytdlpPaths[0] || 'yt-dlp';
    for (const p of ytdlpPaths) {
      try {
        execSync(`which ${p}`, { stdio: 'ignore' });
        ytdlpPath = p;
        console.log(`[yt-dlp info] Using path: ${p} (found via which)`);
        break;
      } catch {
        // パスが見つからない場合は次のパスを試す
        if (fs.existsSync(p)) {
          ytdlpPath = p;
          console.log(`[yt-dlp info] Using path: ${p} (found via file system)`);
          break;
        }
      }
    }
    console.log(`[yt-dlp info] Final path: ${ytdlpPath}`);
    
    // yt-dlpで動画情報を取得
    // YouTube用のオプションを設定
    const args = [
      '--dump-json',
      '--no-playlist',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--extractor-args', 'youtube:player_client=android',
      url
    ];
    
    const ytdlp = spawn(ytdlpPath, args);

    let data = '';
    let error = '';

    ytdlp.stdout.on('data', (chunk) => {
      data += chunk.toString();
      console.log('[yt-dlp info stdout]', chunk.toString().substring(0, 200));
    });

    ytdlp.stderr.on('data', (chunk) => {
      const errorChunk = chunk.toString();
      error += errorChunk;
      console.error('[yt-dlp info stderr]', errorChunk);
    });

    ytdlp.on('error', (err) => {
      console.error('yt-dlp spawn error:', err);
      if (err.code === 'ENOENT') {
        return res.status(500).json({ 
          error: 'yt-dlp not found. Please install yt-dlp: pip install yt-dlp',
          details: `Path tried: ${ytdlpPath}`
        });
      }
      return res.status(500).json({ error: 'Failed to execute yt-dlp', details: err.message });
    });

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        console.error('[yt-dlp info] Error output:', error);
        // エラーメッセージから重要な情報を抽出
        const errorLines = error.split('\n').filter(line => 
          line.trim() && 
          !line.toLowerCase().includes('warning') &&
          !line.toLowerCase().includes('deprecated feature')
        );
        // エラー行を優先的に表示
        const criticalErrors = errorLines.filter(line => 
          line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') ||
          line.toLowerCase().includes('forbidden') ||
          line.toLowerCase().includes('403')
        );
        const errorSummary = (criticalErrors.length > 0 
          ? criticalErrors.join('\n') 
          : errorLines.slice(-3).join('\n')) || error.substring(0, 500);
        
        return res.status(500).json({ 
          error: 'Failed to get video info', 
          details: errorSummary || 'Unknown error',
          fullError: error.substring(0, 1000)
        });
      }

      try {
        const info = JSON.parse(data);
        res.json({
          id: info.id,
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          uploader: info.uploader,
          url: url
        });
      } catch (parseError) {
        console.error('Parse error:', parseError);
        res.status(500).json({ error: 'Failed to parse video info' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 進捗情報取得エンドポイント
app.get('/api/video/progress', (req, res) => {
  const { taskId } = req.query;
  if (!taskId) {
    return res.status(400).json({ error: 'taskId parameter is required' });
  }
  const progress = progressStore.get(taskId) || { progress: 0, status: 'idle' };
  res.json(progress);
});

// 動画ダウンロードエンドポイント（音声のみ）
app.get('/api/video/download', async (req, res) => {
  const { url, format = 'mp3', bitrate = '128k', taskId } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const videoId = new URL(url).searchParams.get('v') || 
                   new URL(url).pathname.split('/').pop() || 
                   Date.now().toString();
    const outputPath = path.join(tempDir, `${videoId}.${format}`);
    const downloadTaskId = taskId || `download_${videoId}_${Date.now()}`;
    
    // 進捗情報を初期化
    progressStore.set(downloadTaskId, { progress: 0, status: 'downloading' });

    // yt-dlpのパスを取得
    // 環境に応じて適切なパスを選択
    const ytdlpPaths = [
      process.env.YTDLP_PATH, // 環境変数で指定されたパス
      'yt-dlp', // システムパスにある場合
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      // ローカル開発環境用（Docker環境では不要）
      '/Users/watrix/Library/Python/3.12/bin/yt-dlp',
      '/Users/watrix/Library/Python/3.9/bin/yt-dlp',
    ].filter(Boolean); // undefined/nullを除外
    
    let ytdlpPath = ytdlpPaths[0];
    for (const p of ytdlpPaths) {
      try {
        execSync(`which ${p}`, { stdio: 'ignore' });
        ytdlpPath = p;
        console.log(`[yt-dlp download] Using path: ${p} (found via which)`);
        break;
      } catch {
        // パスが見つからない場合は次のパスを試す
        if (fs.existsSync(p)) {
          ytdlpPath = p;
          console.log(`[yt-dlp download] Using path: ${p} (found via file system)`);
          break;
        }
      }
    }
    console.log(`[yt-dlp download] Final path: ${ytdlpPath}`);

    // yt-dlpで音声をダウンロード
    // YouTube用のオプションを設定
    const args = [
      '--extract-audio',
      '--audio-format', format,
      '--postprocessor-args', `ffmpeg:-b:a ${bitrate}`,
      '--output', outputPath,
      '--no-playlist',
      '--no-warnings',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--extractor-args', 'youtube:player_client=android',
      '--no-check-certificate',
      url
    ];

    const ytdlp = spawn(ytdlpPath, args);

    let error = '';

    ytdlp.stdout.on('data', (chunk) => {
      const output = chunk.toString();
      console.log('[yt-dlp stdout]', output);
      // 進捗情報を取得して保存
      const progressMatch = output.match(/(\d+\.\d+)%/);
      if (progressMatch) {
        const progressValue = parseFloat(progressMatch[1]);
        console.log(`Progress: ${progressValue}%`);
        progressStore.set(downloadTaskId, { 
          progress: Math.min(100, Math.max(0, progressValue)), 
          status: 'downloading' 
        });
      }
    });

    ytdlp.stderr.on('data', (chunk) => {
      const errorChunk = chunk.toString();
      error += errorChunk;
      console.error('[yt-dlp stderr]', errorChunk);
      // 進捗情報を取得して保存（stderrにも進捗情報が来る場合がある）
      const progressMatch = errorChunk.match(/(\d+\.\d+)%/);
      if (progressMatch) {
        const progressValue = parseFloat(progressMatch[1]);
        console.log(`Progress: ${progressValue}%`);
        progressStore.set(downloadTaskId, { 
          progress: Math.min(100, Math.max(0, progressValue)), 
          status: 'downloading' 
        });
      }
    });

    ytdlp.on('error', (err) => {
      console.error('yt-dlp spawn error:', err);
      if (err.code === 'ENOENT') {
        return res.status(500).json({ 
          error: 'yt-dlp not found. Please install yt-dlp: pip install yt-dlp',
          details: `Path tried: ${ytdlpPath}`
        });
      }
      return res.status(500).json({ error: 'Failed to execute yt-dlp', details: err.message });
    });

    ytdlp.on('close', async (code) => {
      // 進捗情報をクリア
      if (code === 0) {
        progressStore.set(downloadTaskId, { progress: 100, status: 'completed' });
        // 5秒後に進捗情報を削除
        setTimeout(() => {
          progressStore.delete(downloadTaskId);
        }, 5000);
      } else {
        progressStore.delete(downloadTaskId);
      }
      
      if (code !== 0) {
        console.error('yt-dlp exit code:', code);
        console.error('yt-dlp error output:', error);
        // エラーメッセージから重要な情報を抽出
        // WARNINGは除外するが、ERRORは含める
        const errorLines = error.split('\n').filter(line => 
          line.trim() && 
          !line.toLowerCase().includes('warning') &&
          !line.toLowerCase().includes('deprecated feature')
        );
        // エラー行を優先的に表示
        const criticalErrors = errorLines.filter(line => 
          line.toLowerCase().includes('error') || 
          line.toLowerCase().includes('failed') ||
          line.toLowerCase().includes('forbidden') ||
          line.toLowerCase().includes('403')
        );
        const errorSummary = (criticalErrors.length > 0 
          ? criticalErrors.join('\n') 
          : errorLines.slice(-5).join('\n')) || error.substring(0, 500);
        
        // エラーの種類に応じてより詳細なメッセージを提供
        let errorMessage = 'Failed to download video';
        if (error.includes('403') || error.includes('Forbidden')) {
          errorMessage = 'YouTubeへのアクセスが拒否されました。しばらく待ってから再度お試しください。';
        } else if (error.includes('Python version')) {
          errorMessage = 'Pythonのバージョンが古い可能性があります。警告のみで動作する可能性があります。';
        }
        
        return res.status(500).json({ 
          error: errorMessage, 
          details: errorSummary || 'Unknown error',
          fullError: error.substring(0, 1000) // 最初の1000文字のみ
        });
      }

      // ファイルが存在するか確認
      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: 'Downloaded file not found' });
      }

      // ファイルをストリーミング
      const stat = fs.statSync(outputPath);
      res.setHeader('Content-Type', `audio/${format}`);
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);

      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);

      // ストリーミング完了後にファイルを削除
      fileStream.on('end', () => {
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
            console.log(`Deleted temporary file: ${outputPath}`);
          }
        }, 1000);
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`PORT environment variable: ${process.env.PORT || 'not set (using default 3001)'}`);
  console.log(`This is running on Railway (container internal address)`);
  console.log(`External URL will be provided by Railway`);
});

