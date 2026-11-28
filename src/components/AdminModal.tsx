import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Coins,
  Crown,
  Flame,
  Globe,
  Handshake,
  Infinity as InfinityIcon,
  Loader2,
  Radiation,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Swords,
  Unlock,
  Users,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  adminAddArmy,
  adminAddMoney,
  adminAllyEveryone,
  adminConquerCountry,
  adminConquerWorld,
  adminGlobalPeace,
  adminMaxInfrastructure,
  adminPacifyAllRebellions,
  adminResetNukeCooldown,
  adminToggleGodMode,
  adminToggleInfiniteArmy,
  adminToggleInfiniteMoney,
  getCountryName,
  type SimulationState,
} from '../engine/gameSimulation';
import { soundEngine } from '../engine/soundEngine';

interface LivePlayerSessionRow {
  id: string;
  playerLabel: string;
  isSignedIn: boolean;
  screen: string;
  countryName: string;
  difficulty: 'normal' | 'hard' | '';
  activeSeconds: number;
  lastSeenSecondsAgo: number;
}

interface AdminLiveStats {
  onlineNow: number;
  playingNow: number;
  menuNow: number;
  onlineLobbyNow: number;
  peakOnline: number;
  serverUptimeSeconds: number;
  sessions: LivePlayerSessionRow[];
}

interface AdminModalProps {
  user: User;
  sim: SimulationState | null;
  defaultTab?: 'players' | 'powers';
  hardModeUnlocked: boolean;
  onUnlockHardMode: () => void;
  onSimulationMutated: () => void;
  onClose: () => void;
}

