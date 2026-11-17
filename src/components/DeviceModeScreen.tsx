import { Monitor, Smartphone } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallPrompt';
import { soundEngine } from '../engine/soundEngine';

export type DeviceMode = 'desktop' | 'mobile';

interface DeviceModeScreenProps {
  onSelectMode: (mode: DeviceMode) => void;
}

export function DeviceModeScreen({ onSelectMode }: DeviceModeScreenProps) {
  return (
    <div className="w-screen h-screen bg-[#0B121E] text-slate-100 flex flex-col overflow-y-auto">
      <header className="px-4 sm:px-8 py-4 border-b border-slate-800 bg-[#111B2B] flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="Países en Guerra"
            className="w-8 h-8 border border-slate-700 shrink-0"
          />
          <h1 className="font-pixel text-base sm:text-lg tracking-wide text-amber-400 truncate">
            PAÍSES EN GUERRA
          </h1>
        </div>
        <PWAInstallButton />
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              ¿Dónde vas a jugar hoy?
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Elige la interfaz adaptada a tu pantalla para disfrutar de los 195 países con total comodidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Botón 1: Jugar en Computador */}
            <button
              onClick={() => {
                soundEngine.playSelectCountry();
                onSelectMode('desktop');
              }}
              className="group text-left bg-[#111B2B] hover:bg-[#172338] border border-slate-700 hover:border-amber-400/80 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[190px]"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    Jugar en Computador
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    El juego clásico completo con panel lateral fijo, minimapa, gráficas y atajos de teclado (WASD, Espacio, F).
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-400">
                <span>Recomendado para PC y portátil</span>
                <span>Entrar →</span>
              </div>
            </button>

            {/* Botón 2: Jugar para Celular */}
            <button
              onClick={() => {
                soundEngine.playSelectCountry();
                onSelectMode('mobile');
              }}
              className="group text-left bg-[#111B2B] hover:bg-[#172338] border border-slate-700 hover:border-sky-400/80 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[190px]"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                    Jugar para Celular
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Interfaz táctil cómoda para pantallas pequeñas: mapa mundial completo, zoom con dos dedos y barra inferior con todos los menús.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-400">
                <span>Adaptado para pantalla táctil</span>
                <span>Entrar →</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
