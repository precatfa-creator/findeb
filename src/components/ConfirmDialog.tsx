import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

type Variant = 'default' | 'danger' | 'error';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: Variant;
};

type NotifyOptions = {
  title?: string;
  message: string;
  variant?: Variant;
};

type DialogState =
  | { mode: 'confirm'; opts: ConfirmOptions; resolve: (value: boolean) => void }
  | { mode: 'notify'; opts: NotifyOptions; resolve: (value: boolean) => void };

const ConfirmContext = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (opts: NotifyOptions) => Promise<void>;
} | null>(null);

const variantIcon: Record<Variant, typeof AlertTriangle> = {
  default: Info,
  danger: AlertTriangle,
  error: XCircle,
};

const variantColor: Record<Variant, string> = {
  default: 'text-primary bg-primary/10',
  danger: 'text-red-500 bg-red-500/10',
  error: 'text-red-500 bg-red-500/10',
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => setState({ mode: 'confirm', opts, resolve }));
  }, []);

  const notify = useCallback((opts: NotifyOptions) => {
    return new Promise<void>(resolve => setState({ mode: 'notify', opts, resolve: () => resolve() }));
  }, []);

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  const variant = state?.opts.variant || 'default';
  const Icon = variantIcon[variant];

  return (
    <ConfirmContext.Provider value={{ confirm, notify }}>
      {children}
      <AnimatePresence>
        {state && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              onClick={e => e.stopPropagation()}
              className="glass-card w-full max-w-sm rounded-[2rem] p-6 sm:p-8 bg-white/90 dark:bg-gray-900/90"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${variantColor[variant]}`}>
                <Icon size={28} />
              </div>
              {state.opts.title && (
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-2">{state.opts.title}</h3>
              )}
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">{state.opts.message}</p>

              <div className="flex gap-3 mt-7">
                {state.mode === 'confirm' && (
                  <button
                    onClick={() => close(false)}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                  >
                    {(state.opts as ConfirmOptions).cancelText || 'إلغاء'}
                  </button>
                )}
                <button
                  onClick={() => close(true)}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-colors ${variant === 'danger' || variant === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                >
                  {state.mode === 'confirm' ? ((state.opts as ConfirmOptions).confirmText || 'تأكيد') : 'حسناً'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmDialog must be used within ConfirmProvider');
  return ctx;
}
