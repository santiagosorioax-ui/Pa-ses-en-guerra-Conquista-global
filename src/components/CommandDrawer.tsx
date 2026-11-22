import { useState } from 'react';
import {
  Anchor,
  Building2,
  Coins,
  Crown,
  Flame,
  GitFork,
  Handshake,
  Pickaxe,
  Radar,
  Radiation,
  ScrollText,
  Shield,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import { getCountryGenealogyTree } from '../data/countryTrees';
import type { DeviceMode } from './DeviceModeScreen';
import {
  ANTI_NUKE_COST,
  ANTI_NUKE_RADIUS,
  ARMY_RECRUIT_AMOUNT,
  ARMY_RECRUIT_COST,
  CITY_INCOME,
  DEFENSE_COST,
  DEFENSE_RADIUS,
  GOLD_MINE_INCOME,
  MAX_CITIES_PER_MONTH,
  MAX_CITIES_TOTAL,
  MAX_GOLD_MINES_PER_MONTH,
  MAX_GOLD_MINES_TOTAL,
  NUKE_COST,
  NUKE_RADIUS,
  PORT_COST,
  SUPPRESS_REBELLION_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  evaluateFocusNodeStatus,
  getAllies,
  getArmyCap,
  getCityCost,
  getCountryDefensePct,
  getCountryName,
  getCountryRebellionStrength,
  getEnemies,
  getGoldMineCost,
  getMaxRecruitableSoldiers,
  getMoneyCap,
  getOccupiedNationsBy,
  getRelation,
  getTopRelations,
  hasCoast,
  hasTreaty,
  type SimulationState,
} from '../engine/gameSimulation';
import type { GameActionPayload, GameActionResult } from '../engine/gameActions';
import { PixelFlag } from './PixelFlag';
import { StatsChartsPanel } from './StatsChartsPanel';

export type DrawerTab = 'manage' | 'diplomacy' | 'charts' | 'chronicle';

interface CommandDrawerProps {
  deviceMode: DeviceMode;
  onCloseMobileDrawer?: () => void;
  sim: SimulationState;
  selectedId: number | null;
  activeTab: DrawerTab;
  onChangeTab: (tab: DrawerTab) => void;
  onSelectCountry: (id: number | null) => void;
  onJumpToCountry: (id: number) => void;
  onExecuteAction: (action: GameActionPayload) => Promise<GameActionResult> | GameActionResult;
  placingDefense: boolean;
  onTogglePlaceDefense: () => void;
  placingAntiNuke: boolean;
  onTogglePlaceAntiNuke: () => void;
  launchingNuke: boolean;
  onToggleLaunchNuke: () => void;
  defenseFeedback: { text: string; ok: boolean } | null;
  onOpenTree: () => void;
}

export function CommandDrawer({
  deviceMode,
  onCloseMobileDrawer,
  sim,
  selectedId,
  activeTab,
  onChangeTab,
  onSelectCountry,
  onJumpToCountry,
  onExecuteAction,
  placingDefense,
  onTogglePlaceDefense,
  placingAntiNuke,
  onTogglePlaceAntiNuke,
  launchingNuke,
  onToggleLaunchNuke,
  defenseFeedback,
  onOpenTree,
}: CommandDrawerProps) {
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const player = sim.countries[sim.playerId];
  const inspected =
    selectedId !== null && selectedId !== sim.playerId ? sim.countries[selectedId] : null;

  const runAction = async (payload: GameActionPayload) => {
    setBusy(true);
    try {
      const res = await onExecuteAction(payload);
      setFeedback({ text: res.message, ok: res.ok });
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: DrawerTab; label: string; icon: typeof Coins }> = [
    { id: 'manage', label: 'Mando', icon: Swords },
    { id: 'diplomacy', label: 'Alianzas', icon: Handshake },
    { id: 'charts', label: 'Gráficos', icon: TrendingUp },
    { id: 'chronicle', label: 'Crónica', icon: ScrollText },
  ];

  const playerWars = getEnemies(sim, player.id);
  const playerAllies = getAllies(sim, player.id);
  const occupiedNations = getOccupiedNationsBy(sim, player.id);
  const canBuildPort = hasCoast(sim, player.id);
  const armyCap = getArmyCap(player);
  const moneyCap = getMoneyCap(player);
  const maxRecruitableSoldiers = getMaxRecruitableSoldiers(player);
  const playerTree = getCountryGenealogyTree(player.seed);
  const completedFocusCount = (player.completedFocusIds ?? []).length;
  const readyFocusCount = player.alive
    ? playerTree.nodes.filter((n) => evaluateFocusNodeStatus(sim, player.id, n).canComplete).length
    : 0;

  const topPowers = [...sim.countries]
    .filter((c) => c.alive && c.id !== player.id)
    .sort((a, b) => b.army + b.pixels - (a.army + a.pixels))
    .slice(0, 16);

  return (
    <aside
      className={
        deviceMode === 'mobile'
          ? 'absolute inset-x-0 bottom-0 z-30 h-[62vh] bg-[#111B2B]/98 border-t border-slate-600 shadow-2xl flex flex-col overflow-hidden'
          : 'w-[365px] shrink-0 bg-[#111B2B] border-l border-slate-800 flex flex-col h-full overflow-hidden'
      }
    >
      {deviceMode === 'mobile' && (
        <div className="px-3 py-2 border-b border-slate-800 bg-[#0E1726] flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-amber-300">
            {tabs.find((t) => t.id === activeTab)?.label ?? 'Panel'}
          </span>
          <button
            onClick={onCloseMobileDrawer}
            className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Ver Mapa</span>
          </button>
        </div>
      )}

      {/* Tab Selector */}
      <div className={deviceMode === 'mobile' ? 'hidden' : 'grid grid-cols-4 border-b border-slate-800 bg-[#0E1726]'}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setFeedback(null);
                onChangeTab(t.id);
              }}
              className={`py-2.5 px-2 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-amber-400 text-amber-300 bg-[#111B2B]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(feedback || defenseFeedback) && (
          <div
            className={`p-2.5 text-xs border ${
              (defenseFeedback ?? feedback)!.ok
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                : 'bg-red-950/50 border-red-700/60 text-red-200'
            }`}
          >
            {(defenseFeedback ?? feedback)!.text}
          </div>
        )}

        {activeTab === 'manage' && (
          <>
            {!player.alive && sim.isMultiplayer && (
              <div className="p-3 bg-amber-950/60 border border-amber-500/60 text-xs text-amber-200 leading-relaxed space-y-2">
                <div>
                  Tu país fue anexado. Usa el panel de resistencia en el mapa para recaudar un ejército rebelde e iniciar una rebelión.
                </div>
                {deviceMode === 'mobile' && onCloseMobileDrawer && (
                  <button
                    onClick={onCloseMobileDrawer}
                    className="w-full min-h-[40px] py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Ver panel de rebelión en el mapa
                  </button>
                )}
              </div>
            )}

            {/* Resumen Dinero y Ejército */}
            <div className="grid grid-cols-2 gap-2 bg-[#0B121E] border border-slate-800 p-3 font-mono-num">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400 font-sans">Dinero Actual</div>
                <div className="text-base font-bold text-amber-300 truncate">
                  ${Math.round(player.money).toLocaleString('es-ES')}
                </div>
                <div
                  className={`text-[11px] ${
                    player.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {player.netIncome >= 0 ? '+' : ''}
                  {Math.round(player.netIncome).toLocaleString('es-ES')} / seg
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  Reserva máx. ${moneyCap.toLocaleString('es-ES')}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400 font-sans">Tu Ejército</div>
                <div className="text-base font-bold text-rose-400 truncate">
                  {Math.round(player.army).toLocaleString('es-ES')}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Cap. {armyCap.toLocaleString('es-ES')}
                </div>
                <div className="text-[10px] text-emerald-400 truncate">
                  Defensa país +{getCountryDefensePct(player)}%
                </div>
              </div>
            </div>

            {/* Árbol Genealógico Histórico */}
            <button
              type="button"
              onClick={onOpenTree}
              className={`w-full p-3 border text-left transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                readyFocusCount > 0
                  ? 'bg-amber-950/35 hover:bg-amber-950/55 border-amber-500/70'
                  : 'bg-[#0B121E] hover:bg-slate-800/80 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <GitFork className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-amber-200 truncate">
                    Árbol Genealógico ({completedFocusCount}/{playerTree.nodes.length})
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {player.customName === playerTree.restoredName
                        ? `${playerTree.restoredName} restaurada`
                        : `Meta: ${playerTree.restoredName}`}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`text-[11px] font-semibold shrink-0 whitespace-nowrap ${
                  readyFocusCount > 0 ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                {readyFocusCount > 0 ? `${readyFocusCount} listo` : 'Abrir'}
              </span>
            </button>

            {/* Botón Ejército: gastar dinero en soldados + botón Max */}
            <div className="space-y-1.5">
              <div className="flex items-stretch gap-1.5">
                <button
                  disabled={busy || !player.alive}
                  onClick={() => void runAction({ type: 'recruit_soldiers' })}
                  className={`flex-1 min-w-0 py-3 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white font-bold text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    Math.round(player.army) >= armyCap ? 'opacity-65' : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Swords className="w-4 h-4 shrink-0" />
                    <span className="truncate">Ejército (+{ARMY_RECRUIT_AMOUNT})</span>
                  </span>
                  <span className="font-mono-num text-xs bg-rose-800/80 px-2 py-0.5 shrink-0">
                    ${ARMY_RECRUIT_COST}
                  </span>
                </button>

                <button
                  disabled={busy || !player.alive}
                  onClick={() => void runAction({ type: 'recruit_soldiers_max' })}
                  title="Gastar todo tu dinero en soldados hasta tu capacidad militar"
                  className={`px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 font-bold flex flex-col items-center justify-center leading-tight shrink-0 transition-colors cursor-pointer ${
                    maxRecruitableSoldiers <= 0 ? 'opacity-65' : ''
                  }`}
                >
                  <span className="text-sm font-extrabold tracking-wide">Max</span>
                  {maxRecruitableSoldiers > 0 && (
                    <span className="font-mono-num text-[10px] font-semibold text-slate-900">
                      +{maxRecruitableSoldiers.toLocaleString('es-ES')}
                    </span>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Gasta dinero para sumar soldados hasta tu capacidad militar. Pulsa «Max» para invertir todo tu dinero en ejército.
              </p>
            </div>

            {/* Construir Minas de Oro, Ciudades y Puertos */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                Construcción (Dinero y Puertos)
              </h3>

              <button
                disabled={busy || !player.alive}
                onClick={() => void runAction({ type: 'build_gold_mine' })}
                className={`w-full p-2.5 bg-[#0B121E] hover:bg-slate-800/80 disabled:opacity-45 border border-slate-800 flex items-center justify-between text-left cursor-pointer ${
                  player.goldMinesBuiltThisMonth >= MAX_GOLD_MINES_PER_MONTH ||
                  player.goldMines >= MAX_GOLD_MINES_TOTAL
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Pickaxe className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Mina de Oro ({player.goldMines}/{MAX_GOLD_MINES_TOTAL}) ·{' '}
                      <span className="font-mono-num text-[11px] text-amber-300">
                        {player.goldMinesBuiltThisMonth}/{MAX_GOLD_MINES_PER_MONTH} este mes
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Genera +${GOLD_MINE_INCOME} dinero / seg
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-amber-300 font-semibold shrink-0">
                  ${getGoldMineCost(player).toLocaleString('es-ES')}
                </span>
              </button>

              <button
                disabled={busy || !player.alive}
                onClick={() => void runAction({ type: 'build_city' })}
                className={`w-full p-2.5 bg-[#0B121E] hover:bg-slate-800/80 disabled:opacity-45 border border-slate-800 flex items-center justify-between text-left cursor-pointer ${
                  player.citiesBuiltThisMonth >= MAX_CITIES_PER_MONTH ||
                  player.cities >= MAX_CITIES_TOTAL
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Ciudad ({player.cities}/{MAX_CITIES_TOTAL}) ·{' '}
                      <span className="font-mono-num text-[11px] text-emerald-300">
                        {player.citiesBuiltThisMonth}/{MAX_CITIES_PER_MONTH} este mes
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      +${CITY_INCOME}/seg y +120 cap. militar
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-amber-300 font-semibold shrink-0">
                  ${getCityCost(player).toLocaleString('es-ES')}
                </span>
              </button>

              <button
                onClick={() =>
                  void runAction(
                    inspected
                      ? { type: 'build_port', towardsId: inspected.id }
                      : { type: 'build_port' }
                  )
                }
                disabled={busy || !player.alive || !canBuildPort}
                className="w-full p-2.5 bg-[#0B121E] hover:bg-slate-800/80 disabled:opacity-45 border border-slate-800 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Anchor className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Puerto Naval ({player.ports.length})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {!canBuildPort
                        ? 'Sin costa marítima disponible'
                        : inspected
                          ? `Orientado hacia ${getCountryName(inspected)}`
                          : 'Necesario para atacar países por mar'}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-amber-300 font-semibold shrink-0">
                  ${PORT_COST}
                </span>
              </button>

              <button
                disabled={busy || !player.alive}
                onClick={() => {
                  setFeedback(null);
                  onTogglePlaceDefense();
                }}
                className={`w-full p-2.5 border flex items-center justify-between text-left cursor-pointer transition-colors disabled:opacity-45 ${
                  placingDefense
                    ? 'bg-emerald-950/70 border-emerald-500'
                    : 'bg-[#0B121E] hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      {placingDefense
                        ? 'Colocando Defensa (Clic en el mapa)'
                        : `Defensa (${player.defenses.length}) · +${getCountryDefensePct(player)}%`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {placingDefense
                        ? 'Haz clic en tu territorio o pulsa Esc para cancelar'
                        : `Protege en un radio de ${DEFENSE_RADIUS * 10} km y sube la defensa`}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-amber-300 font-semibold shrink-0">
                  {placingDefense ? 'Cancelar' : `$${DEFENSE_COST}`}
                </span>
              </button>

              <button
                disabled={busy || !player.alive}
                onClick={() => {
                  setFeedback(null);
                  onTogglePlaceAntiNuke();
                }}
                className={`w-full p-2.5 border flex items-center justify-between text-left cursor-pointer transition-colors disabled:opacity-45 ${
                  placingAntiNuke
                    ? 'bg-cyan-950/75 border-cyan-400'
                    : 'bg-[#0B121E] hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Radar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {placingAntiNuke
                        ? 'Colocando Antibombas (Toca en el mapa)'
                        : `Antibombas (${player.antiNukes.length})`}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {placingAntiNuke
                        ? 'Toca en tu territorio o pulsa Esc para cancelar'
                        : `Radar ${ANTI_NUKE_RADIUS * 10} km (mayor que Defensa) · Intercepta bombas nucleares`}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-cyan-300 font-semibold shrink-0 ml-2">
                  {placingAntiNuke ? 'Cancelar' : `$${ANTI_NUKE_COST.toLocaleString('es-ES')}`}
                </span>
              </button>

              <button
                disabled={busy || !player.alive || (!launchingNuke && (player.nukeCooldownDays ?? 0) > 0)}
                onClick={() => {
                  setFeedback(null);
                  onToggleLaunchNuke();
                }}
                className={`w-full p-2.5 border flex items-center justify-between text-left cursor-pointer transition-colors disabled:opacity-45 ${
                  launchingNuke
                    ? 'bg-orange-950/75 border-orange-500'
                    : 'bg-[#0B121E] hover:bg-slate-800/80 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Radiation className="w-4 h-4 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {launchingNuke
                        ? 'Apuntando Bomba Nuclear (Clic en mapa)'
                        : 'Bomba Nuclear'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {launchingNuke
                        ? 'Toca territorio enemigo o pulsa Esc para cancelar'
                        : (player.nukeCooldownDays ?? 0) > 0
                          ? `En recarga · ${player.nukeCooldownDays} días restantes`
                          : `Radio ${NUKE_RADIUS * 10} km (menor que Defensa) · Destruye ejército y defensas`}
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-orange-300 font-semibold shrink-0 ml-2">
                  {launchingNuke
                    ? 'Cancelar'
                    : (player.nukeCooldownDays ?? 0) > 0
                      ? `${player.nukeCooldownDays}d`
                      : `$${NUKE_COST.toLocaleString('es-ES')}`}
                </span>
              </button>
            </div>

            {/* Guerras Activas */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">
                Guerras Activas ({playerWars.length})
              </h3>
              {playerWars.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Haz clic en cualquier país del mapa para ver su bandera, capital y atacar o proponer alianza.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {playerWars.map((eid) => {
                    const enemy = sim.countries[eid];
                    const warObj = sim.wars.find(
                      (w) =>
                        (w.a === player.id && w.b === eid) ||
                        (w.a === eid && w.b === player.id)
                    );
                    const warMonths = warObj
                      ? Math.max(0, Math.floor((sim.totalDays - warObj.startTotalDays) / 30))
                      : 0;
                    return (
                      <div
                        key={eid}
                        className="p-2 bg-[#0B121E] border border-red-900/50 flex items-center justify-between gap-2"
                      >
                        <button
                          onClick={() => {
                            onSelectCountry(eid);
                            onJumpToCountry(eid);
                          }}
                          className="flex items-center gap-2 text-left min-w-0 cursor-pointer"
                        >
                          <PixelFlag country={enemy.seed} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-red-300 truncate">
                              {getCountryName(enemy)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-num">
                              Ejército {Math.round(enemy.army).toLocaleString('es-ES')} · {warMonths}/36 meses
                            </div>
                          </div>
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void runAction({ type: 'make_peace', targetId: eid })}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[11px] text-slate-200 border border-slate-700 shrink-0 cursor-pointer"
                        >
                          Paz
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Territorios Anexados (Riesgo de Rebelión según Fuerza) */}
            {occupiedNations.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>Territorios Anexados ({occupiedNations.length})</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    Riesgo de rebelión
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Los países fuertes pueden independizarse y rebelarse contra ti. Coloca una Defensa en su territorio o reprime focos rebeldes.
                </p>
                <div className="space-y-1.5">
                  {occupiedNations.slice(0, 6).map((occNation) => {
                    const unrest = Math.min(100, Math.max(0, Math.round(occNation.rebelUnrest ?? 0)));
                    const strength = getCountryRebellionStrength(occNation);
                    const barColor =
                      unrest >= 75
                        ? 'bg-red-500'
                        : unrest >= 40
                          ? 'bg-amber-400'
                          : 'bg-emerald-500';
                    const textColor =
                      unrest >= 75
                        ? 'text-red-400'
                        : unrest >= 40
                          ? 'text-amber-300'
                          : 'text-slate-300';
                    return (
                      <div
                        key={occNation.id}
                        className="p-2 bg-[#0B121E] border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <PixelFlag country={occNation.seed} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-100 truncate">
                                {getCountryName(occNation)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono-num">
                                Fuerza {strength}/100 ·{' '}
                                <span className={textColor}>Rebeldía {unrest}%</span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={busy || !player.alive || unrest <= 0 || player.money < SUPPRESS_REBELLION_COST}
                            onClick={() =>
                              void runAction({ type: 'suppress_rebellion', targetId: occNation.id })
                            }
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-[11px] text-amber-200 border border-slate-700 font-mono-num shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            Reprimir ${SUPPRESS_REBELLION_COST}
                          </button>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 overflow-hidden">
                          <div
                            className={`h-full transition-all ${barColor}`}
                            style={{ width: `${unrest}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'diplomacy' && (
          <>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-sky-400" />
                <span>Tus Alianzas ({playerAllies.length})</span>
              </h3>
              {playerAllies.length > 0 && playerWars.length > 0 && (
                <p className="text-[11px] text-amber-300">
                  Estás en guerra: haz clic en un aliado para abrir su tarjeta y pulsar «Pedir ayuda».
                </p>
              )}
              {playerAllies.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Aún no tienes alianzas. Haz clic en países con buenas relaciones y pulsa Alianza.
                </p>
              ) : (
                <div className="space-y-1">
                  {playerAllies.map((aid) => {
                    const ally = sim.countries[aid];
                    return (
                      <button
                        key={aid}
                        onClick={() => {
                          onSelectCountry(aid);
                          onJumpToCountry(aid);
                        }}
                        className="w-full px-2.5 py-2 bg-[#0B121E] hover:bg-slate-800 border border-sky-900/50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <PixelFlag country={ally.seed} size="sm" />
                          <span className="text-sky-200 font-medium truncate">{getCountryName(ally)}</span>
                        </span>
                        <span className="font-mono-num text-slate-400 shrink-0 ml-2">
                          Ejército {Math.round(ally.army).toLocaleString('es-ES')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-emerald-300">Buenas Relaciones</h3>
              <div className="space-y-1">
                {getTopRelations(sim, player.id, 'good', 6).map((item) => {
                  const c = sim.countries[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectCountry(item.id);
                        onJumpToCountry(item.id);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0B121E] hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <PixelFlag country={c.seed} size="sm" />
                        <span className="text-slate-200 truncate">{getCountryName(c)}</span>
                      </span>
                      <span className="font-mono-num text-emerald-400 font-semibold shrink-0 ml-2">
                        {item.rel}/100
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-red-300">Malas Relaciones / Rivales</h3>
              <div className="space-y-1">
                {getTopRelations(sim, player.id, 'bad', 6).map((item) => {
                  const c = sim.countries[item.id];
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectCountry(item.id);
                        onJumpToCountry(item.id);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0B121E] hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <PixelFlag country={c.seed} size="sm" />
                        <span className="text-slate-200 truncate">{getCountryName(c)}</span>
                      </span>
                      <span className="font-mono-num text-red-400 font-semibold shrink-0 ml-2">
                        {item.rel}/100
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">Mayores Ejércitos del Mundo</h3>
              <div className="space-y-1">
                {topPowers.map((c) => {
                  const rel = getRelation(sim, player.id, c.id);
                  const war = hasTreaty(sim, player.id, c.id, TREATY_WAR);
                  const ally = hasTreaty(sim, player.id, c.id, TREATY_ALLIANCE);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectCountry(c.id);
                        onJumpToCountry(c.id);
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0B121E] hover:bg-slate-800 border border-slate-800 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <PixelFlag country={c.seed} size="sm" />
                        <span className="text-slate-200 truncate">
                          {getCountryName(c)}
                          {sim.isMultiplayer && sim.humanPlayers[c.id] && (
                            <span className="ml-1 text-[10px] text-emerald-400">
                              ({sim.humanPlayers[c.id].displayName})
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="font-mono-num text-[11px] shrink-0 ml-2">
                        <span className="text-slate-400">
                          Ej. {Math.round(c.army).toLocaleString('es-ES')} ·{' '}
                        </span>
                        <span
                          className={
                            war
                              ? 'text-red-400'
                              : ally
                                ? 'text-sky-400'
                                : rel >= 65
                                  ? 'text-emerald-400'
                                  : rel <= 35
                                    ? 'text-orange-400'
                                    : 'text-slate-300'
                          }
                        >
                          {war ? 'Guerra' : ally ? 'Aliado' : `${rel}/100`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'charts' && (
          <StatsChartsPanel
            player={player}
            history={sim.playerHistory.map((pt) => ({ ...pt }))}
          />
        )}

        {activeTab === 'chronicle' && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-200">Crónica Geopolítica Mundial</h3>
            <div className="space-y-1.5">
              {sim.chronicle.map((entry) => {
                const badgeColor =
                  entry.type === 'war' || entry.type === 'annex' || entry.type === 'capital'
                    ? 'text-red-400'
                    : entry.type === 'alliance' || entry.type === 'peace'
                      ? 'text-sky-400'
                      : 'text-amber-400';
                return (
                  <button
                    key={entry.id}
                    onClick={() => {
                      if (entry.focusCountryId !== undefined) {
                        onSelectCountry(entry.focusCountryId);
                        onJumpToCountry(entry.focusCountryId);
                      }
                    }}
                    className={`w-full text-left p-2.5 bg-[#0B121E] border border-slate-800 text-xs space-y-1 ${
                      entry.focusCountryId !== undefined
                        ? 'hover:border-slate-600 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className={`font-mono-num text-[10px] font-semibold ${badgeColor}`}>
                      {entry.dateLabel}
                    </div>
                    <div className="text-slate-200 leading-relaxed">{entry.text}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
