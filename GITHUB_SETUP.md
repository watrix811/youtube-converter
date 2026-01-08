# GitHubリポジトリの作成とプッシュ手順

## ステップ1: GitHubでリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」アイコンをクリック → **「New repository」**を選択
3. リポジトリ名を入力（例: `youtube-converter` または `mp3-converter`）
4. **「Public」**または**「Private」**を選択
5. **「Initialize this repository with a README」**は**チェックしない**（既存のプロジェクトをプッシュするため）
6. **「Create repository」**をクリック

## ステップ2: ローカルでGitを初期化（まだの場合）

プロジェクトディレクトリで以下を実行：

```bash
cd /Users/watrix/mp3

# Gitが初期化されていない場合
git init

# すべてのファイルをステージング
git add .

# 初回コミット
git commit -m "Initial commit: YouTube変換ツール"
```

## ステップ3: GitHubリポジトリと接続

GitHubで作成したリポジトリのURLをコピー（例: `https://github.com/your-username/youtube-converter.git`）

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/your-username/youtube-converter.git

# ブランチ名をmainに変更（必要に応じて）
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

## ステップ4: Railwayでリポジトリを接続

1. Railwayのダッシュボードに戻る
2. **「New Project」**をクリック
3. **「GitHub Repository」**を選択
4. 先ほど作成したリポジトリが表示されるので選択
5. デプロイが自動的に開始されます

## トラブルシューティング

### GitHub認証エラー

```bash
# GitHub CLIを使用する場合
gh auth login

# または、HTTPSの代わりにSSHを使用
git remote set-url origin git@github.com:your-username/youtube-converter.git
```

### 既存のリモートがある場合

```bash
# 既存のリモートを確認
git remote -v

# 既存のリモートを削除してから追加
git remote remove origin
git remote add origin https://github.com/your-username/youtube-converter.git
```

## 注意事項

### アップロードしないファイル

`.gitignore`に以下が含まれていることを確認：

- `node_modules/`
- `.env`
- `dist/`（ビルド成果物）
- `server/temp/`（一時ファイル）
- その他の機密情報

### 環境変数ファイル

`.env`ファイルはGitHubにプッシュしないでください。
代わりに、Railwayの環境変数設定で直接設定します。

