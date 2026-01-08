# hetemlレンタルサーバーでの対応状況

## 必要なツールの対応状況

### ❌ Node.js
**対応不可**
- hetemlの共有レンタルサーバーではNode.jsは利用できません
- バックエンドAPIサーバー（Express）を動かすことができません

### ❌ Python 3.12
**対応不可**
- hetemlではPythonの実行環境が提供されていません
- yt-dlpを実行することができません

### ❌ ffmpeg
**対応不可**
- hetemlではffmpegは利用できません
- 音声変換処理ができません

## 結論

**hetemlの共有レンタルサーバーでは、このアプリケーションを直接動作させることはできません。**

## 代替案

### 1. VPS（Virtual Private Server）の利用
- Node.js、Python、ffmpegを自由にインストール可能
- 推奨サービス：
  - ConoHa VPS
  - さくらのVPS
  - AWS EC2
  - Google Cloud Platform

### 2. クラウドサービス（PaaS）の利用
- **Heroku**（有料プラン）
  - Node.js対応
  - BuildpackでPython、ffmpegを追加可能
- **Railway**
  - Node.js対応
  - カスタムDockerイメージで対応可能
- **Render**
  - Node.js対応
  - カスタムDockerイメージで対応可能

### 3. アーキテクチャの変更

#### 案A: フロントエンドのみをhetemlに配置
- フロントエンド（静的ファイル）のみをhetemlに配置
- バックエンドAPIを別のサーバー（VPS/PaaS）で動作
- フロントエンドから外部APIを呼び出す

#### 案B: クライアントサイドのみで動作
- FFmpeg.wasmを利用したクライアントサイド変換のみ
- YouTubeダウンロード機能は削除
- ローカルファイルの変換のみ対応

### 4. 推奨構成（VPS使用時）

```
┌─────────────────┐
│  heteml         │
│  (フロントエンド) │
│  /mp3/          │
└────────┬────────┘
         │ API呼び出し
         ▼
┌─────────────────┐
│  VPS/PaaS       │
│  (バックエンド)   │
│  Node.js API    │
│  + yt-dlp       │
│  + ffmpeg       │
└─────────────────┘
```

## 実装例：フロントエンドとバックエンドを分離

### フロントエンド（heteml）
- `dist`ディレクトリの内容を`/mp3/`にアップロード
- 静的ファイルのみ

### バックエンド（VPS/PaaS）
- `server`ディレクトリをアップロード
- Node.js、Python、ffmpegをインストール
- CORS設定でhetemlのドメインを許可

### 設定変更

#### `server/index.js`のCORS設定
```javascript
app.use(cors({
  origin: ['https://your-heteml-domain.com'],
  credentials: true
}));
```

#### `src/App.jsx`のAPIエンドポイント
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-vps-domain.com';
const response = await fetch(`${API_BASE_URL}/api/video/info?url=...`);
```

## まとめ

heteml単体では動作しませんが、以下の方法で対応可能です：

1. **VPSを利用**（推奨）
   - すべての機能を1つのサーバーで動作
   - コスト: 月額1,000円〜

2. **フロントエンドとバックエンドを分離**
   - フロントエンド: heteml
   - バックエンド: VPS/PaaS
   - コスト: フロントエンドはhetemlの料金のみ

3. **PaaSを利用**
   - Heroku、Railway、Renderなど
   - コスト: 月額5ドル〜

最も簡単なのは、VPSを1つ用意して、すべての機能をそこで動作させる方法です。

