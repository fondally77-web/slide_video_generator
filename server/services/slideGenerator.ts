import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { nanoid } from 'nanoid';

interface Segment {
    id: string;
    start: number;
    end: number;
    text: string;
    correctedText?: string;
}

// レイアウトタイプの定義（Phase 1 + Phase 2）
type LayoutType =
    // Phase 1
    | 'title'
    | 'data-emphasis'
    | 'three-columns'
    | 'two-columns'
    | 'timeline'
    | 'bullet-points'
    // Phase 2
    | 'network-diagram'
    | 'bubble-chart'
    | 'arrow-steps'
    | 'formula-flow';

interface Slide {
    id: string;
    layoutType: LayoutType;
    title: string;
    content: string[];
    emphasisNumber?: string;
    emphasisLabel?: string;
    leftColumn?: string[];
    rightColumn?: string[];
    steps?: Array<{ number: string; title: string; description: string }>;
    timelineItems?: Array<{ year: string; description: string }>;
    networkNodes?: Array<{ id: string; label: string }>;
    networkEdges?: Array<{ from: string; to: string }>;
    bubbles?: Array<{ label: string; size: 'small' | 'medium' | 'large'; overlap?: string[] }>;
    arrowSteps?: Array<{ label: string; description?: string }>;
    formula?: { left: string; operator: string; right: string; result: string };
    generateImage?: boolean;
    imagePrompt?: string;
    notes: string;
    startTime: number;
    endTime: number;
    duration: number;
}

// 環境変数チェック
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;

// 開発モード判定
const isDevelopmentMode = !GEMINI_API_KEY && (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT);

// Azure OpenAI GPT クライアント設定
let gptClient: OpenAI | null = null;
if (AZURE_OPENAI_API_KEY && AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
    gptClient = new OpenAI({
        apiKey: AZURE_OPENAI_API_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': AZURE_OPENAI_API_KEY },
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

### 基本レイアウト
1. "title" - タイトルスライド。大胆なタイトルのみ。
2. "data-emphasis" - 左にテキスト、右に巨大な数字。統計やデータ強調に。
3. "three-columns" - 3つのステップやポイント。プロセス説明に。
4. "two-columns" - 左右2カラム。課題vs解決、比較に。
5. "timeline" - 年表形式。歴史や経緯に。
6. "bullet-points" - シンプルな箇条書き。一般説明に。

### 高度なレイアウト
7. "network-diagram" - ネットワーク図解。関係性や接続を示す。
8. "bubble-chart" - バブルチャート/ベン図。重なり合う概念を示す。
9. "arrow-steps" - 矢印ステップ。線形プロセスや流れ。
10. "formula-flow" - 数式・フロー図。「A × B = C」形式の関係性。

## 出力形式
JSON形式で以下の構造を返してください（JSONのみ、他のテキストは不要）:
{
  "slides": [
    {
      "layoutType": "レイアウトタイプ",
      "title": "スライドタイトル",
      "content": ["箇条書き1", "箇条書き2"],
      "emphasisNumber": "85%",
      "emphasisLabel": "成功率",
      "leftColumn": ["左項目"],
      "rightColumn": ["右項目"],
      "steps": [{"number": "01", "title": "名前", "description": "説明"}],
      "timelineItems": [{"year": "2024", "description": "出来事"}],
      "networkNodes": [{"id": "a", "label": "ノードA"}],
      "networkEdges": [{"from": "a", "to": "b"}],
      "bubbles": [{"label": "概念A", "size": "large"}],
      "arrowSteps": [{"label": "ステップ1"}],
      "formula": {"left": "データ", "operator": "×", "right": "AI", "result": "インサイト"},
      "notes": "話者用メモ",
      "startTime": 0,
      "endTime": 15
    }
  ]
}`;

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

    // Gemini APIを優先使用
    if (GEMINI_API_KEY) {
        return generateWithGemini(segments);
    }

    // フォールバック: Azure OpenAI GPT
    if (gptClient) {
        return generateWithGPT(segments);
    }

    return getMockSlides();
}

/**
 * Geminiでスライド生成
 */
async function generateWithGemini(segments: Segment[]): Promise<Slide[]> {
    try {
        console.log('📊 Geminiスライド生成を開始');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const segmentsText = segments
            .map((seg) => {
                const text = seg.correctedText || seg.text;
                return `[${seg.start.toFixed(1)}秒-${seg.end.toFixed(1)}秒] ${text}`;
            })
            .join('\n');

        const prompt = `${DESIGN_SYSTEM_PROMPT}

以下の音声認識結果から、洗練されたミニマルデザインのスライドを作成してください。
内容に応じて最適なレイアウトを選択してください。

${segmentsText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // JSON部分を抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('⚠️ JSON形式の応答が取得できませんでした');
            return getMockSlides();
        }

        const parsed = JSON.parse(jsonMatch[0]);
        const slides: Slide[] = (parsed.slides || []).map((slide: any) => ({
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
            networkNodes: slide.networkNodes,
            networkEdges: slide.networkEdges,
            bubbles: slide.bubbles,
            arrowSteps: slide.arrowSteps,
            formula: slide.formula,
            notes: slide.notes || '',
            startTime: slide.startTime || 0,
            endTime: slide.endTime || 0,
            duration: Math.max(1, (slide.endTime || 0) - (slide.startTime || 0)),
        }));

        console.log('✅ Geminiスライド生成完了:', slides.length, 'スライド');
        return slides;

    } catch (error) {
        console.error('❌ Geminiスライド生成エラー:', error);
        return getMockSlides();
    }
}

/**
 * Azure OpenAI GPTでスライド生成
 */
async function generateWithGPT(segments: Segment[]): Promise<Slide[]> {
    try {
        console.log('📊 GPTスライド生成を開始');

        const segmentsText = segments
            .map((seg) => {
                const text = seg.correctedText || seg.text;
                return `[${seg.start.toFixed(1)}秒-${seg.end.toFixed(1)}秒] ${text}`;
            })
            .join('\n');

        const response = await gptClient!.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: DESIGN_SYSTEM_PROMPT },
                { role: 'user', content: `以下の音声認識結果から、洗練されたミニマルデザインのスライドを作成してください：\n\n${segmentsText}` },
            ],
            temperature: 0.5,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0]?.message?.content || '{"slides":[]}';
        const result = JSON.parse(content);

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
            networkNodes: slide.networkNodes,
            networkEdges: slide.networkEdges,
            bubbles: slide.bubbles,
            arrowSteps: slide.arrowSteps,
            formula: slide.formula,
            notes: slide.notes || '',
            startTime: slide.startTime || 0,
            endTime: slide.endTime || 0,
            duration: Math.max(1, (slide.endTime || 0) - (slide.startTime || 0)),
        }));

        console.log('✅ GPTスライド生成完了:', slides.length, 'スライド');
        return slides;

    } catch (error) {
        console.error('❌ GPTスライド生成エラー:', error);
        return getMockSlides();
    }
}

/**
 * 開発用モックスライド
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
            layoutType: 'bullet-points',
            title: 'まとめ',
            content: [
                'AIは私たちの生活を変革している',
                '適切な活用が成功の鍵',
                '継続的な学習が重要',
            ],
            notes: 'クロージング',
            startTime: 45,
            endTime: 60,
            duration: 15,
        },
    ];
}
