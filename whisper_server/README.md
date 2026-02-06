# ローカルWhisperサーバー

OpenAI Whisperをローカルで実行するPythonサーバーです。

## セットアップ

### 1. Python環境を準備
```bash
cd whisper_server
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
```

### 2. 依存関係をインストール
```bash
pip install -r requirements.txt
```

**注意**: `torch`のインストールには時間がかかります。GPUを使用する場合は、事前にCUDA対応のPyTorchをインストールしてください。

### 3. サーバーを起動
```bash
python server.py
```

デフォルトでポート8000で起動します。

## モデルサイズ

環境変数 `WHISPER_MODEL` でモデルサイズを指定できます：

| モデル | サイズ | 精度 | 速度 |
|--------|--------|------|------|
| tiny | 39MB | 低 | 最速 |
| base | 74MB | 中低 | 速い |
| small | 244MB | 中 | バランス（デフォルト） |
| medium | 769MB | 高 | 遅い |
| large | 1.5GB | 最高 | 最遅 |

例：
```bash
set WHISPER_MODEL=medium
python server.py
```

## API

### ヘルスチェック
```
GET /health
```

### 音声認識
```
POST /transcribe
Content-Type: multipart/form-data
file: 音声ファイル
language: ja（オプション）
```

レスポンス：
```json
{
  "success": true,
  "text": "全体のテキスト",
  "segments": [
    {"start": 0, "end": 5.5, "text": "セグメント1"},
    {"start": 5.5, "end": 10.2, "text": "セグメント2"}
  ]
}
```
