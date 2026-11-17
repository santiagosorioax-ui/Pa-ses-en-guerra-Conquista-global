import {
  Anchor,
  Check,
  Cloud,
  CloudOff,
  Coins,
  HelpCircle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Search,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatFullDate, type SimulationState } from '../engine/gameSimulation';
import { useFirebase } from '../contexts/FirebaseContext';
import { PixelFlag } from './PixelFlag';

export type CloudSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TopCommandBarProps {
  sim: SimulationState;
  speed: number;
  onSetSpeed: (s: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSearch: () => void;
  onOpenTutorial: () => void;
  onSelectOwnCountry: () => void;
  onReturnToMenu: () => void;
  cloudSaveStatus: CloudSaveStatus;
  lastSavedLabel: string | null;
  onManualCloudSave: () => void;
  onConnectCloud: () => void;
}

export function TopCommandBar({
  sim,
  speed,
  onSetSpeed,
  soundEnabled,
  onToggleSound,
  onOpenSearch,
  onOpenTutorial,
  onSelectOwnCountry,
  onReturnToMenu,
  cloudSaveStatus,
  lastSavedLabel,
  onManualCloudSave,
  onConnectCloud,
}: TopCommandBarProps) {
  const { user, authBusy } = useFirebase();
  const player = sim.countries[sim.playerId];
  const speeds = [0, 1, 2];

  return (
    <header className="h-14 px-4 bg-[#111B2B] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 z-30">
      {/* Player Nation */}
      <button
        onClick={onSelectOwnCountry}
        className="flex items-center gap-2.5 px-2 py-1 hover:bg-slate-800/70 transition-colors text-left shrink-0 cursor-pointer"
        title="Centrar en tu nación"
      >
        <PixelFlag country={player.seed} size="md" />
        <div className="min-w-0">
          <div className="text-xs font-bold text-amber-300 truncate max-w-[170px]">
            {player.seed.name}
          </div>
          <div className="text-[11px] text-slate-400 font-mono-num whitespace-nowrap">
            Capital: {player.seed.capital} · {(player.pixels * 100).toLocaleString('es-ES')} km²
          </div>
        </div>
      </button>

      {/* Pure Number Comparison HUD: Dinero, Ejército, Puertos */}
      <div className="flex items-center gap-5 text-xs font-mono-num">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-sans leading-none">Dinero</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-sm font-bold text-emerald-300">${player.money}</span>
              <span className={`text-[11px] ${player.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ({player.netIncome >= 0 ? '+' : ''}{player.netIncome}/seg)
              </span>
            </div>
          </div>
        </div>

        <div className="h-7 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-sans leading-none">Ejército</div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {player.army} soldados
            </div>
          </div>
        </div>

        <div className="h-7 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-sans leading-none">Puertos</div>
            <div className="text-sm font-bold text-sky-300 mt-0.5">
              {player.ports.length}
            </div>
          </div>
        </div>
      </div>

      {/* Time, Cloud Save & PC Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="px-2.5 py-1 bg-[#0B121E] border border-slate-800 text-xs font-mono-num text-slate-200 whitespace-nowrap">
          {formatFullDate(sim.day, sim.month, sim.year)}
        </div>

        <div className="flex items-center bg-[#0B121E] border border-slate-800 p-0.5">
          {speeds.map((s) => {
            const active = speed === s;
            return (
              <button
                key={s}
                onClick={() => onSetSpeed(s)}
                title={s === 0 ? 'Pausar (Espacio)' : `Velocidad ${s}x`}
                className={`px-2 py-1 text-[11px] font-mono-num transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? s === 0
                      ? 'bg-red-500/25 text-red-300'
                      : 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 0 ? (
                  <Pause className="w-3 h-3" />
                ) : s === 1 ? (
                  <span className="flex items-center gap-0.5">
                    <Play className="w-2.5 h-2.5 fill-current" />1x
                  </span>
                ) : (
                  `${s}x`
                )}
              </button>
            );
          })}
        </div>

        {user ? (
          <button
            onClick={onManualCloudSave}
            disabled={cloudSaveStatus === 'saving'}
            title={
              lastSavedLabel
                ? `Último guardado: ${lastSavedLabel} · Clic para guardar ahora`
                : 'Guardar progreso en la nube ahora'
            }
            className={`px-2.5 py-1.5 border text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
              cloudSaveStatus === 'error'
                ? 'bg-red-950/60 border-red-500/60 text-red-300'
                : cloudSaveStatus === 'saved'
                  ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-sky-300 hover:text-white hover:border-sky-500/60'
            }`}
          >
            {cloudSaveStatus === 'saving' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : cloudSaveStatus === 'saved' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Cloud className="w-3.5 h-3.5" />
            )}
            <span className="hidden xl:inline">
              {cloudSaveStatus === 'saving'
                ? 'Guardando...'
                : cloudSaveStatus === 'saved'
                  ? 'Guardado'
                  : cloudSaveStatus === 'error'
                    ? 'Reintentar'
                    : 'Guardar'}
            </span>
          </button>
        ) : (
          <button
            onClick={onConnectCloud}
            disabled={authBusy}
            title="Inicia sesión con Google para guardar tu partida en la nube"
            className="px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/35 border border-sky-500/50 text-sky-200 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
          >
            {authBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudOff className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">Conectar Nube</span>
          </button>
        )}

        <button
          onClick={onOpenSearch}
          title="Buscar país (Tecla F)"
          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Países (F)</span>
        </button>

        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Silenciar audio' : 'Activar audio'}
          className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        <button
          onClick={onOpenTutorial}
          title="Ver tutorial de controles"
          className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onReturnToMenu}
          title="Volver al menú principal"
          className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-300 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
