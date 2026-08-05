import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Estado do PWA: instalação, atualização e conectividade.
 *
 * Concentra aqui as três APIs do navegador que a interface precisa observar,
 * para os componentes só consumirem estado pronto.
 */

/**
 * Evento não padronizado que o Chrome dispara quando o app é instalável.
 * O TypeScript não o conhece — daí a declaração manual.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwa() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  /** Registro do Service Worker, com o aviso de nova versão. */
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      if (import.meta.env.DEV) console.warn('[PWA] Service Worker registrado:', url);
    },
    onRegisterError(error) {
      console.error('[PWA] Falha ao registrar o Service Worker:', error);
    },
  });

  /**
   * Captura o `beforeinstallprompt`.
   *
   * O `preventDefault()` impede o banner padrão do Chrome, que aparece onde o
   * navegador quer. Guardamos o evento para disparar a instalação a partir do
   * NOSSO botão, num momento em que a pessoa já entendeu o que é o app.
   *
   * Detalhe importante: o evento só pode ser usado **uma vez**.
   */
  useEffect(() => {
    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    // `display-mode: standalone` é verdadeiro quando o app foi aberto pelo
    // ícone da tela inicial — a forma de saber que já está instalado.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  /** Conectividade, para o aviso de modo offline. */
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
    };
    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false;

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    // Consumido: o navegador não permite reaproveitar o mesmo evento.
    setInstallEvent(null);

    return outcome === 'accepted';
  }, [installEvent]);

  const applyUpdate = useCallback(() => {
    void updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    /** Há um SW novo esperando para assumir. */
    needRefresh,
    dismissUpdate: () => {
      setNeedRefresh(false);
    },
    applyUpdate,

    /** O navegador considera o app instalável agora. */
    canInstall: installEvent !== null,
    isInstalled,
    promptInstall,

    isOnline,
  };
}

/**
 * Detecta iOS.
 *
 * O Safari **não implementa** `beforeinstallprompt`: no iPhone a instalação é
 * manual, por Compartilhar → "Adicionar à Tela de Início". Sem esta checagem,
 * usuários de iPhone simplesmente nunca veriam como instalar o app.
 */
export function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad com iPadOS 13+ se identifica como Mac; o toque diferencia.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
