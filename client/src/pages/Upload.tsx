import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function Upload() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            validateAndSetFile(droppedFile);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            validateAndSetFile(selectedFile);
        }
    }, []);

    const validateAndSetFile = (file: File) => {
        // WAVファイルチェック
        if (!file.name.toLowerCase().endsWith('.wav')) {
            setError('WAVファイルのみ対応しています');
            return;
        }

        // サイズチェック (16MB)
        const maxSize = 16 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('ファイルサイズは16MB以下にしてください');
            return;
        }

        setFile(file);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('audio', file);

            // プログレスシミュレーション
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('アップロードに失敗しました');
            }

            const data = await response.json();
            setUploadProgress(100);

            // 少し待ってから次の画面へ
            setTimeout(() => {
                navigate('/edit', { state: { projectId: data.projectId } });
            }, 500);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setIsUploading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
        }}>
            {/* ステップインジケーター */}
            <div className="steps">
                <div className="step active">
                    <span className="step-number">1</span>
                    <span>アップロード</span>
                </div>
                <div className="step">
                    <span className="step-number">2</span>
                    <span>確認・編集</span>
                </div>
                <div className="step">
                    <span className="step-number">3</span>
                    <span>プレビュー</span>
                </div>
            </div>

            <div className="container" style={{ maxWidth: '600px', width: '100%' }}>
                <div className="card fade-in">
                    <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                        🎤 音声ファイルをアップロード
                    </h2>

                    {/* ドロップゾーン */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                            border: `2px dashed ${isDragging ? '#6366f1' : '#475569'}`,
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                        }}
                        onClick={() => document.getElementById('fileInput')?.click()}
                    >
                        <input
                            type="file"
                            id="fileInput"
                            accept=".wav"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />

                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                            {file ? '✅' : '📁'}
                        </div>

                        {file ? (
                            <div>
                                <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                                    {file.name}
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '0.5rem' }}>
                                    ファイルをドラッグ＆ドロップ
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                                    または クリックしてファイルを選択
                                </p>
                                <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1rem' }}>
                                    対応形式: WAV (最大16MB)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* エラーメッセージ */}
                    {error && (
                        <div style={{
                            marginTop: '1rem',
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

                    {/* プログレスバー */}
                    {isUploading && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <div className="progress-bar">
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p style={{
                                textAlign: 'center',
                                marginTop: '0.5rem',
                                color: '#94a3b8',
                                fontSize: '0.875rem',
                            }}>
                                {uploadProgress < 100 ? 'アップロード中...' : '完了！'}
                            </p>
                        </div>
                    )}

                    {/* アップロードボタン */}
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        style={{
                            width: '100%',
                            marginTop: '1.5rem',
                        }}
                    >
                        {isUploading ? (
                            <>
                                <span className="spinner" />
                                処理中...
                            </>
                        ) : (
                            '🚀 アップロードして開始'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Upload;
