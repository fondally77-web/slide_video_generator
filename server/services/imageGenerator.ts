import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Azure OpenAI DALL-E クライアント（遅延初期化）
let dalleClient: OpenAI | null | undefined;
function getDalleClient(): OpenAI | null {
    if (dalleClient !== undefined) return dalleClient;
    const key = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DALLE_DEPLOYMENT_NAME;
    if (key && endpoint && deployment) {
        dalleClient = new OpenAI({
            apiKey: key,
            baseURL: `${endpoint}/openai/deployments/${deployment}`,
            defaultQuery: { 'api-version': '2024-02-15-preview' },
            defaultHeaders: { 'api-key': key },
        });
    } else {
        dalleClient = null;
    }
    return dalleClient;
}

interface ImageGenerationResult {
    success: boolean;
    imagePath?: string;
    error?: string;
}

/**
 * スライド用の背景画像を生成
 */
export async function generateSlideImage(
    prompt: string,
    outputDir: string,
    filename: string
): Promise<ImageGenerationResult> {
    // 開発モード: プレースホルダー画像を返す
    const client = getDalleClient();
    if (!client) {
        console.log('⚠️ 開発モード: 画像生成をスキップ');
        return {
            success: false,
            error: '開発モード: DALL-E APIが設定されていません',
        };
    }

    try {
        console.log('🎨 画像生成を開始:', prompt.substring(0, 50) + '...');

        // DALL-E用のプロンプト最適化
        const optimizedPrompt = `
      Create a minimalist, professional presentation visual.
      Style: Clean white background, architectural, modern design.
      No text or words in the image.
      ${prompt}
      High quality, sharp, professional photography or illustration style.
    `.trim();

        const response = await client.images.generate({
            model: 'dall-e-3',
            prompt: optimizedPrompt,
            n: 1,
            size: '1792x1024', // 16:9に近いアスペクト比
            quality: 'standard',
            style: 'natural',
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
            throw new Error('画像URLが取得できませんでした');
        }

        // 画像をダウンロードして保存
        const imagePath = path.join(outputDir, filename);
        await downloadImage(imageUrl, imagePath);

        console.log('✅ 画像生成完了:', imagePath);
        return {
            success: true,
            imagePath,
        };
    } catch (error) {
        console.error('❌ 画像生成エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '画像生成に失敗しました',
        };
    }
}

/**
 * スライド内容に基づいて適切な画像プロンプトを生成
 */
export function generateImagePrompt(
    slideTitle: string,
    slideContent: string[],
    layoutType: string
): string {
    const contentSummary = slideContent.join(' ');

    // レイアウトタイプに応じたプロンプトテンプレート
    const templates: Record<string, string> = {
        'full-image': `
      Abstract, artistic visualization representing: ${slideTitle}.
      Concept: ${contentSummary}
      Style: Desaturated, cool tones, architectural photography.
    `,
        'network-diagram': `
      Abstract network visualization with connected nodes and lines.
      Topic: ${slideTitle}
      Style: Constellation-like, thin black lines on white background, minimalist.
    `,
        'bubble-chart': `
      Abstract overlapping translucent circles or spheres.
      Topic: ${slideTitle}
      Style: Wireframe, thin black outlines, intersection areas visible.
    `,
        'arrow-steps': `
      Abstract geometric pattern with directional flow.
      Topic: ${slideTitle}
      Style: Clean arrows, high contrast, minimalist design.
    `,
        'formula-flow': `
      Abstract mathematical or process visualization.
      Topic: ${slideTitle}
      Style: Clean geometric shapes, connection lines, modern.
    `,
        default: `
      Professional abstract visualization for: ${slideTitle}.
      Style: Minimalist, white background, subtle geometric elements.
    `,
    };

    return templates[layoutType] || templates.default;
}

/**
 * 画像をURLからダウンロード
 */
function downloadImage(url: string, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filePath, () => { }); // エラー時はファイル削除
            reject(err);
        });
    });
}

/**
 * アイコン画像を生成（シンプルな図形）
 */
export async function generateIconImage(
    concept: string,
    outputDir: string,
    filename: string
): Promise<ImageGenerationResult> {
    const iconClient = getDalleClient();
    if (!iconClient) {
        return {
            success: false,
            error: '開発モード: DALL-E APIが設定されていません',
        };
    }

    try {
        const prompt = `
      Simple icon representing: ${concept}
      Style: Black line icon on pure white background.
      Minimalist, single object, no text, vector-like appearance.
    `.trim();

        const response = await iconClient.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'natural',
        });

        const imageUrl = response.data[0]?.url;
        if (!imageUrl) {
            throw new Error('画像URLが取得できませんでした');
        }

        const imagePath = path.join(outputDir, filename);
        await downloadImage(imageUrl, imagePath);

        return {
            success: true,
            imagePath,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'アイコン生成に失敗しました',
        };
    }
}
