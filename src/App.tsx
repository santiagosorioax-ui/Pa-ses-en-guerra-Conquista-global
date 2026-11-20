import { useCallback, useEffect, useRef, useState } from 'react';
import { GitBranch, Handshake, Map as MapIcon, ScrollText, Swords } from 'lucide-react';
import { CommandDrawer, type DrawerTab } from './components/CommandDrawer';
import { CountryActionPopup } from './components/CountryActionPopup';
import { CountrySearchModal } from './components/CountrySearchModal';
import { CountrySelectScreen } from './components/CountrySelectScreen';
import { CountryTreeModal } from './components/CountryTreeView';
import { DeviceModeScreen, type DeviceMode } from './components/DeviceModeScreen';
import { EventModal } from './components/EventModal';
import { MinimapBar } from './components/MinimapBar';
import { OnlineLobbyScreen } from './components/OnlineLobbyScreen';
import { OfflineIndicator, PWAInstallBanner } from './components/PWAInstallPrompt';
import { PixelFlag } from './components/PixelFlag';
import { RebellionPanel } from './components/RebellionPanel';
import { TopCommandBar } from './components/TopCommandBar';
import { TutorialOverlay } from './components/TutorialOverlay';
import { WorldMapCanvas, type CameraView } from './components/WorldMapCanvas';
import { useFirebase } from './contexts/FirebaseContext';
import { restoreRoomWorldState } from './engine/campaignSerializer';
import {
  executeGameAction,
  type GameActionPayload,
  type GameActionResult,
} from './engine/gameActions';
import {
  NUKE_RADIUS,
  canReachToAttack,
  createSimulation,
  getCountryDisplayName,
  respondToPendingProposal,
  stepSimulationDay,
  stepSimulationSecond,
  type MapMode,
  type SimulationState,
} from './engine/gameSimulation';
import { isQuotaExceededError } from './firebase';
import { MAP_H, MAP_W, buildWorldMapData, type WorldMapData } from './engine/mapRasterizer';
import { soundEngine } from './engine/soundEngine';
import {
  loadCampaignFromCloud,
  saveCampaignToCloud,
  type SavedCampaignSummary,
} from './services/cloudSaves';
import {
  hostBroadcastWorldState,
  hostStartMultiplayerMatch,
  leaveMultiplayerRoom,
  markRoomActionProcessed,
  sendRoomAction,
  subscribePendingRoomActions,
  subscribeRoom,
  subscribeRoomMembers,
  subscribeRoomState,
  type MultiplayerRoom,
  type RoomMember,
} from './services/multiplayerService';

type GameScreen = 'DEVICE_SELECT' | 'COUNTRY_SELECT' | 'ONLINE_LOBBY' | 'PLAYING';

