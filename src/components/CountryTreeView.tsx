import React, { useMemo, useState } from 'react';
import {
  Check,
  Coins,
  Crosshair,
  Crown,
  GitBranch,
  Landmark,
  Lock,
  Maximize2,
  Shield,
  Swords,
  X,
} from 'lucide-react';
import {
  getCountryGenealogyTree,
  type CountryTreeNode,
} from '../data/countryTrees';
import {
  evaluateTreeNode,
  getAllies,
  getCountryDisplayName,
  type SimulationState,
} from '../engine/gameSimulation';
import { PixelFlag } from './PixelFlag';

interface CountryTreeProps {
  sim: SimulationState;
  countryId: number;
  onUnlockNode: (nodeId: string) => void;
  onFocusCountry: (countryId: number) => void;
  onExpandModal?: () => void;
  compact?: boolean;
}

const BRANCH_META: Record<
  CountryTreeNode['branch'],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  root: { label: 'Raíz histórica', icon: Landmark },
  economy: { label: 'Rama económica', icon: Coins },
  military: { label: 'Rama militar', icon: Swords },
  restoration: { label: 'Restauración', icon: Crown },
  legacy: { label: 'Legado supremo', icon: Crown },
};

function formatRewardLine(node: CountryTreeNode): string[] {
  const parts: string[] = [];
  const r = node.reward;
  if (r.renameTo) parts.push(`Renombra el país a «${r.renameTo}»`);
  if (r.permanentIncomeBonus) parts.push(`+$${r.permanentIncomeBonus}/s ingreso permanente`);
  if (r.permanentArmyCapBonus) parts.push(`+${r.permanentArmyCapBonus} cap. militar`);
  if (r.moneyDelta) parts.push(`+$${r.moneyDelta.toLocaleString('es-ES')} tesoro`);
  if (r.armyDelta) parts.push(`+${r.armyDelta.toLocaleString('es-ES')} soldados`);
  return parts;
}

