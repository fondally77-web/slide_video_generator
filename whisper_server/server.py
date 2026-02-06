"""
ローカルWhisper音声認識サーバー
FastAPIを使用してOpenAI Whisperをローカルで実行
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
import json
import uvicorn

app = FastAPI(title="Local Whisper Server")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Whisperモデルをロード（初回は時間がかかる）
# small: 速度と精度のバランス、medium/large: より高精度
MODEL_SIZE = os.environ.get("WHISPER_MODEL", "small")
print(f"🔄 Whisperモデルをロード中: {MODEL_SIZE}...")
model = whisper.load_model(MODEL_SIZE)
print(f"✅ Whisperモデル準備完了: {MODEL_SIZE}")


@app.get("/")
async def root():
    return {"status": "ok", "model": MODEL_SIZE}


@app.get("/health")
async def health():
    return {"status": "healthy", "model": MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = "ja"):
    """
    音声ファイルを書き起こし
    """
    try:
        # 一時ファイルに保存
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        print(f"🎤 音声認識開始: {file.filename}")

        # Whisperで書き起こし
        result = model.transcribe(
            tmp_path,
            language=language,
            verbose=False,
            word_timestamps=True,
        )

        # 一時ファイル削除
        os.unlink(tmp_path)

        # セグメント形式に変換
        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"].strip(),
            })

        print(f"✅ 音声認識完了: {len(segments)}セグメント")

        return {
            "success": True,
            "text": result["text"],
            "segments": segments,
            "language": result.get("language", language),
        }

    except Exception as e:
        print(f"❌ エラー: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.environ.get("WHISPER_PORT", 8000))
    print(f"🚀 Local Whisper Server starting on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
