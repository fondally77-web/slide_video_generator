import PptxGenJS from 'pptxgenjs';
import path from 'path';

// レイアウトタイプの定義（Phase 1 + Phase 2）
type LayoutType =
    | 'title'
    | 'data-emphasis'
    | 'three-columns'
    | 'two-columns'
    | 'timeline'
    | 'bullet-points'
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
    steps?: Array<{
        number: string;
        title: string;
        description: string;
    }>;
    timelineItems?: Array<{
        year: string;
        description: string;
    }>;
    networkNodes?: Array<{
        id: string;
        label: string;
    }>;
    networkEdges?: Array<{
        from: string;
        to: string;
    }>;
    bubbles?: Array<{
        label: string;
        size: 'small' | 'medium' | 'large';
        overlap?: string[];
    }>;
    arrowSteps?: Array<{
        label: string;
        description?: string;
    }>;
    formula?: {
        left: string;
        operator: string;
        right: string;
        result: string;
    };
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
        mediumGray: 'CCCCCC',
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
        formula: { face: 'Noto Sans JP', size: 72, bold: true },
        nodeLabel: { face: 'Noto Sans JP', size: 14, bold: true },
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

    pptx.author = 'Slide Video Generator';
    pptx.title = 'AI Generated Presentation';
    pptx.subject = 'Auto-generated from audio';
    pptx.layout = 'LAYOUT_16x9';

    for (const slideData of slides) {
        const slide = pptx.addSlide();
        slide.background = { color: DESIGN.colors.background };

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
            // Phase 2 レイアウト
            case 'network-diagram':
                renderNetworkDiagramSlide(slide, slideData);
                break;
            case 'bubble-chart':
                renderBubbleChartSlide(slide, slideData);
                break;
            case 'arrow-steps':
                renderArrowStepsSlide(slide, slideData);
                break;
            case 'formula-flow':
                renderFormulaFlowSlide(slide, slideData);
                break;
            case 'bullet-points':
            default:
                renderBulletPointsSlide(slide, slideData);
                break;
        }

        // フッター
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

        if (slideData.notes) {
            slide.addNotes(slideData.notes);
        }

        slide.transition = { type: 'fade', speed: 'fast' };
        // @ts-ignore
        slide.advanceAfter = slideData.duration;
    }

    const fileName = `presentation_${projectId}.pptx`;
    const filePath = path.join(outputDir, fileName);
    await pptx.writeFile({ fileName: filePath });

    console.log('✅ PPTX生成完了:', filePath);
    return filePath;
}

// ===== Phase 1 レイアウト =====

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

