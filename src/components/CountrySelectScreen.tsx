import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Dices,
  Globe,
  HelpCircle,
  List,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Search,
  Smartphone,
  Trash2,
  Trophy,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { COUNTRIES_195, type Continent, type CountrySeed } from '../data/countries195';
import { useFirebase } from '../contexts/FirebaseContext';
import { computeInitialArmy, computeInitialMoney } from '../engine/gameSimulation';
import { MAP_H, MAP_W, buildWorldMapData, lonToX, latToY } from '../engine/mapRasterizer';
import { renderStaticPreviewToBuffer } from '../engine/pixelRenderer';
import { soundEngine } from '../engine/soundEngine';
import { deleteCampaignFromCloud, type SavedCampaignSummary } from '../services/cloudSaves';
import type { DeviceMode } from './DeviceModeScreen';
import { PWAInstallButton } from './PWAInstallPrompt';
import { PixelFlag } from './PixelFlag';

interface CountrySelectScreenProps {
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  onStartCampaign: (countryId: number) => void;
  onResumeCampaign: (summary: SavedCampaignSummary) => Promise<void>;
  onOpenOnline: () => void;
  onOpenAchievements: () => void;
  achievementsUnlockedCount: number;
  onResetTutorial: () => void;
}

const CONTINENTS: Array<'Todos' | Continent> = [
  'Todos',
  'América',
  'Europa',
  'Asia',
  'África',
  'Oceanía',
];

