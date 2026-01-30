import OpenAI from 'openai';
import { nanoid } from 'nanoid';

interface Segment {
    id: string;
    start: number;
    end: number;
    text: string;
    correctedText?: string;
}

interface Slide {
    id: string;
    title: string;
    content: string[];
    notes: string;
    startTime: number;
    endTime: number;
    duration: number;
}

// 開発モード判定
const isDevelopmentMode = !process.env.AZURE_OPENAI_API_KEY || !process.env.AZURE_OPENAI_ENDPOINT;

// Azure OpenAI GPT クライアント設定
let client: OpenAI | null = null;
if (!isDevelopmentMode) {
    client = new OpenAI({
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY },
    });
}

/**
 * テキストセグメントからスライド構成を生成
 */
export async function generateSlides(segments: Segment[]): Promise<Slide[]> {
    // 開発モード: モックスライド生成
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: モックスライド生成を使用');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return [
            {
                id: nanoid(8),
                title: 'イントロダクション',
                content: [
                    '本日のテーマ：人工知能（AI）の基礎',
                    'AIとは何か？',
                    'なぜ今AIが注目されているのか？',
                ],
                notes: '導入部分。聴衆の関心を引く。',
                startTime: 0,
                endTime: 15,
                duration: 15,
            },
            {
                id: nanoid(8),
                title: '人工知能（AI）とは',
                content: [
                    '人間の知能を模倣する技術',
                    '学習、推論、問題解決が可能',
                    '様々な分野で活用が進む',
                ],
                notes: 'AIの定義を説明。',
                startTime: 15,
                endTime: 30,
                duration: 15,
            },
            {
                id: nanoid(8),
                title: '機械学習の概要',
                content: [
                    'AIの一分野',
                    'データから自動的に学習',
                    'パターン認識と予測が得意',
                ],
                notes: '機械学習の基本概念を説明。',
                startTime: 30,
                endTime: 45,
                duration: 15,
            },
            {
                id: nanoid(8),
                title: 'ディープラーニング',
                content: [
                    '機械学習の発展形',
                    'ニューラルネットワークを使用',
                    '複雑なパターンを認識可能',
                ],
                notes: 'ディープラーニングの特徴を説明。',
                startTime: 45,
                endTime: 60,
                duration: 15,
            },
            {
                id: nanoid(8),
                title: 'AI技術の活用例',
                content: [
                    '画像認識：顔認証、医療画像診断',
                    '自然言語処理：翻訳、チャットボット',
                    '音声認識：スマートスピーカー',
                ],
                notes: '具体的な活用例を紹介。',
                startTime: 60,
                endTime: 75,
                duration: 15,
            },
        ];
    }

    try {
        console.log('📊 スライド生成を開始');

        const segmentsText = segments
            .map((seg) => {
                const text = seg.correctedText || seg.text;
                return `[${seg.start.toFixed(1)}秒-${seg.end.toFixed(1)}秒] ${text}`;
            })
            .join('\n');

        const response = await client!.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `あなたは教育コンテンツのスライド作成の専門家です。音声認識結果からプレゼンテーションスライドを作成してください。

以下のルールに従ってください：
1. 内容を論理的なスライドに分割する（5〜15スライド程度）
2. 各スライドには明確なタイトルをつける
3. 箇条書きは3〜5項目程度
4. タイムスタンプを考慮して、各スライドの開始・終了時間を設定する
5. ノート欄には話者用のメモを記載する

出力は以下のJSON形式で返してください：
{
  "slides": [
    {
      "title": "スライドタイトル",
      "content": ["箇条書き1", "箇条書き2", "箇条書き3"],
      "notes": "話者用のノート",
      "startTime": 0,
      "endTime": 15
    }
  ]
}`,
                },
                {
                    role: 'user',
                    content: `以下の音声認識結果からスライドを作成してください：

${segmentsText}`,
                },
            ],
            temperature: 0.5,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content || '{"slides":[]}';
        const result = JSON.parse(content);

        console.log('✅ スライド生成完了:', result.slides?.length, 'スライド');

        const slides: Slide[] = (result.slides || []).map((slide: any, idx: number) => ({
            id: nanoid(8),
            title: slide.title || `スライド ${idx + 1}`,
            content: slide.content || [],
            notes: slide.notes || '',
            startTime: slide.startTime || 0,
            endTime: slide.endTime || 0,
            duration: Math.max(1, (slide.endTime || 0) - (slide.startTime || 0)),
        }));

        return slides;
    } catch (error) {
        console.error('❌ スライド生成エラー:', error);

        // フォールバック
        const slides: Slide[] = [];
        const groupSize = Math.ceil(segments.length / 5);

        for (let i = 0; i < segments.length; i += groupSize) {
            const group = segments.slice(i, i + groupSize);
            const firstSeg = group[0];
            const lastSeg = group[group.length - 1];

            slides.push({
                id: nanoid(8),
                title: `セクション ${Math.floor(i / groupSize) + 1}`,
                content: group.map((s) => s.correctedText || s.text),
                notes: '',
                startTime: firstSeg.start,
                endTime: lastSeg.end,
                duration: Math.max(1, lastSeg.end - firstSeg.start),
            });
        }

        return slides;
    }
}
