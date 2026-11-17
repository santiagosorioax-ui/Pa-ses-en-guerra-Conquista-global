import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Capture early beforeinstallprompt before React mounts
let capturedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    capturedPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    capturedPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedPrompt
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsInstalled(checkStandalone());

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    const syncPrompt = () => {
      setDeferredPrompt(capturedPrompt);
      if (checkStandalone()) {
        setIsInstalled(true);
      }
    };

    listeners.add(syncPrompt);

    const onInstalled = () => {
      capturedPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => setIsInstalled(checkStandalone());

    window.addEventListener('appinstalled', onInstalled);
    mediaQuery.addEventListener('change', onDisplayChange);

    return () => {
      listeners.delete(syncPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      mediaQuery.removeEventListener('change', onDisplayChange);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvt = deferredPrompt ?? capturedPrompt;
    if (!promptEvt) return 'unavailable';
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === 'accepted') {
      capturedPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return 'accepted';
    }
    return 'dismissed';
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}
