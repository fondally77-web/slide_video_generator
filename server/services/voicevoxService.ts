import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// VOICEVOX Engine APIのベースURL
const VOICEVOX_BASE_URL = process.env.VOICEVOX_URL || 'http://localhost:50021';

// キャラクター（話者）の定義
export interface VoicevoxSpeaker {
    id: number;
    name: string;
    styleName: string;
    styleId: number;
}

// 主要なキャラクターのプリセット
export const VOICEVOX_CHARACTERS: Record<string, VoicevoxSpeaker> = {
    // ずんだもん
    'zundamon-normal': { id: 3, name: 'ずんだもん', styleName: 'ノーマル', styleId: 3 },
    'zundamon-ama': { id: 3, name: 'ずんだもん', styleName: 'あまあま', styleId: 1 },
    'zundamon-sexy': { id: 3, name: 'ずんだもん', styleName: 'セクシー', styleId: 5 },
    'zundamon-tsun': { id: 3, name: 'ずんだもん', styleName: 'ツンツン', styleId: 7 },
    
    // 四国めたん
    'metan-normal': { id: 2, name: '四国めたん', styleName: 'ノーマル', styleId: 2 },
    'metan-ama': { id: 2, name: '四国めたん', styleName: 'あまあま', styleId: 0 },
    'metan-sexy': { id: 2, name: '四国めたん', styleName: 'セクシー', styleId: 4 },
    'metan-tsun': { id: 2, name: '四国めたん', styleName: 'ツンツン', styleId: 6 },
    
    // 春日部つむぎ
    'tsumugi-normal': { id: 8, name: '春日部つむぎ', styleName: 'ノーマル', styleId: 8 },
    
    // 雨晴はう
    'hau-normal': { id: 10, name: '雨晴はう', styleName: 'ノーマル', styleId: 10 },
    
    // 波音リツ
    'ritsu-normal': { id: 9, name: '波音リツ', styleName: 'ノーマル', styleId: 9 },
    
    // 玄野武宏
    'takehiro-normal': { id: 11, name: '玄野武宏', styleName: 'ノーマル', styleId: 11 },
    
    // 白上虎太郎
    'kotaro-normal': { id: 12, name: '白上虎太郎', styleName: 'ノーマル', styleId: 12 },
    
    // 青山龍星
    'ryusei-normal': { id: 13, name: '青山龍星', styleName: 'ノーマル', styleId: 13 },
    
    // 冥鳴ひまり
    'himari-normal': { id: 14, name: '冥鳴ひまり', styleName: 'ノーマル', styleId: 14 },
    
    // ナースロボ＿タイプＴ
    'nurserobo-normal': { id: 47, name: 'ナースロボ＿タイプＴ', styleName: 'ノーマル', styleId: 47 },
};

interface VoiceSynthesisResult {
    success: boolean;
    audioPath?: string;
    duration?: number;
    error?: string;
}

/**
 * VOICEVOXが起動しているか確認
 */
export async function checkVoicevoxStatus(): Promise<boolean> {
    try {
        const response = await fetch(`${VOICEVOX_BASE_URL}/version`, {
            method: 'GET',
            timeout: 3000,
        } as any);
        return response.ok;
    } catch (error) {
        console.log('⚠️ VOICEVOX Engineが起動していません');
        return false;
    }
}

/**
 * 利用可能な話者一覧を取得
 */
export async function getSpeakers(): Promise<any[]> {
    try {
        const response = await fetch(`${VOICEVOX_BASE_URL}/speakers`);
        if (!response.ok) throw new Error('話者一覧の取得に失敗');
        return await response.json();
    } catch (error) {
        console.error('話者一覧取得エラー:', error);
        return [];
    }
}

/**
 * テキストから音声を合成
 */
