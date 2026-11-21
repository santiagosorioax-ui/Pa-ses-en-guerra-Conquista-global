import { useEffect, useRef, useState } from 'react';
import { MAP_H, MAP_W } from '../engine/mapRasterizer';
import {
  DEFENSE_RADIUS,
  NUKE_FALLOUT_DAYS,
  NUKE_RADIUS,
  TREATY_ALLIANCE,
  TREATY_WAR,
  getCountryName,
  getRelation,
  hasTreaty,
  type MapMode,
  type SimulationState,
} from '../engine/gameSimulation';
import { PixelMapRenderer } from '../engine/pixelRenderer';
import { soundEngine } from '../engine/soundEngine';
import { PixelFlag } from './PixelFlag';

export interface CameraView {
  x: number; // map pixel center X
  y: number; // map pixel center Y
  zoom: number; // 1 = fit width
}

interface WorldMapCanvasProps {
  simRef: React.MutableRefObject<SimulationState>;
  renderTick: number;
  mapMode: MapMode;
  selectedId: number | null;
  onSelectCountry: (id: number | null) => void;
  focusRequest: { x: number; y: number; zoom?: number; nonce: number } | null;
  onCameraChange?: (cam: CameraView, viewportW: number, viewportH: number) => void;
  placingDefense: boolean;
  onPlaceDefense: (mx: number, my: number) => void;
  onCancelPlaceDefense: () => void;
  launchingNuke: boolean;
  onLaunchNuke: (mx: number, my: number) => void;
  onCancelLaunchNuke: () => void;
}

