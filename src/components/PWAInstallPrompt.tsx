import { useState } from 'react';
import { Download, Laptop, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

const DISMISS_KEY = 'paises_en_guerra_pwa_prompt_dismissed';

function InstallGuideModal({
  isIOS,
  isAndroid,
  onClose,
}: {
  isIOS: boolean;
  isAndroid: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#111B2B] border border-amber-500/60 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/pwa-192x192.png"
              alt="Países en Guerra"
              className="w-10 h-10 border border-slate-700"
            />
            <div>
              <h3 className="text-sm font-bold text-white">
                Descargar Países en Guerra
              </h3>
              <p className="text-[11px] text-amber-300">
                Instálalo como aplicación en tu dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="bg-[#0B121E] border border-slate-800 p-3.5 space-y-2 text-xs text-slate-200">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>En iPhone / iPad (Safari)</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              1. Toca el botón <strong className="text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Compartir</strong> en la barra de Safari.<br />
              2. Desliza hacia abajo y elige <strong className="text-white">Agregar a pantalla de inicio</strong>.<br />
              3. Pulsa <strong className="text-amber-300">Agregar</strong> para jugar a pantalla completa.
            </p>
          </div>
        ) : isAndroid ? (
          <div className="bg-[#0B121E] border border-slate-800 p-3.5 space-y-2 text-xs text-slate-200">
            <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>En Celular Android</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              1. Abre el menú del navegador (<strong className="text-white">⋮</strong> en Chrome o Edge).<br />
              2. Selecciona <strong className="text-white">Instalar aplicación</strong> o <strong className="text-white">Agregar a pantalla de inicio</strong>.<br />
              3. Confirma para tener el acceso directo directo en tu celular.
            </p>
          </div>
        ) : (
          <div className="bg-[#0B121E] border border-slate-800 p-3.5 space-y-2 text-xs text-slate-200">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Laptop className="w-4 h-4" />
              <span>En PC o Portátil (Chrome / Edge)</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              1. Haz clic en el icono de <strong className="text-white">Instalar</strong> en el extremo derecho de la barra de direcciones (o abre el menú <strong className="text-white">⋮</strong> → <strong className="text-white">Guardar y compartir</strong> → <strong className="text-white">Instalar Países en Guerra</strong>).<br />
              2. Confirma y el juego se abrirá en su propia ventana de escritorio.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="Descargar e instalar Países en Guerra en tu dispositivo"
        className={`flex items-center gap-1.5 border border-amber-500/60 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className={compact ? 'hidden xl:inline' : ''}>Instalar App</span>
      </button>

      {showGuide && (
        <InstallGuideModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
}

export function PWAInstallBanner({ liftAboveBottomNav = false }: { liftAboveBottomNav?: boolean }) {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled || dismissed) {
    return showGuide ? (
      <InstallGuideModal
        isIOS={isIOS}
        isAndroid={isAndroid}
        onClose={() => setShowGuide(false)}
      />
    ) : null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const handleInstallNow = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        handleDismiss();
        return;
      }
      if (outcome === 'unavailable') {
        setShowGuide(true);
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      <div
        className={`fixed left-1/2 -translate-x-1/2 z-40 w-[min(94vw,520px)] bg-[#111B2B]/98 border border-amber-500/70 px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-2xl flex items-center justify-between gap-2.5 sm:gap-3 ${
          liftAboveBottomNav ? 'bottom-16' : 'bottom-4'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="Países en Guerra"
            className="w-10 h-10 border border-slate-700 shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>Descarga Países en Guerra</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-snug">
              Instálalo gratis en tu celular, PC o portátil para jugar rápido y sin barra del navegador.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallNow}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
            title="Ahora no"
            aria-label="Cerrar aviso de instalación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showGuide && (
        <InstallGuideModal
          isIOS={isIOS}
          isAndroid={isAndroid}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
}

export function OfflineIndicator({ liftAboveBottomNav = false }: { liftAboveBottomNav?: boolean }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      className={`fixed left-3 z-50 flex items-center gap-2 bg-amber-600/95 border border-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg ${
        liftAboveBottomNav ? 'bottom-16' : 'bottom-3'
      }`}
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo sin conexión — Usando datos en caché</span>
    </div>
  );
}
