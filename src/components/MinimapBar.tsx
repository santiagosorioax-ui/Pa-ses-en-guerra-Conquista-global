import { useEffect, useRef } from 'react';
import { Globe, Minus, Plus, Users } from 'lucide-react';
import { MAP_H, MAP_W } from '../engine/mapRasterizer';
import { type MapMode, type SimulationState } from '../engine/gameSimulation';
import type { DeviceMode } from './DeviceModeScreen';
import type { CameraView } from './WorldMapCanvas';

interface MinimapBarProps {
  deviceMode: DeviceMode;
  simRef: React.MutableRefObject<SimulationState>;
  renderTick: number;
  mapMode: MapMode;
  onChangeMapMode: (mode: MapMode) => void;
  camera: CameraView;
  viewportSize: { w: number; h: number };
  onJumpTo: (x: number, y: number, zoom?: number) => void;
}

const MINI_W = 228;
const MINI_H = 88;

export function MinimapBar({
  deviceMode,
  simRef,
  renderTick,
  mapMode,
  onChangeMapMode,
  camera,
  viewportSize,
  onJumpTo,
}: MinimapBarProps) {
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = miniCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sim = simRef.current;
    const { ownerGrid, countries } = sim;

    ctx.fillStyle = '#091423';
    ctx.fillRect(0, 0, MINI_W, MINI_H);

    const stepX = MAP_W / MINI_W;
    const stepY = MAP_H / MINI_H;

    for (let py = 0; py < MINI_H; py++) {
      const sy = Math.floor(py * stepY);
      for (let px = 0; px < MINI_W; px++) {
        const sx = Math.floor(px * stepX);
        const id = ownerGrid[sy * MAP_W + sx];
        if (id >= 0) {
          if (id === sim.playerId) {
            ctx.fillStyle = '#F59E0B';
          } else {
            const [r, g, b] = countries[id].color;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          }
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }

    const rx = ((camera.x - viewportSize.w * 0.5) / MAP_W) * MINI_W;
    const ry = ((camera.y - viewportSize.h * 0.5) / MAP_H) * MINI_H;
    const rw = (viewportSize.w / MAP_W) * MINI_W;
    const rh = (viewportSize.h / MAP_H) * MINI_H;

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0.5, rx),
      Math.max(0.5, ry),
      Math.min(MINI_W - 1, rw),
      Math.min(MINI_H - 1, rh)
    );
  }, [simRef, renderTick, camera, viewportSize]);

  const handleMiniClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const my = ((e.clientY - rect.top) / rect.height) * MAP_H;
    onJumpTo(mx, my);
  };

  const modes: Array<{ id: MapMode; label: string; key: string; icon: typeof Globe }> = [
    { id: 'political', label: 'Político', key: '1', icon: Globe },
    { id: 'diplomatic', label: 'Diplomático', key: '2', icon: Users },
  ];

  if (deviceMode === 'mobile') {
    return (
      <div className="pointer-events-auto flex items-center gap-1.5 bg-[#111B2B]/92 border border-slate-700/90 p-1.5 shadow-xl">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mapMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeMapMode(m.id)}
              className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium border cursor-pointer ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => onJumpTo(camera.x, camera.y, Math.min(14, camera.zoom * 1.3))}
          className="w-8 h-8 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
          aria-label="Acercar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onJumpTo(camera.x, camera.y, Math.max(0.55, camera.zoom / 1.3))}
          className="w-8 h-8 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-200 cursor-pointer"
          aria-label="Alejar"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onJumpTo(MAP_W / 2, MAP_H / 2, 1.0)}
          className="h-8 px-2 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono-num cursor-pointer"
        >
          1:1
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex flex-col gap-2 bg-[#111B2B]/95 border border-slate-700/90 p-2.5 shadow-2xl">
      <div className="flex items-center gap-1">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mapMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChangeMapMode(m.id)}
              title={`${m.label} (Tecla ${m.key})`}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 border cursor-pointer ${
                active
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-end gap-2">
        <canvas
          ref={miniCanvasRef}
          width={MINI_W}
          height={MINI_H}
          onClick={handleMiniClick}
          className="border border-slate-700 cursor-pointer pixelated"
          title="Haz clic para centrar cámara"
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onJumpTo(camera.x, camera.y, Math.min(14, camera.zoom * 1.3))}
            className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer"
            title="Acercar (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onJumpTo(camera.x, camera.y, Math.max(0.55, camera.zoom / 1.3))}
            className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 cursor-pointer"
            title="Alejar (-)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onJumpTo(MAP_W / 2, MAP_H / 2, 1.0)}
            className="w-7 h-7 flex items-center justify-center bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-[10px] font-mono-num cursor-pointer"
            title="Vista global"
          >
            1:1
          </button>
        </div>
      </div>
    </div>
  );
}
