import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// --- コンポーネント: 音声プレビューカード ---
const AudioPreviewItem = ({ file, status, newSize, format }) => {
  return (
    <div className="border rounded p-3 flex flex-col items-center bg-white shadow-sm hover:shadow-md transition relative overflow-hidden">
      {/* ステータスバッジ */}
      {status === 'done' && (
        <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow z-10">
          完了
        </div>
      )}
      {status === 'processing' && (
        <div className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow z-10 animate-pulse">
          処理中
        </div>
      )}
      
      {/* アイコン表示 */}
      <div className="w-full h-24 bg-slate-50 border border-slate-100 mb-2 rounded flex flex-col items-center justify-center overflow-hidden text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 mb-1">
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
          <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
        </svg>
        <span className="text-xs uppercase">{file.name.split('.').pop()}</span>
      </div>

      {/* ファイル情報 */}
      <div className="w-full text-center">
        <p className="text-xs text-slate-700 font-bold truncate mb-1" title={file.name}>
          {file.name}
        </p>
        <div className="flex justify-between text-[10px] text-slate-400 px-2">
          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <span>→</span>
          {newSize ? (
            <span className="text-blue-600 font-bold">{(newSize / 1024 / 1024).toFixed(2)} MB</span>
          ) : (
            <span>---</span>
          )}
        </div>
        {status === 'done' && (
          <p className="text-[10px] text-green-600 mt-1 font-mono">
             converted to .{format}
          </p>
        )}
      </div>
    </div>
  );
};

