import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

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

/**
 * テキストの誤字脱字を修正（Gemini優先）
 */
export async function correctText(text: string): Promise<string> {
    const geminiKey = process.env.GEMINI_API_KEY;
    const azureKey = process.env.AZURE_OPENAI_API_KEY;
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const isDevelopmentMode = !geminiKey && (!azureKey || !azureEndpoint);

    // 開発モード
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: モック修正を使用');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return text;
    }

    // Gemini APIを優先使用
    if (geminiKey) {
        try {
            return await correctWithGemini(text);
        } catch (error) {
            console.error('❌ Geminiテキスト修正失敗、Azureにフォールバック:', error);
        }
    }

    // フォールバック: Azure OpenAI GPT
    const client = getGptClient();
    if (client) {
        try {
            return await correctWithGPT(text);
        } catch (error) {
            console.error('❌ GPTテキスト修正も失敗:', error);
        }
    }

    return text;
}

/**
 * Geminiでテキスト修正
 */
async function correctWithGemini(text: string): Promise<string> {
    try {
        console.log('✏️ Geminiテキスト修正を開始');

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `以下のテキストの誤字脱字を修正し、句読点を適切に整えてください。
意味は変えずに、日本語として自然な文章にしてください。
修正後のテキストのみを出力してください。

テキスト:
${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const correctedText = response.text().trim();

        console.log('✅ Geminiテキスト修正完了');
        return correctedText;

    } catch (error) {
        console.error('❌ Geminiテキスト修正エラー:', error);
        throw error;
    }
}

/**
 * Azure OpenAI GPTでテキスト修正
 */
async function correctWithGPT(text: string): Promise<string> {
    try {
        console.log('✏️ GPTテキスト修正を開始');

        const response = await getGptClient()!.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'あなたは日本語校正の専門家です。与えられたテキストの誤字脱字を修正し、句読点を適切に整えてください。意味は変えないでください。',
                },
                {
                    role: 'user',
                    content: text,
                },
            ],
            temperature: 0.3,
            max_tokens: 4000,
        });

        const correctedText = response.choices[0]?.message?.content || text;
        console.log('✅ GPTテキスト修正完了');
        return correctedText;

    } catch (error) {
        console.error('❌ GPTテキスト修正エラー:', error);
        throw error;
    }
}
