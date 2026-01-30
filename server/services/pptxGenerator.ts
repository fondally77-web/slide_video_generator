import PptxGenJS from 'pptxgenjs';
import path from 'path';

// レイアウトタイプの定義
type LayoutType =
    | 'title'
    | 'data-emphasis'
    | 'three-columns'
    | 'two-columns'
    | 'timeline'
    | 'bullet-points';

interface Slide {
    id: string;
    layoutType: LayoutType;
    title: string;
    content: string[];
    emphasisNumber?: string;
    emphasisLabel?: string;
    leftColumn?: string[];
    rightColumn?: string[];
    steps?: Array<{
        number: string;
        title: string;
        description: string;
    }>;
    timelineItems?: Array<{
        year: string;
        description: string;
    }>;
    notes: string;
    startTime: number;
    endTime: number;
    duration: number;
}

// デザイン定数
const DESIGN = {
    colors: {
        background: 'FFFFFF',
        textPrimary: '000000',
        textSecondary: '333333',
        accent: '000000',
        lightGray: 'EEEEEE',
    },
    fonts: {
        title: { face: 'Noto Sans JP', size: 48, bold: true },
        subtitle: { face: 'Noto Sans JP', size: 36, bold: true },
        body: { face: 'Noto Sans JP', size: 28, bold: false },
        emphasisNumber: { face: 'Noto Sans JP', size: 96, bold: true },
        emphasisLabel: { face: 'Noto Sans JP', size: 24, bold: false },
        stepNumber: { face: 'Noto Sans JP', size: 72, bold: true },
        stepTitle: { face: 'Noto Sans JP', size: 24, bold: true },
        stepDesc: { face: 'Noto Sans JP', size: 18, bold: false },
        yearLabel: { face: 'Noto Sans JP', size: 48, bold: true },
        caption: { face: 'Noto Sans JP', size: 18, bold: false },
    },
    slide: {
        width: 10,
        height: 5.625,
    },
};

/**
 * PPTXファイルを生成
 */
export async function createPptx(
    slides: Slide[],
    outputDir: string,
    projectId: string
): Promise<string> {
    const pptx = new PptxGenJS();

    // プレゼンテーション設定
    pptx.author = 'Slide Video Generator';
    pptx.title = 'AI Generated Presentation';
    pptx.subject = 'Auto-generated from audio';
    pptx.layout = 'LAYOUT_16x9';

    // 各スライドを生成
    for (const slideData of slides) {
        const slide = pptx.addSlide();

        // 白背景を設定
        slide.background = { color: DESIGN.colors.background };

        // レイアウトタイプに応じて描画
        switch (slideData.layoutType) {
            case 'title':
                renderTitleSlide(slide, slideData);
                break;
            case 'data-emphasis':
                renderDataEmphasisSlide(slide, slideData);
                break;
            case 'three-columns':
                renderThreeColumnsSlide(slide, slideData);
                break;
            case 'two-columns':
                renderTwoColumnsSlide(slide, slideData);
                break;
            case 'timeline':
                renderTimelineSlide(slide, slideData);
                break;
            case 'bullet-points':
            default:
                renderBulletPointsSlide(slide, slideData);
                break;
        }

        // フッター（タイムスタンプ）
        slide.addText(
            `${formatTime(slideData.startTime)} - ${formatTime(slideData.endTime)}`,
            {
                x: 0.5,
                y: 5.2,
                w: 2,
                h: 0.3,
                fontSize: 10,
                color: DESIGN.colors.textSecondary,
                fontFace: DESIGN.fonts.caption.face,
            }
        );

        // ノート
        if (slideData.notes) {
            slide.addNotes(slideData.notes);
        }

        // スライド切り替え時間
        slide.transition = { type: 'fade', speed: 'fast' };
        // @ts-ignore - pptxgenjsの型定義にない
        slide.advanceAfter = slideData.duration;
    }

    // ファイル保存
    const fileName = `presentation_${projectId}.pptx`;
    const filePath = path.join(outputDir, fileName);
    await pptx.writeFile({ fileName: filePath });

    console.log('✅ PPTX生成完了:', filePath);
    return filePath;
}

/**
 * タイトルスライド - 大胆なタイトルのみ
 */
function renderTitleSlide(slide: any, data: Slide) {
    slide.addText(data.title, {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: DESIGN.fonts.title.size,
        fontFace: DESIGN.fonts.title.face,
        bold: DESIGN.fonts.title.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
        valign: 'middle',
    });
}

/**
 * データ強調スライド - 左にテキスト、右に巨大な数字
 */
function renderDataEmphasisSlide(slide: any, data: Slide) {
    // タイトル
    slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
    });

    // 左側テキスト
    if (data.content && data.content.length > 0) {
        const contentText = data.content.join('\n');
        slide.addText(contentText, {
            x: 0.5,
            y: 1.8,
            w: 4.5,
            h: 2.5,
            fontSize: DESIGN.fonts.body.size,
            fontFace: DESIGN.fonts.body.face,
            color: DESIGN.colors.textSecondary,
            valign: 'middle',
        });
    }

    // 区切り線
    slide.addShape('line', {
        x: 5.2,
        y: 1.5,
        w: 0,
        h: 3,
        line: { color: DESIGN.colors.lightGray, width: 2 },
    });

    // 右側 - 巨大な数字
    if (data.emphasisNumber) {
        slide.addText(data.emphasisNumber, {
            x: 5.5,
            y: 1.5,
            w: 4,
            h: 2,
            fontSize: DESIGN.fonts.emphasisNumber.size,
            fontFace: DESIGN.fonts.emphasisNumber.face,
            bold: DESIGN.fonts.emphasisNumber.bold,
            color: DESIGN.colors.textPrimary,
            align: 'center',
            valign: 'middle',
        });
    }

    // 数字のラベル
    if (data.emphasisLabel) {
        slide.addText(data.emphasisLabel, {
            x: 5.5,
            y: 3.5,
            w: 4,
            h: 0.5,
            fontSize: DESIGN.fonts.emphasisLabel.size,
            fontFace: DESIGN.fonts.emphasisLabel.face,
            color: DESIGN.colors.textSecondary,
            align: 'center',
        });
    }
}

