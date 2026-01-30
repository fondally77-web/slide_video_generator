import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Phase 1 + Phase 2 レイアウトタイプ
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

// レイアウト名の日本語マッピング
const layoutNames: Record<LayoutType, string> = {
    'title': 'タイトル',
    'data-emphasis': 'データ強調',
    'three-columns': '3カラム',
    'two-columns': '2カラム',
    'timeline': 'タイムライン',
    'bullet-points': '箇条書き',
    'network-diagram': 'ネットワーク',
    'bubble-chart': 'バブル',
    'arrow-steps': '矢印ステップ',
    'formula-flow': '数式フロー',
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
            padding: '1.5rem',
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
                    <div style={{ ...baseStyle, justifyContent: 'center', alignItems: 'center' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h2>
                    </div>
                );

            case 'data-emphasis':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000' }}>
                            {slide.title}
                        </h3>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                {slide.content?.map((item, idx) => (
                                    <p key={idx} style={{ fontSize: '0.75rem', color: '#333', marginBottom: '0.25rem' }}>{item}</p>
                                ))}
                            </div>
                            <div style={{ borderLeft: '2px solid #eee', paddingLeft: '1rem', marginLeft: '0.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#000' }}>{slide.emphasisNumber}</div>
                                <div style={{ fontSize: '0.65rem', color: '#666' }}>{slide.emphasisLabel}</div>
                            </div>
                        </div>
                    </div>
                );

            case 'three-columns':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                            {slide.steps?.map((step, idx) => (
                                <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ddd' }}>{step.number}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#000', marginBottom: '0.15rem' }}>{step.title}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#666' }}>{step.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'two-columns':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ display: 'flex', flex: 1, gap: '0.25rem' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#666', marginBottom: '0.25rem', textAlign: 'center' }}>課題</div>
                                {slide.leftColumn?.map((item, idx) => (
                                    <p key={idx} style={{ fontSize: '0.6rem', color: '#333', marginBottom: '0.15rem' }}>• {item}</p>
                                ))}
                            </div>
                            <div style={{ width: '2px', background: '#000' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: '600', color: '#000', marginBottom: '0.25rem', textAlign: 'center' }}>解決策</div>
                                {slide.rightColumn?.map((item, idx) => (
                                    <p key={idx} style={{ fontSize: '0.6rem', color: '#000', marginBottom: '0.15rem' }}>• {item}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'timeline':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1 }}>
                            {slide.timelineItems?.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000', width: '3rem', textAlign: 'right', marginRight: '0.5rem' }}>{item.year}</div>
                                    <div style={{ width: '2px', height: '1rem', background: '#eee', marginRight: '0.5rem' }} />
                                    <div style={{ fontSize: '0.7rem', color: '#333' }}>{item.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            // Phase 2 レイアウト
            case 'network-diagram':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                            <svg width="200" height="150" viewBox="0 0 200 150">
                                {/* エッジ */}
                                {slide.networkEdges?.map((edge, idx) => {
                                    const nodes = slide.networkNodes || [];
                                    const fromIdx = nodes.findIndex(n => n.id === edge.from);
                                    const toIdx = nodes.findIndex(n => n.id === edge.to);
                                    if (fromIdx === -1 || toIdx === -1) return null;
                                    const fromAngle = (2 * Math.PI * fromIdx) / nodes.length - Math.PI / 2;
                                    const toAngle = (2 * Math.PI * toIdx) / nodes.length - Math.PI / 2;
                                    const cx = 100, cy = 75, r = 50;
                                    return (
                                        <line
                                            key={idx}
                                            x1={cx + r * Math.cos(fromAngle)}
                                            y1={cy + r * Math.sin(fromAngle)}
                                            x2={cx + r * Math.cos(toAngle)}
                                            y2={cy + r * Math.sin(toAngle)}
                                            stroke="#ccc"
                                            strokeWidth="1"
                                        />
                                    );
                                })}
                                {/* ノード */}
                                {slide.networkNodes?.map((node, idx) => {
                                    const angle = (2 * Math.PI * idx) / (slide.networkNodes?.length || 1) - Math.PI / 2;
                                    const cx = 100, cy = 75, r = 50;
                                    const x = cx + r * Math.cos(angle);
                                    const y = cy + r * Math.sin(angle);
                                    return (
                                        <g key={node.id}>
                                            <circle cx={x} cy={y} r="20" fill="white" stroke="#000" strokeWidth="1.5" />
                                            <text x={x} y={y + 4} textAnchor="middle" fontSize="8" fontWeight="bold">{node.label}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                );

            case 'bubble-chart':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                            <svg width="200" height="150" viewBox="0 0 200 150">
                                {slide.bubbles?.map((bubble, idx) => {
                                    const sizeMap = { large: 60, medium: 45, small: 30 };
                                    const r = sizeMap[bubble.size];
                                    const cx = 100 + (idx - (slide.bubbles?.length || 1) / 2) * 20;
                                    const cy = 75;
                                    return (
                                        <g key={idx}>
                                            <circle cx={cx} cy={cy} r={r} fill="white" stroke="#000" strokeWidth="1.5" opacity="0.8" />
                                            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fontWeight="bold">{bubble.label}</text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                );

            case 'arrow-steps':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {slide.arrowSteps?.map((step, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        flex: 1,
                                        background: idx % 2 === 0 ? '#000' : '#eee',
                                        color: idx % 2 === 0 ? '#fff' : '#000',
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        clipPath: idx < (slide.arrowSteps?.length || 1) - 1
                                            ? 'polygon(0 0, 85% 0, 100% 50%, 85% 100%, 0 100%, 15% 50%)'
                                            : 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 15% 50%)',
                                    }}
                                >
                                    <div style={{ fontSize: '0.6rem', fontWeight: '600' }}>{step.label}</div>
                                    {step.description && (
                                        <div style={{ fontSize: '0.5rem', opacity: 0.8 }}>{step.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'formula-flow':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000', textAlign: 'center' }}>
                            {slide.title}
                        </h3>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                            {slide.formula && (
                                <>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>{slide.formula.left}</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#999' }}>{slide.formula.operator}</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>{slide.formula.right}</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#999' }}>=</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#000' }}>{slide.formula.result}</span>
                                </>
                            )}
                        </div>
                    </div>
                );

            case 'bullet-points':
            default:
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000' }}>
                            {slide.title}
                        </h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {slide.content?.map((item, idx) => (
                                <li key={idx} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start' }}>
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
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#94a3b8' }}>スライドを生成しています...</p>
                </div>
            </div>
        );
    }

    const currentSlide = slides[selectedSlide];

    return (
        <div style={{ minHeight: '100vh', padding: '2rem' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }}>
                    {/* メインプレビュー */}
                    <div className="card fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                                        {layoutNames[currentSlide.layoutType] || currentSlide.layoutType}
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

                        {currentSlide && renderSlidePreview(currentSlide)}

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
                                <span>⏱️ {formatTime(currentSlide.startTime)} - {formatTime(currentSlide.endTime)}</span>
                                <span style={{ color: '#94a3b8' }}>表示時間: {currentSlide.duration}秒</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                {index + 1}. {formatTime(slide.startTime)}
                                            </span>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                background: 'rgba(255,255,255,0.1)',
                                                padding: '0.125rem 0.375rem',
                                                borderRadius: '0.25rem',
                                                color: '#94a3b8',
                                            }}>
                                                {layoutNames[slide.layoutType] || slide.layoutType}
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

                        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
                            ※ Phase 2 レイアウト対応版
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
