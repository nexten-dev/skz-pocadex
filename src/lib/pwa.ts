import { useEffect, useState } from 'react';

// Evento de instalação (Chrome/Edge/Android). Não faz parte dos tipos padrão do DOM.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Listener = () => void;
const listeners = new Set<Listener>();
const state = {
  waiting: null as ServiceWorker | null,
  installEvent: null as BeforeInstallPromptEvent | null,
};
const notify = () => listeners.forEach((l) => l());

/** Registra o service worker (só no app publicado/build, não no modo dev). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installEvent = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    state.installEvent = null;
    notify();
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      const track = (sw: ServiceWorker | null) => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // "installed" com um controlador ativo = versão nova esperando
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            state.waiting = sw;
            notify();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        state.waiting = reg.waiting;
        notify();
      }
      reg.addEventListener('updatefound', () => track(reg.installing));
      // Verifica atualizações do app sempre que ele volta a ficar visível
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    } catch {
      /* sem suporte ou bloqueado: o app funciona normalmente, só sem modo offline */
    }
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwa() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    updateReady: !!state.waiting,
    applyUpdate: () => state.waiting?.postMessage('SKIP_WAITING'),
    canInstall: !!state.installEvent,
    promptInstall: async () => {
      const e = state.installEvent;
      if (!e) return;
      await e.prompt();
      await e.userChoice.catch(() => null);
      state.installEvent = null;
      notify();
    },
    platform: detectPlatform(),
    standalone: isStandalone(),
  };
}
