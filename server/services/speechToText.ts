import OpenAI from 'openai';
import fs from 'fs';

interface Segment {
    start: number;
    end: number;
    text: string;
}

// 開発モード判定（環境変数が設定されていない場合）
const isDevelopmentMode = !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT;

// Azure OpenAI クライアント設定（環境変数が設定されている場合のみ）
let client: OpenAI | null = null;
if (!isDevelopmentMode) {
    client = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
    });
}

/**
 * 音声ファイルをテキストに変換（タイムスタンプ付き）
 */
export async function transcribeAudio(audioPath: string): Promise<Segment[]> {
    // 開発モード: モックデータを返す
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: モックデータを使用（.envファイルを設定してください）');
        // 少し待機してリアルな処理感を出す
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return [
            { start: 0, end: 15, text: 'こんにちは、今日は人工知能について説明します。' },
            { start: 15, end: 30, text: '人工知能、略してAIは、人間の知能を模倣する技術です。' },
            { start: 30, end: 45, text: '機械学習はAIの一分野で、データから学習することができます。' },
            { start: 45, end: 60, text: 'ディープラーニングは機械学習の発展形で、ニューラルネットワークを使用します。' },
            { start: 60, end: 75, text: 'これらの技術は、画像認識や自然言語処理などで活用されています。' },
        ];
    }

    try {
        console.log('🎤 音声認識を開始:', audioPath);

        const audioFile = fs.createReadStream(audioPath);

        const response = await client!.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            language: 'ja',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
        });

        console.log('✅ 音声認識完了');

        // セグメントを抽出
        // @ts-ignore - verbose_json形式の追加プロパティ
        const segments: Segment[] = (response.segments || []).map((seg: any) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text.trim(),
        }));

        // セグメントがない場合はテキスト全体を1セグメントに
        if (segments.length === 0 && response.text) {
            segments.push({
                start: 0,
                end: 60,
                text: response.text.trim(),
            });
        }

        return segments;
    } catch (error) {
        console.error('❌ 音声認識エラー:', error);
        throw error;
    }
}
