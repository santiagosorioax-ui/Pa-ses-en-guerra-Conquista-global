import { useCallback, useEffect, useRef, useState } from 'react';
import { Handshake, Map as MapIcon, ScrollText, Swords, TrendingUp } from 'lucide-react';
import { CommandDrawer, type DrawerTab } from './components/CommandDrawer';
import { CountryActionPopup } from './components/CountryActionPopup';
import { CountrySearchModal } from './components/CountrySearchModal';
import { CountrySelectScreen } from './components/CountrySelectScreen';
import { DeviceModeScreen, type DeviceMode } from './components/DeviceModeScreen';
import { EventModal } from './components/EventModal';
import { MinimapBar } from './components/MinimapBar';
import { OfflineIndicator, PWAInstallBanner } from './components/PWAInstallPrompt';
import { TopCommandBar } from './components/TopCommandBar';
import { TutorialOverlay } from './components/TutorialOverlay';
import { WorldMapCanvas, type CameraView } from './components/WorldMapCanvas';
import { useFirebase } from './contexts/FirebaseContext';
import { MAP_H, MAP_W } from './engine/mapRasterizer';
import {
  buildDefenseAt,
  createSimulation,
  respondToPendingProposal,
  stepSimulationDay,
  stepSimulationSecond,
  type MapMode,
  type SimulationState,
} from './engine/gameSimulation';
import { soundEngine } from './engine/soundEngine';
import {
  loadCampaignFromCloud,
  saveCampaignToCloud,
  type SavedCampaignSummary,
} from './services/cloudSaves';
import { PixelFlag } from './components/PixelFlag';

type GameScreen = 'DEVICE_SELECT' | 'COUNTRY_SELECT' | 'PLAYING';

