import { Globe, RotateCcw, Trophy, AlertTriangle } from 'lucide-react';
import {
  resolveEventChoice,
  type ActiveEventModal,
  type SimulationState,
} from '../engine/gameSimulation';

interface EventModalProps {
  sim: SimulationState;
  eventModal: ActiveEventModal | null;
  onResolved: () => void;
  onContinueSandbox: () => void;
  onRestartMenu: () => void;
}

export function EventModal({
  sim,
  eventModal,
  onResolved,
  onContinueSandbox,
  onRestartMenu,
}: EventModalProps) {
  if (sim.outcome !== 'none') {
    const isVictory = sim.outcome === 'victory';
    const player = sim.countries[sim.playerId];
    return (
      <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#111B2B] border border-slate-700 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center gap-3">
            {isVictory ? (
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
            )}
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-white">
                {isVictory ? 'HEGEMONÍA GLOBAL ALCANZADA' : 'DERROTA NACIONAL'}
              </h2>
              <p className="text-xs text-slate-400">
                {player.seed.name} · Año {sim.year}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {isVictory
              ? `${player.seed.name} domina más del 35% del territorio habitable del planeta (${(player.pixels * 100).toLocaleString('es-ES')} km²) con $${Math.round(player.money)} de dinero y un ejército de ${Math.round(player.army)} soldados.`
              : `El último territorio de ${player.seed.name} ha caído bajo control enemigo. Tu campaña estratégica ha concluido.`}
          </p>

          <div className="flex items-center gap-3 pt-2">
            {isVictory && (
              <button
                onClick={onContinueSandbox}
                className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-600 cursor-pointer"
              >
                Seguir Jugando
              </button>
            )}
            <button
              onClick={onRestartMenu}
              className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Nueva Campaña</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!eventModal) return null;
  const { template, dateLabel } = eventModal;

  const formatEffectSummary = (eff: typeof template.choices[number]['effects']) => {
    const parts: string[] = [];
    if (eff.moneyDelta) parts.push(`${eff.moneyDelta > 0 ? '+' : ''}$${eff.moneyDelta} Dinero`);
    if (eff.armyDeltaPct) {
      parts.push(
        `${eff.armyDeltaPct > 0 ? '+' : ''}${Math.round(eff.armyDeltaPct * 100)}% Ejército`
      );
    }
    if (eff.globalStabilityDelta) {
      parts.push(
        `${eff.globalStabilityDelta > 0 ? '+' : ''}${eff.globalStabilityDelta}% Estabilidad`
      );
    }
    if (eff.globalTensionDelta) {
      parts.push(`${eff.globalTensionDelta > 0 ? '+' : ''}${eff.globalTensionDelta} Tensión Global`);
    }
    return parts.join(' · ');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[#111B2B] border border-slate-700 p-6 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="text-[11px] font-mono-num text-amber-400">
              {template.category} · {dateLabel} {template.isGlobal ? '· Impacto Global' : '· Crisis Nacional'}
            </div>
            <h2 className="text-lg font-bold text-white">{template.title}</h2>
          </div>
          <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-1" />
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{template.description}</p>

        {template.isGlobal && template.globalEffects && (
          <div className="bg-[#0B121E] border border-slate-800 px-3 py-2 text-xs font-mono-num text-slate-300">
            Efecto mundial: Estabilidad global{' '}
            {template.globalEffects.globalStabilityDelta > 0 ? '+' : ''}
            {template.globalEffects.globalStabilityDelta}% · Tensión{' '}
            {template.globalEffects.globalTensionDelta > 0 ? '+' : ''}
            {template.globalEffects.globalTensionDelta}%
          </div>
        )}

        <div className="space-y-2 pt-1">
          {template.choices.map((ch, idx) => (
            <button
              key={idx}
              onClick={() => {
                resolveEventChoice(sim, ch);
                onResolved();
              }}
              className="w-full p-3 bg-[#0B121E] hover:bg-slate-800/90 border border-slate-700 hover:border-amber-500/70 text-left transition-colors space-y-1 cursor-pointer"
            >
              <div className="text-xs font-bold text-amber-300">{ch.label}</div>
              <div className="text-xs text-slate-400">{ch.summary}</div>
              <div className="text-[11px] font-mono-num text-slate-200 pt-0.5">
                {formatEffectSummary(ch.effects)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
