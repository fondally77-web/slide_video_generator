# Slide Video Generator

WAVファイルの音声からスライドを自動生成し、スライド切り替え時間付きPPTXを出力するWebアプリケーション。

## 機能

- 🎤 **音声認識**: Azure OpenAI Whisper APIでタイムスタンプ付きテキスト変換
- ✏️ **誤字脱字修正**: Azure OpenAI GPTで自動修正
- 📊 **スライド生成**: テキストから論理的なスライド構成を生成
- ⏱️ **切り替え時間設定**: 音声タイムスタンプに基づく自動設定
- 📥 **PPTXダウンロード**: PowerPoint形式でエクスポート

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd slide_video_generator
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして、Azure OpenAI APIキーを設定:

```bash
cp .env.example .env
```

`.env` ファイルを編集:

```env
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME=whisper
PORT=3001
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

## 使い方

1. **ファイルアップロード**: WAVファイルをドラッグ＆ドロップ
2. **テキスト確認**: 音声認識結果を確認・編集
3. **誤字脱字修正**: 「AIで修正」ボタンで自動修正
4. **スライドプレビュー**: 生成されたスライドを確認
5. **ダウンロード**: PPTXファイルをダウンロード

## 技術スタック

- **フロントエンド**: React 18, TypeScript, Vite
- **バックエンド**: Express, TypeScript
- **音声認識**: Azure OpenAI Whisper API
- **テキスト生成**: Azure OpenAI GPT-4
- **PPTX生成**: pptxgenjs

## ディレクトリ構成

```
slide_video_generator/
├── client/              # フロントエンド (React)
│   └── src/
│       └── pages/       # ページコンポーネント
├── server/              # バックエンド (Express)
│   └── services/        # ビジネスロジック
├── uploads/             # アップロードされた音声ファイル
├── output/              # 生成されたPPTXファイル
└── package.json
```

## 注意事項

- 対応形式: WAV (最大16MB)
- Azure OpenAI APIの利用には課金が発生します
- 生成されたPPTXはPowerPointの「スライドショー」モードで自動再生可能です
