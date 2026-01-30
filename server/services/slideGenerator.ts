import OpenAI from 'openai';
import { nanoid } from 'nanoid';

interface Segment {
    id: string;
    start: number;
    end: number;
    text: string;
    correctedText?: string;
}

// レイアウトタイプの定義
type LayoutType =
    | 'title'           // タイトル・タイポグラフィ
    | 'data-emphasis'   // テキスト＋データ強調
    | 'three-columns'   // 3ステップ・カラム
    | 'two-columns'     // 2カラム（課題 vs 解決）
    | 'timeline'        // 年表リスト
    | 'bullet-points';  // シンプル箇条書き

interface Slide {
    id: string;
    layoutType: LayoutType;
    title: string;
    content: string[];
    emphasisNumber?: string;      // データ強調用の数字
    emphasisLabel?: string;       // 数字のラベル
    leftColumn?: string[];        // 2カラム左側
    rightColumn?: string[];       // 2カラム右側
    steps?: Array<{               // 3ステップ用
        number: string;
        title: string;
        description: string;
    }>;
    timelineItems?: Array<{       // タイムライン用
        year: string;
        description: string;
    }>;
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

// デザイン仕様プロンプト
const DESIGN_SYSTEM_PROMPT = `あなたはプロフェッショナルなプレゼンテーションデザイナーです。
音声認識結果から、洗練されたミニマルデザインのスライドを作成してください。

## デザイン原則
- トーン: プロフェッショナル、建築的、エッジの効いたミニマリズム
- 背景: 常に白（#FFFFFF）
- 言語: すべて日本語（固有名詞のみ英語可）
- 情報量: 1スライド1メッセージ。情報を絞る。
- 箇条書き: 1スライドに最大3〜4項目まで
- テキスト量: 本文は1スライドあたり50文字以内

## 使用可能なレイアウトタイプ
1. "title" - タイトルスライド。大胆なタイトルのみ。オープニングやセクション区切りに使用。
2. "data-emphasis" - 左にテキスト、右に巨大な数字。統計やデータを強調したい時に使用。
3. "three-columns" - 3つのステップやポイント。プロセス説明に最適。
4. "two-columns" - 左右2カラム。課題vs解決、ビフォーアフター、比較に使用。
5. "timeline" - 年表形式。歴史や経緯の説明に使用。
6. "bullet-points" - シンプルな箇条書き。一般的な説明に使用。

## 出力形式
JSON形式で以下の構造を返してください：
{
  "slides": [
    {
      "layoutType": "title" | "data-emphasis" | "three-columns" | "two-columns" | "timeline" | "bullet-points",
      "title": "スライドタイトル（大きく表示される）",
      "content": ["箇条書き1", "箇条書き2"],  // bullet-points用
      "emphasisNumber": "85%",  // data-emphasis用
      "emphasisLabel": "成功率",  // data-emphasis用
      "leftColumn": ["左の項目1", "左の項目2"],  // two-columns用
      "rightColumn": ["右の項目1", "右の項目2"],  // two-columns用
      "steps": [  // three-columns用
        {"number": "01", "title": "ステップ名", "description": "説明"}
      ],
      "timelineItems": [  // timeline用
        {"year": "2024", "description": "出来事"}
      ],
      "notes": "話者用メモ",
      "startTime": 0,
      "endTime": 15
    }
  ]
}

## 重要なルール
- 内容に最適なレイアウトを自動で選択すること
- 数字やデータがあれば data-emphasis を積極的に使用
- プロセスや手順があれば three-columns を使用
- 比較があれば two-columns を使用
- タイムスタンプを考慮して各スライドの時間を設定`;

/**
 * テキストセグメントからスライド構成を生成
 */
export async function generateSlides(segments: Segment[]): Promise<Slide[]> {
    // 開発モード: モックスライド生成
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: モックスライド生成を使用');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return getMockSlides();
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
                    content: DESIGN_SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: `以下の音声認識結果から、洗練されたミニマルデザインのスライドを作成してください：

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

        const slides: Slide[] = (result.slides || []).map((slide: any) => ({
            id: nanoid(8),
            layoutType: slide.layoutType || 'bullet-points',
            title: slide.title || 'タイトル',
            content: slide.content || [],
            emphasisNumber: slide.emphasisNumber,
            emphasisLabel: slide.emphasisLabel,
            leftColumn: slide.leftColumn,
            rightColumn: slide.rightColumn,
            steps: slide.steps,
            timelineItems: slide.timelineItems,
            notes: slide.notes || '',
            startTime: slide.startTime || 0,
            endTime: slide.endTime || 0,
            duration: Math.max(1, (slide.endTime || 0) - (slide.startTime || 0)),
        }));

        return slides;
    } catch (error) {
        console.error('❌ スライド生成エラー:', error);
        return getMockSlides();
    }
}

/**
 * 開発用モックスライド（6種類のレイアウトをデモ）
 */
function getMockSlides(): Slide[] {
    return [
        {
            id: nanoid(8),
            layoutType: 'title',
            title: '人工知能の基礎',
            content: [],
            notes: 'オープニングタイトル',
            startTime: 0,
            endTime: 15,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'data-emphasis',
            title: 'AI市場の成長',
            content: ['急速に拡大するAI市場', '2030年までの予測'],
            emphasisNumber: '1.8兆',
            emphasisLabel: 'ドル規模',
            notes: 'データ強調レイアウト',
            startTime: 15,
            endTime: 30,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'three-columns',
            title: 'AIの3つの柱',
            content: [],
            steps: [
                { number: '01', title: '機械学習', description: 'データから学習' },
                { number: '02', title: '深層学習', description: 'ニューラルネットワーク' },
                { number: '03', title: '生成AI', description: 'コンテンツ生成' },
            ],
            notes: '3ステップレイアウト',
            startTime: 30,
            endTime: 45,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'two-columns',
            title: '導入前後の変化',
            content: [],
            leftColumn: ['手作業でのデータ処理', '属人的な判断', '時間がかかる'],
            rightColumn: ['自動化されたワークフロー', 'データ駆動の意思決定', '高速処理'],
            notes: '2カラム比較レイアウト',
            startTime: 45,
            endTime: 60,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'timeline',
            title: 'AI発展の歴史',
            content: [],
            timelineItems: [
                { year: '1956', description: 'AI研究の始まり' },
                { year: '2012', description: 'ディープラーニング革命' },
                { year: '2022', description: '生成AIの台頭' },
            ],
            notes: 'タイムラインレイアウト',
            startTime: 60,
            endTime: 75,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'bullet-points',
            title: 'まとめ',
            content: [
                'AIは私たちの生活を変革している',
                '適切な活用が成功の鍵',
                '継続的な学習が重要',
            ],
            notes: 'クロージング',
            startTime: 75,
            endTime: 90,
            duration: 15,
        },
    ];
}
