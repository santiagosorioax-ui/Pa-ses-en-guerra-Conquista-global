import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Search, Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENTS_100,
  ACHIEVEMENT_CATEGORIES,
  getAchievementProgress,
  type AchievementCategory,
  type AchievementProfile,
} from '../data/achievements';
import type { SimulationState } from '../engine/gameSimulation';

interface AchievementsModalProps {
  profile: AchievementProfile;
  sim: SimulationState | null;
  onClose: () => void;
}

type StatusFilter = 'all' | 'unlocked' | 'locked';

const CATEGORY_LABEL_MAP = new Map<AchievementCategory, string>(
  ACHIEVEMENT_CATEGORIES.map((c) => [c.id, c.label])
);

export function AchievementsModal({ profile, sim, onClose }: AchievementsModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | AchievementCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const totalCount = ACHIEVEMENTS_100.length;
  const unlockedCount = useMemo(
    () => ACHIEVEMENTS_100.filter((a) => Boolean(profile.unlocked[a.id])).length,
    [profile.unlocked]
  );
  const overallPct = Math.round((unlockedCount / totalCount) * 100);

  const categoryCounts = useMemo(() => {
    const map = new Map<AchievementCategory, { unlocked: number; total: number }>();
    for (const c of ACHIEVEMENT_CATEGORIES) {
      map.set(c.id, { unlocked: 0, total: 0 });
    }
    for (const a of ACHIEVEMENTS_100) {
      const entry = map.get(a.category)!;
      entry.total++;
      if (profile.unlocked[a.id]) entry.unlocked++;
    }
    return map;
  }, [profile.unlocked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ACHIEVEMENTS_100.filter((a) => {
      const isDone = Boolean(profile.unlocked[a.id]);
      if (category !== 'all' && a.category !== category) return false;
      if (statusFilter === 'unlocked' && !isDone) return false;
      if (statusFilter === 'locked' && isDone) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (CATEGORY_LABEL_MAP.get(a.category) ?? '').toLowerCase().includes(q)
      );
    });
  }, [search, category, statusFilter, profile.unlocked]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-[#111B2B] border border-slate-700 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#0E1726] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                  Logros de Países en Guerra
                </h2>
                <span className="text-xs font-mono-num text-amber-300 font-bold">
                  {unlockedCount}/{totalCount} ({overallPct}%)
                </span>
              </div>
              <div className="mt-1.5 w-48 sm:w-64 h-1.5 bg-[#0B121E] border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar logros"
            title="Cerrar (Esc)"
            className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="px-4 sm:px-5 py-3 bg-[#0B121E] border-b border-slate-800 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar entre los 100 logros..."
                className="w-full bg-[#111B2B] border border-slate-700 pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center border border-slate-800 bg-[#111B2B] shrink-0">
              {(
                [
                  { id: 'all', label: `Todos (${totalCount})` },
                  { id: 'unlocked', label: `Completados (${unlockedCount})` },
                  { id: 'locked', label: `Pendientes (${totalCount - unlockedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-2 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    statusFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 10 Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={`px-2.5 py-1 text-[11px] border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                category === 'all'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                  : 'bg-[#111B2B] border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({unlockedCount}/{totalCount})
            </button>
            {ACHIEVEMENT_CATEGORIES.map((cat) => {
              const counts = categoryCounts.get(cat.id)!;
              const active = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`px-2.5 py-1 text-[11px] border whitespace-nowrap shrink-0 cursor-pointer font-mono-num transition-colors ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                      : 'bg-[#111B2B] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-sans">{cat.label}</span> {counts.unlocked}/{counts.total}
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievements List Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-[#0D1625]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No se encontraron logros con ese filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filtered.map((ach) => {
                const unlockedAt = profile.unlocked[ach.id];
                const isDone = Boolean(unlockedAt);
                const prog = getAchievementProgress(ach, profile, sim);
                const pct =
                  prog.target > 0
                    ? Math.min(100, Math.round((prog.current / prog.target) * 100))
                    : 0;
                const catLabel = CATEGORY_LABEL_MAP.get(ach.category) ?? ach.category;

                return (
                  <div
                    key={ach.id}
                    className={`p-3 border flex flex-col justify-between gap-2 ${
                      isDone
                        ? 'bg-emerald-950/20 border-emerald-700/60'
                        : 'bg-[#0B121E] border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono-num">
                        <span className="text-slate-400">
                          #{String(ach.number).padStart(2, '0')} · {catLabel}
                        </span>
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            isDone ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Desbloqueado</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div
                        className={`text-xs font-bold leading-snug ${
                          isDone ? 'text-amber-200' : 'text-slate-100'
                        }`}
                      >
                        {ach.title}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {ach.description}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono-num">
                        <span className={isDone ? 'text-emerald-300' : 'text-slate-400'}>
                          {prog.current.toLocaleString('es-ES')} / {prog.target.toLocaleString('es-ES')}
                        </span>
                        <span className={isDone ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-slate-900 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            isDone ? 'bg-emerald-400' : 'bg-amber-500/80'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
