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
    networkNodes?: Array<{ id: string; label: string }>;
    networkEdges?: Array<{ from: string; to: string }>;
    bubbles?: Array<{ label: string; size: 'small' | 'medium' | 'large'; overlap?: string[] }>;
    arrowSteps?: Array<{ label: string; description?: string }>;
    formula?: { left: string; operator: string; right: string; result: string };
    notes: string;
    startTime: number;
    endTime: number;
    duration: number;
}

interface VoicevoxCharacter {
    key: string;
    name: string;
    style: string;
}

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

    // VOICEVOX関連のstate
    const [voicevoxAvailable, setVoicevoxAvailable] = useState(false);
    const [characters, setCharacters] = useState<VoicevoxCharacter[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState('zundamon-normal');
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            navigate('/upload');
            return;
        }
        fetchSlides();
        checkVoicevoxStatus();
        fetchCharacters();
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

    const checkVoicevoxStatus = async () => {
        try {
            const response = await fetch('/api/voicevox/status');
            const data = await response.json();
            setVoicevoxAvailable(data.available);
        } catch {
            setVoicevoxAvailable(false);
        }
    };

    const fetchCharacters = async () => {
        try {
            const response = await fetch('/api/voicevox/characters');
            const data = await response.json();
            setCharacters(data.characters || []);
        } catch {
            setCharacters([]);
        }
    };

    const handleSynthesize = async () => {
        const currentSlide = slides[selectedSlide];
        if (!currentSlide) return;

        const text = currentSlide.notes || currentSlide.title;
        if (!text) return;

        setIsSynthesizing(true);
        setAudioUrl(null);

        try {
            const response = await fetch('/api/voicevox/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, characterKey: selectedCharacter }),
            });

            const data = await response.json();
            if (data.success && data.audioUrl) {
                setAudioUrl(data.audioUrl);
            } else {
                setError(data.error || '音声合成に失敗しました');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '音声合成に失敗しました');
        } finally {
            setIsSynthesizing(false);
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
                        <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#000', textAlign: 'center' }}>{slide.title}</h2>
                    </div>
                );
            case 'data-emphasis':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000' }}>{slide.title}</h3>
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
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: '#000', textAlign: 'center' }}>{slide.title}</h3>
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
            case 'formula-flow':
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000', textAlign: 'center' }}>{slide.title}</h3>
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
            default:
                return (
                    <div style={baseStyle}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.75rem', color: '#000' }}>{slide.title}</h3>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {slide.content?.map((item, idx) => (
                                <li key={idx} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '0.5rem' }}>• {item}</li>
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
    const groupedCharacters = characters.reduce((acc, char) => {
        if (!acc[char.name]) acc[char.name] = [];
        acc[char.name].push(char);
        return acc;
    }, {} as Record<string, VoicevoxCharacter[]>);

    return (
        <div style={{ minHeight: '100vh', padding: '2rem' }}>
            <div className="steps">
                <div className="step completed"><span className="step-number">✓</span><span>アップロード</span></div>
                <div className="step completed"><span className="step-number">✓</span><span>確認・編集</span></div>
                <div className="step active"><span className="step-number">3</span><span>プレビュー</span></div>
            </div>

            <div className="container">
                {error && (
                    <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.875rem' }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
                    {/* メインプレビュー */}
                    <div className="card fade-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2>📊 スライドプレビュー</h2>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {currentSlide && (
                                    <span style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#a5b4fc' }}>
                                        {layoutNames[currentSlide.layoutType] || currentSlide.layoutType}
                                    </span>
                                )}
                                <span style={{ background: '#334155', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem' }}>
                                    {selectedSlide + 1} / {slides.length}
                                </span>
                            </div>
                        </div>

                        {currentSlide && renderSlidePreview(currentSlide)}

                        {currentSlide && (
                            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#334155', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                <span>⏱️ {formatTime(currentSlide.startTime)} - {formatTime(currentSlide.endTime)}</span>
                                <span style={{ color: '#94a3b8' }}>表示時間: {currentSlide.duration}秒</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedSlide(prev => Math.max(0, prev - 1))} disabled={selectedSlide === 0}>← 前へ</button>
                            <button className="btn btn-secondary" onClick={() => setSelectedSlide(prev => Math.min(slides.length - 1, prev + 1))} disabled={selectedSlide === slides.length - 1}>次へ →</button>
                        </div>
                    </div>

                    {/* サイドバー */}
                    <div>
                        {/* VOICEVOX セクション */}
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                🎤 音声読み上げ
                                <span style={{
                                    fontSize: '0.625rem',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '0.25rem',
                                    background: voicevoxAvailable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: voicevoxAvailable ? '#22c55e' : '#ef4444',
                                }}>
                                    {voicevoxAvailable ? '接続中' : '未接続'}
                                </span>
                            </h3>

                            {voicevoxAvailable ? (
                                <>
                                    <select
                                        value={selectedCharacter}
                                        onChange={(e) => setSelectedCharacter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            marginBottom: '0.75rem',
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '0.375rem',
                                            color: 'white',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {Object.entries(groupedCharacters).map(([name, chars]) => (
                                            <optgroup key={name} label={name}>
                                                {chars.map((char) => (
                                                    <option key={char.key} value={char.key}>
                                                        {char.name} ({char.style})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>

                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleSynthesize}
                                        disabled={isSynthesizing}
                                        style={{ width: '100%', marginBottom: '0.5rem' }}
                                    >
                                        {isSynthesizing ? '合成中...' : '🔊 このスライドを読み上げ'}
                                    </button>

                                    {audioUrl && (
                                        <audio controls src={audioUrl} style={{ width: '100%', marginTop: '0.5rem' }} autoPlay />
                                    )}
                                </>
                            ) : (
                                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    VOICEVOXを起動してください。<br />
                                    ずんだもんなどの音声で読み上げできます。
                                </p>
                            )}
                        </div>

                        {/* スライド一覧 */}
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>スライド一覧</h3>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{index + 1}. {formatTime(slide.startTime)}</span>
                                            <span style={{ fontSize: '0.625rem', background: 'rgba(255,255,255,0.1)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: '#94a3b8' }}>
                                                {layoutNames[slide.layoutType] || slide.layoutType}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slide.title}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={handleDownload} disabled={isDownloading} style={{ width: '100%' }}>
                            {isDownloading ? '準備中...' : '📥 PPTXをダウンロード'}
                        </button>

                        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ width: '100%', marginTop: '1rem' }}>
                            🏠 ホームに戻る
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Preview;
