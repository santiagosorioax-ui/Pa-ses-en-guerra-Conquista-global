import { useState } from 'react';
import { Flame, Swords, Users } from 'lucide-react';
import {
  REBEL_INCOME_PER_SECOND,
  REBEL_RECRUIT_AMOUNT,
  REBEL_RECRUIT_COST,
  getRebellionStatus,
  type SimulationState,
} from '../engine/gameSimulation';
import type { GameActionPayload, GameActionResult } from '../engine/gameActions';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface RebellionPanelProps {
  deviceMode: DeviceMode;
  sim: SimulationState;
  onExecuteAction: (action: GameActionPayload) => Promise<GameActionResult> | GameActionResult;
}

export function RebellionPanel({
  deviceMode,
  sim,
  onExecuteAction,
}: RebellionPanelProps) {
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!sim.isMultiplayer || sim.outcome !== 'none') return null;
  const player = sim.countries[sim.playerId];
  if (!player || player.alive) return null;

  const status = getRebellionStatus(sim, sim.playerId);
  const occupier = status.occupierId !== null ? sim.countries[status.occupierId] : null;
  const pct =
    status.requiredArmy > 0
      ? Math.min(100, Math.round((status.rebelArmy / status.requiredArmy) * 100))
      : 0;

  const runAction = async (payload: GameActionPayload) => {
    setBusy(true);
    try {
      const res = await onExecuteAction(payload);
      setFeedback({ text: res.message, ok: res.ok });
    } finally {
      setBusy(false);
    }
  };

  const isMobile = deviceMode === 'mobile';

  return (
    <div
      className={
        isMobile
          ? 'absolute bottom-14 left-2 right-2 z-30 bg-[#111B2B]/98 border border-amber-500/70 p-3 shadow-2xl space-y-2.5'
          : 'absolute bottom-14 right-4 z-30 w-[380px] bg-[#111B2B]/98 border border-amber-500/70 p-4 shadow-2xl space-y-3'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <PixelFlag country={player.seed} size="md" />
          <div className="min-w-0">
            <div className="text-xs font-extrabold uppercase tracking-wide text-amber-300 truncate">
              {player.seed.name} Anexado · Resistencia
            </div>
            <div className="text-[11px] text-slate-300 truncate flex items-center gap-1.5 mt-0.5">
              <span>Ocupado por:</span>
              {occupier && <PixelFlag country={occupier.seed} size="sm" />}
              <span className="font-semibold text-red-300 truncate">{status.occupierName}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-[#0B121E] border border-slate-800 p-2 text-center font-mono-num">
        <div>
          <div className="text-[10px] text-slate-400 font-sans">Fondos</div>
          <div className="text-xs font-bold text-emerald-300">${status.rebelMoney}</div>
          <div className="text-[9px] text-emerald-400">+${REBEL_INCOME_PER_SECOND}/s</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-sans">Rebeldes</div>
          <div className="text-xs font-bold text-amber-300">{status.rebelArmy}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 font-sans">Ocupante</div>
          <div className="text-xs font-bold text-red-400">{status.occupierArmy}</div>
        </div>
      </div>

      {/* Requirement Progress: half or more of occupier's army */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] gap-2">
          <span className="text-slate-300 flex items-center gap-1 min-w-0 truncate">
            <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Requisito (≥ 50% de {status.occupierName})</span>
          </span>
          <span className="font-mono-num font-bold text-amber-300 shrink-0">
            {status.rebelArmy} / {status.requiredArmy}
          </span>
        </div>
        <div className="w-full h-2 bg-[#0B121E] border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${status.canRebel ? 'bg-emerald-400' : 'bg-amber-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

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

      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={busy || status.rebelMoney < REBEL_RECRUIT_COST}
          onClick={() => runAction({ type: 'recruit_rebel_army' })}
          className={`bg-rose-600 hover:bg-rose-500 disabled:opacity-45 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
            isMobile ? 'min-h-[44px] py-2 px-2' : 'py-2.5 px-3'
          }`}
        >
          <Swords className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isMobile
              ? `Recaudar (+${REBEL_RECRUIT_AMOUNT} · $${REBEL_RECRUIT_COST})`
              : `Recaudar (+${REBEL_RECRUIT_AMOUNT} · $${REBEL_RECRUIT_COST})`}
          </span>
        </button>

        <button
          disabled={busy || !status.canRebel}
          onClick={() => runAction({ type: 'start_rebellion' })}
          className={`bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
            isMobile ? 'min-h-[44px] py-2 px-2' : 'py-2.5 px-3'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span>Iniciar rebelión</span>
        </button>
      </div>
    </div>
  );
}
