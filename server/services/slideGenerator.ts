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
    | 'title'           // タイトル・タイポグラフィ
    | 'data-emphasis'   // テキスト＋データ強調
    | 'three-columns'   // 3ステップ・カラム
    | 'two-columns'     // 2カラム（課題 vs 解決）
    | 'timeline'        // 年表リスト
    | 'bullet-points'   // シンプル箇条書き
    // Phase 2
    | 'network-diagram' // ネットワーク図解
    | 'bubble-chart'    // バブルチャート / ベン図
    | 'arrow-steps'     // 矢印ステップ
    | 'formula-flow';   // 数式・フロー図

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
    // Phase 2 追加フィールド
    networkNodes?: Array<{        // ネットワーク図解用
        id: string;
        label: string;
    }>;
    networkEdges?: Array<{        // ネットワーク図解用
        from: string;
        to: string;
    }>;
    bubbles?: Array<{             // バブルチャート用
        label: string;
        size: 'small' | 'medium' | 'large';
        overlap?: string[];       // 重なる他のバブルのラベル
    }>;
    arrowSteps?: Array<{          // 矢印ステップ用
        label: string;
        description?: string;
    }>;
    formula?: {                   // 数式・フロー用
        left: string;
        operator: string;         // ×, +, →, =
        right: string;
        result: string;
    };
    generateImage?: boolean;      // DALL-E画像生成フラグ
    imagePrompt?: string;         // 画像生成用プロンプト
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

// デザイン仕様プロンプト（Phase 2対応）
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

### 基本レイアウト（Phase 1）
1. "title" - タイトルスライド。大胆なタイトルのみ。
2. "data-emphasis" - 左にテキスト、右に巨大な数字。統計やデータ強調に。
3. "three-columns" - 3つのステップやポイント。プロセス説明に。
4. "two-columns" - 左右2カラム。課題vs解決、比較に。
5. "timeline" - 年表形式。歴史や経緯に。
6. "bullet-points" - シンプルな箇条書き。一般説明に。

### 高度なレイアウト（Phase 2）
7. "network-diagram" - ネットワーク図解。関係性や接続を示す。ノードとエッジで構成。
8. "bubble-chart" - バブルチャート/ベン図。重なり合う概念や集合を示す。
9. "arrow-steps" - 矢印ステップ。線形プロセスや流れを示す。
10. "formula-flow" - 数式・フロー図。「A × B = C」形式の関係性を示す。

## 出力形式
JSON形式で以下の構造を返してください：
{
  "slides": [
    {
      "layoutType": "レイアウトタイプ",
      "title": "スライドタイトル",
      
      // 基本レイアウト用
      "content": ["箇条書き1", "箇条書き2"],
      "emphasisNumber": "85%",
      "emphasisLabel": "成功率",
      "leftColumn": ["左項目"],
      "rightColumn": ["右項目"],
      "steps": [{"number": "01", "title": "名前", "description": "説明"}],
      "timelineItems": [{"year": "2024", "description": "出来事"}],
      
      // Phase 2 レイアウト用
      "networkNodes": [{"id": "a", "label": "ノードA"}, {"id": "b", "label": "ノードB"}],
      "networkEdges": [{"from": "a", "to": "b"}],
      "bubbles": [{"label": "概念A", "size": "large"}, {"label": "概念B", "size": "medium", "overlap": ["概念A"]}],
      "arrowSteps": [{"label": "ステップ1"}, {"label": "ステップ2"}, {"label": "ステップ3"}],
      "formula": {"left": "データ", "operator": "×", "right": "AI", "result": "インサイト"},
      
      "notes": "話者用メモ",
      "startTime": 0,
      "endTime": 15
    }
  ]
}

## レイアウト選択ガイド
- 関係性・接続 → network-diagram
- 重なり・集合 → bubble-chart
- 線形プロセス → arrow-steps（大きな矢印で3〜5ステップ）
- 数式的関係 → formula-flow（A × B = C 形式）
- 数字・データ → data-emphasis
- 比較 → two-columns
- 手順 → three-columns
- 歴史 → timeline`;

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
                    content: `以下の音声認識結果から、洗練されたミニマルデザインのスライドを作成してください。
内容に応じて、Phase 2の高度なレイアウト（network-diagram, bubble-chart, arrow-steps, formula-flow）も積極的に使用してください。

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
            // Phase 2
            networkNodes: slide.networkNodes,
            networkEdges: slide.networkEdges,
            bubbles: slide.bubbles,
            arrowSteps: slide.arrowSteps,
            formula: slide.formula,
            generateImage: slide.generateImage,
            imagePrompt: slide.imagePrompt,
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
 * 開発用モックスライド（Phase 1 + Phase 2のレイアウトをデモ）
 */
function getMockSlides(): Slide[] {
    return [
        // Phase 1 レイアウト
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
        // Phase 2 レイアウト
        {
            id: nanoid(8),
            layoutType: 'network-diagram',
            title: 'AI技術のエコシステム',
            content: [],
            networkNodes: [
                { id: 'ml', label: '機械学習' },
                { id: 'dl', label: '深層学習' },
                { id: 'nlp', label: '自然言語処理' },
                { id: 'cv', label: '画像認識' },
                { id: 'ai', label: 'AI' },
            ],
            networkEdges: [
                { from: 'ai', to: 'ml' },
                { from: 'ml', to: 'dl' },
                { from: 'dl', to: 'nlp' },
                { from: 'dl', to: 'cv' },
            ],
            notes: 'ネットワーク図解レイアウト',
            startTime: 30,
            endTime: 45,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'bubble-chart',
            title: 'AI・ML・DLの関係',
            content: [],
            bubbles: [
                { label: '人工知能', size: 'large' },
                { label: '機械学習', size: 'medium', overlap: ['人工知能'] },
                { label: '深層学習', size: 'small', overlap: ['機械学習'] },
            ],
            notes: 'バブルチャート/ベン図レイアウト',
            startTime: 45,
            endTime: 60,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'arrow-steps',
            title: 'データ処理パイプライン',
            content: [],
            arrowSteps: [
                { label: 'データ収集', description: '様々なソースから' },
                { label: '前処理', description: 'クリーニング・変換' },
                { label: 'モデル学習', description: 'パターン抽出' },
                { label: '予測', description: '新データに適用' },
            ],
            notes: '矢印ステップレイアウト',
            startTime: 60,
            endTime: 75,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'formula-flow',
            title: 'AI活用の公式',
            content: [],
            formula: {
                left: 'データ',
                operator: '×',
                right: 'AI',
                result: 'ビジネス価値',
            },
            notes: '数式・フロー図レイアウト',
            startTime: 75,
            endTime: 90,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'three-columns',
            title: '導入ステップ',
            content: [],
            steps: [
                { number: '01', title: '課題特定', description: '解決すべき問題を明確に' },
                { number: '02', title: 'PoC実施', description: '小規模で効果検証' },
                { number: '03', title: '本格展開', description: '全社への展開' },
            ],
            notes: '3ステップレイアウト',
            startTime: 90,
            endTime: 105,
            duration: 15,
        },
        {
            id: nanoid(8),
            layoutType: 'bullet-points',
            title: 'まとめ',
            content: [
                'AIは多様な技術の集合体',
                '適切なレイアウトで情報を伝える',
                '視覚的表現が理解を促進する',
            ],
            notes: 'クロージング',
            startTime: 105,
            endTime: 120,
            duration: 15,
        },
    ];
}