export function CountrySelectScreen({
  deviceMode,
  onChangeDeviceMode,
  onStartCampaign,
  onResumeCampaign,
  onOpenOnline,
  onOpenAchievements,
  achievementsUnlockedCount,
  onResetTutorial,
}: CountrySelectScreenProps) {
  const {
    user,
    canAccessOnline,
    authReady,
    authBusy,
    authError,
    campaigns,
    campaignsLoading,
    signInWithGoogle,
    signOutUser,
  } = useFirebase();

  const mapData = useMemo(() => buildWorldMapData(), []);
  const [selectedId, setSelectedId] = useState<number>(() => {
    return COUNTRIES_195.find((c) => c.iso2 === 'ES')?.id ?? 0;
  });
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [continent, setContinent] = useState<'Todos' | Continent>('Todos');
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cloudActionError, setCloudActionError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list' | 'cloud'>('map');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef({ x: MAP_W / 2, y: MAP_H / 2, zoom: 1.0 });
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number }>({
    active: false,
    startDist: 0,
    startZoom: 1,
  });
  const dragRef = useRef({ active: false, sx: 0, sy: 0, cx: 0, cy: 0, moved: false });

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COUNTRIES_195.filter((c) => {
      if (continent !== 'Todos' && c.continent !== continent) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.iso2.toLowerCase() === q
      );
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [search, continent]);

  const selectedCountry: CountrySeed = COUNTRIES_195[selectedId];

  // Re-render offscreen pixel map when selection or hover changes
  useEffect(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement('canvas');
    }
    renderStaticPreviewToBuffer(mapData, selectedId, hoveredId, offscreenRef.current);
  }, [mapData, selectedId, hoveredId]);

  // Draw loop for smooth zoom/pan preview
  useEffect(() => {
    let raf = 0;
    const render = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const offscreen = offscreenRef.current;
      if (container && canvas && offscreen) {
        const rect = container.getBoundingClientRect();
        const cw = Math.max(1, Math.floor(rect.width));
        const ch = Math.max(1, Math.floor(rect.height));
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.fillStyle = '#091426';
          ctx.fillRect(0, 0, cw, ch);
          const cam = camRef.current;
          const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
          const scale = baseScale * cam.zoom;
          const ox = cw * 0.5 - cam.x * scale;
          const oy = ch * 0.5 - cam.y * scale;
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreen, ox, oy, MAP_W * scale, MAP_H * scale);

          const capX = mapData.capitalX[selectedId];
          const capY = mapData.capitalY[selectedId];
          const sx = Math.round(ox + (capX + 0.5) * scale);
          const sy = Math.round(oy + (capY + 0.5) * scale);
          ctx.fillStyle = '#0B121E';
          ctx.fillRect(sx - 5, sy - 5, 10, 10);
          ctx.fillStyle = '#FBBF24';
          ctx.fillRect(sx - 3, sy - 3, 6, 6);
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mapData, selectedId, mobileTab, deviceMode]);

  const screenToMap = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
    const scale = baseScale * camRef.current.zoom;
    const ox = cw * 0.5 - camRef.current.x * scale;
    const oy = ch * 0.5 - camRef.current.y * scale;
    return {
      mx: Math.floor((sx - ox) / scale),
      my: Math.floor((sy - oy) / scale),
    };
  };

  const findCountryAt = (mx: number, my: number): number | null => {
    if (mx < 0 || mx >= MAP_W || my < 0 || my >= MAP_H) return null;
    const direct = mapData.ownerGrid[my * MAP_W + mx];
    if (direct >= 0) return direct;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const px = mx + dx;
        const py = my + dy;
        if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) {
          const id = mapData.ownerGrid[py * MAP_W + px];
          if (id >= 0) return id;
        }
      }
    }
    return null;
  };

  const selectAndCenter = (c: CountrySeed, zoomTo = false) => {
    setSelectedId(c.id);
    soundEngine.playSelectCountry();
    if (zoomTo) {
      camRef.current.x = lonToX(c.lon);
      camRef.current.y = latToY(c.lat);
      if (camRef.current.zoom < 1.8) camRef.current.zoom = 2.2;
    }
  };

  const handleRandomCountry = () => {
    const pick = COUNTRIES_195[Math.floor(Math.random() * COUNTRIES_195.length)];
    selectAndCenter(pick, true);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      pinchRef.current = {
        active: true,
        startDist: Math.max(1, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)),
        startZoom: camRef.current.zoom,
      };
      dragRef.current.active = false;
      dragRef.current.moved = true;
      return;
    }

    dragRef.current = {
      active: true,
      sx: e.clientX,
      sy: e.clientY,
      cx: camRef.current.x,
      cy: camRef.current.y,
      moved: false,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activePointersRef.current.size === 2 && pinchRef.current.active && containerRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const ratio = dist / Math.max(1, pinchRef.current.startDist);
      const rect = containerRef.current.getBoundingClientRect();
      const midX = (pts[0].x + pts[1].x) * 0.5 - rect.left;
      const midY = (pts[0].y + pts[1].y) * 0.5 - rect.top;
      const cw = rect.width;
      const ch = rect.height;
      const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
      const oldScale = baseScale * camRef.current.zoom;
      const wx = camRef.current.x + (midX - cw * 0.5) / oldScale;
      const wy = camRef.current.y + (midY - ch * 0.5) / oldScale;
      const newZoom = Math.max(0.55, Math.min(12, pinchRef.current.startZoom * ratio));
      const newScale = baseScale * newZoom;
      camRef.current.zoom = newZoom;
      camRef.current.x = Math.max(0, Math.min(MAP_W, wx - (midX - cw * 0.5) / newScale));
      camRef.current.y = Math.max(0, Math.min(MAP_H, wy - (midY - ch * 0.5) / newScale));
      setHoveredId(null);
      return;
    }

    if (dragRef.current.active && containerRef.current) {
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true;
      if (dragRef.current.moved) {
        const rect = containerRef.current.getBoundingClientRect();
        const baseScale = Math.max(rect.width / MAP_W, rect.height / MAP_H);
        const scale = baseScale * camRef.current.zoom;
        camRef.current.x = Math.max(0, Math.min(MAP_W, dragRef.current.cx - dx / scale));
        camRef.current.y = Math.max(0, Math.min(MAP_H, dragRef.current.cy - dy / scale));
      }
    }

    if (e.pointerType === 'touch') {
      setHoveredId(null);
      return;
    }

    const pos = screenToMap(e.clientX, e.clientY);
    if (pos) setHoveredId(findCountryAt(pos.mx, pos.my));
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchRef.current.active = false;

    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    if (!moved && (e.button === 0 || e.pointerType === 'touch')) {
      const pos = screenToMap(e.clientX, e.clientY);
      if (pos) {
        const cid = findCountryAt(pos.mx, pos.my);
        if (cid !== null) selectAndCenter(COUNTRIES_195[cid], false);
      }
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cw = rect.width;
    const ch = rect.height;
    const baseScale = Math.max(cw / MAP_W, ch / MAP_H);
    const oldZoom = camRef.current.zoom;
    const oldScale = baseScale * oldZoom;
    const wx = camRef.current.x + (sx - cw * 0.5) / oldScale;
    const wy = camRef.current.y + (sy - ch * 0.5) / oldScale;
    const newZoom = Math.max(0.55, Math.min(12, oldZoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18)));
    const newScale = baseScale * newZoom;
    camRef.current.zoom = newZoom;
    camRef.current.x = Math.max(0, Math.min(MAP_W, wx - (sx - cw * 0.5) / newScale));
    camRef.current.y = Math.max(0, Math.min(MAP_H, wy - (sy - ch * 0.5) / newScale));
  };

  const renderCloudPanel = () => (
    <div className="px-4 py-3 border-b border-slate-800 bg-[#0E1726]">
      {!authReady ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
          <span>Conectando con la nube...</span>
        </div>
      ) : user ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Usuario'}
                  className="w-7 h-7 border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {user.displayName || 'Comandante'}
                </div>
                <div className="text-[10px] text-emerald-400 truncate">
                  Guardado automático en la nube activo
                </div>
              </div>
            </div>
            <button
              onClick={signOutUser}
              disabled={authBusy}
              className="px-2.5 py-1.5 text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-3 h-3" />
              <span>Salir</span>
            </button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Cargando partidas guardadas...</span>
            </div>
          ) : campaigns.length > 0 ? (
            <div className={`space-y-1.5 overflow-y-auto pr-0.5 ${deviceMode === 'mobile' ? 'max-h-[45vh]' : 'max-h-40'}`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                <Cloud className="w-3 h-3" />
                <span>Continuar Partida ({campaigns.length})</span>
              </div>
              {campaigns.slice(0, 6).map((camp) => {
                const seed = COUNTRIES_195[camp.countryId];
                const isBusy = resumingId === camp.campaignId || deletingId === camp.campaignId;
                const savedTime = new Date(camp.updatedAtMs).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <div
                    key={camp.campaignId}
                    className="bg-[#0B121E] border border-slate-800 px-2.5 py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {seed && <PixelFlag country={seed} size="sm" />}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-100 truncate">
                          {camp.countryName}
                          {camp.outcome === 'victory' && (
                            <span className="ml-1.5 text-[10px] text-amber-400">(Victoria)</span>
                          )}
                          {camp.outcome === 'defeat' && (
                            <span className="ml-1.5 text-[10px] text-red-400">(Derrota)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-num truncate">
                          {camp.dateLabel} · ${camp.money} · Ej. {camp.army} · {savedTime}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        disabled={isBusy}
                        onClick={async () => {
                          setCloudActionError(null);
                          setResumingId(camp.campaignId);
                          try {
                            soundEngine.playTreaty();
                            await onResumeCampaign(camp);
                          } catch {
                            setCloudActionError('No se pudo cargar la partida guardada.');
                          } finally {
                            setResumingId(null);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {resumingId === camp.campaignId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        <span>Jugar</span>
                      </button>
                      <button
                        disabled={isBusy}
                        onClick={async () => {
                          if (!user) return;
                          setCloudActionError(null);
                          setDeletingId(camp.campaignId);
                          try {
                            await deleteCampaignFromCloud(user.uid, camp.campaignId);
                          } catch {
                            setCloudActionError('No se pudo eliminar la partida.');
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                        title="Eliminar partida guardada"
                        className="p-1.5 bg-slate-900 hover:bg-red-950/70 border border-slate-700 hover:border-red-500/60 text-slate-400 hover:text-red-300 cursor-pointer"
                      >
                        {deletingId === camp.campaignId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">
              Aún no tienes partidas guardadas. Empieza una campaña y se guardará automáticamente.
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Guardado automático en la nube</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Conecta Google y tu progreso se guardará solo al instante.
            </div>
          </div>
          <button
            onClick={signInWithGoogle}
            disabled={authBusy}
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {authBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogIn className="w-3.5 h-3.5" />
            )}
            <span>Google</span>
          </button>
        </div>
      )}
      {(authError || cloudActionError) && (
        <div className="mt-2 text-[11px] text-red-400">
          {cloudActionError || authError}
        </div>
      )}
    </div>
  );

  // MOBILE-FIRST COUNTRY SELECTOR LAYOUT
  if (deviceMode === 'mobile') {
    return (
      <div className="w-screen h-screen flex flex-col bg-[#0B121E] text-slate-100 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="h-12 px-3 border-b border-slate-800 bg-[#111B2B] flex items-center justify-between gap-2 shrink-0">
          <h1 className="font-pixel text-sm tracking-wide text-amber-400 truncate">
            PAÍSES EN GUERRA
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                soundEngine.playClick();
                onResetTutorial();
              }}
              title="Reiniciar tutorial"
              aria-label="Reiniciar tutorial"
              className="w-8 h-8 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-400/70 text-sky-300 flex items-center justify-center cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenAchievements();
              }}
              title={`Logros (${achievementsUnlockedCount}/100)`}
              className="px-2 py-1.5 bg-slate-900 border border-amber-500/50 text-amber-300 hover:text-amber-200 text-[11px] font-mono-num flex items-center gap-1 cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>{achievementsUnlockedCount}</span>
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenOnline();
              }}
              title={
                canAccessOnline
                  ? 'Online · 28/11/2026 (Acceso de pruebas)'
                  : 'El online estará listo para el 28/11/2026'
              }
              className={
                canAccessOnline
                  ? 'relative overflow-hidden px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-emerald-500/70 text-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer'
                  : 'relative overflow-hidden px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-600 text-slate-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer'
              }
            >
              <Globe className="w-3 h-3 text-emerald-400/70 shrink-0 opacity-60" />
              <span className="opacity-45">Online</span>
              <svg
                viewBox="0 0 80 28"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 w-full h-full opacity-70"
                aria-hidden="true"
              >
                <line
                  x1="0"
                  y1="26"
                  x2="80"
                  y2="2"
                  stroke="#94A3B8"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                />
                <line
                  x1="0"
                  y1="2"
                  x2="80"
                  y2="26"
                  stroke="#94A3B8"
                  strokeWidth="2.2"
                  strokeDasharray="4 2"
                />
              </svg>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="px-1 py-0.2 bg-[#0B121E]/95 border border-slate-400 font-mono-num text-[9px] font-extrabold text-white leading-tight">
                  28/11/2026
                </span>
              </span>
            </button>
            <PWAInstallButton compact />
          </div>
        </header>

        {/* Mobile Mode Tabs: Mapa | Lista (195) | Nube */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-[#0E1726] shrink-0">
          <button
            onClick={() => setMobileTab('map')}
            className={`min-h-[42px] flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mobileTab === 'map'
                ? 'border-amber-400 text-amber-300 bg-[#111B2B]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Mapa</span>
          </button>
          <button
            onClick={() => setMobileTab('list')}
            className={`min-h-[42px] flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mobileTab === 'list'
                ? 'border-amber-400 text-amber-300 bg-[#111B2B]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Países ({filteredCountries.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('cloud')}
            className={`min-h-[42px] flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mobileTab === 'cloud'
                ? 'border-sky-400 text-sky-300 bg-[#111B2B]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>Nube{campaigns.length > 0 ? ` (${campaigns.length})` : ''}</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {mobileTab === 'map' && (
            <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#091426]">
              <canvas
                ref={canvasRef}
                className="w-full h-full block pixelated touch-none"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={(e) => {
                  activePointersRef.current.delete(e.pointerId);
                  if (activePointersRef.current.size < 2) pinchRef.current.active = false;
                  dragRef.current.active = false;
                }}
                onWheel={handleCanvasWheel}
              />

              <div className="pointer-events-none absolute top-2.5 left-2.5 bg-[#111B2B]/90 border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300">
                Toca un país · Pellizca para zoom
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={handleRandomCountry}
                  className="h-10 px-3 bg-[#111B2B]/95 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-4 h-4" />
                  <span>Aleatorio</span>
                </button>
                <button
                  onClick={() => {
                    camRef.current.zoom = Math.min(12, camRef.current.zoom * 1.3);
                  }}
                  className="w-10 h-10 bg-[#111B2B]/95 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                  aria-label="Acercar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    camRef.current.zoom = Math.max(0.55, camRef.current.zoom / 1.3);
                  }}
                  className="w-10 h-10 bg-[#111B2B]/95 border border-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                  aria-label="Alejar"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    camRef.current = { x: MAP_W / 2, y: MAP_H / 2, zoom: 1.0 };
                  }}
                  className="h-10 px-2.5 bg-[#111B2B]/95 border border-slate-700 text-slate-200 text-xs font-mono-num cursor-pointer"
                >
                  1:1
                </button>
              </div>
            </div>
          )}

          {mobileTab === 'list' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#111B2B]">
              <div className="p-3 border-b border-slate-800 space-y-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar país, capital o código..."
                      className="w-full bg-[#0B121E] border border-slate-700 pl-9 pr-3 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleRandomCountry}
                    className="h-[38px] px-3 bg-slate-800 border border-slate-700 text-amber-300 text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {CONTINENTS.map((cont) => (
                    <button
                      key={cont}
                      onClick={() => setContinent(cont)}
                      className={`px-3 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                        continent === cont
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                          : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}
                    >
                      {cont}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
                {filteredCountries.map((c) => {
                  const isSel = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        selectAndCenter(c, true);
                        setMobileTab('map');
                      }}
                      className={`w-full px-4 py-3 min-h-[54px] flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSel ? 'bg-amber-500/15' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PixelFlag country={c} size="sm" />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold truncate ${isSel ? 'text-amber-300' : 'text-slate-100'}`}>
                            {c.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {c.capital} · {c.continent}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2 font-mono-num text-[11px]">
                        <div className="text-amber-300">${computeInitialMoney(c.gdp, c.military)}</div>
                        <div className="text-rose-300">Ej. {computeInitialArmy(c.military)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mobileTab === 'cloud' && (
            <div className="flex-1 overflow-y-auto bg-[#0E1726]">
              {renderCloudPanel()}
            </div>
          )}
        </div>

        {/* Pinned Mobile Launch Bar */}
        <div className="p-3 border-t border-slate-800 bg-[#0E1726] space-y-2.5 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <PixelFlag country={selectedCountry} size="md" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{selectedCountry.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {selectedCountry.capital} · ${computeInitialMoney(selectedCountry.gdp, selectedCountry.military)} · Ej. {computeInitialArmy(selectedCountry.military)} · {mapData.initialPixelCounts[selectedCountry.id]} px
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playTreaty();
              onStartCampaign(selectedId);
            }}
            className="w-full min-h-[44px] py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Comenzar Campaña</span>
          </button>
        </div>
      </div>
    );
  }

  // DESKTOP LAYOUT (original PC layout preserved)
  return (
    <div className="w-screen h-screen flex bg-[#0B121E] text-slate-100 overflow-hidden">
      {/* Left Interactive Pixel Map Picker */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-800 bg-[#111B2B]">
          <div className="flex items-center gap-4">
            <h1 className="font-pixel text-lg tracking-wide text-amber-400 whitespace-nowrap shrink-0">
              PAÍSES EN GUERRA
            </h1>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              195 países soberanos · Mapa táctico global en 2D
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                camRef.current.zoom = Math.min(12, camRef.current.zoom * 1.25);
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Acercar</span>
            </button>
            <button
              onClick={() => {
                camRef.current.zoom = Math.max(0.55, camRef.current.zoom / 1.25);
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>Alejar</span>
            </button>
            <button
              onClick={() => {
                camRef.current = { x: MAP_W / 2, y: MAP_H / 2, zoom: 1.0 };
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs cursor-pointer"
            >
              Centrar Mundo
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenAchievements();
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 text-amber-300 hover:text-amber-200 hover:border-amber-400 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 shrink-0" />
              <span>Logros</span>
              <span className="font-mono-num text-amber-200/90">
                {achievementsUnlockedCount}/100
              </span>
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenOnline();
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Online</span>
            </button>
            <button
              onClick={() => onChangeDeviceMode('mobile')}
              title="Cambiar a modo Celular"
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-sky-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Celular</span>
            </button>
            <PWAInstallButton />
          </div>
        </div>

        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#091426]">
          <canvas
            ref={canvasRef}
            className="w-full h-full block cursor-crosshair pixelated touch-none"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={(e) => {
              activePointersRef.current.delete(e.pointerId);
              if (activePointersRef.current.size < 2) pinchRef.current.active = false;
              dragRef.current.active = false;
            }}
            onWheel={handleCanvasWheel}
          />

          <div className="pointer-events-none absolute bottom-4 left-4 bg-[#111B2B]/90 border border-slate-700 px-3 py-2 text-xs text-slate-300">
            Haz clic en cualquier territorio del mapa o usa el buscador derecho · Rueda del ratón para zoom · Arrastra para moverte
          </div>

          {hoveredId !== null && (
            <div className="pointer-events-none absolute top-4 left-4 bg-[#111B2B]/95 border border-slate-700 px-3 py-2 flex items-center gap-2.5 shadow-lg">
              <PixelFlag country={COUNTRIES_195[hoveredId]} size="sm" />
              <div className="text-xs">
                <span className="font-semibold text-white">{COUNTRIES_195[hoveredId].name}</span>
                <span className="text-slate-400"> · {COUNTRIES_195[hoveredId].continent}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right 195-Country Selector, Cloud Saves & Launch Panel */}
      <aside className="w-[415px] shrink-0 border-l border-slate-800 bg-[#111B2B] flex flex-col h-full">
        {renderCloudPanel()}

        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Nueva Campaña ({filteredCountries.length}/195)
            </h2>
            <button
              onClick={handleRandomCountry}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span>Aleatorio</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país, capital o código..."
              className="w-full bg-[#0B121E] border border-slate-700 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {CONTINENTS.map((cont) => (
              <button
                key={cont}
                onClick={() => setContinent(cont)}
                className={`px-2 py-1 text-[11px] font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                  continent === cont
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {cont}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable 195-Country Directory */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70">
          {filteredCountries.map((c) => {
            const isSel = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => selectAndCenter(c, true)}
                className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSel ? 'bg-amber-500/15' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PixelFlag country={c} size="sm" />
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold truncate ${isSel ? 'text-amber-300' : 'text-slate-100'}`}>
                      {c.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {c.capital} · {c.continent}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2 font-mono-num text-[11px]">
                  <div className="text-amber-300">${computeInitialMoney(c.gdp, c.military)}</div>
                  <div className="text-rose-300">Ej. {computeInitialArmy(c.military)}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Nation Summary & Launch CTA */}
        <div className="p-4 border-t border-slate-800 bg-[#0E1726] space-y-3">
          <div className="flex items-center gap-3">
            <PixelFlag country={selectedCountry} size="lg" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{selectedCountry.name}</div>
              <div className="text-xs text-slate-400">
                Capital: {selectedCountry.capital} · {selectedCountry.continent}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center bg-[#0B121E] border border-slate-800 p-2.5 font-mono-num">
            <div>
              <div className="text-[10px] text-slate-400">Dinero Inicial</div>
              <div className="text-xs font-semibold text-amber-300">
                ${computeInitialMoney(selectedCountry.gdp, selectedCountry.military)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Ejército Inicial</div>
              <div className="text-xs font-semibold text-rose-400">
                {computeInitialArmy(selectedCountry.military)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Territorio</div>
              <div className="text-xs font-semibold text-sky-400">
                {mapData.initialPixelCounts[selectedCountry.id]} px
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playTreaty();
              onStartCampaign(selectedId);
            }}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Comenzar Campaña</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