function formatScreenName(screen: string): string {
  switch (screen) {
    case 'PLAYING':
      return 'En partida';
    case 'COUNTRY_SELECT':
    case 'SELECT':
      return 'Eligiendo país';
    case 'ONLINE_LOBBY':
      return 'Sala Online';
    default:
      return 'Menú inicio';
  }
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function AdminModal({
  user,
  sim,
  defaultTab,
  hardModeUnlocked,
  onUnlockHardMode,
  onSimulationMutated,
  onClose,
}: AdminModalProps) {
  const hasActiveMatch = Boolean(sim && sim.countries[sim.playerId]?.alive);
  const [tab, setTab] = useState<'players' | 'powers'>(
    defaultTab ?? (hasActiveMatch ? 'powers' : 'players')
  );
  const [stats, setStats] = useState<AdminLiveStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedConquerId, setSelectedConquerId] = useState<number>(-1);
  const [confirmWorld, setConfirmWorld] = useState(false);

  const fetchLiveStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await res.json()) as AdminLiveStats & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'No se pudieron obtener las estadísticas en vivo.');
      }
      setStats(data);
    } catch (err) {
      setStatsError(
        err instanceof Error ? err.message : 'Error al consultar jugadores conectados.'
      );
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchLiveStats();
    const id = window.setInterval(() => {
      void fetchLiveStats();
    }, 4000);
    return () => window.clearInterval(id);
  }, [fetchLiveStats]);

  const aliveForeignCountries = useMemo(() => {
    if (!sim) return [];
    return sim.countries
      .filter((c) => c.alive && c.id !== sim.playerId)
      .sort((a, b) => getCountryName(a).localeCompare(getCountryName(b), 'es'));
  }, [sim, feedback]);

  useEffect(() => {
    if (
      aliveForeignCountries.length > 0 &&
      !aliveForeignCountries.some((c) => c.id === selectedConquerId)
    ) {
      setSelectedConquerId(aliveForeignCountries[0].id);
    }
  }, [aliveForeignCountries, selectedConquerId]);

  const runPower = (action: () => string) => {
    const msg = action();
    setFeedback(msg);
    onSimulationMutated();
  };

  const player = sim ? sim.countries[sim.playerId] : null;
  const godModeActive = Boolean(
    sim?.adminInfiniteMoney && sim?.adminInfiniteArmy && sim?.adminNoNukeCooldown
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#050A14]/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Panel de Administrador"
    >
      <div className="w-full max-w-3xl max-h-[92vh] bg-[#0E1726] border-2 border-red-500/80 shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#180E16] border-b border-red-900/70 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-red-600/20 border border-red-500/70 flex items-center justify-center text-red-400 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase">
                  Panel ADMIN
                </h2>
                <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-mono-num font-bold uppercase">
                  Verificado
                </span>
              </div>
              <div className="text-[11px] text-red-200/80 font-mono-num truncate">
                {user.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-[#0B121E] border border-slate-700 hover:border-red-400 text-slate-300 hover:text-white cursor-pointer shrink-0"
            aria-label="Cerrar panel admin"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-[#0B121E] border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setTab('players');
            }}
            className={`px-3.5 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
              tab === 'players'
                ? 'border-red-400 text-white bg-[#131E33]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Jugadores en Vivo</span>
            {stats && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-[11px] font-mono-num">
                {stats.onlineNow}
              </span>
            )}
          </button>

          {hasActiveMatch && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setTab('powers');
              }}
              className={`px-3.5 py-2 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
                tab === 'powers'
                  ? 'border-amber-400 text-white bg-[#131E33]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Poderes de Partida</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {feedback && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/70 text-xs sm:text-sm text-emerald-100 flex items-center justify-between gap-2">
              <span>{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {tab === 'players' ? (
            <div className="space-y-5">
              {/* Live Online Counter Banner */}
              <div className="bg-[#09101D] border border-emerald-500/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    Personas jugando ahora mismo
                  </div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-4xl sm:text-5xl font-mono-num font-extrabold text-white">
                      {stats ? stats.onlineNow : '—'}
                    </span>
                    <span className="text-xs text-slate-400">
                      conectados en tiempo real (actualiza cada 4s)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void fetchLiveStats()}
                  disabled={loadingStats}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer self-start sm:self-center shrink-0"
                >
                  {loadingStats ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Actualizar</span>
                </button>
              </div>

              {statsError && (
                <div className="p-3 bg-red-950/60 border border-red-500/70 text-xs text-red-200">
                  {statsError}
                </div>
              )}

              {/* Breakdown Grid */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#0B121E] border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">En partida</div>
                    <div className="mt-1 text-xl font-mono-num font-extrabold text-amber-300">
                      {stats.playingNow}
                    </div>
                  </div>
                  <div className="bg-[#0B121E] border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">Menú / Selección</div>
                    <div className="mt-1 text-xl font-mono-num font-extrabold text-sky-300">
                      {stats.menuNow}
                    </div>
                  </div>
                  <div className="bg-[#0B121E] border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">Salas Online</div>
                    <div className="mt-1 text-xl font-mono-num font-extrabold text-emerald-300">
                      {stats.onlineLobbyNow}
                    </div>
                  </div>
                  <div className="bg-[#0B121E] border border-slate-800 p-3">
                    <div className="text-[11px] text-slate-400">Pico máximo</div>
                    <div className="mt-1 text-xl font-mono-num font-extrabold text-rose-300">
                      {stats.peakOnline}
                    </div>
                  </div>
                </div>
              )}

              {/* Active Sessions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Sesiones activas ({stats?.sessions.length ?? 0})
                  </span>
                  {stats && (
                    <span className="font-mono-num">
                      Servidor activo: {formatDuration(stats.serverUptimeSeconds)}
                    </span>
                  )}
                </div>

                <div className="bg-[#080F1B] border border-slate-800 divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
                  {stats && stats.sessions.length > 0 ? (
                    stats.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white truncate">
                              {s.playerLabel}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#121E33] border border-slate-700 text-[10px] text-sky-300">
                              {formatScreenName(s.screen)}
                            </span>
                            {s.countryName && (
                              <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/40 text-[10px] text-amber-300 font-semibold">
                                {s.countryName}
                              </span>
                            )}
                            {s.difficulty === 'hard' && (
                              <span className="px-1.5 py-0.5 bg-red-950/90 border border-red-500/70 text-[10px] text-red-300 font-bold uppercase">
                                Difícil
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] font-mono-num text-slate-400 shrink-0 whitespace-nowrap">
                          {formatDuration(s.activeSeconds)} · hace {s.lastSeenSecondsAgo}s
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-slate-400">
                      {loadingStats
                        ? 'Consultando jugadores conectados...'
                        : 'No hay otras sesiones activas detectadas.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Global Utility: Unlock Hard Mode */}
              {!hardModeUnlocked && (
                <div className="p-3.5 bg-[#160E16] border border-red-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-red-200">
                      Desbloqueo directo de Modo Difícil
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Rompe las cadenas del Modo Difícil al instante en tu cuenta de administrador.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playAnnexation(true);
                      onUnlockHardMode();
                      setFeedback('Modo Difícil desbloqueado permanentemente.');
                    }}
                    className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Desbloquear Modo Difícil</span>
                  </button>
                </div>
              )}
            </div>
          ) : sim && player ? (
            <div className="space-y-5">
              {/* Current Player Live Readout */}
              <div className="bg-[#080F1B] border border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-num">
                <div className="font-sans font-bold text-amber-300">
                  Comandando: {getCountryName(player)}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-emerald-300 font-bold">
                    ${Math.round(player.money).toLocaleString('es-ES')}
                  </span>
                  <span className="text-rose-300 font-bold">
                    Ej. {Math.round(player.army).toLocaleString('es-ES')}
                  </span>
                  <span className="text-sky-300">
                    {(player.pixels * 100).toLocaleString('es-ES')} km²
                  </span>
                  <span className="text-slate-300">
                    {sim.countries.filter((c) => c.alive).length}/195 activos
                  </span>
                </div>
              </div>

              {/* God Mode + Infinite Toggles */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Modos Infinitos
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => runPower(() => adminToggleGodMode(sim))}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      godModeActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                        : 'bg-[#121D30] hover:bg-[#192842] border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-mono-num font-bold uppercase">
                        {godModeActive ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-extrabold">Modo Dios</div>
                    <div className="text-[10px] text-slate-400">
                      Dinero + Ejército + 0 Recarga
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => runPower(() => adminToggleInfiniteMoney(sim))}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      sim.adminInfiniteMoney
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                        : 'bg-[#121D30] hover:bg-[#192842] border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <InfinityIcon className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-mono-num font-bold uppercase">
                        {sim.adminInfiniteMoney ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-extrabold">Dinero Infinito</div>
                    <div className="text-[10px] text-slate-400">$999.999.999 constantes</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => runPower(() => adminToggleInfiniteArmy(sim))}
                    className={`p-3 border text-left transition-colors cursor-pointer ${
                      sim.adminInfiniteArmy
                        ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                        : 'bg-[#121D30] hover:bg-[#192842] border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Swords className="w-4 h-4 text-rose-400" />
                      <span className="text-[10px] font-mono-num font-bold uppercase">
                        {sim.adminInfiniteArmy ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs font-extrabold">Ejército Infinito</div>
                    <div className="text-[10px] text-slate-400">999.999 soldados fijos</div>
                  </button>
                </div>
              </div>

              {/* Quick Resource Injections */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recursos y Tropas al Instante
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => runPower(() => adminAddMoney(sim, 100_000))}
                    className="px-3 py-2.5 bg-[#0F1B2E] hover:bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>+$100.000</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminAddMoney(sim, 1_000_000))}
                    className="px-3 py-2.5 bg-[#0F1B2E] hover:bg-emerald-950/60 border border-emerald-600/80 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>+$1.000.000</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminAddArmy(sim, 10_000))}
                    className="px-3 py-2.5 bg-[#0F1B2E] hover:bg-rose-950/60 border border-rose-700/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>+10.000 Ej.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminAddArmy(sim, 100_000))}
                    className="px-3 py-2.5 bg-[#0F1B2E] hover:bg-rose-950/60 border border-rose-600/80 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>+100.000 Ej.</span>
                  </button>
                </div>
              </div>

              {/* World Domination */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Conquista Instantánea del Mapa
                </div>
                <div className="bg-[#140D18] border border-red-700/70 p-3.5 space-y-3">
                  {/* Conquer Single Country */}
                  {aliveForeignCountries.length > 0 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedConquerId}
                        onChange={(e) => setSelectedConquerId(Number(e.target.value))}
                        className="flex-1 bg-[#080F1B] border border-slate-700 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                      >
                        {aliveForeignCountries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCountryName(c)} ({(c.pixels * 100).toLocaleString('es-ES')} km²)
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedConquerId >= 0) {
                            runPower(() => adminConquerCountry(sim, selectedConquerId));
                          }
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
                      >
                        Anexar país elegido
                      </button>
                    </div>
                  )}

                  {/* Conquer Entire World */}
                  <div className="pt-2 border-t border-red-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-xs text-red-200">
                      <strong>Conquistar Todo el Mundo:</strong> anexa instantáneamente los{' '}
                      {aliveForeignCountries.length} países restantes.
                    </div>
                    {!confirmWorld ? (
                      <button
                        type="button"
                        disabled={aliveForeignCountries.length === 0}
                        onClick={() => setConfirmWorld(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Globe className="w-4 h-4" />
                        <span>Conquistar Todo el Mundo</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmWorld(false);
                            runPower(() => adminConquerWorld(sim));
                          }}
                          className="px-3.5 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-extrabold cursor-pointer"
                        >
                          Sí, conquistar todo
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmWorld(false)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Infrastructure, Nukes, Diplomacy & Rebellions */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Infraestructura, Nuclear y Diplomacia
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => runPower(() => adminMaxInfrastructure(sim))}
                    className="px-3.5 py-2.5 bg-[#121D30] hover:bg-[#1A2A45] border border-sky-700/70 text-sky-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Máx. Minas/Ciudades + Defensas/Cuarteles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminResetNukeCooldown(sim))}
                    className="px-3.5 py-2.5 bg-[#121D30] hover:bg-[#1A2A45] border border-amber-700/70 text-amber-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Radiation className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Recargar Bomba Nuclear (0 días)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminAllyEveryone(sim))}
                    className="px-3.5 py-2.5 bg-[#121D30] hover:bg-[#1A2A45] border border-emerald-700/70 text-emerald-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Handshake className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Alianza + Relación 100/100 con TODOS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminGlobalPeace(sim))}
                    className="px-3.5 py-2.5 bg-[#121D30] hover:bg-[#1A2A45] border border-slate-600 text-slate-100 text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Paz Mundial (Terminar todas las guerras)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runPower(() => adminPacifyAllRebellions(sim))}
                    className="sm:col-span-2 px-3.5 py-2.5 bg-[#121D30] hover:bg-[#1A2A45] border border-purple-700/70 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Calmar Todas las Rebeliones (0% rebeldía)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Inicia o reanuda una partida para usar los poderes de partida.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
