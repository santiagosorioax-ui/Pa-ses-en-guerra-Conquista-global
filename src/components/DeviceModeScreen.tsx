import { useState } from 'react';
import { Cloud, Globe, HardDrive, Loader2, LogIn, LogOut, Play, RotateCcw } from 'lucide-react';
import { COUNTRIES_195 } from '../data/countries195';
import { useFirebase } from '../contexts/FirebaseContext';
import { PWAInstallButton } from './PWAInstallPrompt';
import { PixelFlag } from './PixelFlag';
import { soundEngine } from '../engine/soundEngine';
import type { SavedCampaignSummary } from '../services/cloudSaves';

export type DeviceMode = 'desktop' | 'mobile';

export interface UnifiedSavedCampaign extends SavedCampaignSummary {
  storageSource: 'both' | 'cloud' | 'local';
  dirtyForCloud?: boolean;
  defensesCount?: number;
  barracksCount?: number;
  antiNukesCount?: number;
}

interface DeviceModeScreenProps {
  onStartPlay: () => void;
  onPressOnline: () => void;
  onResetTutorial: () => void;
  lastCampaign?: UnifiedSavedCampaign | null;
  onResumeLastCampaign?: (campaign: UnifiedSavedCampaign) => Promise<void>;
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

      {/* Center Launch Date Seal */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="px-3.5 py-1.5 bg-[#0B121E]/95 border-2 border-slate-400 shadow-2xl flex items-center justify-center">
          <span className="font-mono-num text-sm sm:text-base font-extrabold tracking-wider text-white">
            28/11/2026
          </span>
        </div>
      </div>
    </div>
  );
}

export function DeviceModeScreen({
  onStartPlay,
  onPressOnline,
  onResetTutorial,
  lastCampaign = null,
  onResumeLastCampaign,
}: DeviceModeScreenProps) {
  const { user, canAccessOnline, authBusy, signInWithGoogle, signOutUser } = useFirebase();
  const [resumingLast, setResumingLast] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const lastSeed = lastCampaign ? COUNTRIES_195[lastCampaign.countryId] : null;

  return (
    <div className="w-screen h-screen bg-[#0B121E] text-slate-100 flex flex-col overflow-y-auto">
      <header className="px-4 sm:px-8 py-3.5 border-b border-slate-800 bg-[#111B2B] flex items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/pwa-192x192.png"
            alt="Países en Guerra"
            className="w-8 h-8 border border-slate-700 shrink-0"
          />
          <h1 className="font-pixel text-sm sm:text-lg tracking-wide text-amber-400 truncate">
            PAÍSES EN GUERRA
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="flex items-center gap-1.5 bg-[#0B121E] border border-slate-700 px-2 py-1">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Usuario'}
                  className="w-5 h-5 object-cover border border-slate-700 shrink-0"
                />
              )}
              <span className="text-[11px] text-slate-200 max-w-[110px] sm:max-w-[160px] truncate hidden xs:inline sm:inline">
                {user.email || user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void signOutUser()}
                disabled={authBusy}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={authBusy}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {authBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              <span>Google</span>
            </button>
          )}
          <PWAInstallButton compact />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
              Conquista el mapa mundial
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              195 países soberanos, árboles genealógicos, imperios históricos, bombas nucleares, rebeliones y 100 logros.
            </p>
          </div>

          {/* Continuar última partida jugada (funciona con y sin internet) */}
          {lastCampaign && onResumeLastCampaign && (
            <div className="space-y-1.5">
              <button
                type="button"
                disabled={resumingLast}
                onClick={async () => {
                  setResumeError(null);
                  setResumingLast(true);
                  try {
                    soundEngine.playTreaty();
                    await onResumeLastCampaign(lastCampaign);
                  } catch (err) {
                    setResumeError(
                      err instanceof Error
                        ? err.message
                        : 'No se pudo cargar la última partida guardada.'
                    );
                  } finally {
                    setResumingLast(false);
                  }
                }}
                className="w-full text-left bg-[#111B2B] hover:bg-[#17253B] border border-emerald-500/75 hover:border-emerald-400 px-4 py-3.5 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-between gap-3 shadow-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {lastSeed ? (
                    <PixelFlag country={lastSeed} size="md" />
                  ) : (
                    <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-300">
                        Continuar última partida · {lastCampaign.countryName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono-num px-1.5 py-0.5 bg-[#0B121E] border border-slate-700 text-slate-300">
                        {lastCampaign.storageSource === 'local' ? (
                          <>
                            <HardDrive className="w-2.5 h-2.5 text-amber-400" />
                            <span>Sin conexión</span>
                          </>
                        ) : lastCampaign.storageSource === 'both' ? (
                          <>
                            <Cloud className="w-2.5 h-2.5 text-sky-400" />
                            <span>Nube + Local</span>
                          </>
                        ) : (
                          <>
                            <Cloud className="w-2.5 h-2.5 text-sky-400" />
                            <span>Nube</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono-num truncate mt-0.5">
                      {lastCampaign.dateLabel} · ${lastCampaign.money.toLocaleString('es-ES')} · Ej.{' '}
                      {lastCampaign.army.toLocaleString('es-ES')}
                      {typeof lastCampaign.defensesCount === 'number' &&
                      (lastCampaign.defensesCount > 0 || (lastCampaign.barracksCount ?? 0) > 0)
                        ? ` · Def ${lastCampaign.defensesCount} · Cuart ${lastCampaign.barracksCount ?? 0}`
                        : ''}
                    </div>
                  </div>
                </div>
                <span className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0">
                  {resumingLast ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Reanudar</span>
                </span>
              </button>
              {resumeError && (
                <div className="text-[11px] text-red-400 px-1">{resumeError}</div>
              )}
            </div>
          )}

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

            {/* Botón Online con cadenas y fecha de lanzamiento 28/11/2026 (acceso de pruebas preservado para cuentas autorizadas) */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                onPressOnline();
              }}
              className={
                canAccessOnline
                  ? 'relative overflow-hidden group text-left bg-[#0E1726] hover:bg-[#142238] border border-emerald-500/70 hover:border-emerald-400 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[200px]'
                  : 'relative overflow-hidden text-left bg-[#0E1726] hover:bg-[#121D30] border border-slate-700 p-5 sm:p-6 transition-colors cursor-pointer flex flex-col justify-between gap-4 min-h-[200px]'
              }
            >
              <div className="space-y-3 opacity-60">
                <div className="w-12 h-12 flex items-center justify-center text-emerald-400 bg-emerald-500/10 border border-emerald-600/40">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-200 transition-colors">
                    Online
                  </div>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-400">
                    Multijugador en vivo con amigos en salas privadas de 4 dígitos, guerras, alianzas y rebeliones.
                  </p>
                </div>
              </div>

              <div className="relative z-10 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-semibold">
                {canAccessOnline ? (
                  <>
                    <span className="text-emerald-400">Acceso de pruebas</span>
                    <span className="text-emerald-300 font-bold">Entrar →</span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-300/90 font-mono-num">Lanzamiento 28/11/2026</span>
                    <span className="text-slate-400">Próximamente</span>
                  </>
                )}
              </div>
              <ChainLinkOverlay />
            </button>
          </div>

          {/* Opción: Reiniciar Tutorial */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onResetTutorial();
            }}
            className="w-full text-left bg-[#111B2B] hover:bg-[#172338] border border-slate-700 hover:border-sky-400/70 px-4 py-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-100">
                  Reiniciar tutorial
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                  Aprende la gestión económica y militar básica y vuelve a mostrar la guía al iniciar partida.
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-sky-400 shrink-0 whitespace-nowrap">
              Ver guía →
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