function renderDataEmphasisSlide(slide: any, data: Slide) {
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

    if (data.content && data.content.length > 0) {
        slide.addText(data.content.join('\n'), {
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

    slide.addShape('line', {
        x: 5.2,
        y: 1.5,
        w: 0,
        h: 3,
        line: { color: DESIGN.colors.lightGray, width: 2 },
    });

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

function renderThreeColumnsSlide(slide: any, data: Slide) {
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

    const steps = data.steps || [];
    const columnWidth = 2.8;
    const startX = 0.8;

    steps.forEach((step, idx) => {
        const x = startX + idx * (columnWidth + 0.3);

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

function renderTwoColumnsSlide(slide: any, data: Slide) {
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

    slide.addShape('line', {
        x: 5,
        y: 1.5,
        w: 0,
        h: 3.2,
        line: { color: DESIGN.colors.accent, width: 3 },
    });

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

    (data.leftColumn || []).forEach((item, idx) => {
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

    (data.rightColumn || []).forEach((item, idx) => {
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

function renderTimelineSlide(slide: any, data: Slide) {
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

    const items = data.timelineItems || [];
    const startY = 1.5;

    items.forEach((item, idx) => {
        const y = startY + idx * 1.1;

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

        slide.addShape('line', {
            x: 3.2,
            y: y + 0.1,
            w: 0,
            h: 0.7,
            line: { color: DESIGN.colors.lightGray, width: 2 },
        });

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

function renderBulletPointsSlide(slide: any, data: Slide) {
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

    (data.content || []).forEach((item, idx) => {
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

// ===== Phase 2 レイアウト =====

/**
 * ネットワーク図解スライド
 */
function renderNetworkDiagramSlide(slide: any, data: Slide) {
    slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.7,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    const nodes = data.networkNodes || [];
    const edges = data.networkEdges || [];

    // ノード位置を計算（円形配置）
    const centerX = 5;
    const centerY = 2.8;
    const radius = 1.8;
    const nodePositions: Record<string, { x: number; y: number }> = {};

    nodes.forEach((node, idx) => {
        const angle = (2 * Math.PI * idx) / nodes.length - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        nodePositions[node.id] = { x, y };

        // ノード（円）
        slide.addShape('ellipse', {
            x: x - 0.5,
            y: y - 0.3,
            w: 1,
            h: 0.6,
            fill: { color: DESIGN.colors.background },
            line: { color: DESIGN.colors.textPrimary, width: 1.5 },
        });

        // ラベル
        slide.addText(node.label, {
            x: x - 0.6,
            y: y - 0.2,
            w: 1.2,
            h: 0.4,
            fontSize: DESIGN.fonts.nodeLabel.size,
            fontFace: DESIGN.fonts.nodeLabel.face,
            bold: true,
            color: DESIGN.colors.textPrimary,
            align: 'center',
            valign: 'middle',
        });
    });

    // エッジ（線）を描画
    edges.forEach((edge) => {
        const from = nodePositions[edge.from];
        const to = nodePositions[edge.to];
        if (from && to) {
            slide.addShape('line', {
                x: from.x,
                y: from.y,
                w: to.x - from.x,
                h: to.y - from.y,
                line: { color: DESIGN.colors.mediumGray, width: 1 },
            });
        }
    });
}

/**
 * バブルチャート/ベン図スライド
 */
function renderBubbleChartSlide(slide: any, data: Slide) {
    slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.7,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    const bubbles = data.bubbles || [];
    const centerX = 5;
    const centerY = 2.8;

    // バブルサイズマッピング
    const sizeMap = { large: 2.5, medium: 1.8, small: 1.2 };

    bubbles.forEach((bubble, idx) => {
        const size = sizeMap[bubble.size];
        // ネスト配置（左から右へ少しずつずらす）
        const xOffset = (idx - bubbles.length / 2) * 0.8;
        const x = centerX + xOffset;
        const y = centerY;

        // 円（透明度を表現するため、塗りつぶしなし）
        slide.addShape('ellipse', {
            x: x - size / 2,
            y: y - size / 2,
            w: size,
            h: size,
            fill: { color: DESIGN.colors.background, transparency: 80 },
            line: { color: DESIGN.colors.textPrimary, width: 1.5 },
        });

        // ラベル
        slide.addText(bubble.label, {
            x: x - 1,
            y: y - 0.2,
            w: 2,
            h: 0.4,
            fontSize: 16,
            fontFace: DESIGN.fonts.nodeLabel.face,
            bold: true,
            color: DESIGN.colors.textPrimary,
            align: 'center',
            valign: 'middle',
        });
    });
}

/**
 * 矢印ステップスライド
 */
function renderArrowStepsSlide(slide: any, data: Slide) {
    slide.addText(data.title, {
        x: 0.5,
        y: 0.3,
        w: 9,
        h: 0.7,
        fontSize: DESIGN.fonts.subtitle.size,
        fontFace: DESIGN.fonts.subtitle.face,
        bold: DESIGN.fonts.subtitle.bold,
        color: DESIGN.colors.textPrimary,
        align: 'center',
    });

    const steps = data.arrowSteps || [];
    const stepCount = steps.length;
    const arrowWidth = 9 / stepCount;
    const startX = 0.5;
    const y = 2.2;

    steps.forEach((step, idx) => {
        const x = startX + idx * arrowWidth;
        const isLast = idx === stepCount - 1;

        // 矢印形状（シェブロン）
        if (!isLast) {
            // 矢印の胴体部分
            slide.addShape('rect', {
                x: x,
                y: y,
                w: arrowWidth - 0.3,
                h: 1.2,
                fill: { color: idx % 2 === 0 ? DESIGN.colors.textPrimary : DESIGN.colors.lightGray },
            });

            // 矢印の先端（三角形）
            slide.addShape('triangle', {
                x: x + arrowWidth - 0.5,
                y: y - 0.2,
                w: 0.4,
                h: 1.6,
                rotate: 90,
                fill: { color: idx % 2 === 0 ? DESIGN.colors.textPrimary : DESIGN.colors.lightGray },
            });
        } else {
            slide.addShape('rect', {
                x: x,
                y: y,
                w: arrowWidth - 0.1,
                h: 1.2,
                fill: { color: DESIGN.colors.textPrimary },
            });
        }

        // ステップラベル
        slide.addText(step.label, {
            x: x + 0.1,
            y: y + 0.2,
            w: arrowWidth - 0.4,
            h: 0.4,
            fontSize: 14,
            fontFace: DESIGN.fonts.nodeLabel.face,
            bold: true,
            color: idx % 2 === 0 ? DESIGN.colors.background : DESIGN.colors.textPrimary,
            align: 'center',
        });

        // 説明
        if (step.description) {
            slide.addText(step.description, {
                x: x + 0.1,
                y: y + 0.6,
                w: arrowWidth - 0.4,
                h: 0.4,
                fontSize: 10,
                fontFace: DESIGN.fonts.caption.face,
                color: idx % 2 === 0 ? DESIGN.colors.background : DESIGN.colors.textSecondary,
                align: 'center',
            });
        }
    });
}

/**
 * 数式・フロー図スライド
 */
function renderFormulaFlowSlide(slide: any, data: Slide) {
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

    const formula = data.formula;
    if (!formula) return;

    const centerY = 2.5;

    // 左辺
    slide.addText(formula.left, {
        x: 0.5,
        y: centerY,
        w: 2.2,
        h: 1,
        fontSize: DESIGN.fonts.formula.size,
        fontFace: DESIGN.fonts.formula.face,
        bold: true,
        color: DESIGN.colors.textPrimary,
        align: 'center',
        valign: 'middle',
    });

    // 演算子
    slide.addText(formula.operator, {
        x: 2.7,
        y: centerY,
        w: 1,
        h: 1,
        fontSize: DESIGN.fonts.formula.size,
        fontFace: DESIGN.fonts.formula.face,
        bold: true,
        color: DESIGN.colors.mediumGray,
        align: 'center',
        valign: 'middle',
    });

    // 右辺
    slide.addText(formula.right, {
        x: 3.7,
        y: centerY,
        w: 2.2,
        h: 1,
        fontSize: DESIGN.fonts.formula.size,
        fontFace: DESIGN.fonts.formula.face,
        bold: true,
        color: DESIGN.colors.textPrimary,
        align: 'center',
        valign: 'middle',
    });

    // イコール
    slide.addText('=', {
        x: 5.9,
        y: centerY,
        w: 1,
        h: 1,
        fontSize: DESIGN.fonts.formula.size,
        fontFace: DESIGN.fonts.formula.face,
        bold: true,
        color: DESIGN.colors.mediumGray,
        align: 'center',
        valign: 'middle',
    });

    // 結果
    slide.addText(formula.result, {
        x: 6.9,
        y: centerY,
        w: 2.6,
        h: 1,
        fontSize: DESIGN.fonts.formula.size,
        fontFace: DESIGN.fonts.formula.face,
        bold: true,
        color: DESIGN.colors.textPrimary,
        align: 'center',
        valign: 'middle',
    });
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
