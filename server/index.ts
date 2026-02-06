import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { transcribeAudio } from './services/speechToText.js';
import { correctText } from './services/textCorrection.js';
import { generateSlides } from './services/slideGenerator.js';
import { createPptx } from './services/pptxGenerator.js';
import {
    checkVoicevoxStatus,
    synthesizeSpeech,
    getCharacterList,
    VOICEVOX_CHARACTERS,
} from './services/voicevoxService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// ミドルウェア
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ファイルストレージ設定
const uploadsDir = path.join(__dirname, '..', 'uploads');
const outputDir = path.join(__dirname, '..', 'output');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const id = nanoid(10);
        cb(null, `${id}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 64 * 1024 * 1024 }, // 64MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/wav' || file.originalname.endsWith('.wav')) {
            cb(null, true);
        } else {
            cb(new Error('WAVファイルのみ対応しています'));
        }
    },
});

// プロジェクトデータ（メモリ内保存、本番ではDBを使用）
interface ProjectData {
    id: string;
    audioPath: string;
    audioFileName: string;
    segments: Array<{
        id: string;
        start: number;
        end: number;
        text: string;
        correctedText?: string;
    }>;
    slides: Array<{
        id: string;
        title: string;
        content: string[];
        notes: string;
        startTime: number;
        endTime: number;
        duration: number;
    }>;
    pptxPath?: string;
}

const projects = new Map<string, ProjectData>();

// APIエンドポイント

// 1. ファイルアップロード
app.post('/api/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ファイルがありません' });
        }

        const projectId = nanoid(12);
        const audioPath = req.file.path;
        const audioFileName = req.file.originalname;

        // プロジェクト作成
        projects.set(projectId, {
            id: projectId,
            audioPath,
            audioFileName,
            segments: [],
            slides: [],
        });

        // 音声認識を開始（非同期）
        transcribeAudio(audioPath)
            .then((segments) => {
                const project = projects.get(projectId);
                if (project) {
                    project.segments = segments.map((seg, idx) => ({
                        id: nanoid(8),
                        ...seg,
                    }));
                }
            })
            .catch((err) => {
                console.error('音声認識エラー:', err);
            });

        res.json({ projectId });
    } catch (error) {
        console.error('アップロードエラー:', error);
        res.status(500).json({ error: 'アップロードに失敗しました' });
    }
});

// 2. 音声認識結果取得
app.get('/api/project/:id/transcription', async (req, res) => {
    try {
        const project = projects.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'プロジェクトが見つかりません' });
        }

        // 音声認識が完了するまで待機（最大60秒）
        let attempts = 0;
        while (project.segments.length === 0 && attempts < 60) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            attempts++;
        }

        if (project.segments.length === 0) {
            return res.status(408).json({ error: '音声認識がタイムアウトしました' });
        }

        res.json({ segments: project.segments });
    } catch (error) {
        console.error('取得エラー:', error);
        res.status(500).json({ error: 'データの取得に失敗しました' });
    }
});

// 3. テキスト修正
app.post('/api/project/:id/correct', async (req, res) => {
    try {
        const project = projects.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'プロジェクトが見つかりません' });
        }

        // 全体のテキストを修正
        const fullText = project.segments.map((s) => s.text).join('\n');
        const correctedText = await correctText(fullText);
        const correctedLines = correctedText.split('\n');

        // 修正結果をセグメントに反映
        project.segments = project.segments.map((seg, idx) => ({
            ...seg,
            correctedText: correctedLines[idx] || seg.text,
        }));

        res.json({ segments: project.segments });
    } catch (error) {
        console.error('修正エラー:', error);
        res.status(500).json({ error: 'テキスト修正に失敗しました' });
    }
});

// 4. スライド生成
app.post('/api/project/:id/generate-slides', async (req, res) => {
    try {
        const project = projects.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'プロジェクトが見つかりません' });
        }

        // リクエストからセグメントを更新
        if (req.body.segments) {
            project.segments = req.body.segments;
        }

        // スライド生成
        const slides = await generateSlides(project.segments);
        project.slides = slides;

        // PPTX生成
        const pptxPath = await createPptx(slides, outputDir, project.id);
        project.pptxPath = pptxPath;

        res.json({ slides });
    } catch (error) {
        console.error('スライド生成エラー:', error);
        res.status(500).json({ error: 'スライド生成に失敗しました' });
    }
});

// 5. スライド取得
app.get('/api/project/:id/slides', async (req, res) => {
    try {
        const project = projects.get(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'プロジェクトが見つかりません' });
        }

        res.json({ slides: project.slides });
    } catch (error) {
        console.error('取得エラー:', error);
        res.status(500).json({ error: 'スライドの取得に失敗しました' });
    }
});

// 6. PPTXダウンロード
app.get('/api/project/:id/download', async (req, res) => {
    try {
        const project = projects.get(req.params.id);
        if (!project || !project.pptxPath) {
            return res.status(404).json({ error: 'PPTXファイルが見つかりません' });
        }

        res.download(project.pptxPath, 'presentation.pptx');
    } catch (error) {
        console.error('ダウンロードエラー:', error);
        res.status(500).json({ error: 'ダウンロードに失敗しました' });
    }
});

// ===== VOICEVOX API =====

// 7. VOICEVOXステータス確認
app.get('/api/voicevox/status', async (req, res) => {
    try {
        const isRunning = await checkVoicevoxStatus();
        res.json({
            available: isRunning,
            message: isRunning ? 'VOICEVOX Engineが起動中です' : 'VOICEVOX Engineが起動していません',
        });
    } catch (error) {
        res.json({ available: false, message: 'ステータス確認に失敗しました' });
    }
});

// 8. キャラクター一覧取得
app.get('/api/voicevox/characters', async (req, res) => {
    try {
        const characters = getCharacterList();
        res.json({ characters });
    } catch (error) {
        res.status(500).json({ error: 'キャラクター取得に失敗しました' });
    }
});

// 9. 音声合成
app.post('/api/voicevox/synthesize', async (req, res) => {
    try {
        const { text, characterKey } = req.body;
        if (!text || !characterKey) {
            return res.status(400).json({ error: 'テキストとキャラクターキーが必要です' });
        }

        // VOICEVOXが起動しているか確認
        const isRunning = await checkVoicevoxStatus();
        if (!isRunning) {
            return res.status(503).json({
                error: 'VOICEVOX Engineが起動していません。VOICEVOXを起動してください。',
            });
        }

        const result = await synthesizeSpeech(text, characterKey, outputDir, `voice_${nanoid(8)}.wav`);

        if (result.success && result.audioPath) {
            res.json({
                success: true,
                audioUrl: `/api/audio/${path.basename(result.audioPath)}`,
                duration: result.duration,
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('音声合成エラー:', error);
        res.status(500).json({ error: '音声合成に失敗しました' });
    }
});

// 10. 音声ファイル配信
app.get('/api/audio/:filename', (req, res) => {
    const filePath = path.join(outputDir, req.params.filename);
    res.sendFile(filePath);
});

// ディレクトリ作成
import { mkdirSync, existsSync } from 'fs';
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// サーバー起動
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 API設定状況:`);
    console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   AZURE_OPENAI_API_KEY: ${process.env.AZURE_OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
    console.log(`   AZURE_OPENAI_ENDPOINT: ${process.env.AZURE_OPENAI_ENDPOINT ? '✅ 設定済み' : '❌ 未設定'}`);
});
