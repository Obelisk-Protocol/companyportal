import { Fragment, ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-40 dark:bg-black/70"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={`${sizes[size]} w-full max-h-[90vh] flex flex-col bg-surface-container-lowest dark:bg-[var(--bg-card)] border border-outline-variant dark:border-[var(--border-color)] rounded-2xl shadow-2xl transition-colors`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/80 dark:border-[var(--border-color)] flex-shrink-0">
                <h3 className="text-lg font-semibold font-headline text-on-surface">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-[var(--hover-bg)] rounded-lg transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 text-on-surface">{children}</div>
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}
