import OpenAI from 'openai';

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
 * テキストの誤字脱字を修正
 */
export async function correctText(text: string): Promise<string> {
    // 開発モード: 簡易修正（デモ用）
    if (isDevelopmentMode) {
        console.log('⚠️ 開発モード: 簡易テキスト修正を使用');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // 簡単な置換ルールでデモ
        return text
            .replace(/ですた/g, 'でした')
            .replace(/きました/g, '記ました')
            .replace(/  +/g, ' ')
            .trim();
    }

    try {
        console.log('✏️ テキスト修正を開始');

        const response = await client!.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: `あなたは日本語テキストの校正者です。以下のルールに従ってテキストを修正してください：

1. 誤字脱字を修正する
2. 句読点を適切に追加する
3. 文法的な誤りを修正する
4. 意味は変えない
5. 各行は独立したセグメントなので、行ごとに修正して同じ行数で返す
6. 補足説明や注釈は追加しない`,
                },
                {
                    role: 'user',
                    content: `以下のテキストを修正してください。各行を維持してください：

${text}`,
                },
            ],
            temperature: 0.3,
            max_tokens: 4000,
        });

        const correctedText = response.choices[0]?.message?.content || text;
        console.log('✅ テキスト修正完了');

        return correctedText.trim();
    } catch (error) {
        console.error('❌ テキスト修正エラー:', error);
        return text;
    }
}
