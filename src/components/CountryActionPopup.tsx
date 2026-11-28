import { useEffect, useState } from 'react';
import {
  Anchor,
  ArrowLeft,
  Coins,
  GitFork,
  Handshake,
  Lock,
  MessageSquare,
  Radiation,
  Shield,
  Swords,
  UserCheck,
  X,
} from 'lucide-react';
import { getCountryGenealogyTree } from '../data/countryTrees';
import {
  MIN_MEETING_RELATION,
  PORT_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  canReachToAttack,
  getAllies,
  getAllianceRelThreshold,
  getArmyCap,
  getCountryName,
  getEnemies,
  getGiftMoneyPerRel,
  getNukeCost,
  getRelation,
  hasCoast,
  hasTreaty,
  type SimulationState,
} from '../engine/gameSimulation';
import type { GameActionPayload, GameActionResult } from '../engine/gameActions';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface CountryActionPopupProps {
  deviceMode: DeviceMode;
  sim: SimulationState;
  targetId: number;
  onClose: () => void;
  onExecuteAction: (action: GameActionPayload) => Promise<GameActionResult> | GameActionResult;
  onOpenCountryTree: (countryId: number) => void;
  onStartMeeting: (targetId: number) => void;
  onStartNukeTarget: () => void;
}

function getRelationDescriptor(rel: number): { label: string; colorClass: string; barClass: string } {
  if (rel < 20) {
    return { label: 'Hostil', colorClass: 'text-red-400', barClass: 'bg-red-500' };
  }
  if (rel < 35) {
    return { label: 'Desconfiada', colorClass: 'text-orange-400', barClass: 'bg-orange-500' };
  }
  if (rel < 55) {
    return { label: 'Cautelosa', colorClass: 'text-amber-300', barClass: 'bg-amber-400' };
  }
  if (rel < 75) {
    return { label: 'Cordial', colorClass: 'text-sky-300', barClass: 'bg-sky-400' };
  }
  return { label: 'Hermandad', colorClass: 'text-emerald-400', barClass: 'bg-emerald-400' };
}

