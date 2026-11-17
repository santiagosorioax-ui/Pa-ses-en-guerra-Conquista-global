import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  TREATY_ALLIANCE,
  TREATY_WAR,
  hasTreaty,
  type SimulationState,
} from '../engine/gameSimulation';
import { PixelFlag } from './PixelFlag';

interface CountrySearchModalProps {
  sim: SimulationState;
  open: boolean;
  onClose: () => void;
  onPickCountry: (id: number) => void;
}

export function CountrySearchModal({
  sim,
  open,
  onClose,
  onPickCountry,
}: CountrySearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const matches = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    return sim.countries
      .filter((c) => {
        if (!q) return true;
        return (
          c.seed.name.toLowerCase().includes(q) ||
          c.seed.capital.toLowerCase().includes(q) ||
          c.seed.continent.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.alive) - Number(a.alive) || b.pixels - a.pixels)
      .slice(0, 60);
  }, [open, query, sim.countries]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 flex items-start justify-center pt-10 sm:pt-20 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111B2B] border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && matches.length > 0) {
                onPickCountry(matches[0].id);
                onClose();
              }
            }}
            placeholder="Buscar entre los 195 países o capitales..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] sm:max-h-96 overflow-y-auto divide-y divide-slate-800/70">
          {matches.map((c) => {
            const war = hasTreaty(sim, sim.playerId, c.id, TREATY_WAR);
            const ally = hasTreaty(sim, sim.playerId, c.id, TREATY_ALLIANCE);
            return (
              <button
                key={c.id}
                onClick={() => {
                  onPickCountry(c.id);
                  onClose();
                }}
                className="w-full px-3.5 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between hover:bg-slate-800/70 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PixelFlag country={c.seed} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {c.seed.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {c.seed.capital} · {c.seed.continent}
                    </div>
                  </div>
                </div>
                <div className="font-mono-num text-[11px] text-right shrink-0 ml-2">
                  {!c.alive ? (
                    <span className="text-slate-500">Anexado</span>
                  ) : (
                    <>
                      <span className="text-amber-300">${Math.round(c.money)}</span>
                      <span className="text-slate-500"> · </span>
                      <span className="text-rose-300">Ej. {Math.round(c.army)}</span>
                      {war && <span className="text-red-400 ml-1.5">· Guerra</span>}
                      {ally && <span className="text-sky-400 ml-1.5">· Aliado</span>}
                    </>
                  )}
                </div>
              </button>
            );
          })}
          {matches.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">
              No se encontraron países con esa búsqueda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
