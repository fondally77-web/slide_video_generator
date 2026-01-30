import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

// レイアウト名の日本語マッピング
const layoutNames: Record<LayoutType, string> = {
    'title': 'タイトル',
    'data-emphasis': 'データ強調',
    'three-columns': '3カラム',
    'two-columns': '2カラム',
    'timeline': 'タイムライン',
    'bullet-points': '箇条書き',
};

function Preview() {
    const navigate = useNavigate();
    const location = useLocation();
    const projectId = location.state?.projectId;

    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSlide, setSelectedSlide] = useState(0);

    useEffect(() => {
        if (!projectId) {
            navigate('/upload');
            return;
        }
        fetchSlides();
    }, [projectId]);

    const fetchSlides = async () => {
        try {
            const response = await fetch(`/api/project/${projectId}/slides`);
            if (!response.ok) throw new Error('スライドの取得に失敗しました');
            const data = await response.json();
            setSlides(data.slides);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/project/${projectId}/download`);
            if (!response.ok) throw new Error('ダウンロードに失敗しました');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'presentation.pptx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsDownloading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // スライドプレビューのレンダリング
    const renderSlidePreview = (slide: Slide) => {
        const baseStyle: React.CSSProperties = {
            background: 'white',
            borderRadius: '0.5rem',
            padding: '2rem',
            aspectRatio: '16/9',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
        };

        switch (slide.layoutType) {
            case 'title':
                return (
                    <div style={{
                        ...baseStyle,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <h2 style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#000',
                            textAlign: 'center',
                        }}>
                            {slide.title}
                        </h2>
                    </div>
                );

            case 'data-emphasis':
                return (
                    <div style={baseStyle}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            marginBottom: '1rem',
                            color: '#000',
                        }}>
                            {slide.title}
                        </h3>
                        <div style={{
                            display: 'flex',
                            flex: 1,
                            alignItems: 'center',
                        }}>
                            <div style={{ flex: 1 }}>
                                {slide.content?.map((item, idx) => (
                                    <p key={idx} style={{
                                        fontSize: '0.875rem',
                                        color: '#333',
                                        marginBottom: '0.5rem',
                                    }}>
                                        {item}
                                    </p>
                                ))}
                            </div>
                            <div style={{
                                borderLeft: '2px solid #eee',
                                paddingLeft: '1.5rem',
                                marginLeft: '1rem',
                                textAlign: 'center',
                            }}>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: '700',
                                    color: '#000',
                                }}>
                                    {slide.emphasisNumber}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#666',
                                }}>
                                    {slide.emphasisLabel}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'three-columns':
                return (
                    <div style={baseStyle}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            marginBottom: '1.5rem',
                            color: '#000',
                            textAlign: 'center',
                        }}>
                            {slide.title}
                        </h3>
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            flex: 1,
                        }}>
                            {slide.steps?.map((step, idx) => (
                                <div key={idx} style={{
                                    flex: 1,
                                    textAlign: 'center',
                                }}>
                                    <div style={{
                                        fontSize: '2rem',
                                        fontWeight: '700',
                                        color: '#ddd',
                                    }}>
                                        {step.number}
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#000',
                                        marginBottom: '0.25rem',
                                    }}>
                                        {step.title}
                                    </div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#666',
                                    }}>
                                        {step.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'two-columns':
                return (
                    <div style={baseStyle}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            marginBottom: '1rem',
                            color: '#000',
                            textAlign: 'center',
                        }}>
                            {slide.title}
                        </h3>
                        <div style={{
                            display: 'flex',
                            flex: 1,
                            gap: '0.5rem',
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#666',
                                    marginBottom: '0.5rem',
                                    textAlign: 'center',
                                }}>
                                    課題
                                </div>
                                {slide.leftColumn?.map((item, idx) => (
                                    <p key={idx} style={{
                                        fontSize: '0.75rem',
                                        color: '#333',
                                        marginBottom: '0.25rem',
                                    }}>
                                        • {item}
                                    </p>
                                ))}
                            </div>
                            <div style={{
                                width: '2px',
                                background: '#000',
                            }} />
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#000',
                                    marginBottom: '0.5rem',
                                    textAlign: 'center',
                                }}>
                                    解決策
                                </div>
                                {slide.rightColumn?.map((item, idx) => (
                                    <p key={idx} style={{
                                        fontSize: '0.75rem',
                                        color: '#000',
                                        marginBottom: '0.25rem',
                                    }}>
                                        • {item}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'timeline':
                return (
                    <div style={baseStyle}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            marginBottom: '1rem',
                            color: '#000',
                            textAlign: 'center',
                        }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1 }}>
                            {slide.timelineItems?.map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '0.75rem',
                                }}>
                                    <div style={{
                                        fontSize: '1.25rem',
                                        fontWeight: '700',
                                        color: '#000',
                                        width: '4rem',
                                        textAlign: 'right',
                                        marginRight: '0.75rem',
                                    }}>
                                        {item.year}
                                    </div>
                                    <div style={{
                                        width: '2px',
                                        height: '1.5rem',
                                        background: '#eee',
                                        marginRight: '0.75rem',
                                    }} />
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#333',
                                    }}>
                                        {item.description}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'bullet-points':
            default:
                return (
                    <div style={baseStyle}>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            marginBottom: '1rem',
                            color: '#000',
                        }}>
                            {slide.title}
                        </h3>
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                        }}>
                            {slide.content?.map((item, idx) => (
                                <li key={idx} style={{
                                    fontSize: '1rem',
                                    color: '#333',
                                    marginBottom: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                }}>
                                    <span style={{ marginRight: '0.5rem' }}>•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
        }
    };

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#94a3b8' }}>スライドを生成しています...</p>
                </div>
            </div>
        );
    }

    const currentSlide = slides[selectedSlide];

    return (
        <div style={{
            minHeight: '100vh',
            padding: '2rem',
        }}>
            {/* ステップインジケーター */}
            <div className="steps">
                <div className="step completed">
                    <span className="step-number">✓</span>
                    <span>アップロード</span>
                </div>
                <div className="step completed">
                    <span className="step-number">✓</span>
                    <span>確認・編集</span>
                </div>
                <div className="step active">
                    <span className="step-number">3</span>
                    <span>プレビュー</span>
                </div>
            </div>

            <div className="container">
                {/* エラーメッセージ */}
                {error && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0.5rem',
                        color: '#ef4444',
                        fontSize: '0.875rem',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 280px',
                    gap: '1.5rem',
                }}>
                    {/* メインプレビュー */}
                    <div className="card fade-in">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}>
                            <h2>📊 スライドプレビュー</h2>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {currentSlide && (
                                    <span style={{
                                        background: 'rgba(99, 102, 241, 0.2)',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        color: '#a5b4fc',
                                    }}>
                                        {layoutNames[currentSlide.layoutType]}
                                    </span>
                                )}
                                <span style={{
                                    background: '#334155',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.875rem',
                                }}>
                                    {selectedSlide + 1} / {slides.length}
                                </span>
                            </div>
                        </div>

                        {/* スライド表示 */}
                        {currentSlide && renderSlidePreview(currentSlide)}

                        {/* タイムスタンプ情報 */}
                        {currentSlide && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.75rem 1rem',
                                background: '#334155',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.875rem',
                            }}>
                                <span>
                                    ⏱️ {formatTime(currentSlide.startTime)} - {formatTime(currentSlide.endTime)}
                                </span>
                                <span style={{ color: '#94a3b8' }}>
                                    表示時間: {currentSlide.duration}秒
                                </span>
                            </div>
                        )}

                        {/* ナビゲーション */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '1rem',
                            marginTop: '1rem',
                        }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedSlide(prev => Math.max(0, prev - 1))}
                                disabled={selectedSlide === 0}
                            >
                                ← 前へ
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedSlide(prev => Math.min(slides.length - 1, prev + 1))}
                                disabled={selectedSlide === slides.length - 1}
                            >
                                次へ →
                            </button>
                        </div>
                    </div>

                    {/* サイドバー */}
                    <div>
                        {/* スライド一覧 */}
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>スライド一覧</h3>
                            <div style={{
                                maxHeight: '400px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                            }}>
                                {slides.map((slide, index) => (
                                    <div
                                        key={slide.id}
                                        onClick={() => setSelectedSlide(index)}
                                        style={{
                                            padding: '0.75rem',
                                            background: selectedSlide === index ? 'rgba(99, 102, 241, 0.2)' : '#334155',
                                            border: selectedSlide === index ? '1px solid #6366f1' : '1px solid transparent',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '0.25rem',
                                        }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#94a3b8',
                                            }}>
                                                {index + 1}. {formatTime(slide.startTime)}
                                            </span>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                background: 'rgba(255,255,255,0.1)',
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: '0.25rem',
                                                color: '#94a3b8',
                                            }}>
                                                {layoutNames[slide.layoutType]}
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '0.875rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {slide.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ダウンロードボタン */}
                        <button
                            className="btn btn-primary"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            style={{ width: '100%' }}
                        >
                            {isDownloading ? (
                                <>
                                    <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                                    準備中...
                                </>
                            ) : (
                                '📥 PPTXをダウンロード'
                            )}
                        </button>

                        <p style={{
                            marginTop: '0.75rem',
                            fontSize: '0.75rem',
                            color: '#64748b',
                            textAlign: 'center',
                        }}>
                            ※ 洗練されたミニマルデザイン
                        </p>

                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/')}
                            style={{ width: '100%', marginTop: '1rem' }}
                        >
                            🏠 ホームに戻る
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Preview;
