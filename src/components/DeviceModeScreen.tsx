import { Globe, Lock, Play } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallPrompt';
import { soundEngine } from '../engine/soundEngine';

export type DeviceMode = 'desktop' | 'mobile';

interface DeviceModeScreenProps {
  onStartPlay: () => void;
  onPressOnline: () => void;
}

function ChainLinkOverlay() {
  // Two diagonal steel chains forming an X across the locked Online card
  const links = Array.from({ length: 13 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      <svg
        viewBox="0 0 320 220"
        preserveAspectRatio="none"
        className="w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chainMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="45%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        {/* Subtle dark tint over chained card */}
        <rect x="0" y="0" width="320" height="220" fill="rgba(7, 13, 24, 0.36)" />

        {/* Diagonal Chain 1: top-left to bottom-right */}
        <g transform="translate(160 110) rotate(34) translate(-195 -10)">
          {links.map((i) => {
            const x = i * 30;
            const isFlat = i % 2 === 0;
            return isFlat ? (
              <g key={`c1-${i}`}>
                <rect
                  x={x}
                  y={3}
                  width={26}
                  height={14}
                  rx={7}
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth={6}
                />
                <rect
                  x={x}
                  y={3}
                  width={26}
                  height={14}
                  rx={7}
                  fill="none"
                  stroke="url(#chainMetal)"
                  strokeWidth={3.2}
                />
              </g>
            ) : (
              <g key={`c1-${i}`}>
                <line
                  x1={x + 4}
                  y1={10}
                  x2={x + 22}
                  y2={10}
                  stroke="#0F172A"
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <line
                  x1={x + 4}
                  y1={10}
                  x2={x + 22}
                  y2={10}
                  stroke="url(#chainMetal)"
                  strokeWidth={3.6}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>

        {/* Diagonal Chain 2: bottom-left to top-right */}
        <g transform="translate(160 110) rotate(-34) translate(-195 -10)">
          {links.map((i) => {
            const x = i * 30;
            const isFlat = i % 2 === 0;
            return isFlat ? (
              <g key={`c2-${i}`}>
                <rect
                  x={x}
                  y={3}
                  width={26}
                  height={14}
                  rx={7}
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth={6}
                />
                <rect
                  x={x}
                  y={3}
                  width={26}
                  height={14}
                  rx={7}
                  fill="none"
                  stroke="url(#chainMetal)"
                  strokeWidth={3.2}
                />
              </g>
            ) : (
              <g key={`c2-${i}`}>
                <line
                  x1={x + 4}
                  y1={10}
                  x2={x + 22}
                  y2={10}
                  stroke="#0F172A"
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <line
                  x1={x + 4}
                  y1={10}
                  x2={x + 22}
                  y2={10}
                  stroke="url(#chainMetal)"
                  strokeWidth={3.6}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </g>
      </svg>

      {/* Center Padlock Seal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 bg-[#0B121E]/95 border-2 border-slate-400 shadow-2xl flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-400" />
        </div>
      </div>
    </div>
  );
}

export function DeviceModeScreen({ onStartPlay, onPressOnline }: DeviceModeScreenProps) {
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
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Conquista el mapa mundial
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              195 países soberanos, árboles genealógicos, imperios históricos, bombas nucleares, rebeliones y 100 logros.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Botón Principal: Jugar */}
            <button
              onClick={() => {
                soundEngine.playSelectCountry();
                onStartPlay();
              }}
              className="group text-left bg-[#111B2B] hover:bg-[#172338] border border-amber-500/60 hover:border-amber-400 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[200px]"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    Jugar
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Elige cualquier país del mundo, expande tu ejército, conquista territorios para formar imperios y domina el mapa.
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400">
                <span>195 países · Campaña</span>
                <span>Entrar →</span>
              </div>
            </button>

            {/* Botón Encadenado: Online (En desarrollo) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onPressOnline();
              }}
              className="relative overflow-hidden text-left bg-[#0E1726] hover:bg-[#121D30] border border-slate-700 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[200px]"
            >
              <div className="space-y-3 opacity-60">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-600/40 flex items-center justify-center text-emerald-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-200">
                    Online
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Multijugador en vivo con amigos en salas privadas de 4 dígitos, guerras, alianzas y rebeliones.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-300/90">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>En desarrollo</span>
                </span>
                <span className="text-slate-400">Bloqueado</span>
              </div>

              <ChainLinkOverlay />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
