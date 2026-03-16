import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { FaCheck, FaEraser } from 'react-icons/fa6';

interface MobileSignatureProps {
  sessionId: string;
}

const MobileSignature: React.FC<MobileSignatureProps> = ({ sessionId }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const resizeCanvas = () => {
    if (sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas();
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const parent = canvas.parentElement;
      if (parent) {
        const data = sigCanvas.current.toData();
        canvas.width = parent.offsetWidth * ratio;
        canvas.height = parent.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        sigCanvas.current.clear();
        if (data && data.length > 0) {
            sigCanvas.current.fromData(data);
        }
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(resizeCanvas, 100);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const submitSignature = async () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.toDataURL();
      
      try {
          await updateDoc(doc(db, "signatures", sessionId), {
              signatureData: signatureData,
              status: 'signed',
              signedAt: new Date()
          });
          setSubmitted(true);
      } catch (e) {
          console.error("Error sending signature", e);
          setError("Erreur lors de l'envoi. Vérifiez votre connexion.");
      }
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-green-50 p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <FaCheck className="text-4xl text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Signature Envoyée !</h1>
        <p className="text-green-600">Vous pouvez fermer cette page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-100 p-4 overflow-hidden">
      <div className="mb-4 text-center shrink-0">
        <h1 className="text-xl font-bold text-neutral-800">Signature Client</h1>
        <p className="text-sm text-neutral-500">Veuillez signer dans la zone ci-dessous</p>
      </div>

      {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
              {error}
          </div>
      )}

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden relative mb-4 touch-none">
        <SignatureCanvas 
            ref={sigCanvas}
            penColor="black"
            canvasProps={{className: 'w-full h-full block absolute inset-0'}}
            backgroundColor="rgba(255,255,255,1)"
            clearOnResize={false}
        />
      </div>

      <div className="flex gap-3 shrink-0 pb-safe">
        <button 
          onClick={clearSignature}
          className="flex-1 py-4 bg-white text-neutral-600 font-bold rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 touch-manipulation"
        >
          <FaEraser /> Effacer
        </button>
        <button 
          onClick={submitSignature}
          className="flex-1 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 touch-manipulation"
        >
          <FaCheck /> Valider
        </button>
      </div>
    </div>
  );
};

export default MobileSignature;
