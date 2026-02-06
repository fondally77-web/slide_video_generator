import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

interface Segment {
    start: number;
    end: number;
    text: string;
}

// 日本語の平均話速（1分あたりの文字数）
const CHARS_PER_MINUTE = 320;

// Azure OpenAI GPT クライアント（遅延初期化）
let gptClient: OpenAI | null | undefined;
function getGptClient(): OpenAI | null {
    if (gptClient !== undefined) return gptClient;
    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    if (key && endpoint && deployment) {
        gptClient = new OpenAI({
            apiKey: key,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            defaultHeaders: { 'api-key': key },
        });
    } else {
        gptClient = null;
    }
    return gptClient;
}

const SEGMENTATION_PROMPT = `あなたはプレゼンテーション原稿の構造化の専門家です。
以下のテキストを、スライド1枚分に対応するセグメントに分割してください。

## ルール
- 内容の意味的なまとまりで分割する（話題の切り替わりを見極める）
- 1セグメントは50〜150文字程度を目安にする
- 導入・本論・まとめなどの構成を意識する
- 原文のテキストをそのまま使い、内容を変更しない

## 出力形式
JSONのみを出力してください：
{
  "segments": [
    {"text": "セグメント1のテキスト"},
    {"text": "セグメント2のテキスト"}
  ]
}`;

/**
 * テキストをAIでセグメント分割し、文字数から時間を算出
 */
export async function segmentText(text: string): Promise<Segment[]> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const azureKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const isDevelopmentMode = !geminiKey && (!azureKey || !azureEndpoint);

    let rawSegments: string[];

    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: 簡易セグメント分割を使用');
        rawSegments = simpleSplit(text);
    } else if (geminiKey) {
        rawSegments = await segmentWithGemini(text);
    } else {
        const client = getGptClient();
        if (client) {
            rawSegments = await segmentWithGPT(text);
        } else {
            rawSegments = simpleSplit(text);
        }
    }

    // 文字数から時間を算出してセグメントを構築
    return assignTimestamps(rawSegments);
}

/**
 * 文字数ベースでタイムスタンプを付与
 */
function assignTimestamps(texts: string[]): Segment[] {
    const segments: Segment[] = [];
    let currentTime = 0;

    for (const text of texts) {
        const charCount = text.length;
        const durationSeconds = (charCount / CHARS_PER_MINUTE) * 60;
        // 最低3秒、最大60秒
        const duration = Math.max(3, Math.min(60, Math.round(durationSeconds)));

        segments.push({
            start: currentTime,
            end: currentTime + duration,
            text,
        });

        currentTime += duration;
    }

    return segments;
}

/**
 * 簡易分割（句点・改行ベース）
 */
function simpleSplit(text: string): string[] {
    // 改行で分割し、空行を除去
    const lines = text.split(/\n+/).filter((line) => line.trim());

    // 各行が長すぎる場合は句点で分割
    const result: string[] = [];
    for (const line of lines) {
        if (line.length > 150) {
            const sentences = line.split(/(?<=[。！？])/).filter((s) => s.trim());
            let buffer = '';
            for (const sentence of sentences) {
                if (buffer.length + sentence.length > 150 && buffer.length > 0) {
                    result.push(buffer.trim());
                    buffer = sentence;
                } else {
                    buffer += sentence;
                }
            }
            if (buffer.trim()) {
                result.push(buffer.trim());
            }
        } else {
            result.push(line.trim());
        }
    }

    return result.length > 0 ? result : [text.trim()];
}

/**
 * Geminiでセグメント分割
 */
async function segmentWithGemini(text: string): Promise<string[]> {
    try {
        console.log('📝 Geminiテキスト分割を開始');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(
            `${SEGMENTATION_PROMPT}\n\nテキスト:\n${text}`
        );
        const response = await result.response;
        const responseText = response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('⚠️ AI分割失敗、簡易分割にフォールバック');
            return simpleSplit(text);
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const segments: string[] = (parsed.segments || []).map((s: any) => s.text);

        if (segments.length === 0) {
            return simpleSplit(text);
        }

        console.log('✅ Geminiテキスト分割完了:', segments.length, 'セグメント');
        return segments;
    } catch (error) {
        console.error('❌ Geminiテキスト分割エラー:', error);
        return simpleSplit(text);
    }
}

/**
 * Azure OpenAI GPTでセグメント分割
 */
async function segmentWithGPT(text: string): Promise<string[]> {
    try {
        console.log('📝 GPTテキスト分割を開始');

        const response = await getGptClient()!.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: SEGMENTATION_PROMPT },
                { role: 'user', content: text },
            ],
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content || '{"segments":[]}';
        const parsed = JSON.parse(content);
        const segments: string[] = (parsed.segments || []).map((s: any) => s.text);

        if (segments.length === 0) {
            return simpleSplit(text);
        }

        console.log('✅ GPTテキスト分割完了:', segments.length, 'セグメント');
        return segments;
    } catch (error) {
        console.error('❌ GPTテキスト分割エラー:', error);
        return simpleSplit(text);
    }
}