export function CountryActionPopup({
  deviceMode,
  sim,
  targetId,
  onClose,
  onExecuteAction,
  onOpenCountryTree,
  onStartMeeting,
  onStartNukeTarget,
}: CountryActionPopupProps) {
  const [feedback, setFeedback] = useState<{
    text: string;
    ok: boolean;
    needsPort?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFeedback(null);
  }, [targetId]);

  const player = sim.countries[sim.playerId];
  const target = sim.countries[targetId];
  if (!target || target.id === player.id) return null;

  const rel = getRelation(sim, player.id, target.id);
  const relInfo = getRelationDescriptor(rel);
  const atWar = hasTreaty(sim, player.id, target.id, TREATY_WAR);
  const allied = hasTreaty(sim, player.id, target.id, TREATY_ALLIANCE);
  const playerAtWar = getEnemies(sim, player.id).length > 0;
  const reach = canReachToAttack(sim, player.id, target.id);
  const humanOwner = sim.isMultiplayer ? sim.humanPlayers[target.id] : undefined;
  const playerName = getCountryName(player);
  const targetName = getCountryName(target);
  const targetTree = getCountryGenealogyTree(target.seed);
  const targetFocusCount = (target.completedFocusIds ?? []).length;
  const allianceRelThreshold = getAllianceRelThreshold(sim.difficulty);
  const giftMoneyPerRel = getGiftMoneyPerRel(sim.difficulty);
  const nukeCost = getNukeCost(sim, player.id);

  const playerAllies = getAllies(sim, player.id);
  const targetAllies = getAllies(sim, target.id);
  const playerEnemies = getEnemies(sim, player.id);
  const targetEnemies = getEnemies(sim, target.id);
  const playerArmyCap = getArmyCap(player, sim.difficulty);
  const targetArmyCap = getArmyCap(target, sim.difficulty);

  const canHoldMeeting = target.alive && player.alive && !humanOwner && rel >= MIN_MEETING_RELATION;
  const canBuildPort = hasCoast(sim, player.id);
  const isMobile = deviceMode === 'mobile';

  const diplomaticStatusText = atWar
    ? 'En guerra'
    : allied
      ? 'Aliado estratégico'
      : `Relación ${relInfo.label}`;

  const runAction = async (payload: GameActionPayload) => {
    setBusy(true);
    try {
      const res = await onExecuteAction(payload);
      setFeedback({
        text: res.message,
        ok: res.ok,
        needsPort: res.needsPort,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAttack = () => {
    if (atWar) {
      void runAction({ type: 'make_peace', targetId: target.id });
    } else {
      void runAction({ type: 'declare_war', targetId: target.id });
    }
  };

  const handleAlliance = () => {
    void runAction({ type: 'propose_alliance', targetId: target.id });
  };

  const handleRequestHelp = () => {
    void runAction({ type: 'request_ally_help', allyId: target.id });
  };

  const handleBuildDirectionalPort = () => {
    void runAction({ type: 'build_port', towardsId: target.id });
  };

  const handleSendMoney = (points: number) => {
    void runAction({ type: 'send_gift', targetId: target.id, points });
  };

  const comparisonRows = [
    {
      label: 'Tesoro nacional',
      yours: `$${Math.round(player.money).toLocaleString('es-ES')}`,
      theirs: `$${Math.round(target.money).toLocaleString('es-ES')}`,
      accentTheirs: 'text-amber-300',
    },
    {
      label: 'Ingreso neto / seg',
      yours: `${player.netIncome >= 0 ? '+' : ''}$${Math.round(player.netIncome).toLocaleString('es-ES')}/s`,
      theirs: `${target.netIncome >= 0 ? '+' : ''}$${Math.round(target.netIncome).toLocaleString('es-ES')}/s`,
      accentTheirs: target.netIncome >= 0 ? 'text-emerald-300' : 'text-red-400',
    },
    {
      label: 'Ejército activo',
      yours: `${Math.round(player.army).toLocaleString('es-ES')} / ${playerArmyCap.toLocaleString('es-ES')}`,
      theirs: `${Math.round(target.army).toLocaleString('es-ES')} / ${targetArmyCap.toLocaleString('es-ES')}`,
      accentTheirs: 'text-rose-300',
    },
    {
      label: 'Territorio',
      yours: `${(player.pixels * 100).toLocaleString('es-ES')} km²`,
      theirs: `${(target.pixels * 100).toLocaleString('es-ES')} km²`,
      accentTheirs: 'text-slate-100',
    },
    {
      label: 'Defensas · Cuarteles · Antibombas',
      yours: `${player.defenses.length} · ${player.barracks.length} · ${player.antiNukes.length}`,
      theirs: `${target.defenses.length} · ${target.barracks.length} · ${target.antiNukes.length}`,
      accentTheirs: 'text-slate-200',
    },
    {
      label: 'Puertos navales',
      yours: `${player.ports.length}`,
      theirs: `${target.ports.length}`,
      accentTheirs: 'text-sky-300',
    },
    {
      label: 'Alianzas · Guerras activas',
      yours: `${playerAllies.length} · ${playerEnemies.length}`,
      theirs: `${targetAllies.length} · ${targetEnemies.length}`,
      accentTheirs: 'text-slate-200',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 bg-[#080F1B] text-slate-100 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Expediente diplomático de ${targetName}`}
    >
      {/* Full-Screen Top Header */}
      <header className="px-4 sm:px-8 py-3.5 sm:py-4 bg-[#0D1727] border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
          <PixelFlag country={target.seed} size={isMobile ? 'lg' : 'xl'} />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3 h-3 shrink-0 border border-white/40"
                style={{
                  backgroundColor: `rgb(${target.color[0]},${target.color[1]},${target.color[2]})`,
                }}
                title="Color del país en el mapa"
              />
              <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight truncate">
                {targetName}
              </h2>
            </div>
            <div className="mt-0.5 text-xs sm:text-sm text-slate-400 flex items-center flex-wrap gap-x-2 gap-y-0.5">
              <span className="text-amber-300 font-medium">Capital: {target.seed.capital}</span>
              <span aria-hidden="true">·</span>
              <span>{target.seed.continent}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">
                {(target.pixels * 100).toLocaleString('es-ES')} km²
              </span>
              <span aria-hidden="true">·</span>
              <span
                className={
                  atWar
                    ? 'text-red-400 font-semibold'
                    : allied
                      ? 'text-emerald-400 font-semibold'
                      : `${relInfo.colorClass} font-semibold`
                }
              >
                {diplomaticStatusText}
              </span>
              {target.customName && target.customName !== target.seed.name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Antes {target.seed.name}</span>
                </>
              )}
            </div>
            {humanOwner && (
              <div className="mt-1 text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Dirigido por jugador: {humanOwner.displayName}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Volver al mapa (Esc)"
          className="min-h-[42px] px-3.5 sm:px-5 py-2 bg-[#111D30] hover:bg-slate-800 border border-slate-700 text-slate-100 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Volver al Mapa</span>
          <span className="sm:hidden">Salir</span>
        </button>
      </header>

      {/* Main Full-Screen Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-6">
          {!target.alive ? (
            <div className="p-6 bg-[#101A2C] border border-red-800/60 space-y-3">
              <h3 className="text-base font-bold text-red-300">Nación anexada</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {targetName} ha sido conquistado por completo y ya no mantiene soberanía activa en el mapa mundial.
              </p>
              <button
                type="button"
                onClick={() => onOpenCountryTree(target.id)}
                className="min-h-[42px] px-4 py-2 bg-[#162339] hover:bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
              >
                <GitFork className="w-4 h-4" />
                <span>Ver Árbol Genealógico ({targetFocusCount}/{targetTree.nodes.length})</span>
              </button>
            </div>
          ) : !player.alive ? (
            <div className="p-6 bg-[#101A2C] border border-amber-700/60 space-y-2">
              <h3 className="text-base font-bold text-amber-300">Tu país fue anexado</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Recauda un ejército rebelde e inicia una rebelión para recuperar tu soberanía antes de retomar la diplomacia internacional.
              </p>
            </div>
          ) : (
            <>
              {/* Primary Diplomatic Summit Callout: Hacer Reunión */}
              <section className="bg-[#0E1829] border border-slate-800 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <PixelFlag country={player.seed} size="md" />
                    <span className="text-xs font-mono-num text-slate-400">↔</span>
                    <PixelFlag country={target.seed} size="md" />
                    <span className="text-xs text-slate-400 truncate">
                      {playerName} y {targetName}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Cumbre Diplomática Directa
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Habla directamente con el gobierno de {targetName} sobre alianzas, paz, ayuda económica, tropas o cualquier tema. Sus respuestas dependen de vuestra relación actual ({rel}/100) y al terminar la reunión se revisará toda la conversación para aplicar los acuerdos y ajustar vuestra relación en el juego.
                  </p>
                  {!canHoldMeeting && (
                    <div className="text-xs text-amber-300 flex items-center gap-1.5 pt-0.5">
                      <Lock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {humanOwner
                          ? 'Este país es dirigido por otro jugador humano en línea.'
                          : `Necesitas como mínimo ${MIN_MEETING_RELATION} de relación para hacer una reunión (tienes ${rel}/100). Envía dinero abajo para mejorar vuestra relación.`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-stretch lg:items-end gap-1.5">
                  <button
                    type="button"
                    disabled={!canHoldMeeting}
                    onClick={() => onStartMeeting(target.id)}
                    className={`min-h-[48px] px-6 py-3 font-bold text-sm flex items-center justify-center gap-2.5 whitespace-nowrap transition-colors ${
                      canHoldMeeting
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canHoldMeeting ? (
                      <MessageSquare className="w-4 h-4 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 shrink-0" />
                    )}
                    <span>Hacer Reunión</span>
                  </button>
                  <span className="text-[11px] font-mono-num text-slate-400 text-center lg:text-right">
                    Requisito: relación ≥ {MIN_MEETING_RELATION}/100
                  </span>
                </div>
              </section>

              {feedback && (
                <div
                  className={`px-4 py-3 text-xs sm:text-sm border ${
                    feedback.ok
                      ? 'bg-emerald-950/40 border-emerald-700/70 text-emerald-200'
                      : 'bg-red-950/40 border-red-700/70 text-red-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              {/* Two-Column Strategic Intelligence & Direct Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Bilateral Comparison + Relation Controls */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Side-by-Side Comparison Table */}
                  <div className="bg-[#0E1829] border border-slate-800">
                    <div className="px-4 sm:px-5 py-3.5 border-b border-slate-800 grid grid-cols-12 gap-2 items-center text-xs font-semibold text-slate-300">
                      <span className="col-span-5 text-slate-400">Indicador</span>
                      <span className="col-span-3 flex items-center justify-end gap-1.5 min-w-0">
                        <PixelFlag country={player.seed} size="sm" />
                        <span className="truncate text-slate-200">Tú</span>
                      </span>
                      <span className="col-span-4 flex items-center justify-end gap-1.5 min-w-0">
                        <PixelFlag country={target.seed} size="sm" />
                        <span className="truncate text-amber-300">{targetName}</span>
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/80">
                      {comparisonRows.map((row) => (
                        <div
                          key={row.label}
                          className="px-4 sm:px-5 py-3 grid grid-cols-12 gap-2 items-center text-xs sm:text-sm"
                        >
                          <span className="col-span-5 text-slate-400">{row.label}</span>
                          <span className="col-span-3 text-right font-mono-num text-slate-300">
                            {row.yours}
                          </span>
                          <span
                            className={`col-span-4 text-right font-mono-num font-semibold ${row.accentTheirs}`}
                          >
                            {row.theirs}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relation Bar & Financial Aid */}
                  <div className="bg-[#0E1829] border border-slate-800 p-4 sm:p-5 space-y-4">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <h4 className="text-sm font-bold text-white">Relación bilateral</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Reunión diplomática desde {MIN_MEETING_RELATION}/100 ·{' '}
                          {humanOwner
                            ? 'Alianza por acuerdo mutuo'
                            : `Alianza directa desde ${allianceRelThreshold}/100`}
                        </p>
                      </div>
                      <div className={`text-lg font-mono-num font-extrabold ${relInfo.colorClass}`}>
                        {rel}/100{' '}
                        <span className="text-xs font-sans font-semibold text-slate-400">
                          · {relInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Progress bar with threshold ticks */}
                    <div className="relative h-2.5 bg-[#080F1B] border border-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all ${relInfo.barClass}`}
                        style={{ width: `${rel}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px bg-amber-300/80"
                        style={{ left: `${MIN_MEETING_RELATION}%` }}
                        title={`Mínimo para reunión: ${MIN_MEETING_RELATION}/100`}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px bg-emerald-300/80"
                        style={{ left: `${allianceRelThreshold}%` }}
                        title={`Umbral de alianza: ${allianceRelThreshold}/100`}
                      />
                    </div>

                    {!atWar && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>
                            Enviar ayuda económica (${giftMoneyPerRel.toLocaleString('es-ES')} = +1 relación)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono-num shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSendMoney(1)}
                            disabled={busy || rel >= 100}
                            className="min-h-[40px] px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            ${giftMoneyPerRel.toLocaleString('es-ES')} (+1)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendMoney(5)}
                            disabled={busy || rel >= 100}
                            className="min-h-[40px] px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            ${(giftMoneyPerRel * 5).toLocaleString('es-ES')} (+5)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Direct Military, Treaty & History Actions */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-[#0E1829] border border-slate-800 p-4 sm:p-5 space-y-3">
                    <h4 className="text-sm font-bold text-white">Acciones diplomáticas y militares</h4>

                    {!reach.ok && !atWar && !allied && (
                      <div className="p-3 bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 space-y-2.5">
                        <div>{reach.reason}</div>
                        {canBuildPort && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleBuildDirectionalPort}
                            className="w-full min-h-[42px] px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Anchor className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                              Construir Puerto hacia {targetName} (${PORT_COST})
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleAttack}
                        className={`min-h-[46px] px-4 py-2.5 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50 transition-colors ${
                          atWar
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-red-600 hover:bg-red-500 text-white'
                        }`}
                      >
                        {atWar ? (
                          <>
                            <Handshake className="w-4 h-4 shrink-0" />
                            <span>{humanOwner ? 'Proponer Paz' : 'Firmar Paz'}</span>
                          </>
                        ) : (
                          <>
                            <Swords className="w-4 h-4 shrink-0" />
                            <span>Declarar Guerra / Atacar</span>
                          </>
                        )}
                      </button>

                      {allied && playerAtWar ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={handleRequestHelp}
                          className="min-h-[46px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Shield className="w-4 h-4 shrink-0" />
                          <span>Pedir ayuda militar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAlliance}
                          disabled={busy || allied || atWar}
                          className="min-h-[46px] px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-45 disabled:hover:bg-sky-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Shield className="w-4 h-4 shrink-0" />
                          <span>{allied ? 'Ya son Aliados' : 'Proponer Alianza'}</span>
                        </button>
                      )}
                    </div>

                    {!allied && (
                      <button
                        type="button"
                        disabled={busy || (player.nukeCooldownDays ?? 0) > 0}
                        onClick={onStartNukeTarget}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-orange-950/70 hover:bg-orange-900/80 disabled:opacity-45 border border-orange-600/70 text-orange-200 font-bold text-xs sm:text-sm flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Radiation className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate">
                            {(player.nukeCooldownDays ?? 0) > 0
                              ? `Bomba Nuclear (recarga ${player.nukeCooldownDays}d)`
                              : 'Apuntar Bomba Nuclear'}
                          </span>
                        </span>
                        <span className="font-mono-num text-xs text-orange-300 shrink-0">
                          ${nukeCost.toLocaleString('es-ES')}
                        </span>
                      </button>
                    )}

                    <div className="pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => onOpenCountryTree(target.id)}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-[#0A1220] hover:bg-slate-800/90 border border-slate-700 hover:border-amber-500/60 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2 text-xs sm:text-sm text-amber-300 font-semibold min-w-0 truncate">
                          <GitFork className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            Árbol Genealógico ({targetFocusCount}/{targetTree.nodes.length})
                          </span>
                        </span>
                        <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                          Ver historia
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Active Diplomatic Network Preview */}
                  {(targetAllies.length > 0 || targetEnemies.length > 0) && (
                    <div className="bg-[#0E1829] border border-slate-800 p-4 sm:p-5 space-y-3 text-xs">
                      <h4 className="text-sm font-bold text-white">Panorama diplomático de {targetName}</h4>
                      {targetAllies.length > 0 && (
                        <div>
                          <div className="text-slate-400 mb-1">
                            Aliados ({targetAllies.length})
                          </div>
                          <div className="text-emerald-300 leading-relaxed">
                            {targetAllies
                              .slice(0, 8)
                              .map((id) => getCountryName(sim.countries[id]))
                              .join(' · ')}
                            {targetAllies.length > 8 ? ` · +${targetAllies.length - 8} más` : ''}
                          </div>
                        </div>
                      )}
                      {targetEnemies.length > 0 && (
                        <div>
                          <div className="text-slate-400 mb-1">
                            En guerra con ({targetEnemies.length})
                          </div>
                          <div className="text-red-300 leading-relaxed">
                            {targetEnemies
                              .slice(0, 8)
                              .map((id) => getCountryName(sim.countries[id]))
                              .join(' · ')}
                            {targetEnemies.length > 8 ? ` · +${targetEnemies.length - 8} más` : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full min-h-[44px] px-4 py-2.5 bg-[#0E1829] hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 shrink-0" />
                    <span>Cerrar expediente y volver al mapa</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
