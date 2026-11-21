import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Crown,
  GitFork,
  Landmark,
  Lock,
  Map as MapIcon,
  Shield,
  Sparkles,
  Swords,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  getCountryGenealogyTree,
  type FocusCategory,
  type FocusNode,
} from '../data/countryTrees';
import type { GameActionPayload, GameActionResult } from '../engine/gameActions';
import {
  evaluateFocusNodeStatus,
  getCountryName,
  getEmpireTargetProgress,
  type FocusNodeStatus,
  type SimulationState,
} from '../engine/gameSimulation';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface GenealogyTreeModalProps {
  sim: SimulationState;
  countryId: number;
  deviceMode: DeviceMode;
  initialSelectedNodeId?: FocusNode['id'];
  onClose: () => void;
  onExecuteAction: (action: GameActionPayload) => Promise<GameActionResult> | GameActionResult;
  onSwitchCountry?: (id: number) => void;
  onPreviewEmpireTerritory: (
    ownerCountryId: number,
    empireName: string,
    targetCountryIds: number[]
  ) => void;
}

const CATEGORY_LABELS: Record<FocusCategory, string> = {
  origin: 'Origen Histórico',
  economy: 'Rama Económica',
  military: 'Rama Militar',
  diplomacy: 'Integración',
  restoration: 'Restauración Histórica',
};

function getCategoryIcon(category: FocusCategory) {
  switch (category) {
    case 'origin':
      return Landmark;
    case 'economy':
      return TrendingUp;
    case 'military':
      return Swords;
    case 'diplomacy':
      return Shield;
    case 'restoration':
      return Crown;
  }
}

function summarizeEffects(node: FocusNode): string[] {
  const e = node.effects;
  const items: string[] = [];
  if (e.newName) items.push(`Cambia el nombre del país a «${e.newName}»`);
  if (e.incomeBonus) items.push(`+$${e.incomeBonus}/seg de ingreso permanente`);
  if (e.moneyBonus) items.push(`+$${e.moneyBonus.toLocaleString('es-ES')} al tesoro`);
  if (e.armyBonus) items.push(`+${e.armyBonus.toLocaleString('es-ES')} soldados`);
  if (e.armyCapBonus) items.push(`+${e.armyCapBonus.toLocaleString('es-ES')} capacidad militar`);
  if (e.defenseBonusPct) items.push(`+${e.defenseBonusPct}% defensa nacional`);
  if (e.relationsContinentDelta) {
    items.push(`+${e.relationsContinentDelta} relaciones en su continente`);
  }
  return items;
}

function compactEffectPreview(node: FocusNode): string {
  const e = node.effects;
  if (e.newName) return `Renombra a: ${e.newName}`;
  const parts: string[] = [];
  if (e.incomeBonus) parts.push(`+$${e.incomeBonus}/s`);
  if (e.armyBonus) parts.push(`+${e.armyBonus} sold.`);
  if (e.armyCapBonus) parts.push(`+${e.armyCapBonus} cap.`);
  if (e.defenseBonusPct) parts.push(`+${e.defenseBonusPct}% def.`);
  if (e.moneyBonus) parts.push(`+$${e.moneyBonus}`);
  return parts.slice(0, 2).join(' · ');
}