export async function synthesizeSpeech(
    text: string,
    speakerKey: string,
    outputDir: string,
    filename: string
): Promise<VoiceSynthesisResult> {
    const speaker = VOICEVOX_CHARACTERS[speakerKey];
    if (!speaker) {
        return {
            success: false,
            error: `不明なキャラクター: ${speakerKey}`,
        };
    }

    try {
        console.log(`🎤 音声合成開始: ${speaker.name}（${speaker.styleName}）`);

        // 1. 音声合成用のクエリを作成
        const queryResponse = await fetch(
            `${VOICEVOX_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker.styleId}`,
            { method: 'POST' }
        );

        if (!queryResponse.ok) {
            throw new Error(`音声クエリ作成失敗: ${queryResponse.status}`);
        }

        const audioQuery = await queryResponse.json();

        // 2. 音声を合成
        const synthesisResponse = await fetch(
            `${VOICEVOX_BASE_URL}/synthesis?speaker=${speaker.styleId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(audioQuery),
            }
        );

        if (!synthesisResponse.ok) {
            throw new Error(`音声合成失敗: ${synthesisResponse.status}`);
        }

        // 3. 音声ファイルを保存
        const audioBuffer = await synthesisResponse.buffer();
        const audioPath = path.join(outputDir, filename);
        fs.writeFileSync(audioPath, audioBuffer);

        // 音声の長さを計算（概算）
        const duration = estimateAudioDuration(text);

        console.log(`✅ 音声合成完了: ${audioPath}`);
        return {
            success: true,
            audioPath,
            duration,
        };
    } catch (error) {
        console.error('❌ 音声合成エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '音声合成に失敗しました',
        };
    }
}

/**
 * 複数のテキストを一括で音声合成
 */
export async function synthesizeMultiple(
    texts: Array<{ id: string; text: string }>,
    speakerKey: string,
    outputDir: string
): Promise<Map<string, VoiceSynthesisResult>> {
    const results = new Map<string, VoiceSynthesisResult>();

    // VOICEVOXの状態確認
    const isRunning = await checkVoicevoxStatus();
    if (!isRunning) {
        texts.forEach((item) => {
            results.set(item.id, {
                success: false,
                error: 'VOICEVOX Engineが起動していません',
            });
        });
        return results;
    }

    // 順次処理（並列だとVOICEVOXに負荷がかかる）
    for (const item of texts) {
        const result = await synthesizeSpeech(
            item.text,
            speakerKey,
            outputDir,
            `audio_${item.id}.wav`
        );
        results.set(item.id, result);
    }

    return results;
}

/**
 * スピーカー設定を調整（速度、ピッチ等）
 */
export async function synthesizeSpeechWithOptions(
    text: string,
    speakerKey: string,
    outputDir: string,
    filename: string,
    options: {
        speedScale?: number;    // 話速（0.5〜2.0、デフォルト1.0）
        pitchScale?: number;    // 音高（-0.15〜0.15、デフォルト0）
        volumeScale?: number;   // 音量（0.0〜2.0、デフォルト1.0）
        intonationScale?: number; // 抑揚（0.0〜2.0、デフォルト1.0）
    } = {}
): Promise<VoiceSynthesisResult> {
    const speaker = VOICEVOX_CHARACTERS[speakerKey];
    if (!speaker) {
        return {
            success: false,
            error: `不明なキャラクター: ${speakerKey}`,
        };
    }

    try {
        // 1. 音声合成用のクエリを作成
        const queryResponse = await fetch(
            `${VOICEVOX_BASE_URL}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker.styleId}`,
            { method: 'POST' }
        );

        if (!queryResponse.ok) {
            throw new Error(`音声クエリ作成失敗: ${queryResponse.status}`);
        }

        const audioQuery = await queryResponse.json();

        // オプションを適用
        if (options.speedScale !== undefined) audioQuery.speedScale = options.speedScale;
        if (options.pitchScale !== undefined) audioQuery.pitchScale = options.pitchScale;
        if (options.volumeScale !== undefined) audioQuery.volumeScale = options.volumeScale;
        if (options.intonationScale !== undefined) audioQuery.intonationScale = options.intonationScale;

        // 2. 音声を合成
        const synthesisResponse = await fetch(
            `${VOICEVOX_BASE_URL}/synthesis?speaker=${speaker.styleId}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(audioQuery),
            }
        );

        if (!synthesisResponse.ok) {
            throw new Error(`音声合成失敗: ${synthesisResponse.status}`);
        }

        // 3. 音声ファイルを保存
        const audioBuffer = await synthesisResponse.buffer();
        const audioPath = path.join(outputDir, filename);
        fs.writeFileSync(audioPath, audioBuffer);

        const duration = estimateAudioDuration(text, options.speedScale || 1.0);

        return {
            success: true,
            audioPath,
            duration,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '音声合成に失敗しました',
        };
    }
}

/**
 * 音声の長さを概算（日本語の場合、1文字あたり約0.15秒）
 */
function estimateAudioDuration(text: string, speedScale: number = 1.0): number {
    const charCount = text.replace(/\s/g, '').length;
    const baseDuration = charCount * 0.15;
    return baseDuration / speedScale;
}

/**
 * キャラクター一覧を取得（UI用）
 */
export function getCharacterList(): Array<{
    key: string;
    name: string;
    style: string;
}> {
    return Object.entries(VOICEVOX_CHARACTERS).map(([key, speaker]) => ({
        key,
        name: speaker.name,
        style: speaker.styleName,
    }));
}
