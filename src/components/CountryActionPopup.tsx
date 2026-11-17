import { useEffect, useState } from 'react';
import { Anchor, Coins, Handshake, Shield, Swords, X } from 'lucide-react';
import {
  ALLIANCE_REL_THRESHOLD,
  GIFT_MONEY_PER_REL,
  PORT_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  buildPort,
  canReachToAttack,
  declareWar,
  getEnemies,
  getRelation,
  hasCoast,
  hasTreaty,
  makePeace,
  proposeAlliance,
  requestAllyHelp,
  sendDiplomaticGift,
  type SimulationState,
} from '../engine/gameSimulation';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface CountryActionPopupProps {
  deviceMode: DeviceMode;
  sim: SimulationState;
  targetId: number;
  onClose: () => void;
  onMutated: () => void;
}

export function CountryActionPopup({
  deviceMode,
  sim,
  targetId,
  onClose,
  onMutated,
}: CountryActionPopupProps) {
  const [feedback, setFeedback] = useState<{
    text: string;
    ok: boolean;
    needsPort?: boolean;
  } | null>(null);

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

  const handleAttack = () => {
    if (atWar) {
      makePeace(sim, player.id, target.id);
      setFeedback({ text: `Has firmado la paz con ${target.seed.name}.`, ok: true });
      onMutated();
      return;
    }

    const res = declareWar(sim, player.id, target.id);
    if (!res.ok) {
      setFeedback({
        text: res.error ?? 'No se puede declarar la guerra.',
        ok: false,
        needsPort: !reach.ok && reach.viaSea,
      });
    } else {
      setFeedback({
        text: reach.viaSea
          ? `¡Guerra declarada! Tu flota zarpó desde tu puerto hacia ${target.seed.name}.`
          : `¡Guerra declarada contra ${target.seed.name}!`,
        ok: true,
      });
    }
    onMutated();
  };

  const handleAlliance = () => {
    const res = proposeAlliance(sim, player.id, target.id);
    setFeedback({ text: res.reason, ok: res.accepted });
    onMutated();
  };

  const handleRequestHelp = () => {
    const res = requestAllyHelp(sim, player.id, target.id);
    setFeedback({ text: res.reason, ok: res.accepted });
    onMutated();
  };

  const handleBuildDirectionalPort = () => {
    const err = buildPort(sim, player.id, target.id);
    if (err) {
      setFeedback({ text: err, ok: false });
    } else {
      setFeedback({
        text: `Puerto construido orientado hacia ${target.seed.name}. Ya puedes atacar.`,
        ok: true,
        needsPort: false,
      });
    }
    onMutated();
  };

  const handleSendMoney = (points: number) => {
    const res = sendDiplomaticGift(sim, player.id, target.id, points);
    if (!res.ok) {
      setFeedback({ text: res.error ?? 'No se pudo enviar dinero.', ok: false });
    } else {
      const gained = res.gained ?? points;
      setFeedback({
        text: `Enviaste $${gained * GIFT_MONEY_PER_REL} a ${target.seed.name}. La relación subió +${gained} (${getRelation(sim, player.id, target.id)}/100).`,
        ok: true,
      });
    }
    onMutated();
  };

  const canBuildPort = hasCoast(sim, player.id);

  return (
    <div
      className={
        deviceMode === 'mobile'
          ? 'absolute bottom-2 left-2 right-2 z-30 max-h-[65vh] overflow-y-auto bg-[#111B2B]/98 border border-slate-600 rounded-lg shadow-2xl p-3.5 space-y-2.5'
          : 'absolute top-4 right-4 z-30 w-[350px] bg-[#111B2B]/98 border border-slate-600 rounded-lg shadow-2xl p-4 space-y-3'
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
            <div className="text-[11px] text-slate-400">
              {target.seed.continent} · {(target.pixels * 100).toLocaleString('es-ES')} km²
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          title="Salir (Esc)"
          aria-label="Cerrar"
          className="w-7 h-7 flex items-center justify-center bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!target.alive ? (
        <div className="p-2.5 bg-red-950/40 border border-red-800/60 text-xs text-red-200">
          Este país ha sido conquistado por completo.
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
                ${Math.round(target.money)}
              </div>
              <div className="text-[10px] text-slate-500">
                Tuyo: ${Math.round(player.money)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Swords className="w-3 h-3 text-rose-400" />
                <span>Ejército</span>
              </div>
              <div className="text-sm font-bold text-rose-400">
                {Math.round(target.army)}
              </div>
              <div className="text-[10px] text-slate-500">
                Tuyo: {Math.round(player.army)}
              </div>
            </div>
          </div>

          {/* Relación diplomática (1-100) y envío de dinero */}
          <div className="bg-[#0B121E] border border-slate-800 px-2.5 py-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Relación (1-100)</span>
              <span
                className={`font-mono-num font-bold ${
                  rel >= ALLIANCE_REL_THRESHOLD
                    ? 'text-emerald-400'
                    : rel <= 35
                      ? 'text-red-400'
                      : 'text-slate-200'
                }`}
              >
                {rel}/100 (Alianza ≥ {ALLIANCE_REL_THRESHOLD})
              </span>
            </div>

            {!atWar && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">
                  Enviar dinero ($100 = +1):
                </span>
                <div className="flex items-center gap-1.5 font-mono-num">
                  <button
                    onClick={() => handleSendMoney(1)}
                    disabled={rel >= 100}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    ${GIFT_MONEY_PER_REL} (+1)
                  </button>
                  <button
                    onClick={() => handleSendMoney(5)}
                    disabled={rel >= 100}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-[11px] font-semibold cursor-pointer"
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
                  onClick={handleBuildDirectionalPort}
                  className="w-full py-1.5 px-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Anchor className="w-3.5 h-3.5" />
                  <span>Construir Puerto hacia {target.seed.name} (${PORT_COST})</span>
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

          {/* Los 3 botones solicitados: X (Salir), Atacar, Alianza */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={onClose}
              className="py-2 px-2 bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>

            <button
              onClick={handleAttack}
              className={`py-2 px-2 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                atWar
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {atWar ? (
                <>
                  <Handshake className="w-3.5 h-3.5" />
                  <span>Firmar Paz</span>
                </>
              ) : (
                <>
                  <Swords className="w-3.5 h-3.5" />
                  <span>Atacar</span>
                </>
              )}
            </button>

            {allied && playerAtWar ? (
              <button
                onClick={handleRequestHelp}
                className="py-2 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Pedir ayuda</span>
              </button>
            ) : (
              <button
                onClick={handleAlliance}
                disabled={allied || atWar}
                className="py-2 px-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-45 disabled:hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{allied ? 'Aliado' : 'Alianza'}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
