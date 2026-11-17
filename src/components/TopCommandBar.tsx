import {
  Anchor,
  Coins,
  HelpCircle,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  Search,
  Smartphone,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatFullDate, type SimulationState } from '../engine/gameSimulation';
import type { DeviceMode } from './DeviceModeScreen';
import { PWAInstallButton } from './PWAInstallPrompt';
import { PixelFlag } from './PixelFlag';

interface TopCommandBarProps {
  deviceMode: DeviceMode;
  onSwitchDeviceMode: (mode: DeviceMode) => void;
  sim: SimulationState;
  speed: number;
  onSetSpeed: (s: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenSearch: () => void;
  onOpenTutorial: () => void;
  onSelectOwnCountry: () => void;
  onReturnToMenu: () => void;
  roomCode?: string | null;
  isRemoteGuest?: boolean;
}

export function TopCommandBar({
  deviceMode,
  onSwitchDeviceMode,
  sim,
  speed,
  onSetSpeed,
  soundEnabled,
  onToggleSound,
  onOpenSearch,
  onOpenTutorial,
  onSelectOwnCountry,
  onReturnToMenu,
  roomCode,
  isRemoteGuest = false,
}: TopCommandBarProps) {
  const player = sim.countries[sim.playerId];
  const speeds = [0, 1, 2];

  // COMPACT MOBILE TOP BAR (fits 360px-430px screens cleanly)
  if (deviceMode === 'mobile') {
    return (
      <header className="bg-[#111B2B] border-b border-slate-800 shrink-0 z-30">
        {/* Row 1: Nation, Speed & Core Actions */}
        <div className="h-11 px-2 flex items-center justify-between gap-1.5">
          <button
            onClick={onSelectOwnCountry}
            className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
            title="Centrar en tu país"
          >
            <PixelFlag country={player.seed} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-300 truncate max-w-[96px]">
                {player.seed.name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono-num leading-none">
                {formatFullDate(sim.day, sim.month, sim.year)}
              </div>
            </div>
          </button>

          {/* Speed Pills / Live Room Badge */}
          {isRemoteGuest ? (
            <div className="px-2 py-1 bg-emerald-950/70 border border-emerald-600/60 text-[10px] font-mono-num text-emerald-300 shrink-0">
              Sala {roomCode} · En vivo
            </div>
          ) : (
            <div className="flex items-center bg-[#0B121E] border border-slate-800 p-0.5 shrink-0">
              {speeds.map((s) => {
                const active = speed === s;
                return (
                  <button
                    key={s}
                    onClick={() => onSetSpeed(s)}
                    className={`px-2 py-1 text-[11px] font-mono-num cursor-pointer ${
                      active
                        ? s === 0
                          ? 'bg-red-500/25 text-red-300'
                          : 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s === 0 ? <Pause className="w-3 h-3" /> : `${s}x`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Compact Icons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenSearch}
              title="Buscar país"
              className="p-1.5 bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onSwitchDeviceMode('desktop')}
              title="Cambiar a modo Computador"
              className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onReturnToMenu}
              title="Menú principal"
              className="p-1.5 bg-slate-900 border border-slate-700 text-amber-300 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Live Resource Strip (Dinero, Ejército, Puertos, km²) + Sound/Tutorial */}
        <div className="h-8 px-2.5 bg-[#0B121E] border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px] font-mono-num">
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
            <span className="flex items-center gap-1 text-emerald-300 font-bold">
              <Coins className="w-3 h-3 text-amber-400 shrink-0" />
              ${player.money}
              <span className="text-[10px] text-emerald-400 font-normal">
                (+{player.netIncome}/s)
              </span>
            </span>
            <span className="flex items-center gap-1 text-rose-300 font-bold">
              <Swords className="w-3 h-3 text-rose-400 shrink-0" />
              {player.army}
            </span>
            <span className="flex items-center gap-1 text-sky-300 font-bold">
              <Anchor className="w-3 h-3 text-sky-400 shrink-0" />
              {player.ports.length}
            </span>
            <span className="text-slate-400 text-[10px]">
              {(player.pixels * 100).toLocaleString('es-ES')} km²
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton compact />
            <button
              onClick={onToggleSound}
              className="p-1 text-slate-300 cursor-pointer"
              aria-label="Audio"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
            <button
              onClick={onOpenTutorial}
              className="p-1 text-slate-300 cursor-pointer"
              aria-label="Ayuda"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // DESKTOP TOP BAR (preserved)
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

      {/* Time, Online Room & PC Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {roomCode && (
          <div className="px-2 py-1 bg-emerald-950/70 border border-emerald-600/60 text-xs font-mono-num text-emerald-300 whitespace-nowrap">
            Sala {roomCode}
          </div>
        )}
        <div className="px-2.5 py-1 bg-[#0B121E] border border-slate-800 text-xs font-mono-num text-slate-200 whitespace-nowrap">
          {formatFullDate(sim.day, sim.month, sim.year)}
        </div>

        {!isRemoteGuest && (
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
        )}

        <PWAInstallButton compact />

        <button
          onClick={onOpenSearch}
          title="Buscar país (Tecla F)"
          className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Países (F)</span>
        </button>

        <button
          onClick={() => onSwitchDeviceMode('mobile')}
          title="Cambiar a vista de Celular"
          className="p-1.5 bg-slate-900 border border-slate-700 text-sky-300 hover:text-white cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
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
