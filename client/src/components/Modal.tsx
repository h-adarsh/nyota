import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0a1217]/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div
        className={`w-full ${maxWidth} bg-[#ffffff] rounded-[24px] border border-[#000000] overflow-hidden transform transition-all animate-in fade-in duration-200`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#0a1217]/10">
          <div>
            <h3 className="text-lg font-medium text-[#0a1217] tracking-tight">{title}</h3>
            {subtitle && <p className="text-[13px] text-[#85898b] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#85898b] hover:text-[#0a1217] hover:bg-[#e4eff7] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
};
