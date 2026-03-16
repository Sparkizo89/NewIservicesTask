import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { FaXmark } from 'react-icons/fa6';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    scanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        onScan(decodedText);
        scanner.stop().catch(console.error);
      },
      (errorMessage) => {
        // Ignore normal scanning errors (no barcode found)
      }
    ).catch((err) => {
      console.error("Error starting scanner:", err);
      setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111] rounded-2xl p-4 w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 w-10 h-10 bg-white dark:bg-[#111] rounded-full flex items-center justify-center text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
        >
          <FaXmark />
        </button>
        
        <h3 className="text-center font-tech font-bold uppercase tracking-widest mb-4 dark:text-white text-black">Scanner un Code-Barres</h3>
        
        {error ? (
          <div className="text-red-500 text-center p-4 bg-red-500/10 rounded-xl text-sm">
            {error}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border-2 border-orange-600/50">
            <div id="reader" className="w-full"></div>
          </div>
        )}
        
        <p className="text-center text-xs text-neutral-500 mt-4">
          Placez le code-barres (EAN-13, etc.) au centre de la zone de scan.
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