export const CountryTreeView: React.FC<CountryTreeProps> = ({
  sim,
  countryId,
  onUnlockNode,
  onFocusCountry,
  onExpandModal,
  compact = false,
}) => {
  const country = sim.countries[countryId];
  const tree = useMemo(
    () => getCountryGenealogyTree(country?.seed.iso2 ?? 'CO'),
    [country?.seed.iso2]
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string>(() => tree.nodes[0]?.id ?? '');

  // Keep selectedNodeId valid when switching countries
  const activeNode = useMemo(() => {
    return tree.nodes.find((n) => n.id === selectedNodeId) ?? tree.nodes[0];
  }, [tree.nodes, selectedNodeId]);

  if (!country || !activeNode) return null;

  const isPlayerCountry = countryId === sim.playerId;
  const displayName = getCountryDisplayName(country);
  const isRenamed = Boolean(country.customName && country.customName !== country.seed.name);
  const completedCount = (country.completedTreeNodes ?? []).filter((id) =>
    tree.nodes.some((n) => n.id === id)
  ).length;
  const alliesCount = getAllies(sim, countryId).length;
  const annexedCount = country.annexedCount ?? 0;

  const tier1 = tree.nodes.filter((n) => n.tier === 1);
  const tier2 = tree.nodes.filter((n) => n.tier === 2);
  const tier3 = tree.nodes.filter((n) => n.tier === 3);

  const evaluations = new Map(
    tree.nodes.map((node) => [node.id, evaluateTreeNode(sim, countryId, node)])
  );

  const rootCompleted = tier1.some((n) => evaluations.get(n.id)?.completed);
  const anyTier2Completed = tier2.some((n) => evaluations.get(n.id)?.completed);
  const activeEval = evaluations.get(activeNode.id)!;
  const activeRewards = formatRewardLine(activeNode);

  const renderNodeCard = (node: CountryTreeNode) => {
    const ev = evaluations.get(node.id)!;
    const selected = activeNode.id === node.id;
    const isRestoration = node.branch === 'restoration' || node.branch === 'legacy';
    const Icon = BRANCH_META[node.branch].icon;

    let borderStyle = 'border-slate-700/80 bg-[#0d1626] hover:border-slate-500';
    if (ev.completed) {
      borderStyle = isRestoration
        ? 'border-amber-400/80 bg-amber-950/35'
        : 'border-emerald-500/70 bg-emerald-950/30';
    } else if (ev.canUnlock) {
      borderStyle = isRestoration
        ? 'border-amber-400/90 bg-amber-950/25 shadow-[0_0_0_1px_rgba(251,191,36,0.28)]'
        : 'border-sky-400/80 bg-sky-950/25 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]';
    }

    const selectedRing = selected ? 'ring-1 ring-amber-300/90 border-amber-300/80' : '';

    return (
      <button
        key={node.id}
        type="button"
        onClick={() => setSelectedNodeId(node.id)}
        className={`w-full text-left rounded-lg border transition-colors ${
          compact ? 'p-2.5 min-h-[72px]' : 'p-3 min-h-[84px]'
        } ${borderStyle} ${selectedRing}`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon
              className={`w-3.5 h-3.5 shrink-0 ${
                ev.completed
                  ? isRestoration
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                  : ev.canUnlock
                    ? isRestoration
                      ? 'text-amber-300'
                      : 'text-sky-300'
                    : 'text-slate-500'
              }`}
            />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 truncate">
              {node.era}
            </span>
          </div>
          <span className="shrink-0">
            {ev.completed ? (
              <Check className={`w-3.5 h-3.5 ${isRestoration ? 'text-amber-300' : 'text-emerald-400'}`} />
            ) : !ev.parentMet ? (
              <Lock className="w-3.5 h-3.5 text-slate-600" />
            ) : ev.canUnlock ? (
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
            ) : null}
          </span>
        </div>

        <div
          className={`font-semibold leading-snug ${
            compact ? 'text-[12px]' : 'text-[13px]'
          } ${ev.completed ? 'text-white' : ev.parentMet ? 'text-slate-100' : 'text-slate-400'}`}
        >
          {node.title}
        </div>

        {node.reward.renameTo ? (
          <div className="mt-1 text-[10.5px] font-medium text-amber-300/95 truncate">
            → {node.reward.renameTo}
          </div>
        ) : (
          <div className="mt-0.5 text-[10.5px] text-slate-400 truncate">
            {node.subtitle}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={compact ? 'space-y-3' : 'grid grid-cols-1 lg:grid-cols-[1.2fr_0.95fr] gap-4'}>
      {/* Left / Main Branching Tree */}
      <div className="space-y-3">
        {/* Heritage Header */}
        <div className="rounded-lg border border-slate-700/80 bg-[#0d1626] p-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <PixelFlag country={country.seed} size={compact ? 'md' : 'lg'} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-100 truncate">{displayName}</h3>
                  {isRenamed && (
                    <span className="text-[11px] text-amber-300/90 font-mono">
                      (antes {country.seed.name})
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{tree.heritageTitle}</div>
              </div>
            </div>
            {onExpandModal && (
              <button
                type="button"
                onClick={onExpandModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-md border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-[11px] font-medium text-slate-200 whitespace-nowrap shrink-0"
                title="Abrir árbol genealógico en pantalla completa"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                Ampliar
              </button>
            )}
          </div>

          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
            {tree.heritageSummary}
          </p>

          {/* Live Campaign Deeds Strip */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-800/90 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Hitos</div>
              <div className="text-xs font-mono font-bold text-amber-300">
                {completedCount}/{tree.nodes.length}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Conquistas</div>
              <div className="text-xs font-mono font-bold text-rose-300">{annexedCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Alianzas</div>
              <div className="text-xs font-mono font-bold text-emerald-300">{alliesCount}</div>
            </div>
          </div>
        </div>

        {/* Visual Tree Diagram */}
        <div className="rounded-lg border border-slate-800 bg-[#080f1b] p-3">
          {/* Tier 1: Root */}
          <div className="max-w-[280px] mx-auto">
            {tier1.map((node) => renderNodeCard(node))}
          </div>

          {/* Connector Tier 1 -> Tier 2 */}
          <svg
            viewBox="0 0 200 26"
            className="w-full h-6 block overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 100 0 L 100 13 M 50 13 L 150 13 M 50 13 L 50 26 M 150 13 L 150 26"
              fill="none"
              stroke={rootCompleted ? '#10b981' : '#334155'}
              strokeWidth="1.75"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Tier 2: Economy & Military Branches */}
          <div className="grid grid-cols-2 gap-2.5">
            {tier2.map((node) => renderNodeCard(node))}
          </div>

          {/* Connector Tier 2 -> Tier 3 */}
          <svg
            viewBox="0 0 200 26"
            className="w-full h-6 block overflow-visible"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {tier3.length <= 1 ? (
              <path
                d="M 50 0 L 50 13 M 150 0 L 150 13 M 50 13 L 150 13 M 100 13 L 100 26"
                fill="none"
                stroke={anyTier2Completed ? '#f59e0b' : '#334155'}
                strokeWidth="1.75"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <path
                d="M 50 0 L 50 13 M 150 0 L 150 13 M 50 13 L 150 13 M 50 13 L 50 26 M 150 13 L 150 26"
                fill="none"
                stroke={anyTier2Completed ? '#f59e0b' : '#334155'}
                strokeWidth="1.75"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {/* Tier 3: Historical Restoration / Legacy */}
          <div
            className={
              tier3.length > 1
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
                : 'max-w-[320px] mx-auto'
            }
          >
            {tier3.map((node) => renderNodeCard(node))}
          </div>
        </div>
      </div>

      {/* Right / Bottom Node Inspector */}
      <div className="rounded-lg border border-slate-700/80 bg-[#0d1626] p-3.5 flex flex-col justify-between gap-3">
        <div className="space-y-3">
          {/* Inspector Header */}
          <div>
            <div className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400">
              {BRANCH_META[activeNode.branch].label} · {activeNode.era}
            </div>
            <h4 className="mt-1 text-base font-bold text-slate-100 leading-tight">
              {activeNode.title}
            </h4>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {activeNode.history}
            </p>
          </div>

          {/* Rewards */}
          <div className="rounded-md border border-slate-800 bg-[#09101d] p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Efectos al completar
            </div>
            <ul className="space-y-1">
              {activeRewards.map((line, i) => (
                <li
                  key={i}
                  className={`text-xs flex items-center gap-1.5 ${
                    line.startsWith('Renombra')
                      ? 'text-amber-300 font-semibold'
                      : 'text-emerald-300'
                  }`}
                >
                  {line.startsWith('Renombra') ? (
                    <Crown className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  )}
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements Checklist */}
          <div className="rounded-md border border-slate-800 bg-[#09101d] p-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Requisitos históricos
            </div>
            <div className="space-y-1.5">
              {!activeEval.parentMet && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                  <span>Completar un hito previo en la rama</span>
                </div>
              )}
              {activeEval.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {req.met || activeEval.completed ? (
                      <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                    )}
                    <span
                      className={
                        req.met || activeEval.completed
                          ? 'text-emerald-200 line-through decoration-emerald-500/60'
                          : 'text-slate-200'
                      }
                    >
                      {req.label}
                    </span>
                  </div>
                  {req.targetCountryId !== undefined && !req.met && !activeEval.completed && (
                    <button
                      type="button"
                      onClick={() => onFocusCountry(req.targetCountryId!)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[10.5px] text-sky-300 whitespace-nowrap shrink-0"
                    >
                      <Crosshair className="w-3 h-3" />
                      Ver
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {!isPlayerCountry ? (
            <div className="w-full py-2.5 px-3 rounded-md border border-slate-800 bg-slate-900/70 text-center text-xs text-slate-400">
              Modo consulta · Árbol histórico de {displayName}
            </div>
          ) : activeEval.completed ? (
            <div className="w-full py-2.5 px-3 rounded-md border border-emerald-600/50 bg-emerald-950/40 text-center text-xs font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" />
              Hito histórico completado
            </div>
          ) : (
            <button
              type="button"
              disabled={!activeEval.canUnlock}
              onClick={() => onUnlockNode(activeNode.id)}
              className={`w-full py-2.5 px-3 min-h-[44px] rounded-md text-xs font-bold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeEval.canUnlock
                  ? activeNode.reward.renameTo
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800/80 text-slate-500 border border-slate-700/70 cursor-not-allowed'
              }`}
            >
              {activeNode.reward.renameTo ? (
                <Crown className="w-4 h-4 shrink-0" />
              ) : (
                <GitBranch className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">
                {activeNode.reward.renameTo
                  ? `Proclamar ${activeNode.reward.renameTo} ($${activeNode.costMoney})`
                  : `Completar hito ($${activeNode.costMoney})`}
              </span>
            </button>
          )}
          {isPlayerCountry && !activeEval.completed && !activeEval.canUnlock && activeEval.reason && (
            <div className="mt-1.5 text-[11px] text-center text-slate-400">
              {activeEval.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface CountryTreeModalProps {
  sim: SimulationState;
  countryId: number;
  onClose: () => void;
  onUnlockNode: (nodeId: string) => void;
  onFocusCountry: (countryId: number) => void;
  onSwitchToPlayerTree: () => void;
}

export const CountryTreeModal: React.FC<CountryTreeModalProps> = ({
  sim,
  countryId,
  onClose,
  onUnlockNode,
  onFocusCountry,
  onSwitchToPlayerTree,
}) => {
  const country = sim.countries[countryId];
  if (!country) return null;
  const isOwn = countryId === sim.playerId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-700/90 bg-[#0b121e] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-[#0d1626]">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-100 truncate">
              Árbol Genealógico e Histórico · {getCountryDisplayName(country)}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isOwn && (
              <button
                type="button"
                onClick={onSwitchToPlayerTree}
                className="px-2.5 py-1.5 min-h-[36px] rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs text-slate-200 whitespace-nowrap"
              >
                Ver mi país
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 min-w-[36px] min-h-[36px] rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center"
              aria-label="Cerrar árbol genealógico"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5">
          <CountryTreeView
            sim={sim}
            countryId={countryId}
            onUnlockNode={onUnlockNode}
            onFocusCountry={(cid) => {
              onFocusCountry(cid);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
