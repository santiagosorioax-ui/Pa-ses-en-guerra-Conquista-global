import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Coins, Globe, Swords } from 'lucide-react';
import {
  getCountryDisplayName,
  type CountryState,
  type PlayerHistoryPoint,
} from '../engine/gameSimulation';

interface StatsChartsPanelProps {
  player: CountryState;
  history: PlayerHistoryPoint[];
}

function formatCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

export function StatsChartsPanel({ player, history }: StatsChartsPanelProps) {
  const chartData = history.map((pt) => ({ ...pt }));
  const first = chartData[0];
  const latestKm2 = player.pixels * 100;
  const startKm2 = first ? first.km2 : player.initialPixels * 100;
  const km2Diff = latestKm2 - startKm2;
  const armyDiff = Math.round(player.army) - (first ? first.army : Math.round(player.army));

  const tooltipStyle = {
    backgroundColor: '#0B121E',
    border: '1px solid #334155',
    fontSize: '11px',
    color: '#E2E8F0',
    padding: '6px 8px',
  };

  return (
    <div className="space-y-4">
      <div className="text-[11px] text-slate-400">
        Evolución en tiempo real de{' '}
        <span className="text-amber-300 font-semibold">{getCountryDisplayName(player)}</span> (
        {history.length} muestras).
      </div>

      {/* 1. Crecimiento Económico (Dinero e Ingreso/seg) */}
      <div className="bg-[#0B121E] border border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Crecimiento Económico</span>
          </div>
          <div className="font-mono-num text-[11px] text-amber-300">
            ${Math.round(player.money).toLocaleString('es-ES')} ·{' '}
            <span className={player.netIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {player.netIncome >= 0 ? '+' : ''}
              {Math.round(player.netIncome).toLocaleString('es-ES')}/seg
            </span>
          </div>
        </div>

        <div className="h-[135px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={22}
              />
              <YAxis
                yAxisId="money"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
              />
              <YAxis
                yAxisId="income"
                orientation="right"
                hide
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_, payload) => {
                  const pt = payload?.[0]?.payload as PlayerHistoryPoint | undefined;
                  return pt ? `${pt.label} · ${pt.dateLabel}` : '';
                }}
              />
              <Line
                yAxisId="money"
                type="monotone"
                dataKey="money"
                name="Dinero ($)"
                stroke="#FBBF24"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="income"
                type="monotone"
                dataKey="netIncome"
                name="Ingreso ($/seg)"
                stroke="#34D399"
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono-num">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Dinero ($)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Ingreso ($/seg)
          </span>
        </div>
      </div>

      {/* 2. Poder Militar */}
      <div className="bg-[#0B121E] border border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Poder Militar</span>
          </div>
          <div className="font-mono-num text-[11px] text-rose-300">
            {Math.round(player.army).toLocaleString('es-ES')} sold.{' '}
            <span className={armyDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              ({armyDiff >= 0 ? '+' : ''}
              {armyDiff.toLocaleString('es-ES')})
            </span>
          </div>
        </div>

        <div className="h-[130px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={22}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(_, payload) => {
                  const pt = payload?.[0]?.payload as PlayerHistoryPoint | undefined;
                  return pt ? `${pt.label} · ${pt.dateLabel}` : '';
                }}
              />
              <Line
                type="monotone"
                dataKey="army"
                name="Ejército (soldados)"
                stroke="#FB7185"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Desarrollo Territorial */}
      <div className="bg-[#0B121E] border border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-100">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Desarrollo Territorial</span>
          </div>
          <div className="font-mono-num text-[11px] text-sky-300">
            {latestKm2.toLocaleString('es-ES')} km²{' '}
            <span className={km2Diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              ({km2Diff >= 0 ? '+' : ''}{km2Diff.toLocaleString('es-ES')})
            </span>
          </div>
        </div>

        <div className="h-[130px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748B', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={22}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompact}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val) => [`${Number(val).toLocaleString('es-ES')} km²`, 'Territorio']}
                labelFormatter={(_, payload) => {
                  const pt = payload?.[0]?.payload as PlayerHistoryPoint | undefined;
                  return pt ? `${pt.label} · ${pt.dateLabel}` : '';
                }}
              />
              <Line
                type="monotone"
                dataKey="km2"
                name="Territorio (km²)"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