export function GenealogyTreeModal({
  sim,
  countryId,
  deviceMode,
  initialSelectedNodeId,
  onClose,
  onExecuteAction,
  onSwitchCountry,
  onPreviewEmpireTerritory,
}: GenealogyTreeModalProps) {
  const country = sim.countries[countryId];
  const player = sim.countries[sim.playerId];
  const isOwnCountry = countryId === sim.playerId;
  const isMobile = deviceMode === 'mobile';

  const tree = useMemo(
    () => (country ? getCountryGenealogyTree(country.seed) : null),
    [country]
  );

  const [selectedNodeId, setSelectedNodeId] = useState<FocusNode['id']>(
    initialSelectedNodeId ?? 'root'
  );
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  // When switching country, automatically highlight the next actionable node (or requested initial node)
  useEffect(() => {
    if (!tree || !country) return;
    setFeedback(null);
    if (initialSelectedNodeId) {
      setSelectedNodeId(initialSelectedNodeId);
      return;
    }
    const statuses = tree.nodes.map((n) => ({
      node: n,
      status: evaluateFocusNodeStatus(sim, countryId, n),
    }));
    const nextReady = statuses.find((s) => s.status.canComplete);
    if (nextReady) {
      setSelectedNodeId(nextReady.node.id);
      return;
    }
    const nextUnlocked = statuses.find((s) => !s.status.completed && s.status.parentsMet);
    if (nextUnlocked) {
      setSelectedNodeId(nextUnlocked.node.id);
      return;
    }
    const lastCompleted = [...statuses].reverse().find((s) => s.status.completed);
    setSelectedNodeId(lastCompleted ? lastCompleted.node.id : 'root');
    // Only reset selection when changing the inspected country
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryId, initialSelectedNodeId]);

  if (!country || !tree) return null;

  const currentName = getCountryName(country);
  const isRenamed = Boolean(country.customName && country.customName !== country.seed.name);
  const completedCount = (country.completedFocusIds ?? []).length;

  const statusMap = new Map<FocusNode['id'], FocusNodeStatus>();
  for (const node of tree.nodes) {
    statusMap.set(node.id, evaluateFocusNodeStatus(sim, countryId, node));
  }

  const nodeById = (id: FocusNode['id']) => tree.nodes.find((n) => n.id === id)!;
  const rootNode = nodeById('root');
  const eco1Node = nodeById('eco1');
  const mil1Node = nodeById('mil1');
  const eco2Node = nodeById('eco2');
  const mil2Node = nodeById('mil2');
  const restoreNode = nodeById('restore');

  const selectedNode = nodeById(selectedNodeId) ?? rootNode;
  const selectedStatus = statusMap.get(selectedNode.id)!;
  const restoreCompleted = statusMap.get('restore')?.completed ?? false;
  const empireTargets = getEmpireTargetProgress(
    sim,
    countryId,
    restoreNode.requirements.historicalTargetIso2 ?? []
  );
  const empireTargetIds = empireTargets.map((t) => t.countryId);
  const empireConqueredCount = empireTargets.filter((t) => t.conquered).length;

  const triggerEmpireMapPreview = () => {
    if (empireTargetIds.length === 0) return;
    onPreviewEmpireTerritory(
      countryId,
      restoreNode.effects.newName ?? tree.restoredName,
      empireTargetIds
    );
  };

  const handleCompleteSelected = async () => {
    if (!isOwnCountry || busy) return;
    setBusy(true);
    try {
      const res = await onExecuteAction({ type: 'complete_focus', nodeId: selectedNode.id });
      setFeedback({ text: res.message, ok: res.ok });
    } finally {
      setBusy(false);
    }
  };

  const edgeColor = (fromId: FocusNode['id'], toId: FocusNode['id']) => {
    const fromDone = statusMap.get(fromId)?.completed ?? false;
    const toStatus = statusMap.get(toId);
    if (toId === 'restore') {
      if (toStatus?.completed) return '#F59E0B';
      if (toStatus?.canComplete) return '#F59E0B';
      return '#475569';
    }
    if (fromDone && toStatus?.completed) return '#10B981';
    if (fromDone && toStatus?.canComplete) return '#F59E0B';
    if (fromDone) return '#64748B';
    return '#1E293B';
  };

  const renderNodeCard = (node: FocusNode) => {
    const status = statusMap.get(node.id)!;
    const isSelected = selectedNode.id === node.id;
    const isRestore = node.id === 'restore';
    const Icon = getCategoryIcon(node.category);

    let borderCls = 'border-slate-800 bg-[#0B121E]/95 hover:border-slate-600';
    let stateLabel = 'Bloqueado';
    let stateColor = 'text-slate-500';
    let StateIcon = Lock;

    if (status.completed) {
      borderCls = isRestore
        ? 'border-amber-400/80 bg-amber-950/25 hover:border-amber-300'
        : 'border-emerald-600/70 bg-emerald-950/25 hover:border-emerald-500';
      stateLabel = isRestore ? 'Proclamado' : 'Completado';
      stateColor = isRestore ? 'text-amber-300' : 'text-emerald-400';
      StateIcon = CheckCircle2;
    } else if (status.canComplete) {
      borderCls = 'border-amber-500/80 bg-[#142033] hover:border-amber-400';
      stateLabel = isRestore ? '¡Listo!' : 'Disponible';
      stateColor = 'text-amber-300';
      StateIcon = Sparkles;
    } else if (isRestore) {
      borderCls = 'border-amber-500/45 bg-[#121D30] hover:border-amber-400';
      stateLabel = `Ver mapa (10s)`;
      stateColor = 'text-amber-300';
      StateIcon = MapIcon;
    } else if (status.parentsMet) {
      borderCls = 'border-slate-700 bg-[#0E1829] hover:border-slate-500';
      stateLabel = 'En progreso';
      stateColor = 'text-sky-300';
      StateIcon = Circle;
    }

    return (
      <button
        key={node.id}
        type="button"
        onClick={() => {
          setFeedback(null);
          if (isRestore && !status.completed && !status.canComplete && empireTargetIds.length > 0) {
            triggerEmpireMapPreview();
            return;
          }
          setSelectedNodeId(node.id);
        }}
        className={`w-full text-left border transition-colors cursor-pointer px-3 py-2.5 ${borderCls} ${
          isSelected ? 'ring-1 ring-amber-400 bg-[#16243A]' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num">
          <span className="text-slate-400 truncate">{node.era}</span>
          <span className={`flex items-center gap-1 shrink-0 font-semibold ${stateColor}`}>
            <StateIcon className="w-3 h-3 shrink-0" />
            <span>{stateLabel}</span>
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5 min-w-0">
          <Icon
            className={`w-3.5 h-3.5 shrink-0 ${
              isRestore
                ? 'text-amber-400'
                : node.category === 'military'
                  ? 'text-rose-400'
                  : node.category === 'economy'
                    ? 'text-emerald-400'
                    : 'text-sky-400'
            }`}
          />
          <span
            className={`text-xs font-bold leading-snug truncate ${
              isRestore ? 'text-amber-200' : 'text-slate-100'
            }`}
          >
            {node.title}
          </span>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-mono-num">
          <span className={isRestore ? 'text-amber-300 font-semibold truncate' : 'text-slate-400 truncate'}>
            {compactEffectPreview(node)}
          </span>
          {!status.completed && (
            <span className={isRestore ? 'text-emerald-300 shrink-0 font-semibold' : 'text-slate-300 shrink-0'}>
              {isRestore
                ? `Invasión ${empireConqueredCount}/${empireTargets.length}`
                : `$${node.requirements.moneyCost.toLocaleString('es-ES')}`}
            </span>
          )}
        </div>
        {isRestore && !status.completed && !status.canComplete && (
          <div className="mt-1 text-[10px] text-amber-200/80">
            Clic para ver en el mapa qué territorio invadir (10s) · Sin costo en dinero
          </div>
        )}
      </button>
    );
  };

  const SelectedIcon = getCategoryIcon(selectedNode.category);
  const effectList = summarizeEffects(selectedNode);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] bg-[#111B2B] border border-slate-700 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-3.5 sm:px-5 py-3 bg-[#0E1726] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PixelFlag country={country.seed} size={isMobile ? 'md' : 'lg'} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate">
                  Árbol Genealógico · {currentName}
                </h2>
                {isRenamed && (
                  <span className="text-[11px] text-amber-300/90 font-mono-num">
                    (Antes: {country.seed.name})
                  </span>
                )}
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 truncate">
                {tree.subtitle} ·{' '}
                <span className="font-mono-num text-slate-300">
                  {completedCount}/{tree.nodes.length} hitos
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isOwnCountry && onSwitchCountry && (
              <button
                type="button"
                onClick={() => onSwitchCountry(sim.playerId)}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <GitFork className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Ver mi país</span>
                <span className="sm:hidden">Mi país</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar árbol genealógico"
              title="Cerrar (Esc)"
              className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Historical Lineage Strip (Unboxed Typography) */}
        <div className="px-3.5 sm:px-5 py-2 bg-[#0B121E] border-b border-slate-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[11px] shrink-0">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] shrink-0">
            Linaje:
          </span>
          {tree.ancestors.map((ancestor, idx) => (
            <span key={`${ancestor}-${idx}`} className="flex items-center gap-2 text-slate-300">
              <span>{ancestor}</span>
              <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
            </span>
          ))}
          <span
            className={`font-bold flex items-center gap-1 ${
              restoreCompleted ? 'text-amber-300' : 'text-amber-400/75'
            }`}
          >
            <Crown className="w-3 h-3 shrink-0" />
            <span>{tree.restoredName}</span>
            {!restoreCompleted && (
              <span className="text-[10px] font-normal text-slate-500">(Meta)</span>
            )}
          </span>
        </div>

        {/* Main Content: Tree Diagram + Inspector */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          {/* Left: Interactive Tree Diagram */}
          <div className="p-3.5 sm:p-5 lg:overflow-y-auto bg-[#0D1625] border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="max-w-xl mx-auto">
              {/* Tier 0: Root */}
              <div className="max-w-[300px] mx-auto">{renderNodeCard(rootNode)}</div>

              {/* SVG Connectors: Root -> Eco1 & Mil1 */}
              <svg
                viewBox="0 0 400 32"
                className="w-full h-8 block"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M 200 0 L 200 14 L 100 14 L 100 32"
                  fill="none"
                  stroke={edgeColor('root', 'eco1')}
                  strokeWidth="2"
                />
                <path
                  d="M 200 0 L 200 14 L 300 14 L 300 32"
                  fill="none"
                  stroke={edgeColor('root', 'mil1')}
                  strokeWidth="2"
                />
              </svg>

              {/* Branch Headers */}
              <div className="grid grid-cols-2 gap-3 mb-1.5 text-[10px] uppercase tracking-wider font-semibold">
                <div className="text-emerald-400/80 text-center">Desarrollo y Diplomacia</div>
                <div className="text-rose-400/80 text-center">Fuerza y Doctrina Militar</div>
              </div>

              {/* Tier 1: Eco1 & Mil1 */}
              <div className="grid grid-cols-2 gap-3">
                {renderNodeCard(eco1Node)}
                {renderNodeCard(mil1Node)}
              </div>

              {/* SVG Connectors: Eco1 -> Eco2, Mil1 -> Mil2 */}
              <svg
                viewBox="0 0 400 28"
                className="w-full h-7 block"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <line
                  x1="100"
                  y1="0"
                  x2="100"
                  y2="28"
                  stroke={edgeColor('eco1', 'eco2')}
                  strokeWidth="2"
                />
                <line
                  x1="300"
                  y1="0"
                  x2="300"
                  y2="28"
                  stroke={edgeColor('mil1', 'mil2')}
                  strokeWidth="2"
                />
              </svg>

              {/* Tier 2: Eco2 & Mil2 */}
              <div className="grid grid-cols-2 gap-3">
                {renderNodeCard(eco2Node)}
                {renderNodeCard(mil2Node)}
              </div>

              {/* SVG Connectors: Eco2 & Mil2 -> Restore */}
              <div className="relative">
                <svg
                  viewBox="0 0 400 36"
                  className="w-full h-9 block"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 100 0 L 100 18 L 200 18 L 200 36"
                    fill="none"
                    stroke={edgeColor('eco2', 'restore')}
                    strokeWidth="2"
                  />
                  <path
                    d="M 300 0 L 300 18 L 200 18 L 200 36"
                    fill="none"
                    stroke={edgeColor('mil2', 'restore')}
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute inset-x-0 top-1 flex justify-center pointer-events-none">
                  <span className="px-1.5 bg-[#0D1625] text-[10px] text-amber-300/90 font-mono-num">
                    Se forma invadiendo su territorio · Sin costo en dinero
                  </span>
                </div>
              </div>

              {/* Tier 3: Historical Restoration */}
              <div className="max-w-[360px] mx-auto">{renderNodeCard(restoreNode)}</div>
            </div>
          </div>

          {/* Right: Detail & Action Inspector */}
          <div className="p-4 sm:p-5 lg:overflow-y-auto bg-[#111B2B] flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Node Header */}
              <div className="space-y-1 border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num">
                  <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <SelectedIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{CATEGORY_LABELS[selectedNode.category]}</span>
                  </span>
                  <span className="text-slate-400">{selectedNode.era}</span>
                </div>
                <h3 className="text-base font-extrabold text-white leading-snug">
                  {selectedNode.title}
                </h3>
              </div>

              {/* Historical Fact */}
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Legado histórico
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {selectedNode.historicalFact}
                </p>
              </div>

              {/* Effects */}
              <div className="space-y-1.5 bg-[#0B121E] border border-slate-800 p-3">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-amber-300">
                  Recompensas al completar
                </div>
                <ul className="space-y-1 text-xs text-slate-200">
                  {effectList.map((eff, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className={i === 0 && selectedNode.effects.newName ? 'font-bold text-amber-200' : ''}>
                        {eff}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements Checklist */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Requisitos
                </div>
                <div className="space-y-1.5 bg-[#0B121E] border border-slate-800 p-3">
                  {selectedNode.parents.length > 0 && (
                    <div className="flex items-start gap-2 text-xs">
                      {selectedStatus.parentsMet ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={
                          selectedStatus.parentsMet ? 'text-emerald-300' : 'text-slate-400'
                        }
                      >
                        {selectedNode.requireAnyParent
                          ? `Completar «${nodeById(selectedNode.parents[0]).title}» o «${nodeById(selectedNode.parents[1]).title}»`
                          : `Completar «${nodeById(selectedNode.parents[0]).title}»`}
                      </span>
                    </div>
                  )}

                  {selectedStatus.checks.map((ch, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs font-mono-num">
                      {ch.met ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <span className={ch.met ? 'text-emerald-300' : 'text-slate-300'}>
                        {ch.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {feedback && (
                <div
                  className={`p-2.5 text-xs border ${
                    feedback.ok
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                      : 'bg-red-950/50 border-red-700/60 text-red-200'
                  }`}
                >
                  {feedback.text}
                </div>
              )}
            </div>

            {/* Bottom Action CTA */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              {selectedNode.id === 'restore' && empireTargetIds.length > 0 && (
                <button
                  type="button"
                  onClick={triggerEmpireMapPreview}
                  className={`w-full px-3 bg-[#0B121E] hover:bg-slate-800 border border-amber-500/60 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    isMobile ? 'min-h-[42px] py-2.5' : 'py-2'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Ver territorio a invadir en el mapa (10s)</span>
                </button>
              )}

              {isOwnCountry ? (
                selectedStatus.completed ? (
                  <div className="w-full py-2.5 px-3 bg-emerald-950/50 border border-emerald-700/60 text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {selectedNode.effects.newName
                        ? `${selectedNode.effects.newName} proclamada`
                        : 'Hito histórico completado'}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !selectedStatus.canComplete}
                    onClick={() => void handleCompleteSelected()}
                    className={`w-full px-4 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                      isMobile ? 'min-h-[44px] py-3' : 'py-2.5'
                    } ${
                      selectedNode.effects.newName
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {selectedNode.effects.newName ? (
                      <Crown className="w-4 h-4 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {selectedNode.effects.newName
                        ? `Proclamar ${selectedNode.effects.newName}`
                        : 'Completar hito histórico'}
                    </span>
                    <span className="font-mono-num shrink-0">
                      {selectedNode.requirements.moneyCost > 0
                        ? `($${selectedNode.requirements.moneyCost.toLocaleString('es-ES')})`
                        : '· Gratis'}
                    </span>
                  </button>
                )
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400 leading-snug">
                    Modo consulta: estás explorando el árbol histórico de{' '}
                    <span className="text-slate-200 font-semibold">{currentName}</span>.
                  </div>
                  {onSwitchCountry && player && (
                    <button
                      type="button"
                      onClick={() => onSwitchCountry(sim.playerId)}
                      className={`w-full px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                        isMobile ? 'min-h-[44px] py-2.5' : 'py-2'
                      }`}
                    >
                      <GitFork className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        Abrir mi árbol ({getCountryName(player)})
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