export default function App() {
  const { user } = useFirebase();

  const [screen, setScreen] = useState<GameScreen>('DEVICE_SELECT');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const simRef = useRef<SimulationState | null>(null);
  const cachedMapDataRef = useRef<WorldMapData | null>(null);

  // Singleplayer automatic cloud save refs
  const activeCampaignIdRef = useRef<string>(`camp_${Date.now()}`);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastOutcomeRef = useRef<'none' | 'victory' | 'defeat'>('none');

  // Multiplayer room state & host sync refs
  const [mpRoomCode, setMpRoomCode] = useState<string | null>(null);
  const [mpRoom, setMpRoom] = useState<MultiplayerRoom | null>(null);
  const [mpMembers, setMpMembers] = useState<RoomMember[]>([]);
  const [mpSyncError, setMpSyncError] = useState<string | null>(null);
  const mpTickRef = useRef<number>(1);
  const isBroadcastingRef = useRef<boolean>(false);
  const pendingBroadcastRef = useRef<boolean>(false);
  const broadcastThrottleRef = useRef<number | null>(null);
  const quotaCooldownUntilRef = useRef<number>(0);
  const processedActionIdsRef = useRef<Set<string>>(new Set());

  const [renderTick, setRenderTick] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const lastActiveSpeedRef = useRef<number>(1);
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('manage');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [treeModalCountryId, setTreeModalCountryId] = useState<number | null>(null);
  const [placingDefense, setPlacingDefense] = useState(false);
  const [launchingNuke, setLaunchingNuke] = useState(false);
  const [defenseFeedback, setDefenseFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [mapToast, setMapToast] = useState<{ text: string; ok: boolean } | null>(null);
  const mapToastTimerRef = useRef<number | null>(null);
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

  const showMapToast = useCallback((text: string, ok: boolean) => {
    setMapToast({ text, ok });
    if (mapToastTimerRef.current !== null) {
      window.clearTimeout(mapToastTimerRef.current);
    }
    mapToastTimerRef.current = window.setTimeout(() => {
      setMapToast(null);
      mapToastTimerRef.current = null;
    }, 4500);
  }, []);

  const isOnlineMatch = Boolean(mpRoomCode && simRef.current?.isMultiplayer);
  const isOnlineHost = Boolean(
    isOnlineMatch && mpRoom && user && mpRoom.hostUid === user.uid
  );
  const isRemoteGuest = Boolean(isOnlineMatch && !isOnlineHost);

  const performCloudSave = useCallback(
    async (uidOverride?: string) => {
      const uid = uidOverride ?? user?.uid;
      const sim = simRef.current;
      if (!uid || !sim || sim.isMultiplayer) return;
      if (Date.now() < quotaCooldownUntilRef.current) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      pendingSaveRef.current = false;
      try {
        await saveCampaignToCloud(uid, activeCampaignIdRef.current, sim);
      } catch (err) {
        if (isQuotaExceededError(err)) {
          quotaCooldownUntilRef.current = Date.now() + 60_000;
        }
      } finally {
        isSavingRef.current = false;
        if (pendingSaveRef.current && Date.now() >= quotaCooldownUntilRef.current) {
          pendingSaveRef.current = false;
          void performCloudSave(uid);
        } else {
          pendingSaveRef.current = false;
        }
      }
    },
    [user?.uid]
  );

  const scheduleAutoCloudSave = useCallback(() => {
    if (!user?.uid || !simRef.current || simRef.current.isMultiplayer) return;
    if (Date.now() < quotaCooldownUntilRef.current) return;
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void performCloudSave(user.uid);
    }, 4500);
  }, [user?.uid, performCloudSave]);

  const handlePlayerMutation = useCallback(() => {
    bumpRender();
    scheduleAutoCloudSave();
  }, [bumpRender, scheduleAutoCloudSave]);

  const performHostBroadcast = useCallback(async () => {
    const sim = simRef.current;
    if (!mpRoomCode || !user?.uid || !sim || !sim.isMultiplayer) return;
    if (mpRoom && mpRoom.hostUid !== user.uid) return;
    if (Date.now() < quotaCooldownUntilRef.current) return;

    if (isBroadcastingRef.current) {
      pendingBroadcastRef.current = true;
      return;
    }

    isBroadcastingRef.current = true;
    pendingBroadcastRef.current = false;
    try {
      const nextTick = mpTickRef.current++;
      const finished = sim.outcome !== 'none';
      await hostBroadcastWorldState(mpRoomCode, user.uid, sim, nextTick, finished);
    } catch (err) {
      if (isQuotaExceededError(err)) {
        quotaCooldownUntilRef.current = Date.now() + 60_000;
      }
    } finally {
      isBroadcastingRef.current = false;
      if (pendingBroadcastRef.current && Date.now() >= quotaCooldownUntilRef.current) {
        pendingBroadcastRef.current = false;
        void performHostBroadcast();
      } else {
        pendingBroadcastRef.current = false;
      }
    }
  }, [mpRoomCode, mpRoom, user?.uid]);

  const scheduleHostBroadcast = useCallback(
    (immediate = false) => {
      if (Date.now() < quotaCooldownUntilRef.current) return;
      if (immediate) {
        if (broadcastThrottleRef.current !== null) {
          window.clearTimeout(broadcastThrottleRef.current);
          broadcastThrottleRef.current = null;
        }
        void performHostBroadcast();
        return;
      }
      if (broadcastThrottleRef.current !== null) return;
      broadcastThrottleRef.current = window.setTimeout(() => {
        broadcastThrottleRef.current = null;
        void performHostBroadcast();
      }, 4500);
    },
    [performHostBroadcast]
  );

  const handleExecuteAction = useCallback(
    async (action: GameActionPayload): Promise<GameActionResult> => {
      const sim = simRef.current;
      if (!sim) {
        return { ok: false, message: 'No hay partida activa.' };
      }

      if (sim.isMultiplayer && mpRoom && user && mpRoom.hostUid !== user.uid) {
        if (action.type === 'declare_war') {
          const reach = canReachToAttack(sim, sim.playerId, action.targetId);
          if (!reach.ok) {
            return {
              ok: false,
              message: reach.reason ?? 'Necesitas un puerto para atacar por mar.',
              needsPort: reach.viaSea,
            };
          }
        }
        try {
          await sendRoomAction(
            mpRoom.roomCode,
            mpRoom.hostUid,
            user.uid,
            sim.playerId,
            action
          );
          soundEngine.playClick();
          return {
            ok: true,
            message: 'Orden enviada en vivo al anfitrión...',
          };
        } catch (err) {
          return {
            ok: false,
            message: err instanceof Error ? err.message : 'Error al enviar orden online.',
          };
        }
      }

      const res = executeGameAction(sim, sim.playerId, action);
      if (sim.isMultiplayer) {
        bumpRender();
        scheduleHostBroadcast(true);
      } else {
        handlePlayerMutation();
      }
      return res;
    },
    [mpRoom, user, bumpRender, scheduleHostBroadcast, handlePlayerMutation]
  );

  // Subscribe to Room & Members whenever in an online room
  useEffect(() => {
    if (!mpRoomCode || !user) {
      setMpRoom(null);
      setMpMembers([]);
      setMpSyncError(null);
      return;
    }

    setMpSyncError(null);
    const unsubRoom = subscribeRoom(
      mpRoomCode,
      (room, meta) => {
        if (!room) {
          if (meta?.fromCache) return;
          setMpRoomCode(null);
          setMpRoom(null);
          setMpMembers([]);
          if (simRef.current?.isMultiplayer) {
            simRef.current = null;
            setScreen('ONLINE_LOBBY');
          }
          return;
        }
        setMpSyncError(null);
        setMpRoom(room);
      },
      (errMsg) => setMpSyncError(errMsg)
    );

    const unsubMembers = subscribeRoomMembers(
      mpRoomCode,
      (list) => {
        setMpMembers(list);
      },
      (errMsg) => setMpSyncError(errMsg)
    );

    return () => {
      unsubRoom();
      unsubMembers();
    };
  }, [mpRoomCode, user]);

  // Guest client: subscribe to /state/current as soon as host starts match
  useEffect(() => {
    if (
      !mpRoomCode ||
      !user ||
      !mpRoom ||
      mpRoom.hostUid === user.uid ||
      (mpRoom.status !== 'playing' && mpRoom.status !== 'finished')
    ) {
      return;
    }

    const unsubState = subscribeRoomState(mpRoomCode, (raw) => {
      const prevSim = simRef.current;
      const myMember = mpMembers.find((m) => m.uid === user.uid);
      let myCountryId = myMember && myMember.countryId >= 0 ? myMember.countryId : -1;

      if (myCountryId < 0 && raw.humanPlayers && typeof raw.humanPlayers === 'object') {
        const slots = Object.values(raw.humanPlayers as Record<string, { uid?: string; countryId?: number }>);
        const mine = slots.find((s) => s.uid === user.uid);
        if (mine && typeof mine.countryId === 'number') {
          myCountryId = mine.countryId;
        }
      }
      if (myCountryId < 0) return;

      if (!cachedMapDataRef.current) {
        cachedMapDataRef.current = buildWorldMapData();
      }

      const nextSim = restoreRoomWorldState(
        raw,
        myCountryId,
        cachedMapDataRef.current,
        prevSim?.isMultiplayer ? prevSim.playerHistory : []
      );

      // Contextual sound cues on guest updates
      if (prevSim?.isMultiplayer) {
        const prevWarCount = prevSim.wars.filter(
          (w) => w.a === myCountryId || w.b === myCountryId
        ).length;
        const nextWarCount = nextSim.wars.filter(
          (w) => w.a === myCountryId || w.b === myCountryId
        ).length;
        if (nextWarCount > prevWarCount) {
          soundEngine.playWarDeclared();
        }
        if (prevSim.outcome === 'none' && nextSim.outcome !== 'none') {
          soundEngine.playAnnexation(nextSim.winnerCountryId === myCountryId);
        }
      }

      simRef.current = nextSim;
      lastOutcomeRef.current = nextSim.outcome;
      bumpRender();

      setScreen((curr) => {
        if (curr === 'ONLINE_LOBBY') {
          setSelectedId(myCountryId);
          setDrawerTab('manage');
          setMobileDrawerOpen(false);
          setMapMode('political');
          setShowTutorial(false);
          const c = nextSim.countries[myCountryId];
          if (c) {
            setFocusRequest({
              x: c.capitalX,
              y: c.capitalY,
              zoom: c.pixels < 20 ? 3.5 : 2.0,
              nonce: Date.now(),
            });
          }
          return 'PLAYING';
        }
        return curr;
      });
    });

    return () => {
      unsubState();
    };
  }, [mpRoomCode, mpRoom, user, mpMembers, bumpRender]);

  // Host: subscribe to pending player actions and execute them on authoritative sim
  useEffect(() => {
    if (screen !== 'PLAYING' || !isOnlineHost || !mpRoomCode || !user?.uid) return;

    const unsubActions = subscribePendingRoomActions(mpRoomCode, user.uid, (actions) => {
      const sim = simRef.current;
      if (!sim || !sim.isMultiplayer) return;

      let executedAny = false;
      for (const act of actions) {
        if (processedActionIdsRef.current.has(act.id)) continue;
        processedActionIdsRef.current.add(act.id);

        const slot = sim.humanPlayers[act.actorCountryId];
        if (slot && slot.uid === act.senderUid) {
          executeGameAction(sim, act.actorCountryId, act.payload);
          executedAny = true;
        }
        void markRoomActionProcessed(mpRoomCode, act.id);
      }

      if (executedAny) {
        bumpRender();
        scheduleHostBroadcast(true);
      }
    });

    return () => {
      unsubActions();
    };
  }, [screen, isOnlineHost, mpRoomCode, user?.uid, bumpRender, scheduleHostBroadcast]);

  const handleStartCampaign = (countryId: number) => {
    setMpRoomCode(null);
    setMpRoom(null);
    setMpMembers([]);
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
      setMpRoomCode(null);
      setMpRoom(null);
      setMpMembers([]);
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

  const handleHostStartMatch = useCallback(async () => {
    if (!mpRoomCode || !user?.uid) return;
    const myMember = mpMembers.find((m) => m.uid === user.uid);
    if (!myMember || myMember.countryId < 0) {
      throw new Error('Debes escoger un país antes de empezar la partida.');
    }

    const humanSlots = mpMembers
      .filter((m) => m.countryId >= 0)
      .map((m) => ({
        uid: m.uid,
        displayName: m.displayName,
        photoUrl: m.photoUrl,
        countryId: m.countryId,
      }));

    const sim = createSimulation(myMember.countryId, {
      isMultiplayer: true,
      humanSlots,
    });
    simRef.current = sim;
    mpTickRef.current = 1;
    processedActionIdsRef.current.clear();
    lastOutcomeRef.current = 'none';

    await hostStartMultiplayerMatch(mpRoomCode, user.uid, sim);

    setSelectedId(myMember.countryId);
    setDrawerTab('manage');
    setMobileDrawerOpen(false);
    setMapMode('political');
    setSpeed(1);
    lastActiveSpeedRef.current = 1;
    setShowTutorial(false);
    setScreen('PLAYING');

    const c = sim.countries[myMember.countryId];
    setFocusRequest({
      x: c.capitalX,
      y: c.capitalY,
      zoom: c.pixels < 20 ? 3.5 : 2.0,
      nonce: Date.now(),
    });
    bumpRender();
  }, [mpRoomCode, user?.uid, mpMembers, bumpRender]);

  const handleLeaveOnlineRoom = useCallback(async () => {
    if (mpRoomCode && user?.uid && mpRoom) {
      try {
        await leaveMultiplayerRoom(
          mpRoomCode,
          user.uid,
          mpRoom.hostUid === user.uid,
          mpRoom.status
        );
      } catch {
        // ignore cleanup error
      }
    }
    setMpRoomCode(null);
    setMpRoom(null);
    setMpMembers([]);
    if (simRef.current?.isMultiplayer) {
      simRef.current = null;
    }
  }, [mpRoomCode, user?.uid, mpRoom]);

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
      if (isRemoteGuest) return;
      if (s > 0) lastActiveSpeedRef.current = s;
      setSpeed(s);
      soundEngine.playClick();
      if (s === 0 && user?.uid && !simRef.current?.isMultiplayer) {
        void performCloudSave(user.uid);
      }
    },
    [isRemoteGuest, user?.uid, performCloudSave]
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
        if (!isRemoteGuest) {
          e.preventDefault();
          setSpeed((prev) => (prev === 0 ? lastActiveSpeedRef.current : 0));
        }
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
        } else if (treeModalCountryId !== null) {
          setTreeModalCountryId(null);
        } else if (placingDefense) {
          setPlacingDefense(false);
        } else if (launchingNuke) {
          setLaunchingNuke(false);
        } else if (searchOpen) {
          setSearchOpen(false);
        } else if (simRef.current) {
          setSelectedId(simRef.current.playerId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    screen,
    isRemoteGuest,
    searchOpen,
    placingDefense,
    launchingNuke,
    treeModalCountryId,
    showTutorial,
    dismissTutorial,
  ]);

  // Simulation Day Accumulator (Singleplayer or Multiplayer Host only)
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0 || isRemoteGuest) return;

    const intervalMs = Math.max(45, Math.round(420 / speed));

    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      stepSimulationDay(sim);
      if (sim.outcome !== lastOutcomeRef.current) {
        lastOutcomeRef.current = sim.outcome;
        if (sim.isMultiplayer) {
          scheduleHostBroadcast(true);
        } else if (user?.uid) {
          void performCloudSave(user.uid);
        }
      }
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, speed, isRemoteGuest, bumpRender, user?.uid, performCloudSave, scheduleHostBroadcast]);

  // Per-second Economy Income Tick & Host Multiplayer Sync
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0 || isRemoteGuest) return;

    const intervalMs = Math.round(1000 / speed);
    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      stepSimulationSecond(sim);
      if (sim.isMultiplayer) {
        scheduleHostBroadcast(false);
      }
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, speed, isRemoteGuest, bumpRender, scheduleHostBroadcast]);

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

  // Automatic cloud save every 60s & on tab/window exit (singleplayer only)
  useEffect(() => {
    if (screen !== 'PLAYING' || !user?.uid || simRef.current?.isMultiplayer) return;

    const autoTimer = window.setInterval(() => {
      void performCloudSave(user.uid);
    }, 60000);

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
          onSelectOnline={(autoMode) => {
            setDeviceMode(autoMode);
            setScreen('ONLINE_LOBBY');
          }}
        />
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  if (screen === 'ONLINE_LOBBY') {
    return (
      <>
        <OnlineLobbyScreen
          deviceMode={deviceMode}
          onChangeDeviceMode={setDeviceMode}
          roomCode={mpRoomCode}
          room={mpRoom}
          members={mpMembers}
          syncError={mpSyncError}
          onEnterRoom={(code) => {
            setMpSyncError(null);
            setMpRoomCode(code);
          }}
          onLeaveRoom={handleLeaveOnlineRoom}
          onHostStartMatch={handleHostStartMatch}
          onBack={() => setScreen('COUNTRY_SELECT')}
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
          onOpenOnline={() => setScreen('ONLINE_LOBBY')}
        />
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  const sim = simRef.current;
  const isMobile = deviceMode === 'mobile';
  const showForeignPopup = selectedId !== null && selectedId !== sim.playerId;
  const incomingHumanOffers = sim.isMultiplayer
    ? sim.diplomaticOffers.filter((o) => o.toCountryId === sim.playerId)
    : [];
  const activeHumanOffer = incomingHumanOffers[0] ?? null;

  const openMobileTab = (tab: DrawerTab) => {
    soundEngine.playClick();
    setDefenseFeedback(null);
    setDrawerTab(tab);
    setMobileDrawerOpen(true);
    if (showForeignPopup) {
      setSelectedId(sim.playerId);
    }
  };

  const handleExitToMenu = async () => {
    setSpeed(0);
    setPlacingDefense(false);
    setLaunchingNuke(false);
    setMobileDrawerOpen(false);
    if (sim.isMultiplayer) {
      await handleLeaveOnlineRoom();
    } else if (user?.uid) {
      void performCloudSave(user.uid);
    }
    setScreen('COUNTRY_SELECT');
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
        onReturnToMenu={() => void handleExitToMenu()}
        roomCode={sim.isMultiplayer ? mpRoomCode : null}
        isRemoteGuest={isRemoteGuest}
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
            onPlaceDefense={async (mx, my) => {
              const res = await handleExecuteAction({ type: 'build_defense', x: mx, y: my });
              setDefenseFeedback({ text: res.message, ok: res.ok });
              showMapToast(res.message, res.ok);
              if (res.ok) {
                setPlacingDefense(false);
              }
            }}
            onCancelPlaceDefense={() => setPlacingDefense(false)}
            launchingNuke={launchingNuke}
            onLaunchNuke={async (mx, my) => {
              const res = await handleExecuteAction({ type: 'launch_nuke', x: mx, y: my });
              setDefenseFeedback({ text: res.message, ok: res.ok });
              showMapToast(res.message, res.ok);
              if (res.ok) {
                setLaunchingNuke(false);
              }
            }}
            onCancelLaunchNuke={() => setLaunchingNuke(false)}
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

          {launchingNuke && (
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,540px)] bg-orange-950/95 border border-orange-500 px-3 sm:px-4 py-2 shadow-2xl flex items-center justify-between gap-2.5 text-xs text-orange-100">
              <span>
                {isMobile
                  ? `Toca un país enemigo para lanzar la Bomba Nuclear (radio ${NUKE_RADIUS * 10} km)`
                  : `Haz clic sobre un país enemigo para detonar la Bomba Nuclear (radio ${NUKE_RADIUS * 10} km · clic derecho o Esc cancela)`}
              </span>
              <button
                onClick={() => setLaunchingNuke(false)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {mapToast && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-30 w-[min(94vw,520px)] px-3.5 py-2 border shadow-2xl text-xs flex items-center justify-between gap-2 ${
                placingDefense || launchingNuke ? 'top-14 sm:top-16' : 'top-2.5 sm:top-3'
              } ${
                mapToast.ok
                  ? 'bg-emerald-950/95 border-emerald-500/80 text-emerald-100'
                  : 'bg-red-950/95 border-red-600/80 text-red-100'
              }`}
            >
              <span>{mapToast.text}</span>
              <button
                onClick={() => setMapToast(null)}
                className="px-2 py-0.5 bg-slate-900/80 border border-slate-700 text-slate-300 shrink-0 cursor-pointer"
              >
                OK
              </button>
            </div>
          )}

          {/* Live Autonomous AI Geopolitical Feed (top-left of map) */}
          {sim.chronicle.length > 0 && !(isMobile && (activeHumanOffer || sim.pendingProposal || placingDefense || launchingNuke)) && (
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
              onOpenTreeModal={(cid) => {
                setTreeModalCountryId(cid);
                soundEngine.playClick();
              }}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {/* Underground Rebellion Panel when eliminated in Multiplayer */}
          {sim.isMultiplayer && !sim.countries[sim.playerId]?.alive && !showForeignPopup && (
            <RebellionPanel
              deviceMode={deviceMode}
              sim={sim}
              onExecuteAction={handleExecuteAction}
            />
          )}

          {/* Incoming Human Diplomatic Offer (Multiplayer) */}
          {activeHumanOffer && (
            <div
              className={
                isMobile
                  ? 'absolute top-2 left-2 right-2 z-30 bg-[#111B2B]/98 border border-emerald-500/80 p-3 shadow-2xl flex flex-col gap-2.5'
                  : 'absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,490px)] bg-[#111B2B]/95 border border-emerald-500/80 px-4 py-3 shadow-2xl flex items-center gap-4'
              }
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <PixelFlag
                  country={sim.countries[activeHumanOffer.fromCountryId].seed}
                  size="md"
                />
                <div className="text-xs min-w-0 flex-1">
                  <div className="font-bold text-emerald-300 truncate">
                    {sim.humanPlayers[activeHumanOffer.fromCountryId]
                      ? `${sim.humanPlayers[activeHumanOffer.fromCountryId].displayName} · `
                      : ''}
                    {getCountryDisplayName(sim.countries[activeHumanOffer.fromCountryId])}
                  </div>
                  <div className="text-slate-200 leading-snug">
                    {activeHumanOffer.type === 'alliance'
                      ? 'Propone firmar una Alianza Estratégica.'
                      : activeHumanOffer.type === 'peace'
                        ? 'Propone firmar un Tratado de Paz.'
                        : 'Solicita tu ayuda militar en su guerra actual.'}
                  </div>
                </div>
              </div>
              <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-1.5 shrink-0'}>
                <button
                  onClick={() =>
                    void handleExecuteAction({
                      type: 'respond_human_offer',
                      offerId: activeHumanOffer.id,
                      accept: true,
                    })
                  }
                  className={`bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer ${
                    isMobile ? 'min-h-[42px] py-2 px-3' : 'px-3 py-1.5'
                  }`}
                >
                  Aceptar
                </button>
                <button
                  onClick={() =>
                    void handleExecuteAction({
                      type: 'respond_human_offer',
                      offerId: activeHumanOffer.id,
                      accept: false,
                    })
                  }
                  className={`bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 cursor-pointer ${
                    isMobile ? 'min-h-[42px] py-2 px-3' : 'px-3 py-1.5'
                  }`}
                >
                  Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Incoming Diplomatic Proposal from AI Nation (Singleplayer) */}
          {!activeHumanOffer && sim.pendingProposal && (
            <div
              className={
                isMobile
                  ? 'absolute top-2 left-2 right-2 z-30 bg-[#111B2B]/98 border border-amber-500/70 p-3 shadow-2xl flex flex-col gap-2.5'
                  : 'absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,470px)] bg-[#111B2B]/95 border border-amber-500/70 px-4 py-3 shadow-2xl flex items-center gap-4'
              }
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <PixelFlag
                  country={sim.countries[sim.pendingProposal.fromId].seed}
                  size="md"
                />
                <div className="text-xs min-w-0 flex-1">
                  <div className="font-bold text-amber-300 truncate">
                    Propuesta · {getCountryDisplayName(sim.countries[sim.pendingProposal.fromId])}
                  </div>
                  <div className="text-slate-200 leading-snug">
                    {sim.pendingProposal.type === 'alliance'
                      ? 'Propone firmar una Alianza Estratégica.'
                      : 'Solicita firmar un Tratado de Paz.'}
                  </div>
                </div>
              </div>
              <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'flex items-center gap-1.5 shrink-0'}>
                <button
                  onClick={() => {
                    respondToPendingProposal(sim, true);
                    handlePlayerMutation();
                  }}
                  className={`bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer ${
                    isMobile ? 'min-h-[42px] py-2 px-3' : 'px-3 py-1.5'
                  }`}
                >
                  Aceptar
                </button>
                <button
                  onClick={() => {
                    respondToPendingProposal(sim, false);
                    handlePlayerMutation();
                  }}
                  className={`bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 cursor-pointer ${
                    isMobile ? 'min-h-[42px] py-2 px-3' : 'px-3 py-1.5'
                  }`}
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
              countryName={getCountryDisplayName(sim.countries[sim.playerId])}
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
            onOpenTreeModal={(cid) => {
              setTreeModalCountryId(cid);
              soundEngine.playClick();
            }}
            onExecuteAction={async (act) => {
              setDefenseFeedback(null);
              return handleExecuteAction(act);
            }}
            placingDefense={placingDefense}
            onTogglePlaceDefense={() => {
              setDefenseFeedback(null);
              setLaunchingNuke(false);
              setPlacingDefense((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            launchingNuke={launchingNuke}
            onToggleLaunchNuke={() => {
              setDefenseFeedback(null);
              setPlacingDefense(false);
              setLaunchingNuke((v) => !v);
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
            onClick={() => openMobileTab('tree')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
              mobileDrawerOpen && drawerTab === 'tree'
                ? 'text-amber-300 bg-[#131F33] border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Árbol</span>
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

      {treeModalCountryId !== null && (
        <CountryTreeModal
          sim={sim}
          countryId={treeModalCountryId}
          onClose={() => setTreeModalCountryId(null)}
          onUnlockNode={(nodeId) => {
            void handleExecuteAction({ type: 'unlock_tree_node', nodeId });
          }}
          onFocusCountry={(cid) => {
            setSelectedId(cid);
            if (isMobile) setMobileDrawerOpen(false);
            handleJumpToCountry(cid);
            soundEngine.playSelectCountry();
          }}
          onSwitchToPlayerTree={() => setTreeModalCountryId(sim.playerId)}
        />
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
        onRestartMenu={() => void handleExitToMenu()}
      />

      <PWAInstallBanner liftAboveBottomNav={isMobile} />
      <OfflineIndicator liftAboveBottomNav={isMobile} />
    </div>
  );
}
