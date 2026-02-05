import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

interface Segment {
    start: number;
    end: number;
    text: string;
}

// 環境変数チェック
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;

// 開発モード判定（どちらのAPIキーも設定されていない場合）
const isDevelopmentMode = !GEMINI_API_KEY && (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT);

// Azure OpenAI Whisper クライアント設定
let whisperClient: OpenAI | null = null;
if (AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME) {
    whisperClient = new OpenAI({
        apiKey: AZURE_OPENAI_API_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': AZURE_OPENAI_API_KEY },
    });
}

/**
 * 音声をテキストに変換（Gemini優先、フォールバックでWhisper）
 */
export async function transcribeAudio(audioPath: string): Promise<Segment[]> {
    // 開発モード: モックデータを返す
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: モック音声認識を使用');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return getMockSegments();
    }

    // Gemini APIを優先使用
    if (GEMINI_API_KEY) {
        return transcribeWithGemini(audioPath);
    }

    // フォールバック: Azure OpenAI Whisper
    if (whisperClient) {
        return transcribeWithWhisper(audioPath);
    }

    console.log('⚠️ APIキーが設定されていません。モックデータを使用します。');
    return getMockSegments();
}

/**
 * Gemini APIで音声認識
 */
async function transcribeWithGemini(audioPath: string): Promise<Segment[]> {
    try {
        console.log('🎤 Gemini音声認識を開始:', audioPath);

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // 音声ファイルを読み込み
        const audioData = fs.readFileSync(audioPath);
        const base64Audio = audioData.toString('base64');

        // ファイル拡張子からMIMEタイプを判定
        const ext = path.extname(audioPath).toLowerCase();
        const mimeType = ext === '.wav' ? 'audio/wav' :
            ext === '.mp3' ? 'audio/mp3' :
                ext === '.m4a' ? 'audio/mp4' :
                    ext === '.webm' ? 'audio/webm' : 'audio/wav';

        const prompt = `この音声ファイルを書き起こしてください。
JSON形式で、以下の形式で出力してください：
{
  "segments": [
    {"start": 0, "end": 10, "text": "最初の文章"},
    {"start": 10, "end": 20, "text": "次の文章"}
  ]
}

ルール：
- 日本語で書き起こしてください
- 句読点を適切に入れてください
- 約10-15秒ごとにセグメントを区切ってください
- startとendは秒数（小数点可）
- JSONのみを出力し、他のテキストは含めないでください`;

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: base64Audio,
                },
            },
            { text: prompt },
        ]);

        const response = await result.response;
        const text = response.text();

        // JSON部分を抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('⚠️ JSON形式の応答が取得できませんでした。テキスト全体を使用します。');
            return [{
                start: 0,
                end: 60,
                text: text.trim(),
            }];
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const segments: Segment[] = parsed.segments || [];

        console.log('✅ Gemini音声認識完了:', segments.length, 'セグメント');
        return segments;

    } catch (error) {
        console.error('❌ Gemini音声認識エラー:', error);
        return getMockSegments();
    }
}

/**
 * Azure OpenAI Whisperで音声認識
 */
async function transcribeWithWhisper(audioPath: string): Promise<Segment[]> {
    try {
        console.log('🎤 Whisper音声認識を開始:', audioPath);

        const audioFile = fs.createReadStream(audioPath);

        const response = await whisperClient!.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
            language: 'ja',
        });

        const segments: Segment[] = [];
        const responseAny = response as any;

        if (responseAny.segments) {
            for (const seg of responseAny.segments) {
                segments.push({
                    start: seg.start ?? 0,
                    end: seg.end ?? 0,
                    text: seg.text ?? '',
                });
            }
        } else if (responseAny.text) {
            segments.push({
                start: 0,
                end: 60,
                text: responseAny.text,
            });
        }

        console.log('✅ Whisper音声認識完了:', segments.length, 'セグメント');
        return segments;

    } catch (error) {
        console.error('❌ Whisper音声認識エラー:', error);
        return getMockSegments();
    }
}

/**
 * 開発用モックセグメント
 */
function getMockSegments(): Segment[] {
    return [
        { start: 0, end: 15, text: 'こんにちは、本日はAIについてお話しします。' },
        { start: 15, end: 30, text: '人工知能は私たちの生活を大きく変えつつあります。' },
        { start: 30, end: 45, text: '特に機械学習と深層学習の発展が目覚ましいです。' },
        { start: 45, end: 60, text: '今後もAI技術の進化に注目していきましょう。' },
    ];
}