export function WorldMapCanvas({
  simRef,
  renderTick,
  mapMode,
  selectedId,
  onSelectCountry,
  focusRequest,
  onCameraChange,
  placingDefense,
  onPlaceDefense,
  onCancelPlaceDefense,
  launchingNuke,
  onLaunchNuke,
  onCancelLaunchNuke,
}: WorldMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<PixelMapRenderer | null>(null);

  const camRef = useRef<CameraView>({ x: MAP_W / 2, y: MAP_H / 2, zoom: 1.0 });
  const keysPressedRef = useRef<Set<string>>(new Set());
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    active: boolean;
    startDist: number;
    startZoom: number;
  }>({ active: false, startDist: 0, startZoom: 1 });
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0, moved: false });

  const hoveredIdRef = useRef<number | null>(null);
  const hoverMapPosRef = useRef<{ mx: number; my: number } | null>(null);
  const placingDefenseRef = useRef<boolean>(placingDefense);
  placingDefenseRef.current = placingDefense;
  const launchingNukeRef = useRef<boolean>(launchingNuke);
  launchingNukeRef.current = launchingNuke;
  const nukeAnimStartRef = useRef<Map<number, number>>(new Map());

  const [hoverInfo, setHoverInfo] = useState<{
    id: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Initialize offscreen pixel renderer once
  if (!rendererRef.current && typeof document !== 'undefined') {
    rendererRef.current = new PixelMapRenderer();
  }

  // Handle focus jump requests (from country search or minimap)
  useEffect(() => {
    if (!focusRequest) return;
    camRef.current.x = Math.max(0, Math.min(MAP_W, focusRequest.x));
    camRef.current.y = Math.max(0, Math.min(MAP_H, focusRequest.y));
    if (focusRequest.zoom !== undefined) {
      camRef.current.zoom = Math.max(0.55, Math.min(14, focusRequest.zoom));
    }
  }, [focusRequest]);

  // WASD / Arrow keyboard panning for PC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        keysPressedRef.current.add(k);
      }
      if (k === '=' || k === '+') {
        camRef.current.zoom = Math.min(14, camRef.current.zoom * 1.2);
      } else if (k === '-' || k === '_') {
        camRef.current.zoom = Math.max(0.55, camRef.current.zoom / 1.2);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main 60 FPS PC Render Loop
  useEffect(() => {
    let rafId = 0;

    const drawFrame = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!container || !canvas || !renderer) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      const rect = container.getBoundingClientRect();
      const cw = Math.max(1, Math.floor(rect.width));
      const ch = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      // Keyboard pan
      const keys = keysPressedRef.current;
      if (keys.size > 0) {
        const panSpeed = 5.5 / camRef.current.zoom;
        if (keys.has('w') || keys.has('arrowup')) camRef.current.y -= panSpeed;
        if (keys.has('s') || keys.has('arrowdown')) camRef.current.y += panSpeed;
        if (keys.has('a') || keys.has('arrowleft')) camRef.current.x -= panSpeed;
        if (keys.has('d') || keys.has('arrowright')) camRef.current.x += panSpeed;
        camRef.current.x = Math.max(0, Math.min(MAP_W, camRef.current.x));
        camRef.current.y = Math.max(0, Math.min(MAP_H, camRef.current.y));
      }

      const sim = simRef.current;
      const cam = camRef.current;

      renderer.renderToBuffer(sim, mapMode, selectedId, hoveredIdRef.current);

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      // Clear background matching deep ocean
      ctx.fillStyle = '#091426';
      ctx.fillRect(0, 0, cw, ch);

      // Compute pixel scale so zoom=1 fills the viewport edge-to-edge
      const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
      const scale = baseScale * cam.zoom;
      const drawW = MAP_W * scale;
      const drawH = MAP_H * scale;
      const offsetX = cw * 0.5 - cam.x * scale;
      const offsetY = ch * 0.5 - cam.y * scale;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(renderer.offscreenCanvas, offsetX, offsetY, drawW, drawH);

      // Draw pixel-art grid subtly when zoomed deep
      if (scale >= 6) {
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.lineWidth = 1;
        const startX = Math.max(0, Math.floor(-offsetX / scale));
        const endX = Math.min(MAP_W, Math.ceil((cw - offsetX) / scale));
        const startY = Math.max(0, Math.floor(-offsetY / scale));
        const endY = Math.min(MAP_H, Math.ceil((ch - offsetY) / scale));
        ctx.beginPath();
        for (let gx = startX; gx <= endX; gx++) {
          const sx = Math.floor(offsetX + gx * scale) + 0.5;
          ctx.moveTo(sx, Math.max(0, offsetY));
          ctx.lineTo(sx, Math.min(ch, offsetY + drawH));
        }
        for (let gy = startY; gy <= endY; gy++) {
          const sy = Math.floor(offsetY + gy * scale) + 0.5;
          ctx.moveTo(Math.max(0, offsetX), sy);
          ctx.lineTo(Math.min(cw, offsetX + drawW), sy);
        }
        ctx.stroke();
      }

      // Draw Naval Invasions
      for (const inv of sim.invasions) {
        const sx1 = offsetX + (inv.fromX + 0.5) * scale;
        const sy1 = offsetY + (inv.fromY + 0.5) * scale;
        const sx2 = offsetX + (inv.targetX + 0.5) * scale;
        const sy2 = offsetY + (inv.targetY + 0.5) * scale;

        ctx.save();
        ctx.strokeStyle = inv.attackerId === sim.playerId ? '#FBBF24' : '#F87171';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(sx1, sy1);
        ctx.lineTo(sx2, sy2);
        ctx.stroke();

        const t = inv.progress / 100;
        const curX = sx1 + (sx2 - sx1) * t;
        const curY = sy1 + (sy2 - sy1) * t;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(Math.round(curX - 3), Math.round(curY - 3), 6, 6);
        ctx.restore();
      }

      // Draw Frontline Battle Particles
      for (const p of sim.particles) {
        const sx = offsetX + (p.x + 0.5) * scale;
        const sy = offsetY + (p.y + 0.5) * scale;
        if (sx < -10 || sx > cw + 10 || sy < -10 || sy > ch + 10) continue;
        const alpha = p.life / p.maxLife;
        const sz = Math.max(3, Math.round(scale * 1.15));
        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${alpha.toFixed(2)})`;
        ctx.fillRect(Math.round(sx - sz * 0.5), Math.round(sy - sz * 0.5), sz, sz);
      }

      // Draw Port Markers
      for (const c of sim.countries) {
        if (!c.alive || c.ports.length === 0) continue;
        const showPorts =
          c.id === sim.playerId || c.id === selectedId || cam.zoom >= 1.6;
        if (!showPorts) continue;
        const portSize = c.id === sim.playerId ? Math.max(4, Math.round(scale * 0.85)) : 3;
        for (const p of c.ports) {
          const px = offsetX + (p.x + 0.5) * scale;
          const py = offsetY + (p.y + 0.5) * scale;
          if (px < -10 || px > cw + 10 || py < -10 || py > ch + 10) continue;
          ctx.fillStyle = '#07101D';
          ctx.fillRect(
            Math.round(px - portSize / 2) - 1,
            Math.round(py - portSize / 2) - 1,
            portSize + 2,
            portSize + 2
          );
          ctx.fillStyle = c.id === sim.playerId ? '#38BDF8' : '#7DD3FC';
          ctx.fillRect(
            Math.round(px - portSize / 2),
            Math.round(py - portSize / 2),
            portSize,
            portSize
          );
        }
      }

      // Draw Placed Defenses and their Protection Radius Circles
      for (const c of sim.countries) {
        if (!c.alive || c.defenses.length === 0) continue;
        const showDefenses =
          c.id === sim.playerId || c.id === selectedId || c.id === hoveredIdRef.current || cam.zoom >= 1.8;
        if (!showDefenses) continue;

        const isPlayer = c.id === sim.playerId;
        const showRadius =
          isPlayer ||
          c.id === selectedId ||
          c.id === hoveredIdRef.current ||
          placingDefenseRef.current ||
          launchingNukeRef.current;

        for (const d of c.defenses) {
          const dx = offsetX + (d.x + 0.5) * scale;
          const dy = offsetY + (d.y + 0.5) * scale;
          const rPx = d.radius * scale;
          if (dx + rPx < -20 || dx - rPx > cw + 20 || dy + rPx < -20 || dy - rPx > ch + 20) {
            continue;
          }

          if (showRadius) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(dx, dy, rPx, 0, Math.PI * 2);
            ctx.fillStyle = isPlayer
              ? 'rgba(16, 185, 129, 0.13)'
              : 'rgba(245, 158, 11, 0.10)';
            ctx.fill();
            ctx.setLineDash([4, 3]);
            ctx.lineWidth = 1.25;
            ctx.strokeStyle = isPlayer
              ? 'rgba(52, 211, 153, 0.72)'
              : 'rgba(251, 191, 36, 0.55)';
            ctx.stroke();
            ctx.restore();
          }

          const fortSize = isPlayer ? Math.max(5, Math.round(scale * 0.95)) : 4;
          ctx.fillStyle = '#07101D';
          ctx.fillRect(
            Math.round(dx - fortSize / 2) - 1,
            Math.round(dy - fortSize / 2) - 1,
            fortSize + 2,
            fortSize + 2
          );
          ctx.fillStyle = isPlayer ? '#10B981' : '#F59E0B';
          ctx.fillRect(
            Math.round(dx - fortSize / 2),
            Math.round(dy - fortSize / 2),
            fortSize,
            fortSize
          );
        }
      }

      // Draw Active Nuclear Detonations & Radioactive Fallout Zones
      const nowMs = Date.now();
      for (const c of sim.countries) {
        const strike = c.lastNukeStrike;
        if (!strike) continue;
        const ageDays = sim.totalDays - strike.totalDays;
        if (ageDays < 0 || ageDays > NUKE_FALLOUT_DAYS) continue;

        let animStart = nukeAnimStartRef.current.get(strike.id);
        if (animStart === undefined) {
          animStart = ageDays <= 1 ? nowMs : nowMs - 2500;
          nukeAnimStartRef.current.set(strike.id, animStart);
          if (ageDays <= 1 && c.id !== sim.playerId) {
            soundEngine.playNuclearExplosion();
          }
        }

        const nx = offsetX + (strike.x + 0.5) * scale;
        const ny = offsetY + (strike.y + 0.5) * scale;
        const rPx = strike.radius * scale;
        if (nx + rPx < -30 || nx - rPx > cw + 30 || ny + rPx < -30 || ny - rPx > ch + 30) {
          continue;
        }

        const elapsedMs = nowMs - animStart;
        const falloutAlpha = Math.max(0.18, 1 - ageDays / NUKE_FALLOUT_DAYS);

        ctx.save();
        // Persistent scorched fallout footprint (exact NUKE_RADIUS, slightly smaller than defense)
        ctx.beginPath();
        ctx.arc(nx, ny, rPx, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 45, 12, ${(0.22 * falloutAlpha).toFixed(2)})`;
        ctx.fill();
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(251, 146, 60, ${(0.78 * falloutAlpha).toFixed(2)})`;
        ctx.stroke();

        // Scorched inner epicenter
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(nx, ny, rPx * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(24, 16, 12, ${(0.45 * falloutAlpha).toFixed(2)})`;
        ctx.fill();

        // Initial 1.8s nuclear flash & expanding shockwave ring
        if (elapsedMs < 1800) {
          const t = Math.min(1, elapsedMs / 1800);
          const waveR = rPx * (0.15 + 0.85 * Math.pow(t, 0.45));
          const flashAlpha = Math.pow(1 - t, 1.5);

          const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, waveR);
          grad.addColorStop(0, `rgba(255, 255, 235, ${(0.95 * flashAlpha).toFixed(2)})`);
          grad.addColorStop(0.45, `rgba(251, 191, 36, ${(0.72 * flashAlpha).toFixed(2)})`);
          grad.addColorStop(0.8, `rgba(239, 68, 68, ${(0.42 * flashAlpha).toFixed(2)})`);
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.beginPath();
          ctx.arc(nx, ny, waveR, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nx, ny, waveR, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(1.5, 3.5 * (1 - t));
          ctx.strokeStyle = `rgba(255, 247, 214, ${(0.9 * (1 - t)).toFixed(2)})`;
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw Live Defense Placement Preview under Cursor
      if (placingDefenseRef.current && hoverMapPosRef.current) {
        const { mx, my } = hoverMapPosRef.current;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
          const valid = sim.ownerGrid[my * MAP_W + mx] === sim.playerId;
          const px = offsetX + (mx + 0.5) * scale;
          const py = offsetY + (my + 0.5) * scale;
          const rPx = DEFENSE_RADIUS * scale;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, rPx, 0, Math.PI * 2);
          ctx.fillStyle = valid
            ? 'rgba(16, 185, 129, 0.24)'
            : 'rgba(239, 68, 68, 0.22)';
          ctx.fill();
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.75;
          ctx.strokeStyle = valid ? '#34D399' : '#F87171';
          ctx.stroke();

          ctx.fillStyle = valid ? '#10B981' : '#EF4444';
          ctx.fillRect(Math.round(px - 3), Math.round(py - 3), 6, 6);
          ctx.restore();
        }
      }

      // Draw Live Nuclear Bomb Targeting Preview under Cursor (NUKE_RADIUS = 19, slightly smaller than Defense = 24)
      if (launchingNukeRef.current && hoverMapPosRef.current) {
        const { mx, my } = hoverMapPosRef.current;
        if (mx >= 0 && mx < MAP_W && my >= 0 && my < MAP_H) {
          const centerOwner = sim.ownerGrid[my * MAP_W + mx];
          const valid =
            centerOwner >= 0 &&
            centerOwner !== sim.playerId &&
            !hasTreaty(sim, sim.playerId, centerOwner, TREATY_ALLIANCE);
          const px = offsetX + (mx + 0.5) * scale;
          const py = offsetY + (my + 0.5) * scale;
          const rPx = NUKE_RADIUS * scale;

          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, rPx, 0, Math.PI * 2);
          ctx.fillStyle = valid
            ? 'rgba(249, 115, 22, 0.26)'
            : 'rgba(148, 163, 184, 0.16)';
          ctx.fill();
          ctx.setLineDash([5, 3]);
          ctx.lineWidth = 1.85;
          ctx.strokeStyle = valid ? '#FB923C' : '#94A3B8';
          ctx.stroke();

          // Inner lethal epicenter ring + crosshair
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(px, py, rPx * 0.42, 0, Math.PI * 2);
          ctx.lineWidth = 1.25;
          ctx.strokeStyle = valid ? 'rgba(254, 240, 138, 0.85)' : 'rgba(148, 163, 184, 0.5)';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px - 7, py);
          ctx.lineTo(px + 7, py);
          ctx.moveTo(px, py - 7);
          ctx.lineTo(px, py + 7);
          ctx.strokeStyle = valid ? '#FDE047' : '#CBD5E1';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw Capital Markers & Country Names when zoomed in
      for (const c of sim.countries) {
        if (!c.alive) continue;
        const cx = offsetX + (c.capitalX + 0.5) * scale;
        const cy = offsetY + (c.capitalY + 0.5) * scale;
        if (cx < -60 || cx > cw + 60 || cy < -30 || cy > ch + 30) continue;

        const isImportant =
          c.id === sim.playerId ||
          c.id === selectedId ||
          c.id === hoveredIdRef.current;

        if (isImportant || cam.zoom >= 2.0) {
          const dotSize = isImportant ? Math.max(4, Math.min(8, Math.round(scale * 0.9))) : 3;
          ctx.fillStyle = '#0B121E';
          ctx.fillRect(Math.round(cx - dotSize / 2) - 1, Math.round(cy - dotSize / 2) - 1, dotSize + 2, dotSize + 2);
          ctx.fillStyle =
            c.id === sim.playerId
              ? '#FBBF24'
              : c.id === selectedId
                ? '#FFFFFF'
                : '#E2E8F0';
          ctx.fillRect(Math.round(cx - dotSize / 2), Math.round(cy - dotSize / 2), dotSize, dotSize);
        }

        // Labels at sufficient zoom
        const minPixelsForZoom = cam.zoom >= 5.5 ? 1 : cam.zoom >= 3.2 ? 12 : cam.zoom >= 2.0 ? 55 : 999999;
        if ((isImportant && cam.zoom >= 1.35) || c.pixels >= minPixelsForZoom) {
          ctx.font = isImportant
            ? '600 11px "Plus Jakarta Sans", sans-serif'
            : '500 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          const labelText = getCountryName(c);
          const labelY = Math.round(cy - 6);
          ctx.fillStyle = 'rgba(7, 16, 29, 0.85)';
          ctx.fillText(labelText, Math.round(cx) + 1, labelY + 1);
          ctx.fillStyle =
            c.id === sim.playerId ? '#FDE68A' : isImportant ? '#FFFFFF' : '#CBD5E1';
          ctx.fillText(labelText, Math.round(cx), labelY);
        }
      }

      if (onCameraChange) {
        onCameraChange(cam, cw / scale, ch / scale);
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [simRef, mapMode, selectedId, renderTick, onCameraChange]);

  const screenToMapPixel = (clientX: number, clientY: number): { mx: number; my: number; sx: number; sy: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const cw = rect.width;
    const ch = rect.height;
    const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
    const scale = baseScale * camRef.current.zoom;
    const offsetX = cw * 0.5 - camRef.current.x * scale;
    const offsetY = ch * 0.5 - camRef.current.y * scale;
    const mx = Math.floor((sx - offsetX) / scale);
    const my = Math.floor((sy - offsetY) / scale);
    return { mx, my, sx, sy };
  };

  const getCountryAt = (mx: number, my: number): number | null => {
    if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return null;
    const sim = simRef.current;
    const direct = sim.ownerGrid[my * MAP_W + mx];
    if (direct >= 0) return direct;

    // Gentle click-assist radius of 2 map pixels for tiny microstates/islands when zoomed out
    const r = camRef.current.zoom < 3 ? 2 : 1;
    let bestId: number | null = null;
    let bestDist = Infinity;
    for (let dy = -r; dy <= r; dy++) {
      const py = my + dy;
      if (py < 0 || py >= MAP_H) continue;
      for (let dx = -r; dx <= r; dx++) {
        const px = mx + dx;
        if (px < 0 || px >= MAP_W) continue;
        const id = sim.ownerGrid[py * MAP_W + px];
        if (id >= 0) {
          const d = dx * dx + dy * dy;
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        }
      }
    }
    return bestId;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStateRef.current = {
        active: true,
        startDist: Math.max(1, dist),
        startZoom: camRef.current.zoom,
      };
      dragRef.current.active = false;
      dragRef.current.moved = true;
      return;
    }

    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      camStartX: camRef.current.x,
      camStartY: camRef.current.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    if (!container) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch-to-zoom
    if (activePointersRef.current.size === 2 && pinchStateRef.current.active) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / Math.max(1, pinchStateRef.current.startDist);
      const rect = container.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) * 0.5 - rect.left;
      const midY = (pts[0].y + pts[1].y) * 0.5 - rect.top;
      const cw = rect.width;
      const ch = rect.height;
      const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
      const oldZoom = camRef.current.zoom;
      const oldScale = baseScale * oldZoom;
      const worldX = camRef.current.x + (midX - cw * 0.5) / oldScale;
      const worldY = camRef.current.y + (midY - ch * 0.5) / oldScale;

      const newZoom = Math.max(0.55, Math.min(14, pinchStateRef.current.startZoom * ratio));
      const newScale = baseScale * newZoom;
      camRef.current.zoom = newZoom;
      camRef.current.x = Math.max(0, Math.min(MAP_W, worldX - (midX - cw * 0.5) / newScale));
      camRef.current.y = Math.max(0, Math.min(MAP_H, worldY - (midY - ch * 0.5) / newScale));
      setHoverInfo(null);
      return;
    }

    if (dragRef.current.active) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragRef.current.moved = true;
      }
      if (dragRef.current.moved) {
        const rect = container.getBoundingClientRect();
        const baseScale = Math.max(rect.width / MAP_W, rect.height / MAP_H);
        const scale = baseScale * camRef.current.zoom;
        camRef.current.x = Math.max(0, Math.min(MAP_W, dragRef.current.camStartX - dx / scale));
        camRef.current.y = Math.max(0, Math.min(MAP_H, dragRef.current.camStartY - dy / scale));
      }
    }

    if (e.pointerType === 'touch') {
      setHoverInfo(null);
      return;
    }

    const pos = screenToMapPixel(e.clientX, e.clientY);
    if (!pos) return;
    hoverMapPosRef.current = { mx: pos.mx, my: pos.my };
    const cid = getCountryAt(pos.mx, pos.my);
    hoveredIdRef.current = cid;
    if (cid !== null) {
      setHoverInfo({ id: cid, screenX: pos.sx, screenY: pos.sy });
    } else {
      setHoverInfo(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current.active = false;
    }

    const wasMoved = dragRef.current.moved;
    dragRef.current.active = false;
    if (wasMoved) return;

    if (e.button === 2) {
      if (launchingNukeRef.current) {
        onCancelLaunchNuke();
        return;
      }
      if (placingDefenseRef.current) {
        onCancelPlaceDefense();
        return;
      }
    }

    if (e.button === 0 || e.pointerType === 'touch') {
      const pos = screenToMapPixel(e.clientX, e.clientY);
      if (pos) {
        if (launchingNukeRef.current) {
          onLaunchNuke(pos.mx, pos.my);
        } else if (placingDefenseRef.current) {
          onPlaceDefense(pos.mx, pos.my);
        } else {
          const cid = getCountryAt(pos.mx, pos.my);
          onSelectCountry(cid);
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cw = rect.width;
    const ch = rect.height;
    const baseScale = Math.max(cw / MAP_W, ch / MAP_H);

    const oldZoom = camRef.current.zoom;
    const oldScale = baseScale * oldZoom;
    const worldX = camRef.current.x + (sx - cw * 0.5) / oldScale;
    const worldY = camRef.current.y + (sy - ch * 0.5) / oldScale;

    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const newZoom = Math.max(0.55, Math.min(14, oldZoom * factor));
    const newScale = baseScale * newZoom;

    camRef.current.zoom = newZoom;
    camRef.current.x = Math.max(0, Math.min(MAP_W, worldX - (sx - cw * 0.5) / newScale));
    camRef.current.y = Math.max(0, Math.min(MAP_H, worldY - (sy - ch * 0.5) / newScale));
  };

  const hoveredCountry = hoverInfo ? simRef.current.countries[hoverInfo.id] : null;
  const sim = simRef.current;

  let hoverDiploLabel = 'Neutral';
  let hoverDiploColor = 'text-slate-300';
  if (hoveredCountry && hoveredCountry.id !== sim.playerId) {
    if (hasTreaty(sim, sim.playerId, hoveredCountry.id, TREATY_WAR)) {
      hoverDiploLabel = 'En Guerra';
      hoverDiploColor = 'text-red-400';
    } else if (hasTreaty(sim, sim.playerId, hoveredCountry.id, TREATY_ALLIANCE)) {
      hoverDiploLabel = 'Aliado';
      hoverDiploColor = 'text-sky-400';
    }
  } else if (hoveredCountry && hoveredCountry.id === sim.playerId) {
    hoverDiploLabel = 'Tu Nación';
    hoverDiploColor = 'text-amber-400';
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#091426]"
      onContextMenu={(e) => {
        e.preventDefault();
        if (launchingNukeRef.current) onCancelLaunchNuke();
        if (placingDefenseRef.current) onCancelPlaceDefense();
      }}
    >
      <canvas
        ref={canvasRef}
        className={`w-full h-full block pixelated touch-none ${
          placingDefense || launchingNuke ? 'cursor-cell' : 'cursor-crosshair'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => {
          activePointersRef.current.delete(e.pointerId);
          if (activePointersRef.current.size < 2) pinchStateRef.current.active = false;
          dragRef.current.active = false;
        }}
        onPointerLeave={() => {
          hoveredIdRef.current = null;
          hoverMapPosRef.current = null;
          setHoverInfo(null);
          dragRef.current.active = false;
        }}
        onWheel={handleWheel}
      />

      {hoverInfo && hoveredCountry && (
        <div
          className="pointer-events-none absolute z-20 bg-[#111B2B]/95 border border-slate-700 px-3 py-2 shadow-xl max-w-[275px]"
          style={{
            left: Math.min(hoverInfo.screenX + 14, (containerRef.current?.clientWidth || 1000) - 285),
            top: Math.max(8, hoverInfo.screenY - 12),
          }}
        >
          <div className="flex items-center gap-2">
            <PixelFlag country={hoveredCountry.seed} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 shrink-0 border border-white/40"
                  style={{
                    backgroundColor: `rgb(${hoveredCountry.color[0]},${hoveredCountry.color[1]},${hoveredCountry.color[2]})`,
                  }}
                />
                <span className="truncate">{getCountryName(hoveredCountry)}</span>
              </div>
              <div className="text-[10px] text-amber-300 truncate">
                Capital: {hoveredCountry.seed.capital}
              </div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-300 font-mono-num">
            <span className="text-amber-300">
              ${Math.round(hoveredCountry.money).toLocaleString('es-ES')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-300">
              Ej. {Math.round(hoveredCountry.army).toLocaleString('es-ES')}
            </span>
            <span aria-hidden="true">·</span>
            <span className={hoverDiploColor}>{hoverDiploLabel}</span>
          </div>
          {hoveredCountry.id !== sim.playerId && (
            <div className="mt-0.5 text-[11px] text-slate-400 font-mono-num">
              Relación: {getRelation(sim, sim.playerId, hoveredCountry.id)}/100
            </div>
          )}
        </div>
      )}
    </div>
  );
}