/**
 * 3カラムスライド - 3つのステップ
 */
function renderThreeColumnsSlide(slide: any, data: Slide) {
    // タイトル
    slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    // 3つのステップ
    const steps = data.steps || [];
    const columnWidth = 2.8;
    const startX = 0.8;

    steps.forEach((step, idx) => {
        const x = startX + idx * (columnWidth + 0.3);

        // 番号
        slide.addText(step.number, {
            x: x,
            y: 1.5,
            w: columnWidth,
            h: 1.2,
            fontSize: DESIGN.fonts.stepNumber.size,
            fontFace: DESIGN.fonts.stepNumber.face,
            bold: DESIGN.fonts.stepNumber.bold,
            color: DESIGN.colors.lightGray,
            align: 'center',
        });

        // タイトル
        slide.addText(step.title, {
            x: x,
            y: 2.7,
            w: columnWidth,
            h: 0.6,
            fontSize: DESIGN.fonts.stepTitle.size,
            fontFace: DESIGN.fonts.stepTitle.face,
            bold: DESIGN.fonts.stepTitle.bold,
            color: DESIGN.colors.textPrimary,
            align: 'center',
        });

        // 説明
        slide.addText(step.description, {
            x: x,
            y: 3.3,
            w: columnWidth,
            h: 1,
            fontSize: DESIGN.fonts.stepDesc.size,
            fontFace: DESIGN.fonts.stepDesc.face,
            color: DESIGN.colors.textSecondary,
            align: 'center',
        });
    });
}

/**
 * 2カラムスライド - 左右比較
 */
function renderTwoColumnsSlide(slide: any, data: Slide) {
    // タイトル
    slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    // 中央の区切り線
    slide.addShape('line', {
        x: 5,
        y: 1.5,
        w: 0,
        h: 3.2,
        line: { color: DESIGN.colors.accent, width: 3 },
    });

    // 左カラムヘッダー
    slide.addText('課題', {
        x: 0.5,
        y: 1.3,
        w: 4.2,
        h: 0.5,
        fontSize: 20,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: true,
        color: DESIGN.colors.textSecondary,
        align: 'center',
    });

    // 左カラム内容
    const leftItems = data.leftColumn || [];
    leftItems.forEach((item, idx) => {
        slide.addText(`• ${item}`, {
            x: 0.5,
            y: 1.9 + idx * 0.7,
            w: 4.2,
            h: 0.6,
            fontSize: DESIGN.fonts.body.size - 4,
            fontFace: DESIGN.fonts.body.face,
            color: DESIGN.colors.textSecondary,
        });
    });

    // 右カラムヘッダー
    slide.addText('解決策', {
        x: 5.3,
        y: 1.3,
        w: 4.2,
        h: 0.5,
        fontSize: 20,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: true,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    // 右カラム内容
    const rightItems = data.rightColumn || [];
    rightItems.forEach((item, idx) => {
        slide.addText(`• ${item}`, {
            x: 5.3,
            y: 1.9 + idx * 0.7,
            w: 4.2,
            h: 0.6,
            fontSize: DESIGN.fonts.body.size - 4,
            fontFace: DESIGN.fonts.body.face,
            color: DESIGN.colors.textPrimary,
        });
    });
}

/**
 * タイムラインスライド - 年表形式
 */
function renderTimelineSlide(slide: any, data: Slide) {
    // タイトル
    slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 0.8,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    // タイムラインアイテム
    const items = data.timelineItems || [];
    const startY = 1.5;

    items.forEach((item, idx) => {
        const y = startY + idx * 1.1;

        // 年号（大きく）
        slide.addText(item.year, {
            x: 0.5,
            y: y,
            w: 2.5,
            h: 0.9,
            fontSize: DESIGN.fonts.yearLabel.size,
            fontFace: DESIGN.fonts.yearLabel.face,
            bold: DESIGN.fonts.yearLabel.bold,
            color: DESIGN.colors.textPrimary,
            align: 'right',
            valign: 'middle',
        });

        // 区切り線
        slide.addShape('line', {
            x: 3.2,
            y: y + 0.1,
            w: 0,
            h: 0.7,
            line: { color: DESIGN.colors.lightGray, width: 2 },
        });

        // 説明
        slide.addText(item.description, {
            x: 3.5,
            y: y,
            w: 6,
            h: 0.9,
            fontSize: DESIGN.fonts.body.size,
            fontFace: DESIGN.fonts.body.face,
            color: DESIGN.colors.textSecondary,
            valign: 'middle',
        });
    });
}

/**
 * 箇条書きスライド - シンプル
 */
function renderBulletPointsSlide(slide: any, data: Slide) {
    // タイトル
    slide.addText(data.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
    });

    // 箇条書き
    const content = data.content || [];
    content.forEach((item, idx) => {
        slide.addText(`• ${item}`, {
            x: 0.8,
            y: 1.8 + idx * 0.9,
            w: 8.4,
            h: 0.8,
            fontSize: DESIGN.fonts.body.size,
            fontFace: DESIGN.fonts.body.face,
            color: DESIGN.colors.textSecondary,
            valign: 'middle',
        });
    });
}

/**
 * 秒を MM:SS 形式に変換
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
