import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

interface Segment {
    start: number;
    end: number;
    text: string;
}

/**
 * Gemini APIを使用して音声をテキストに変換
 */
export async function transcribeAudioWithGemini(audioPath: string): Promise<Segment[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
        console.log('⚠️ 開発モード: GEMINI_API_KEYが設定されていません。モックデータを使用します。');
        return getMockSegments();
    }

    try {
        console.log('🎤 Gemini音声認識を開始:', audioPath);

        const genAI = new GoogleGenerativeAI(geminiKey);
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
            console.log('⚠️ JSON形式の応答が取得できませんでした');
            // フォールバック: テキスト全体を1セグメントとして返す
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
 * 開発用モックデータ
 */
function getMockSegments(): Segment[] {
    return [
        { start: 0, end: 15, text: 'こんにちは、本日はAIについてお話しします。' },
        { start: 15, end: 30, text: '人工知能は私たちの生活を大きく変えつつあります。' },
        { start: 30, end: 45, text: '特に機械学習と深層学習の発展が目覚ましいです。' },
        { start: 45, end: 60, text: '今後もAI技術の進化に注目していきましょう。' },
    ];
}
