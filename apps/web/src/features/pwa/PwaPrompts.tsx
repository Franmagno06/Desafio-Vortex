import { useEffect, useState } from 'react';
import { Download, RefreshCw, Share, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isIos, usePwa } from './usePwa';

/**
 * Avisos do PWA: instalação, atualização e modo offline.
 *
 * Ficam num componente só porque compartilham a mesma faixa inferior da tela e
 * nunca devem aparecer ao mesmo tempo — três banners empilhados sobre a barra
 * de navegação seriam mais atrapalho que ajuda.
 *
 * Prioridade: offline > atualização > instalação. Estar sem rede é o que mais
 * afeta o uso imediato.
 */

const DISMISSED_KEY = 'circula:install-dismissed';

export function PwaPrompts() {
  const {
    needRefresh,
    dismissUpdate,
    applyUpdate,
    canInstall,
    isInstalled,
    promptInstall,
    isOnline,
  } = usePwa();

  const [installDismissed, setInstallDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1',
  );
  const [showIosGuide, setShowIosGuide] = useState(false);

  /**
   * Ouve o aviso de sincronização do Service Worker.
   *
   * Quando um anúncio criado offline é enviado pelo Background Sync, o SW
   * avisa as abas abertas — sem isso a pessoa não saberia que a publicação
   * finalmente aconteceu.
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function handleMessage(event: MessageEvent) {
      const data = event.data as { type?: string; count?: number } | undefined;

      if (data?.type === 'SYNC_COMPLETED' && data.count) {
        // Recarrega os dados para o anúncio sincronizado aparecer na lista.
        window.dispatchEvent(new CustomEvent('circula:sync-completed'));
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  function handleDismissInstall() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setInstallDismissed(true);
  }

  // ── 1. Offline ────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <Banner tone="warning">
        <WifiOff className="size-5 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm">
          <strong className="font-semibold">Você está offline.</strong> Os itens já carregados
          continuam visíveis.
        </p>
      </Banner>
    );
  }

  // ── 2. Nova versão disponível ─────────────────────────────────────────
  if (needRefresh) {
    return (
      <Banner tone="brand">
        <RefreshCw className="size-5 shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm">Uma versão nova do Circula está pronta.</p>
        <Button onClick={applyUpdate} size="sm">
          Atualizar
        </Button>
        <DismissButton onClick={dismissUpdate} label="Adiar atualização" />
      </Banner>
    );
  }

  // ── 3. Instalação ─────────────────────────────────────────────────────
  if (isInstalled || installDismissed) return null;

  // No iPhone não existe `beforeinstallprompt`: só dá para ensinar o caminho.
  if (isIos()) {
    return (
      <Banner tone="brand">
        <Share className="size-5 shrink-0" aria-hidden="true" />
        <div className="flex-1 text-sm">
          {showIosGuide ? (
            <p>
              Toque em <strong>Compartilhar</strong> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p>Instale o Circula na sua tela de início.</p>
          )}
        </div>
        {!showIosGuide && (
          <Button
            onClick={() => {
              setShowIosGuide(true);
            }}
            size="sm"
          >
            Como?
          </Button>
        )}
        <DismissButton onClick={handleDismissInstall} label="Dispensar" />
      </Banner>
    );
  }

  if (!canInstall) return null;

  return (
    <Banner tone="brand">
      <Download className="size-5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <strong className="font-semibold">Instale o Circula</strong> e use como aplicativo.
      </p>
      <Button
        onClick={() => {
          void promptInstall();
        }}
        size="sm"
      >
        Instalar
      </Button>
      <DismissButton onClick={handleDismissInstall} label="Dispensar" />
    </Banner>
  );
}

function Banner({ tone, children }: { tone: 'brand' | 'warning'; children: React.ReactNode }) {
  return (
    <div
      // `role="status"` + `aria-live` fazem o leitor de tela anunciar a
      // mudança (ficar offline, por exemplo) sem o usuário precisar navegar.
      role="status"
      aria-live="polite"
      className={[
        'fixed inset-x-0 z-[90] flex items-center gap-3 px-4 py-3 shadow-lg',
        // Acima da barra de navegação no mobile; rente ao rodapé no desktop.
        'bottom-16 md:bottom-0',
        'pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3',
        tone === 'warning'
          ? 'border-t border-accent-400/40 bg-accent-100 text-accent-600'
          : 'border-t border-brand-200 bg-brand-50 text-brand-900',
      ].join(' ')}
    >
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">{children}</div>
    </div>
  );
}

function DismissButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}
