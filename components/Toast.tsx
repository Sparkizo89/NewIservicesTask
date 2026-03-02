import React, { useEffect } from 'react';
import { FaSquareCheck } from 'react-icons/fa6';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <div
      className={`fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-5 bg-[#e5e5e5] text-black px-6 py-4 rounded-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all duration-500 z-50 min-w-[340px] font-tech border-l-8 border-orange-600 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
    >
      <FaSquareCheck className="text-xl text-orange-600" />
      <div className="flex flex-col">
          <span className="font-bold text-sm uppercase tracking-widest">Notification Système</span>
          <span className="text-xs font-mono font-bold mt-1">{message}</span>
      </div>
    </div>
  );
};

export default Toast;