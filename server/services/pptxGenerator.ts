import PptxGenJS from 'pptxgenjs';
import path from 'path';

interface Slide {
    id: string;
    title: string;
    content: string[];
    notes: string;
    startTime: number;
    endTime: number;
    duration: number;
}

/**
 * スライドデータからPPTXファイルを生成
 * 切り替え時間を自動設定
 */
export async function createPptx(
    slides: Slide[],
    outputDir: string,
    projectId: string
): Promise<string> {
    console.log('📝 PPTX生成を開始');

    const pptx = new PptxGenJS();

    // プレゼンテーション設定
    pptx.author = 'Slide Video Generator';
    pptx.title = 'Generated Presentation';
    pptx.subject = 'Auto-generated from audio';
    pptx.company = 'Slide Video Generator';

    // スライドサイズ（16:9）
    pptx.defineLayout({ name: 'LAYOUT_16x9', width: 10, height: 5.625 });
    pptx.layout = 'LAYOUT_16x9';

    // カラーテーマ
    const colors = {
        primary: '6366F1',    // インディゴ
        secondary: '10B981',  // グリーン
        background: 'FFFFFF',
        text: '1E293B',
        textLight: '64748B',
    };

    slides.forEach((slideData, index) => {
        const slide = pptx.addSlide();

        // スライド切り替え時間を設定（秒）
        // PowerPointでは advanceAfter がスライド自動切り替え時間
        if (slideData.duration > 0) {
            slide.transition = {
                type: 'fade',
                speed: 'medium',
            };
            // @ts-ignore - pptxgenjs の型定義に含まれていないが動作する
            slide.advanceAfter = slideData.duration;
        }

        // 背景
        slide.bkgd = colors.background;

        // タイトル
        slide.addText(slideData.title, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.8,
            fontSize: 28,
            fontFace: 'Meiryo',
            color: colors.primary,
            bold: true,
        });

        // 区切り線
        slide.addShape(pptx.ShapeType.rect, {
            x: 0.5,
            y: 1.1,
            w: 1,
            h: 0.05,
            fill: { color: colors.primary },
        });

        // コンテンツ（箇条書き）
        if (slideData.content && slideData.content.length > 0) {
            const bulletPoints = slideData.content.map((item) => ({
                text: item,
                options: {
                    bullet: { type: 'bullet' as const, color: colors.secondary },
                    indentLevel: 0,
                },
            }));

            slide.addText(bulletPoints, {
                x: 0.5,
                y: 1.4,
                w: 9,
                h: 3.5,
                fontSize: 18,
                fontFace: 'Meiryo',
                color: colors.text,
                valign: 'top',
                lineSpacing: 32,
            });
        }

        // フッター（タイムスタンプ）
        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        slide.addText(
            `${formatTime(slideData.startTime)} - ${formatTime(slideData.endTime)} (${slideData.duration}秒)`,
            {
                x: 0.5,
                y: 5.2,
                w: 4,
                h: 0.3,
                fontSize: 10,
                fontFace: 'Meiryo',
                color: colors.textLight,
            }
        );

        // スライド番号
        slide.addText(`${index + 1} / ${slides.length}`, {
            x: 8.5,
            y: 5.2,
            w: 1,
            h: 0.3,
            fontSize: 10,
            fontFace: 'Meiryo',
            color: colors.textLight,
            align: 'right',
        });

        // ノート（話者用メモ + タイムスタンプ情報）
        const notesContent = [
            `【タイムスタンプ】`,
            `開始: ${formatTime(slideData.startTime)}`,
            `終了: ${formatTime(slideData.endTime)}`,
            `表示時間: ${slideData.duration}秒`,
            ``,
            `【話者メモ】`,
            slideData.notes || '(メモなし)',
        ].join('\n');

        slide.addNotes(notesContent);
    });

    // ファイル保存
    const fileName = `presentation-${projectId}.pptx`;
    const filePath = path.join(outputDir, fileName);

    await pptx.writeFile({ fileName: filePath });

    console.log('✅ PPTX生成完了:', filePath);

    return filePath;
}
