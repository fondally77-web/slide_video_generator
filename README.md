# Slide Video Generator

WAVファイルの音声またはテキスト入力からスライドを自動生成し、スライド切り替え時間付きPPTXを出力するWebアプリケーション。

## 機能

- 🎤 **音声認識**: Gemini API（優先）/ Azure OpenAI Whisper APIでタイムスタンプ付きテキスト変換
- 📝 **テキスト入力**: 音声認識が使えない場合、テキストを直接入力してスライド生成が可能
- ✏️ **誤字脱字修正**: Gemini / Azure OpenAI GPTで自動修正
- 📊 **スライド生成**: テキストから論理的なスライド構成を生成（10種類のレイアウト対応）
- ⏱️ **切り替え時間設定**: 音声タイムスタンプまたは文字数ベースの自動設定
- 🔊 **音声合成**: VOICEVOX連携でスライド読み上げ
- 📥 **PPTXダウンロード**: PowerPoint形式でエクスポート

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd slide_video_generator
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env` にコピーして、APIキーを設定:

```bash
cp .env.example .env
```

`.env` ファイルを編集（Gemini APIまたはAzure OpenAIのいずれかを設定）:

```env
# Gemini API（優先使用）
GEMINI_API_KEY=your-gemini-api-key

# Azure OpenAI（フォールバック）
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME=whisper
AZURE_OPENAI_DALLE_DEPLOYMENT_NAME=dall-e-3

# VOICEVOX（任意）
VOICEVOX_URL=http://localhost:50021

PORT=3005
```

> **注意**: APIキーが未設定の場合は開発モード（モックデータ）で動作します。サーバー起動時のログで設定状況を確認できます。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開く。

## 使い方

### 音声ファイルから

1. **ファイルアップロード**: WAVファイルをドラッグ＆ドロップ
2. **テキスト確認**: 音声認識結果を確認・編集
3. **誤字脱字修正**: 「AIで修正」ボタンで自動修正
4. **スライドプレビュー**: 生成されたスライドを確認
5. **ダウンロード**: PPTXファイルをダウンロード

### テキスト入力から

1. **テキスト入力**: アップロード画面で「テキスト入力」タブに切替え、テキストを貼り付け
2. **自動処理**: AIが誤字脱字修正 → セグメント分割 → 時間算出を実行
3. **テキスト確認**: 分割結果を確認・編集
4. **スライドプレビュー**: 生成されたスライドを確認
5. **ダウンロード**: PPTXファイルをダウンロード

> 音声ファイルのアップロードに失敗した場合、エラーメッセージからテキスト入力に切り替えることもできます。

## 技術スタック

- **フロントエンド**: React 18, TypeScript, Vite
- **バックエンド**: Express, TypeScript
- **音声認識**: Gemini API / Azure OpenAI Whisper API
- **テキスト生成**: Gemini API / Azure OpenAI GPT-4
- **画像生成**: Azure OpenAI DALL-E 3
- **音声合成**: VOICEVOX
- **PPTX生成**: pptxgenjs

## ディレクトリ構成

```
slide_video_generator/
├── client/              # フロントエンド (React)
│   └── src/
│       └── pages/       # ページコンポーネント
├── server/              # バックエンド (Express)
│   └── services/        # ビジネスロジック
│       ├── speechToText.ts       # 音声認識
│       ├── geminiSpeechToText.ts # Gemini音声認識
│       ├── textCorrection.ts     # 誤字脱字修正
│       ├── textSegmentation.ts   # テキスト分割・時間算出
│       ├── slideGenerator.ts     # スライド生成
│       ├── imageGenerator.ts     # 画像生成
│       ├── pptxGenerator.ts      # PPTX出力
│       └── voicevoxService.ts    # 音声合成
├── uploads/             # アップロードされた音声ファイル
├── output/              # 生成されたPPTX・音声ファイル
└── package.json
```

## 注意事項

- 対応形式: WAV (最大64MB)
- Gemini API / Azure OpenAI APIの利用には課金が発生します
- 生成されたPPTXはPowerPointの「スライドショー」モードで自動再生可能です
- テキスト入力時の時間算出は日本語話速（約320文字/分）を基準にしています
