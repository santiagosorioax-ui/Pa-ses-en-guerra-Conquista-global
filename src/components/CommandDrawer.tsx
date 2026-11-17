import { useState } from 'react';
import {
  Anchor,
  Building2,
  Coins,
  Handshake,
  Pickaxe,
  ScrollText,
  Shield,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import type { DeviceMode } from './DeviceModeScreen';
import {
  ARMY_RECRUIT_AMOUNT,
  ARMY_RECRUIT_COST,
  CITY_INCOME,
  DEFENSE_COST,
  DEFENSE_RADIUS,
  GOLD_MINE_INCOME,
  MAX_CITIES_PER_MONTH,
  MAX_GOLD_MINES_PER_MONTH,
  PORT_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  getAllies,
  getCityCost,
  getCountryDefensePct,
  getEnemies,
  getGoldMineCost,
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
  defenseFeedback: { text: string; ok: boolean } | null;
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
  defenseFeedback,
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
  const canBuildPort = hasCoast(sim, player.id);

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
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Dinero Actual</div>
                <div className="text-lg font-bold text-amber-300">${Math.round(player.money)}</div>
                <div className="text-[11px] text-emerald-400">
                  +{Math.round(player.netIncome)} / seg
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Tu Ejército</div>
                <div className="text-lg font-bold text-rose-400">{Math.round(player.army)}</div>
                <div className="text-[11px] text-emerald-400">
                  Defensa país +{getCountryDefensePct(player)}%
                </div>
              </div>
            </div>

            {/* Botón Ejército: gastar dinero en soldados */}
            <div className="space-y-1.5">
              <button
                disabled={busy || !player.alive}
                onClick={() => void runAction({ type: 'recruit_soldiers' })}
                className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white font-bold text-sm flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  <span>Ejército (+{ARMY_RECRUIT_AMOUNT} Soldados)</span>
                </span>
                <span className="font-mono-num text-xs bg-rose-800/80 px-2 py-0.5">
                  ${ARMY_RECRUIT_COST}
                </span>
              </button>
              <p className="text-[11px] text-slate-400">
                Gasta dinero para sumar soldados. Si alcanzan una capital en guerra, ese país pierde 50% de su ejército.
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
                  player.goldMinesBuiltThisMonth >= MAX_GOLD_MINES_PER_MONTH ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Pickaxe className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Mina de Oro ({player.goldMines}) ·{' '}
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
                  ${getGoldMineCost(player)}
                </span>
              </button>

              <button
                disabled={busy || !player.alive}
                onClick={() => void runAction({ type: 'build_city' })}
                className={`w-full p-2.5 bg-[#0B121E] hover:bg-slate-800/80 disabled:opacity-45 border border-slate-800 flex items-center justify-between text-left cursor-pointer ${
                  player.citiesBuiltThisMonth >= MAX_CITIES_PER_MONTH ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-slate-100">
                      Ciudad ({player.cities}) ·{' '}
                      <span className="font-mono-num text-[11px] text-emerald-300">
                        {player.citiesBuiltThisMonth}/{MAX_CITIES_PER_MONTH} este mes
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Genera +${CITY_INCOME} dinero / seg
                    </div>
                  </div>
                </div>
                <span className="font-mono-num text-xs text-amber-300 font-semibold shrink-0">
                  ${getCityCost(player)}
                </span>
              </button>

              <button
                onClick={() => void runAction({ type: 'build_port', towardsId: inspected?.id })}
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
                          ? `Orientado hacia ${inspected.seed.name}`
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
                              {enemy.seed.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-num">
                              Ejército {Math.round(enemy.army)} · {warMonths}/36 meses
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
                          <span className="text-sky-200 font-medium truncate">{ally.seed.name}</span>
                        </span>
                        <span className="font-mono-num text-slate-400 shrink-0 ml-2">
                          Ejército {Math.round(ally.army)}
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
                        <span className="text-slate-200 truncate">{c.seed.name}</span>
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
                        <span className="text-slate-200 truncate">{c.seed.name}</span>
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
                          {c.seed.name}
                          {sim.isMultiplayer && sim.humanPlayers[c.id] && (
                            <span className="ml-1 text-[10px] text-emerald-400">
                              ({sim.humanPlayers[c.id].displayName})
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="font-mono-num text-[11px] shrink-0 ml-2">
                        <span className="text-slate-400">Ej. {Math.round(c.army)} · </span>
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
