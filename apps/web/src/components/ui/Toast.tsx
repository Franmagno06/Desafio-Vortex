import { createContext, use, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Notificações temporárias (toasts).
 *
 * Requisito de "feedback visual" do edital: depois de criar ou excluir um
 * anúncio, a interface precisa confirmar que a ação deu certo. Sem isso o
 * usuário fica sem saber se o clique funcionou.
 *
 * Acessibilidade: o contêiner é `role="status"` com `aria-live="polite"`, então
 * o leitor de tela anuncia a mensagem sem interromper o que estiver falando.
 */

type ToastKind = 'success' | 'error';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      // `Date.now()` colidiria se dois toasts nascessem no mesmo milissegundo.
      const id = Math.random();

      setToasts((current) => [...current, { id, kind, message }]);
      setTimeout(() => {
        dismiss(id);
      }, AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => {
        push('success', message);
      },
      error: (message) => {
        push('error', message);
      },
    }),
    [push],
  );

  return (
    <ToastContext value={api}>
      {children}

      <div
        role="status"
        aria-live="polite"
        // `pointer-events-none` no contêiner + `auto` no card: a área vazia ao
        // redor não bloqueia cliques na página atrás.
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg',
              'animate-[fadeIn_0.2s_ease-out]',
              toast.kind === 'success'
                ? 'border-brand-200 bg-brand-50 text-brand-900'
                : 'border-red-200 bg-red-50 text-red-800',
            )}
          >
            {toast.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            )}

            <p className="flex-1 text-sm font-medium">{toast.message}</p>

            <button
              type="button"
              onClick={() => {
                dismiss(toast.id);
              }}
              aria-label="Fechar notificação"
              className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const context = use(ToastContext);

  if (!context) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  }

  return context;
}
