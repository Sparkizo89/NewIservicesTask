import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface SignaturePageProps {
    sessionId: string;
}

const SignaturePage: React.FC<SignaturePageProps> = ({ sessionId }) => {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle');
    const [isEmpty, setIsEmpty] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const resize = () => {
            if (sigCanvas.current) {
                const canvas = sigCanvas.current.getCanvas();
                const ratio = Math.max(window.devicePixelRatio || 1, 1);
                const parent = canvas.parentElement;
                if (parent) {
                    canvas.width = parent.offsetWidth * ratio;
                    canvas.height = parent.offsetHeight * ratio;
                    canvas.getContext('2d')?.scale(ratio, ratio);
                    sigCanvas.current.clear();
                }
            }
        };
        setTimeout(resize, 150);
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const handleClear = () => {
        sigCanvas.current?.clear();
        setIsEmpty(true);
    };

    const handleSubmit = async () => {
        if (!sigCanvas.current || sigCanvas.current.isEmpty()) return;
        setIsSubmitting(true);
        try {
            const signatureData = sigCanvas.current.toDataURL();
            await setDoc(doc(db, 'signatureSessions', sessionId), {
                signatureData,
                status: 'completed',
                completedAt: serverTimestamp()
            });
            setStatus('done');
        } catch (e) {
            console.error('Error sending signature', e);
            setStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (status === 'done') {
        return (
            <div style={styles.fullPage}>
                <div style={styles.resultCard}>
                    <div style={{ ...styles.iconCircle, borderColor: '#22c55e', background: 'rgba(34,197,94,0.12)' }}>
                        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#22c55e" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 style={styles.resultTitle}>Signature envoyée !</h1>
                    <p style={styles.resultSub}>Votre signature a bien été transmise au technicien.</p>
                    <p style={{ ...styles.resultSub, color: '#404040', marginTop: 8, fontSize: 12 }}>Vous pouvez fermer cette page.</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div style={styles.fullPage}>
                <div style={styles.resultCard}>
                    <div style={{ ...styles.iconCircle, borderColor: '#ef4444', background: 'rgba(239,68,68,0.12)' }}>
                        <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 style={styles.resultTitle}>Erreur de connexion</h1>
                    <p style={styles.resultSub}>Impossible d'envoyer la signature. Veuillez réessayer.</p>
                    <button style={styles.btnPrimary} onClick={() => { setStatus('idle'); setIsSubmitting(false); }}>
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.fullPage}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerIcon}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </div>
                <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15, lineHeight: 1.3 }}>Signature électronique</div>
                    <div style={{ color: '#737373', fontSize: 12 }}>iServices — Bon QualiRépar</div>
                </div>
            </div>

            {/* Instructions */}
            <div style={{ padding: '10px 20px', color: '#a3a3a3', fontSize: 13, lineHeight: 1.5 }}>
                Signez avec votre <strong style={{ color: 'white' }}>doigt</strong> dans le cadre ci-dessous puis appuyez sur <strong style={{ color: 'white' }}>Terminer</strong>.
            </div>

            {/* Signature canvas — fixed height so button is always visible */}
            <div style={{ padding: '0 16px', flex: 1, minHeight: 0 }}>
                <div style={styles.canvasWrapper}>
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{
                            style: { width: '100%', height: '100%', display: 'block', touchAction: 'none' }
                        }}
                        onEnd={() => setIsEmpty(false)}
                        onBegin={() => setIsEmpty(false)}
                    />
                    {isEmpty && (
                        <div style={styles.placeholder}>
                            <span style={{ color: '#c4c4c4', fontSize: 14, fontWeight: 500, pointerEvents: 'none' }}>
                                Signez ici avec votre doigt
                            </span>
                        </div>
                    )}
                    <button onClick={handleClear} style={styles.clearBtn}>Effacer</button>
                </div>
            </div>

            {/* Footer — always visible at bottom */}
            <div style={styles.footer}>
                <button
                    onClick={handleSubmit}
                    disabled={isEmpty || isSubmitting}
                    style={{
                        ...styles.btnPrimary,
                        background: isEmpty || isSubmitting ? '#262626' : '#f97316',
                        color: isEmpty || isSubmitting ? '#525252' : 'white',
                        boxShadow: isEmpty || isSubmitting ? 'none' : '0 0 24px rgba(249,115,22,0.4)',
                        cursor: isEmpty || isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                >
                    {isSubmitting ? 'Envoi...' : 'Terminer'}
                </button>
                <p style={{ textAlign: 'center', color: '#404040', fontSize: 11, marginTop: 8 }}>
                    En signant, vous validez votre bon de réparation QualiRépar.
                </p>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    fullPage: {
        minHeight: '100dvh',
        height: '100dvh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'rgba(249,115,22,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    canvasWrapper: {
        position: 'relative',
        height: '100%',
        minHeight: 200,
        borderRadius: 16,
        border: '2px dashed rgba(255,255,255,0.2)',
        background: 'white',
        overflow: 'hidden',
    },
    placeholder: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    clearBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: '5px 12px',
        background: '#f5f5f5',
        color: '#525252',
        fontSize: 12,
        fontWeight: 600,
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        zIndex: 10,
    },
    footer: {
        padding: '12px 16px 20px',
        flexShrink: 0,
    },
    btnPrimary: {
        width: '100%',
        padding: '15px',
        borderRadius: 14,
        border: 'none',
        fontWeight: 700,
        fontSize: 16,
        transition: 'all 0.2s',
        display: 'block',
    },
    resultCard: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        textAlign: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    resultTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 700,
        marginBottom: 8,
    },
    resultSub: {
        color: '#a3a3a3',
        fontSize: 14,
        lineHeight: 1.5,
    },
};

export default SignaturePage;
