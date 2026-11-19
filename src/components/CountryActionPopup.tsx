import { useEffect, useState } from 'react';
import { Anchor, Coins, Handshake, Shield, Swords, UserCheck, X } from 'lucide-react';
import {
  ALLIANCE_REL_THRESHOLD,
  GIFT_MONEY_PER_REL,
  PORT_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  canReachToAttack,
  getEnemies,
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
}

export function CountryActionPopup({
  deviceMode,
  sim,
  targetId,
  onClose,
  onExecuteAction,
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
  const atWar = hasTreaty(sim, player.id, target.id, TREATY_WAR);
  const allied = hasTreaty(sim, player.id, target.id, TREATY_ALLIANCE);
  const playerAtWar = getEnemies(sim, player.id).length > 0;
  const reach = canReachToAttack(sim, player.id, target.id);
  const humanOwner = sim.isMultiplayer ? sim.humanPlayers[target.id] : undefined;

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

  const canBuildPort = hasCoast(sim, player.id);

  const isMobile = deviceMode === 'mobile';

  return (
    <div
      className={
        isMobile
          ? 'absolute bottom-2 left-2 right-2 z-30 max-h-[62vh] overflow-y-auto bg-[#111B2B]/98 border border-slate-600 rounded-lg shadow-2xl p-3.5 space-y-2.5'
          : 'absolute top-4 right-4 z-30 w-[355px] bg-[#111B2B]/98 border border-slate-600 rounded-lg shadow-2xl p-4 space-y-3'
      }
    >
      {/* Header: Bandera, País, Capital y botón X */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <PixelFlag country={target.seed} size="lg" />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 shrink-0 border border-white/40"
                style={{
                  backgroundColor: `rgb(${target.color[0]},${target.color[1]},${target.color[2]})`,
                }}
                title="Color del país en el mapa"
              />
              <span className="truncate">{target.seed.name}</span>
            </h3>
            <div className="text-xs text-amber-300 font-medium truncate">
              Capital: {target.seed.capital}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
              <span>
                {target.seed.continent} · {(target.pixels * 100).toLocaleString('es-ES')} km²
              </span>
            </div>
            {humanOwner && (
              <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 mt-0.5 truncate">
                <UserCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">Jugador: {humanOwner.displayName}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          title="Salir (Esc)"
          aria-label="Cerrar"
          className={`flex items-center justify-center bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer shrink-0 ${
            isMobile ? 'w-9 h-9' : 'w-7 h-7'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!target.alive ? (
        <div className="p-2.5 bg-red-950/40 border border-red-800/60 text-xs text-red-200">
          Este país ha sido conquistado por completo.
        </div>
      ) : !player.alive ? (
        <div className="p-2.5 bg-amber-950/40 border border-amber-700/60 text-xs text-amber-200">
          Tu país fue anexado. Recauda un ejército rebelde e inicia una rebelión para recuperar tu soberanía.
        </div>
      ) : (
        <>
          {/* Comparación numérica directa: Dinero y Ejército */}
          <div className="grid grid-cols-2 gap-2 bg-[#0B121E] border border-slate-800 p-2.5 font-mono-num">
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>Dinero</span>
              </div>
              <div className="text-sm font-bold text-amber-300">
                ${Math.round(target.money).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">
                Tuyo: ${Math.round(player.money).toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Swords className="w-3 h-3 text-rose-400" />
                <span>Ejército</span>
              </div>
              <div className="text-sm font-bold text-rose-400">
                {Math.round(target.army).toLocaleString('es-ES')}
              </div>
              <div className="text-[10px] text-slate-500">
                Tuyo: {Math.round(player.army).toLocaleString('es-ES')}
              </div>
            </div>
          </div>

          {/* Relación diplomática (1-100) y envío de dinero */}
          <div className="bg-[#0B121E] border border-slate-800 px-2.5 py-2 space-y-2">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-400 shrink-0">Relación (1-100)</span>
              <span
                className={`font-mono-num font-bold truncate ${
                  rel >= ALLIANCE_REL_THRESHOLD
                    ? 'text-emerald-400'
                    : rel <= 35
                      ? 'text-red-400'
                      : 'text-slate-200'
                }`}
              >
                {rel}/100 ({humanOwner ? 'Acuerdo mutuo' : `Alianza ≥ ${ALLIANCE_REL_THRESHOLD}`})
              </span>
            </div>

            {!atWar && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  Enviar dinero ($100 = +1):
                </span>
                <div className="flex items-center gap-1.5 font-mono-num">
                  <button
                    onClick={() => handleSendMoney(1)}
                    disabled={busy || rel >= 100}
                    className={`bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer ${
                      isMobile ? 'px-2.5 py-1.5 min-h-[34px]' : 'px-2 py-1'
                    }`}
                  >
                    ${GIFT_MONEY_PER_REL} (+1)
                  </button>
                  <button
                    onClick={() => handleSendMoney(5)}
                    disabled={busy || rel >= 100}
                    className={`bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer ${
                      isMobile ? 'px-2.5 py-1.5 min-h-[34px]' : 'px-2 py-1'
                    }`}
                  >
                    ${GIFT_MONEY_PER_REL * 5} (+5)
                  </button>
                </div>
              </div>
            )}
          </div>

          {!reach.ok && !atWar && !allied && (
            <div className="p-2 bg-amber-950/40 border border-amber-700/50 text-[11px] text-amber-200 space-y-1.5">
              <div>{reach.reason}</div>
              {canBuildPort && (
                <button
                  disabled={busy}
                  onClick={handleBuildDirectionalPort}
                  className={`w-full px-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer ${
                    isMobile ? 'py-2 min-h-[38px]' : 'py-1.5'
                  }`}
                >
                  <Anchor className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Construir Puerto hacia {target.seed.name} (${PORT_COST})</span>
                </button>
              )}
            </div>
          )}

          {feedback && (
            <div
              className={`p-2 text-xs border ${
                feedback.ok
                  ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                  : 'bg-red-950/50 border-red-700/60 text-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Action Buttons: adapted cleanly for Mobile vs Desktop */}
          {isMobile ? (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={busy}
                  onClick={handleAttack}
                  className={`min-h-[44px] py-2.5 px-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
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
                      <span>Atacar</span>
                    </>
                  )}
                </button>

                {allied && playerAtWar ? (
                  <button
                    disabled={busy}
                    onClick={handleRequestHelp}
                    className="min-h-[44px] py-2.5 px-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Pedir ayuda</span>
                  </button>
                ) : (
                  <button
                    onClick={handleAlliance}
                    disabled={busy || allied || atWar}
                    className="min-h-[44px] py-2.5 px-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-45 disabled:hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>{allied ? 'Aliado' : 'Alianza'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-full min-h-[40px] py-2 px-3 bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={onClose}
                className="py-2 px-2 bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>

              <button
                disabled={busy}
                onClick={handleAttack}
                className={`py-2 px-2 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                  atWar
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {atWar ? (
                  <>
                    <Handshake className="w-3.5 h-3.5 shrink-0" />
                    <span>{humanOwner ? 'Proponer Paz' : 'Firmar Paz'}</span>
                  </>
                ) : (
                  <>
                    <Swords className="w-3.5 h-3.5 shrink-0" />
                    <span>Atacar</span>
                  </>
                )}
              </button>

              {allied && playerAtWar ? (
                <button
                  disabled={busy}
                  onClick={handleRequestHelp}
                  className="py-2 px-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Pedir ayuda</span>
                </button>
              ) : (
                <button
                  onClick={handleAlliance}
                  disabled={busy || allied || atWar}
                  className="py-2 px-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-45 disabled:hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>{allied ? 'Aliado' : 'Alianza'}</span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
