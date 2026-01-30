import { useNavigate } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}>
            {/* ヒーローセクション */}
            <div style={{
                textAlign: 'center',
                maxWidth: '800px',
                animation: 'fadeIn 0.6s ease',
            }}>
                {/* ロゴ/アイコン */}
                <div style={{
                    fontSize: '4rem',
                    marginBottom: '1.5rem',
                    filter: 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.5))',
                }}>
                    🎙️✨📊
                </div>

                {/* タイトル */}
                <h1 style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    Slide Video Generator
                </h1>

                {/* サブタイトル */}
                <p style={{
                    fontSize: '1.25rem',
                    color: '#94a3b8',
                    marginBottom: '2rem',
                    lineHeight: '1.8',
                }}>
                    音声ファイルをアップロードするだけで<br />
                    <strong style={{ color: '#f8fafc' }}>AIが自動でスライドを生成</strong>します
                </p>

                {/* 機能リスト */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginBottom: '3rem',
                }}>
                    {[
                        { icon: '🎤', text: '音声認識' },
                        { icon: '✏️', text: '誤字脱字修正' },
                        { icon: '📊', text: 'スライド生成' },
                        { icon: '⏱️', text: '切り替え時間設定' },
                    ].map((feature, index) => (
                        <div
                            key={index}
                            style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '2rem',
                                padding: '0.5rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.9rem',
                            }}
                        >
                            <span>{feature.icon}</span>
                            <span>{feature.text}</span>
                        </div>
                    ))}
                </div>

                {/* CTAボタン */}
                <button
                    className="btn btn-primary"
                    onClick={() => navigate('/upload')}
                    style={{
                        fontSize: '1.25rem',
                        padding: '1rem 3rem',
                    }}
                >
                    🚀 今すぐ始める
                </button>

                {/* 説明テキスト */}
                <p style={{
                    marginTop: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#64748b',
                }}>
                    WAVファイル対応 • 登録不要 • 無料で利用可能
                </p>
            </div>

            {/* ステップ説明 */}
            <div style={{
                marginTop: '4rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.5rem',
                maxWidth: '900px',
                width: '100%',
            }}>
                {[
                    { step: '1', title: 'アップロード', desc: 'WAVファイルを選択' },
                    { step: '2', title: '音声認識', desc: 'AIがテキストに変換' },
                    { step: '3', title: '確認・編集', desc: '誤字脱字を修正' },
                    { step: '4', title: 'ダウンロード', desc: 'PPTXを取得' },
                ].map((item, index) => (
                    <div
                        key={index}
                        className="card"
                        style={{
                            textAlign: 'center',
                            opacity: 0,
                            animation: `fadeIn 0.5s ease ${0.2 + index * 0.1}s forwards`,
                        }}
                    >
                        <div style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem',
                            fontWeight: '700',
                        }}>
                            {item.step}
                        </div>
                        <h3 style={{ marginBottom: '0.5rem' }}>{item.title}</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Home;