// --- メインアプリ ---
function App() {
  // ステート
  const [files, setFiles] = useState([]); // { file, id, status, newBlob, newSize }
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(new FFmpeg());

  // 設定ステート（音声用）
  const [settings, setSettings] = useState({
    bitrate: '128k',   // ビットレート (例: 128k, 192k, 320k)
    format: 'mp3',     // 出力形式 (mp3, m4a, wav)
  });

  // URL入力用ステート
  const [videoUrl, setVideoUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  
  // 進捗表示用ステート
  const [downloadProgress, setDownloadProgress] = useState(0); // YouTubeダウンロード進捗 (0-100)
  const [conversionProgress, setConversionProgress] = useState(0); // 変換進捗 (0-100)
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null); // 現在処理中のファイルID

  // FFmpegのロード
  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async (retryCount = 0) => {
    const maxRetries = 2;
    setStatusMessage('エンジンをロード中...');
    const ffmpeg = ffmpegRef.current;
    
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg log]', message);
    });

    try {
      // 必要なファイルをCDNから取得してロード
      // esmバージョンを使用（より安定している）
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      setStatusMessage('FFmpegコアファイルをダウンロード中...');
      let coreURL;
      try {
        coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        console.log('Core URL loaded:', coreURL);
      } catch (err) {
        console.error('Failed to load core URL:', err);
        // フォールバック: umdバージョンを試す
        try {
          const fallbackURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js';
          coreURL = await toBlobURL(fallbackURL, 'text/javascript');
          console.log('Core URL loaded (fallback):', coreURL);
        } catch (fallbackErr) {
          throw new Error(`コアファイルのダウンロードに失敗: ${err.message || err}`);
        }
      }
      
      setStatusMessage('WASMファイルをダウンロード中...');
      let wasmURL;
      try {
        wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        console.log('WASM URL loaded:', wasmURL);
      } catch (err) {
        console.error('Failed to load WASM URL:', err);
        // フォールバック: umdバージョンを試す
        try {
          const fallbackURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm';
          wasmURL = await toBlobURL(fallbackURL, 'application/wasm');
          console.log('WASM URL loaded (fallback):', wasmURL);
        } catch (fallbackErr) {
          throw new Error(`WASMファイルのダウンロードに失敗: ${err.message || err}`);
        }
      }
      
      setStatusMessage('FFmpegを初期化中...');
      try {
        await ffmpeg.load({
          coreURL,
          wasmURL,
        });
        console.log('FFmpeg loaded successfully');
      } catch (err) {
        console.error('FFmpeg.load() failed:', err);
        // より詳細なエラー情報を取得
        const errorDetails = {
          message: err?.message || 'Unknown error',
          name: err?.name || 'Error',
          stack: err?.stack || '',
          toString: err?.toString?.() || ''
        };
        console.error('FFmpeg.load() error details:', errorDetails);
        throw new Error(`FFmpegの初期化に失敗: ${errorDetails.message}`);
      }
      
      setFfmpegLoaded(true);
      setStatusMessage('準備完了。YouTubeのURLを入力してください。');
    } catch (error) {
      // エラーオブジェクトの詳細を取得
      const errorMessage = error?.message || error?.toString() || '不明なエラー';
      const errorName = error?.name || 'Error';
      const errorStack = error?.stack || '';
      
      console.error('FFmpeg load failed:', error);
      console.error('Error details:', {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
        error: error
      });
      
      if (retryCount < maxRetries) {
        setStatusMessage(`エンジンのロードに失敗しました。リトライ中... (${retryCount + 1}/${maxRetries})`);
        // 2秒待ってからリトライ
        await new Promise(resolve => setTimeout(resolve, 2000));
        return loadFFmpeg(retryCount + 1);
      } else {
        // より詳細なエラーメッセージを表示
        const detailedMessage = errorMessage !== '不明なエラー' 
          ? errorMessage 
          : `エラーが発生しました。ブラウザのコンソールを確認してください。 (${errorName})`;
        setStatusMessage(`エンジンのロードに失敗しました: ${detailedMessage}`);
        
        // 詳細なエラー情報をコンソールに表示
        console.error('FFmpeg load error details:', {
          error: error,
          name: errorName,
          message: errorMessage,
          stack: errorStack,
          toString: error?.toString()
        });
      }
    }
  };

  // ファイル追加時の処理
  const onDrop = (acceptedFiles) => {
    // ローカルファイルの処理にはFFmpegが必要
    if (!ffmpegLoaded) {
      alert('エンジンがまだロードされていません。少し待ってから再度お試しください。\n\nURLからのダウンロードはエンジン不要で利用できます。');
      return;
    }
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: crypto.randomUUID(), // 一意なID
      status: 'idle', // idle, processing, done, error
      newBlob: null,
      newSize: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setStatusMessage(`${newFiles.length}件追加しました`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'audio/*': [],
      'video/*': [] // 動画から音声抽出も可能にする
    },
    noClick: false,
    noKeyboard: true
  });

  // YouTubeのURL検証
  const isValidVideoUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // YouTubeのURLパターン
      const youtubePatterns = [
        /^www\.youtube\.com$/,
        /^youtube\.com$/,
        /^m\.youtube\.com$/,
        /^youtu\.be$/,
        /^www\.youtu\.be$/
      ];
      
      const isYouTube = youtubePatterns.some(pattern => pattern.test(hostname));
      
      return isYouTube;
    } catch {
      return false;
    }
  };

  // URLから動画を取得して追加
  const handleUrlSubmit = async () => {
    if (!videoUrl.trim()) {
      setStatusMessage('URLを入力してください。');
      return;
    }

    if (!isValidVideoUrl(videoUrl)) {
      setStatusMessage('YouTubeのURLを入力してください。');
      return;
    }

    // URLからのダウンロードはバックエンドAPIで処理されるため、FFmpegは不要
    setIsLoadingUrl(true);
    setStatusMessage('動画情報を取得中...');

    try {
      // APIのベースURLを環境変数から取得（本番環境ではRailwayのURL、開発環境では空文字でプロキシを使用）
      const API_BASE_URL = import.meta.env.VITE_API_URL || '';
      
      // バックエンドAPIから動画情報を取得
      const infoResponse = await fetch(`${API_BASE_URL}/api/video/info?url=${encodeURIComponent(videoUrl)}`);
      
      if (!infoResponse.ok) {
        const errorData = await infoResponse.json();
        const errorMessage = errorData.error || '動画情報の取得に失敗しました';
        throw new Error(errorMessage);
      }

      const videoInfo = await infoResponse.json();
      setStatusMessage('動画をダウンロード中...');
      setDownloadProgress(0);

      // タスクIDを生成
      const taskId = `download_${videoInfo.id}_${Date.now()}`;
      
      // 進捗ポーリングを開始
      const progressInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${API_BASE_URL}/api/video/progress?taskId=${encodeURIComponent(taskId)}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setDownloadProgress(progressData.progress || 0);
            if (progressData.status === 'completed') {
              clearInterval(progressInterval);
            }
          }
        } catch (e) {
          console.error('Progress polling error:', e);
        }
      }, 500); // 0.5秒ごとにポーリング

      // バックエンドAPIから動画をダウンロード（音声のみ）
      const downloadResponse = await fetch(
        `${API_BASE_URL}/api/video/download?url=${encodeURIComponent(videoUrl)}&format=${settings.format}&bitrate=${settings.bitrate}&taskId=${encodeURIComponent(taskId)}`
      );
      
      // ダウンロード完了時にポーリングを停止
      clearInterval(progressInterval);

      if (!downloadResponse.ok) {
        let errorMessage = '動画のダウンロードに失敗しました';
        try {
          const errorData = await downloadResponse.json();
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
          console.error('Download error details:', errorData);
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }

      // ダウンロード完了
      setDownloadProgress(100);
      
      // ダウンロードした音声ファイルをBlobとして取得
      const audioBlob = await downloadResponse.blob();
      
      // ファイル名を生成
      const safeTitle = videoInfo.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `${safeTitle}.${settings.format}`;
      
      // BlobからFileオブジェクトを作成
      const audioFile = new File([audioBlob], fileName, { type: `audio/${settings.format}` });

      // ファイルリストに追加
      const newFile = {
        file: audioFile,
        id: crypto.randomUUID(),
        status: 'idle',
        newBlob: null,
        newSize: audioBlob.size,
        videoUrl: videoUrl,
        videoTitle: videoInfo.title
      };

      setFiles(prev => [...prev, newFile]);
      setStatusMessage(`${videoInfo.title} を追加しました`);
      setVideoUrl('');

    } catch (error) {
      console.error('URL処理エラー:', error);
      setStatusMessage(`エラー: ${error.message}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // ステータス更新ヘルパー
  const updateFileStatus = (id, newStatus, additionalData = {}) => {
    setFiles(prevFiles => 
      prevFiles.map(f => f.id === id ? { ...f, status: newStatus, ...additionalData } : f)
    );
  };

  // 音声処理ロジック (FFmpeg使用)
  const processAudio = async (fileItem, fileIndex, totalFiles) => {
    const ffmpeg = ffmpegRef.current;
    const { file, id } = fileItem;
    const inputFileName = `input_${id}.${file.name.split('.').pop()}`;
    const outputExt = settings.format;
    const outputFileName = `output_${id}.${outputExt}`;

    updateFileStatus(id, 'processing');
    setCurrentProcessingFile(id);
    
    // 変換開始時の進捗を計算
    const baseProgress = totalFiles > 0 ? (fileIndex / totalFiles) * 100 : 0;
    setConversionProgress(baseProgress);

    try {
      // 1. ファイルをFFmpegの仮想ファイルシステムに書き込む
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));
      setConversionProgress(baseProgress + 5);

      // 2. FFmpegコマンドを実行
      // 例: ffmpeg -i input.wav -b:a 128k output.mp3
      const commands = ['-i', inputFileName];
      
      // ビットレート設定 (wav以外の場合のみ適用)
      if (outputExt !== 'wav') {
        commands.push('-b:a', settings.bitrate);
      }
      
      commands.push(outputFileName);

      console.log('Running FFmpeg:', commands.join(' '));
      
      // FFmpegの進捗を監視（ログから進捗を推定）
      let ffmpegProgress = 0;
      const progressInterval = setInterval(() => {
        // FFmpegの進捗を推定（実際の進捗は取得困難なため、時間ベースで推定）
        if (ffmpegProgress < 85) {
          ffmpegProgress += 5;
          const currentFileProgress = baseProgress + 5 + (ffmpegProgress * 0.9);
          setConversionProgress(Math.min(100, currentFileProgress));
        }
      }, 500);
      
      await ffmpeg.exec(commands);
      clearInterval(progressInterval);
      setConversionProgress(baseProgress + 90);

      // 3. 出力ファイルを読み込む
      const data = await ffmpeg.readFile(outputFileName);
      
      // 4. 仮想ファイルシステムをお掃除
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      // Blob変換
      const blob = new Blob([data.buffer], { type: `audio/${outputExt}` });
      
      updateFileStatus(id, 'done', {
        newBlob: blob,
        newSize: blob.size
      });

      return { ...fileItem, newBlob: blob, status: 'done' };

    } catch (error) {
      console.error('Conversion failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      updateFileStatus(id, 'error');
      throw error;
    }
  };

  // 一括変換実行
  const handleProcessAndDownload = async () => {
    if (files.length === 0 || !ffmpegLoaded) return;
    
    // 既に完了しているファイルを除外して処理対象を決定
    const targetFiles = files.filter(f => f.status === 'idle');
    if (targetFiles.length === 0 && files.length > 0) {
         setStatusMessage('全てのファイルが処理済みです。');
         return;
    }

    setIsProcessing(true);
    setStatusMessage('変換処理中... (時間がかかる場合があります)');

    const zip = new JSZip();
    const folder = zip.folder("converted_audio");
    let successCount = 0;

    try {
      // 1つずつ順次処理 (FFmpegは負荷が高いので直列処理が無難)
      for (let i = 0; i < targetFiles.length; i++) {
        const item = targetFiles[i];
        try {
          const resultItem = await processAudio(item, i, targetFiles.length);
          
          // ZIPに追加
          const originalName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || 'audio';
          folder.file(`${originalName}_(${settings.bitrate}).${settings.format}`, resultItem.newBlob);
          successCount++;
        } catch (e) {
          console.error(`Failed to process ${item.file.name}`, e);
          console.error('Error details:', {
            message: e.message,
            stack: e.stack,
            name: e.name
          });
          setStatusMessage(`エラー: ${item.file.name} の処理に失敗しました - ${e.message}`);
        }
      }

      if (successCount > 0) {
        setStatusMessage('ZIP圧縮中...');
        // ZIPダウンロード
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "audio_converted.zip");
        setStatusMessage('完了！ダウンロードを開始します。');
      } else {
         setStatusMessage('処理に失敗しました。ログを確認してください。');
      }

    } catch (error) {
      console.error(error);
      setStatusMessage('予期せぬエラーが発生しました');
    } finally {
      setIsProcessing(false);
      setConversionProgress(0);
      setCurrentProcessingFile(null);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setStatusMessage('リストをクリアしました。');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]">
        
        {/* ▼ 左カラム: 操作パネル ▼ */}
        <div className="w-full md:w-80 bg-slate-50 p-6 border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          
          <h1 className="text-2xl font-extrabold mb-2 text-slate-800 items-center gap-2">
             YouTube変換ツール <span className="text-xs font-normal text-slate-400">Ver1.0</span>
          </h1>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            YouTubeの動画を音声ファイルに変換。<br/>
            MP3、M4A、WAV形式でダウンロードできます。
          </p>
          
          {/* Step 1: ファイル選択 */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Step 1: YouTube URL入力</h2>
            
            {/* URL入力 */}
            <div className="mb-4" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube URL"
                  disabled={isLoadingUrl}
                  className="flex-1 text-xs p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isLoadingUrl) {
                      handleUrlSubmit();
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUrlSubmit();
                  }}
                  disabled={isLoadingUrl || !videoUrl.trim()}
                  className={`px-4 py-2 text-xs font-bold rounded transition
                    ${isLoadingUrl || !videoUrl.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'}
                  `}
                >
                  {isLoadingUrl ? '取得中...' : '追加'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">YouTubeのURLを入力</p>
              {/* ダウンロード進捗バー */}
              {isLoadingUrl && downloadProgress > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                    <span>ダウンロード中...</span>
                    <span>{Math.round(downloadProgress)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* ドラッグ&ドロップ（オプション機能） */}
            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-50 px-2 text-slate-400">オプション: ローカルファイル</span>
              </div>
            </div>

            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition duration-200 ease-in-out mt-4
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-100'}
                ${!ffmpegLoaded ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} disabled={!ffmpegLoaded} />
              <p className="text-sm text-slate-600 font-medium">
                {!ffmpegLoaded ? 'エンジン起動中...' : '音声/動画をドラッグ\nまたはクリック'}
              </p>
              <p className="text-[10px] text-slate-400 mt-2">wav, mp3, m4a, mp4 etc.</p>
            </div>
          </div>

          {/* Step 2: 設定 */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Step 2: 変換設定</h2>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-5">
              
              {/* フォーマット選択 */}
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">出力形式</label>
                <div className="flex bg-slate-100 rounded p-1">
                  {['mp3', 'm4a', 'wav'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSettings({...settings, format: fmt})}
                      className={`flex-1 py-1 text-[10px] font-bold rounded transition uppercase
                        ${settings.format === fmt ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}
                      `}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* ビットレート設定 (wav以外) */}
              {settings.format !== 'wav' && (
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">音質 (ビットレート)</label>
                  <select
                    value={settings.bitrate}
                    onChange={(e) => setSettings({...settings, bitrate: e.target.value})}
                    className="w-full text-sm p-2 border border-slate-300 rounded focus:border-blue-500 focus:outline-none appearance-none bg-white cursor-pointer"
                    style={{backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-13%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2013l131.3%20131.3c3.6%203.6%207.9%205.4%2013%205.4s9.3-1.8%2013-5.4L287%2095.2a17.6%2017.6%200%200%200%205.4-13%2017.6%2017.6%200%200%200-5.4-13z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7em top 50%', backgroundSize: '.65em auto', paddingRight: '1.5em'}}
                  >
                    <option value="320k">320 kbps (高音質)</option>
                    <option value="256k">256 kbps</option>
                    <option value="192k">192 kbps (標準)</option>
                    <option value="128k">128 kbps (軽量)</option>
                    <option value="96k">96 kbps</option>
                    <option value="64k">64 kbps (会話向け)</option>
                  </select>
                </div>
              )}

            </div>
          </div>

          {/* アクション */}
          <div className="mt-auto pt-4 border-t border-slate-200">
            {/* 変換進捗バー */}
            {isProcessing && conversionProgress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                  <span>変換中...</span>
                  <span>{Math.round(conversionProgress)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${conversionProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleProcessAndDownload} 
              disabled={files.length === 0 || isProcessing || !ffmpegLoaded}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg transition transform active:scale-95
                ${files.length > 0 && !isProcessing && ffmpegLoaded
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30' 
                  : 'bg-slate-300 cursor-not-allowed shadow-none'}
              `}
            >
              {isProcessing ? '変換中...' : '変換 & ダウンロード'}
            </button>
            <p className="text-center text-xs text-blue-600 mt-3 font-semibold h-4 truncate">
              {statusMessage}
            </p>

            {/* コピーライト */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
              <div className="flex items-center space-x-2">
                <img src="logo.png" alt="WATRIX Logo" className="h-5 w-auto" />
                <p className="text-[10px] text-slate-400">
                  <a href="https://watrix.co.jp/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition underline">WATRIX</a> All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ▼ 右カラム: プレビューエリア ▼ */}
        <div className="flex-1 bg-slate-100/50 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-700">リスト <span className="text-slate-400 text-sm font-normal">({files.length}件)</span></h2>
            {files.length > 0 && !isProcessing && (
              <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded">
                リストをクリア
              </button>
            )}
          </div>
          
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 text-slate-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25a2.25 2.25 0 00-1.632-2.163l-1.32-.377a1.803 1.803 0 00-.99 3.467l2.31.66a2.25 2.25 0 011.632 2.163v3.75z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>YouTubeのURLを入力して追加してください</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
              {files.map((item) => (
                <AudioPreviewItem 
                  key={item.id} 
                  file={item.file} 
                  status={item.status}
                  newSize={item.newSize}
                  format={settings.format}
                />
              ))}
            </div>
          )}
        </div>

      </div>
      
      {/* 右下に表示するロゴ */}
      <a 
        href="https://watrix.co.jp/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="logo-fixed-link"
      >
        <img 
          src={`${import.meta.env.BASE_URL}biglogo.png`}
          alt="WATRIX Logo" 
          className="logo-fixed"
        />
      </a>
    </div>
  );
}

export default App;
