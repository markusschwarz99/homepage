import type { ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Modal({
  title,
  onClose,
  onConfirm,
  confirmLabel = 'OK',
  confirmVariant = 'primary',
  children,
}: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary rounded-xl p-8 max-w-md w-full relative shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-bg-secondary flex items-center justify-center text-text-muted hover:text-text-primary text-2xl leading-none"
        >
          ×
        </button>

        <h3 className="text-lg font-medium mb-6 pr-8">{title}</h3>

        <div className="mb-6">{children}</div>

        {onConfirm && (
          <Button variant={confirmVariant} onClick={onConfirm} className="w-full">
            {confirmLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
