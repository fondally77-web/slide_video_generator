import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface Segment {
    id: string;
    start: number;
    end: number;
    text: string;
    correctedText?: string;
}

function TextEdit() {
    const navigate = useNavigate();
    const location = useLocation();
    const projectId = location.state?.projectId;

    const [segments, setSegments] = useState<Segment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCorrecting, setIsCorrecting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId) {
            navigate('/upload');
            return;
        }
        fetchTranscription();
    }, [projectId]);

    const fetchTranscription = async () => {
        try {
            const response = await fetch(`/api/project/${projectId}/transcription`);
            if (!response.ok) throw new Error('データの取得に失敗しました');
            const data = await response.json();
            setSegments(data.segments);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCorrectAll = async () => {
        setIsCorrecting(true);
        try {
            const response = await fetch(`/api/project/${projectId}/correct`, {
                method: 'POST',
            });
            if (!response.ok) throw new Error('修正に失敗しました');
            const data = await response.json();
            setSegments(data.segments);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
        } finally {
            setIsCorrecting(false);
        }
    };

    const handleTextChange = (id: string, newText: string) => {
        setSegments(prev =>
            prev.map(seg =>
                seg.id === id ? { ...seg, correctedText: newText } : seg
            )
        );
    };

    const handleGenerateSlides = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch(`/api/project/${projectId}/generate-slides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ segments }),
            });
            if (!response.ok) throw new Error('スライド生成に失敗しました');
            navigate('/preview', { state: { projectId } });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setIsGenerating(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                    <p style={{ color: '#94a3b8' }}>音声を認識しています...</p>
                </div>
            </div>
        );
    }

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
                <div className="step active">
                    <span className="step-number">2</span>
                    <span>確認・編集</span>
                </div>
                <div className="step">
                    <span className="step-number">3</span>
                    <span>プレビュー</span>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '900px' }}>
                <div className="card fade-in">
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem',
                    }}>
                        <h2>✏️ テキストの確認・編集</h2>
                        <button
                            className="btn btn-secondary"
                            onClick={handleCorrectAll}
                            disabled={isCorrecting}
                        >
                            {isCorrecting ? (
                                <>
                                    <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                                    修正中...
                                </>
                            ) : (
                                '🔧 AIで誤字脱字を修正'
                            )}
                        </button>
                    </div>

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

                    {/* セグメントリスト */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        {segments.map((segment, index) => (
                            <div
                                key={segment.id}
                                style={{
                                    padding: '1rem',
                                    background: editingId === segment.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem',
                                    border: '1px solid transparent',
                                    borderColor: editingId === segment.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '1rem',
                                }}>
                                    {/* タイムスタンプ */}
                                    <div style={{
                                        background: '#334155',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {formatTime(segment.start)} - {formatTime(segment.end)}
                                    </div>

                                    {/* テキスト */}
                                    <div style={{ flex: 1 }}>
                                        {editingId === segment.id ? (
                                            <textarea
                                                value={segment.correctedText ?? segment.text}
                                                onChange={(e) => handleTextChange(segment.id, e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                style={{
                                                    width: '100%',
                                                    minHeight: '80px',
                                                    resize: 'vertical',
                                                }}
                                            />
                                        ) : (
                                            <p
                                                onClick={() => setEditingId(segment.id)}
                                                style={{
                                                    cursor: 'text',
                                                    lineHeight: '1.8',
                                                    color: segment.correctedText ? '#22c55e' : '#f8fafc',
                                                }}
                                            >
                                                {segment.correctedText ?? segment.text}
                                                {segment.correctedText && segment.correctedText !== segment.text && (
                                                    <span style={{
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.75rem',
                                                        color: '#22c55e',
                                                    }}>
                                                        (修正済み)
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* アクションボタン */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        justifyContent: 'flex-end',
                    }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate('/upload')}
                        >
                            ← 戻る
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleGenerateSlides}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <span className="spinner" style={{ width: '1rem', height: '1rem' }} />
                                    生成中...
                                </>
                            ) : (
                                'スライドを生成 →'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TextEdit;