export default function App() {
  const { user } = useFirebase();

  const [screen, setScreen] = useState<GameScreen>('DEVICE_SELECT');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const simRef = useRef<SimulationState | null>(null);
  const activeCampaignIdRef = useRef<string>(`camp_${Date.now()}`);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastOutcomeRef = useRef<'none' | 'victory' | 'defeat'>('none');
  const [renderTick, setRenderTick] = useState(0);

  const [speed, setSpeed] = useState<number>(1);
  const lastActiveSpeedRef = useRef<number>(1);
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('manage');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [placingDefense, setPlacingDefense] = useState(false);
  const [defenseFeedback, setDefenseFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const [focusRequest, setFocusRequest] = useState<{
    x: number;
    y: number;
    zoom?: number;
    nonce: number;
  } | null>(null);

  const [cameraView, setCameraView] = useState<CameraView>({
    x: MAP_W / 2,
    y: MAP_H / 2,
    zoom: 1.0,
  });
  const [viewportSize, setViewportSize] = useState({ w: MAP_W, h: MAP_H });

  const bumpRender = useCallback(() => {
    setRenderTick((t) => t + 1);
  }, []);

  const performCloudSave = useCallback(
    async (uidOverride?: string) => {
      const uid = uidOverride ?? user?.uid;
      const sim = simRef.current;
      if (!uid || !sim) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      pendingSaveRef.current = false;
      try {
        await saveCampaignToCloud(uid, activeCampaignIdRef.current, sim);
      } catch {
        // Silent automatic retry on next cycle or mutation
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          void performCloudSave(uid);
        }
      }
    },
    [user?.uid]
  );

  const scheduleAutoCloudSave = useCallback(() => {
    if (!user?.uid || !simRef.current) return;
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void performCloudSave(user.uid);
    }, 1200);
  }, [user?.uid, performCloudSave]);

  const handlePlayerMutation = useCallback(() => {
    bumpRender();
    scheduleAutoCloudSave();
  }, [bumpRender, scheduleAutoCloudSave]);

  const handleStartCampaign = (countryId: number) => {
    const sim = createSimulation(countryId);
    simRef.current = sim;
    lastOutcomeRef.current = 'none';
    activeCampaignIdRef.current = `camp_${Date.now()}`;
    setSelectedId(countryId);
    setDrawerTab('manage');
    setMobileDrawerOpen(false);
    setMapMode('political');
    setSpeed(1);
    lastActiveSpeedRef.current = 1;
    setScreen('PLAYING');
    const c = sim.countries[countryId];
    setFocusRequest({
      x: c.capitalX,
      y: c.capitalY,
      zoom: c.pixels < 20 ? 3.5 : 2.0,
      nonce: Date.now(),
    });
    try {
      if (!window.localStorage.getItem('paises_en_guerra_tutorial_done')) {
        setShowTutorial(true);
      }
    } catch {
      setShowTutorial(true);
    }
    bumpRender();
    if (user?.uid) {
      void performCloudSave(user.uid);
    }
  };

  const handleResumeCampaign = useCallback(
    async (summary: SavedCampaignSummary) => {
      if (!user?.uid) return;
      const loadedSim = await loadCampaignFromCloud(user.uid, summary.campaignId);
      if (!loadedSim) {
        throw new Error('No se encontró el estado de la campaña.');
      }
      simRef.current = loadedSim;
      lastOutcomeRef.current = loadedSim.outcome;
      activeCampaignIdRef.current = summary.campaignId;
      setSelectedId(loadedSim.playerId);
      setDrawerTab('manage');
      setMobileDrawerOpen(false);
      setMapMode('political');
      setSpeed(1);
      lastActiveSpeedRef.current = 1;
      setShowTutorial(false);
      setScreen('PLAYING');
      const c = loadedSim.countries[loadedSim.playerId];
      setFocusRequest({
        x: c.capitalX,
        y: c.capitalY,
        zoom: c.pixels < 20 ? 3.5 : 2.0,
        nonce: Date.now(),
      });
      bumpRender();
    },
    [user?.uid, bumpRender]
  );

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem('paises_en_guerra_tutorial_done', '1');
    } catch {
      // ignore storage errors
    }
    soundEngine.playClick();
  }, []);

  const handleSetSpeed = useCallback(
    (s: number) => {
      if (s > 0) lastActiveSpeedRef.current = s;
      setSpeed(s);
      soundEngine.playClick();
      if (s === 0 && user?.uid) {
        void performCloudSave(user.uid);
      }
    },
    [user?.uid, performCloudSave]
  );

  // PC Keyboard Shortcuts
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setSpeed((prev) => (prev === 0 ? lastActiveSpeedRef.current : 0));
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === '1') {
        setMapMode('political');
      } else if (e.key === '2') {
        setMapMode('diplomatic');
      } else if (e.key === 'Escape') {
        if (showTutorial) {
          dismissTutorial();
        } else if (placingDefense) {
          setPlacingDefense(false);
        } else if (searchOpen) {
          setSearchOpen(false);
        } else if (simRef.current) {
          setSelectedId(simRef.current.playerId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, searchOpen, placingDefense, showTutorial, dismissTutorial]);

  // Simulation Day Accumulator
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0) return;

    const intervalMs = Math.max(45, Math.round(420 / speed));

    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      stepSimulationDay(sim);
      if (sim.outcome !== lastOutcomeRef.current) {
        lastOutcomeRef.current = sim.outcome;
        if (user?.uid) {
          void performCloudSave(user.uid);
        }
      }
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, speed, bumpRender, user?.uid, performCloudSave]);

  // Per-second Economy Income Tick (every 1s at 1x, 0.5s at 2x)
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0) return;

    const intervalMs = Math.round(1000 / speed);
    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      stepSimulationSecond(sim);
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, speed, bumpRender]);

  const handleCameraChange = useCallback((cam: CameraView, vw: number, vh: number) => {
    setCameraView((prev) => {
      if (
        Math.abs(prev.x - cam.x) < 0.5 &&
        Math.abs(prev.y - cam.y) < 0.5 &&
        Math.abs(prev.zoom - cam.zoom) < 0.02
      ) {
        return prev;
      }
      return { ...cam };
    });
    setViewportSize((prev) => {
      if (Math.abs(prev.w - vw) < 1 && Math.abs(prev.h - vh) < 1) return prev;
      return { w: vw, h: vh };
    });
  }, []);

  const handleJumpToCountry = useCallback((id: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const c = sim.countries[id];
    setFocusRequest({
      x: c.capitalX,
      y: c.capitalY,
      zoom: c.pixels < 15 ? 4.2 : 2.2,
      nonce: Date.now(),
    });
  }, []);

  // Automatic cloud save every 10s, on initial connection, and when leaving tab/window
  useEffect(() => {
    if (screen !== 'PLAYING' || !user?.uid) return;

    const autoTimer = window.setInterval(() => {
      void performCloudSave(user.uid);
    }, 10000);

    const onVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        void performCloudSave(user.uid);
      }
    };
    const onPageHide = () => {
      void performCloudSave(user.uid);
    };

    document.addEventListener('visibilitychange', onVisibilityOrHide);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(autoTimer);
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityOrHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [screen, user?.uid, performCloudSave]);

  if (screen === 'DEVICE_SELECT') {
    return (
      <>
        <DeviceModeScreen
          onSelectMode={(mode) => {
            setDeviceMode(mode);
            setScreen('COUNTRY_SELECT');
          }}
        />
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  if (screen === 'COUNTRY_SELECT' || !simRef.current) {
    return (
      <>
        <CountrySelectScreen
          deviceMode={deviceMode}
          onChangeDeviceMode={setDeviceMode}
          onStartCampaign={handleStartCampaign}
          onResumeCampaign={handleResumeCampaign}
        />
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  const sim = simRef.current;
  const isMobile = deviceMode === 'mobile';
  const showForeignPopup = selectedId !== null && selectedId !== sim.playerId;

  const openMobileTab = (tab: DrawerTab) => {
    soundEngine.playClick();
    setDefenseFeedback(null);
    setDrawerTab(tab);
    setMobileDrawerOpen(true);
    if (showForeignPopup) {
      setSelectedId(sim.playerId);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B121E] text-slate-100 overflow-hidden">
      <TopCommandBar
        deviceMode={deviceMode}
        onSwitchDeviceMode={(mode) => {
          setDeviceMode(mode);
          setMobileDrawerOpen(false);
        }}
        sim={sim}
        speed={speed}
        onSetSpeed={handleSetSpeed}
        soundEnabled={soundEnabled}
        onToggleSound={() => {
          const next = !soundEnabled;
          soundEngine.enabled = next;
          setSoundEnabled(next);
        }}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenTutorial={() => setShowTutorial(true)}
        onSelectOwnCountry={() => {
          setSelectedId(sim.playerId);
          setMobileDrawerOpen(false);
          handleJumpToCountry(sim.playerId);
          soundEngine.playSelectCountry();
        }}
        onReturnToMenu={() => {
          setSpeed(0);
          setMobileDrawerOpen(false);
          if (user?.uid) {
            void performCloudSave(user.uid);
          }
          setScreen('COUNTRY_SELECT');
        }}
      />

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 relative min-w-0">
          <WorldMapCanvas
            simRef={simRef as React.MutableRefObject<SimulationState>}
            renderTick={renderTick}
            mapMode={mapMode}
            selectedId={selectedId}
            onSelectCountry={(id) => {
              if (id !== null) {
                setSelectedId(id);
                if (isMobile && id !== sim.playerId) {
                  setMobileDrawerOpen(false);
                }
                soundEngine.playSelectCountry();
              } else {
                setSelectedId(sim.playerId);
              }
            }}
            focusRequest={focusRequest}
            onCameraChange={handleCameraChange}
            placingDefense={placingDefense}
            onPlaceDefense={(mx, my) => {
              const err = buildDefenseAt(sim, sim.playerId, mx, my);
              if (err) {
                setDefenseFeedback({ text: err, ok: false });
              } else {
                setDefenseFeedback({
                  text: '¡Defensa construida! Protege tu territorio dentro de su radio.',
                  ok: true,
                });
                setPlacingDefense(false);
                handlePlayerMutation();
              }
            }}
            onCancelPlaceDefense={() => setPlacingDefense(false)}
          />

          {placingDefense && (
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,520px)] bg-emerald-950/95 border border-emerald-500 px-3 sm:px-4 py-2 shadow-2xl flex items-center justify-between gap-2.5 text-xs text-emerald-100">
              <span>
                {isMobile
                  ? 'Toca en tu país para colocar la Defensa'
                  : 'Haz clic en cualquier punto de tu país para colocar la Defensa (radio de protección visible)'}
              </span>
              <button
                onClick={() => setPlacingDefense(false)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Live Autonomous AI Geopolitical Feed (top-left of map) */}
          {sim.chronicle.length > 0 && (
            <div
              className={`absolute z-20 space-y-1.5 pointer-events-none ${
                isMobile
                  ? 'top-2 left-2 w-[calc(100vw-16px)] max-w-[270px]'
                  : 'top-3 left-3 w-[330px]'
              }`}
            >
              {sim.chronicle.slice(0, isMobile ? 1 : 3).map((entry) => {
                const typeLabel =
                  entry.type === 'war'
                    ? 'Guerra'
                    : entry.type === 'alliance'
                      ? 'Alianza'
                      : entry.type === 'peace'
                        ? 'Paz'
                        : entry.type === 'capital'
                          ? '¡Capital!'
                          : entry.type === 'annex'
                            ? 'Anexión'
                            : 'Mundial';
                const labelColor =
                  entry.type === 'war' || entry.type === 'annex' || entry.type === 'capital'
                    ? 'text-red-400'
                    : entry.type === 'alliance' || entry.type === 'peace'
                      ? 'text-sky-400'
                      : 'text-amber-400';

                return (
                  <button
                    key={entry.id}
                    onClick={() => {
                      if (entry.focusCountryId !== undefined) {
                        setSelectedId(entry.focusCountryId);
                        if (isMobile) setMobileDrawerOpen(false);
                        handleJumpToCountry(entry.focusCountryId);
                        soundEngine.playSelectCountry();
                      }
                    }}
                    className="pointer-events-auto w-full text-left bg-[#111B2B]/90 hover:bg-[#172338]/95 border border-slate-700/80 px-2.5 py-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono-num">
                      <span className={`font-semibold ${labelColor}`}>{typeLabel}</span>
                      <span className="text-slate-400">{entry.dateLabel}</span>
                    </div>
                    <div className="text-[11px] text-slate-200 leading-snug line-clamp-2">
                      {entry.text}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Popup al tocar o hacer clic en cualquier país extranjero */}
          {showForeignPopup && (
            <CountryActionPopup
              deviceMode={deviceMode}
              sim={sim}
              targetId={selectedId}
              onClose={() => setSelectedId(sim.playerId)}
              onMutated={handlePlayerMutation}
            />
          )}

          {/* Incoming Diplomatic Proposal from AI Nation */}
          {sim.pendingProposal && (
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100vw-16px)] max-w-md bg-[#111B2B]/95 border border-amber-500/70 px-3 sm:px-4 py-2.5 sm:py-3 shadow-2xl flex items-center gap-3 sm:gap-4">
              <PixelFlag
                country={sim.countries[sim.pendingProposal.fromId].seed}
                size="md"
              />
              <div className="text-xs min-w-0 flex-1">
                <div className="font-bold text-amber-300 truncate">
                  Propuesta · {sim.countries[sim.pendingProposal.fromId].seed.name}
                </div>
                <div className="text-slate-200 leading-snug">
                  {sim.pendingProposal.type === 'alliance'
                    ? 'Propone firmar una Alianza Estratégica.'
                    : 'Solicita firmar un Tratado de Paz.'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    respondToPendingProposal(sim, true);
                    handlePlayerMutation();
                  }}
                  className="px-2.5 py-1.5 sm:py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => {
                    respondToPendingProposal(sim, false);
                    handlePlayerMutation();
                  }}
                  className="px-2.5 py-1.5 sm:py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 cursor-pointer"
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Bottom-left Minimap & Map Modes */}
          <div
            className={`absolute z-20 pointer-events-none ${
              isMobile ? 'bottom-2 left-2' : 'bottom-3 left-3'
            }`}
          >
            <MinimapBar
              deviceMode={deviceMode}
              simRef={simRef as React.MutableRefObject<SimulationState>}
              renderTick={renderTick}
              mapMode={mapMode}
              onChangeMapMode={(mode) => {
                setMapMode(mode);
                soundEngine.playClick();
              }}
              camera={cameraView}
              viewportSize={viewportSize}
              onJumpTo={(x, y, zoom) => {
                setFocusRequest({ x, y, zoom, nonce: Date.now() });
              }}
            />
          </div>

          {/* Subtle PC Controls Hint in bottom-right of map viewport */}
          {!isMobile && (
            <div className="pointer-events-none absolute bottom-3 right-3 z-10 bg-[#111B2B]/85 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-400 font-mono-num">
              WASD / Arrastrar: Mover · Rueda: Zoom · Espacio: Pausa · 1-2: Mapas · F: Buscar
            </div>
          )}

          {showTutorial && (
            <TutorialOverlay
              countryName={sim.countries[sim.playerId].seed.name}
              deviceMode={deviceMode}
              onFinish={dismissTutorial}
            />
          )}
        </div>

        {(!isMobile || mobileDrawerOpen) && (
          <CommandDrawer
            deviceMode={deviceMode}
            onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
            sim={sim}
            selectedId={selectedId}
            activeTab={drawerTab}
            onChangeTab={(tab) => {
              setDefenseFeedback(null);
              setDrawerTab(tab);
            }}
            onSelectCountry={(id) => {
              setSelectedId(id);
              if (isMobile && id !== null && id !== sim.playerId) {
                setMobileDrawerOpen(false);
              }
              soundEngine.playSelectCountry();
            }}
            onJumpToCountry={handleJumpToCountry}
            onMutated={() => {
              setDefenseFeedback(null);
              handlePlayerMutation();
            }}
            placingDefense={placingDefense}
            onTogglePlaceDefense={() => {
              setDefenseFeedback(null);
              setPlacingDefense((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            defenseFeedback={defenseFeedback}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <nav className="h-14 shrink-0 grid grid-cols-5 border-t border-slate-800 bg-[#0E1726] z-30">
          <button
            onClick={() => {
              soundEngine.playClick();
              setMobileDrawerOpen(false);
              if (showForeignPopup) {
                setSelectedId(sim.playerId);
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              !mobileDrawerOpen
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Mapa</span>
          </button>

          <button
            onClick={() => openMobileTab('manage')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              mobileDrawerOpen && drawerTab === 'manage'
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Mando</span>
          </button>

          <button
            onClick={() => openMobileTab('diplomacy')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              mobileDrawerOpen && drawerTab === 'diplomacy'
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Handshake className="w-4 h-4" />
            <span>Alianzas</span>
          </button>

          <button
            onClick={() => openMobileTab('charts')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              mobileDrawerOpen && drawerTab === 'charts'
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Gráficos</span>
          </button>

          <button
            onClick={() => openMobileTab('chronicle')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              mobileDrawerOpen && drawerTab === 'chronicle'
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>Crónica</span>
          </button>
        </nav>
      )}

      <CountrySearchModal
        sim={sim}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPickCountry={(id) => {
          setSelectedId(id);
          if (isMobile) setMobileDrawerOpen(false);
          handleJumpToCountry(id);
          soundEngine.playSelectCountry();
        }}
      />

      <EventModal
        sim={sim}
        eventModal={sim.activeEvent}
        onResolved={handlePlayerMutation}
        onContinueSandbox={() => {
          sim.outcome = 'none';
          sim.sandboxAfterVictory = true;
          lastOutcomeRef.current = 'none';
          handlePlayerMutation();
        }}
        onRestartMenu={() => {
          setSpeed(0);
          setMobileDrawerOpen(false);
          if (user?.uid) {
            void performCloudSave(user.uid);
          }
          setScreen('COUNTRY_SELECT');
        }}
      />

      <PWAInstallBanner liftAboveBottomNav={isMobile} />
      <OfflineIndicator liftAboveBottomNav={isMobile} />
    </div>
  );
}
