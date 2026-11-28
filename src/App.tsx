import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Handshake, Map as MapIcon, ScrollText, Skull, Swords, TrendingUp, Trophy, X } from 'lucide-react';
import { AchievementsModal } from './components/AchievementsModal';
import { CommandDrawer, type DrawerTab } from './components/CommandDrawer';
import { CountryActionPopup } from './components/CountryActionPopup';
import { CountrySearchModal } from './components/CountrySearchModal';
import { CountrySelectScreen } from './components/CountrySelectScreen';
import {
  DeviceModeScreen,
  type DeviceMode,
  type UnifiedSavedCampaign,
} from './components/DeviceModeScreen';
import { DiplomaticMeetingModal } from './components/DiplomaticMeetingModal';
import { EventModal } from './components/EventModal';
import { GenealogyTreeModal } from './components/GenealogyTreeModal';
import { MinimapBar } from './components/MinimapBar';
import { OnlineLobbyScreen } from './components/OnlineLobbyScreen';
import { OfflineIndicator, PWAInstallBanner } from './components/PWAInstallPrompt';
import { PixelFlag } from './components/PixelFlag';
import { RebellionPanel } from './components/RebellionPanel';
import { TopCommandBar } from './components/TopCommandBar';
import { TutorialOverlay } from './components/TutorialOverlay';
import { WorldMapCanvas, type CameraView } from './components/WorldMapCanvas';
import { useFirebase } from './contexts/FirebaseContext';
import {
  evaluateAchievements,
  loadAchievementProfile,
  saveAchievementProfile,
  type AchievementDef,
  type AchievementProfile,
  type AchievementStats,
} from './data/achievements';
import type { FocusNode } from './data/countryTrees';
import { restoreRoomWorldState } from './engine/campaignSerializer';
import {
  executeGameAction,
  validateGameActionLocally,
  type GameActionPayload,
  type GameActionResult,
} from './engine/gameActions';
import {
  ANTI_NUKE_RADIUS,
  BARRACKS_ARMY_CAP_BONUS,
  BARRACKS_RADIUS,
  NUKE_RADIUS,
  createSimulation,
  getAntiNukeCost,
  getBarracksCost,
  getCountryName,
  getCountryRebellionStrength,
  getEmpirePreviewBounds,
  getEmpireTargetProgress,
  getEnemies,
  respondToPendingProposal,
  stepSimulationDay,
  stepSimulationSecond,
  type GameDifficulty,
  type MapMode,
  type SimulationState,
} from './engine/gameSimulation';
import type { EmpireHighlightConfig } from './engine/pixelRenderer';
import {
  formatFirestoreUserError,
  isFirestoreQuotaCooldownActive,
  isQuotaExceededError,
} from './firebase';
import { MAP_H, MAP_W, buildWorldMapData, type WorldMapData } from './engine/mapRasterizer';
import { soundEngine } from './engine/soundEngine';
import {
  deleteCampaignFromCloud,
  loadCampaignSnapshotWithMetaFromCloud,
  saveCampaignToCloud,
} from './services/cloudSaves';
import {
  deleteLocalCampaign,
  getLastPlayedLocalCampaign,
  listLocalCampaigns,
  loadLocalCampaignSnapshot,
  saveCampaignLocally,
  type LocalCampaignSummary,
} from './services/localSaves';
import {
  loadHardModeUnlockProgress,
  recordSingleMatchCaptures,
  type HardModeUnlockProgress,
} from './services/hardModeUnlock';
import {
  hostBroadcastWorldState,
  hostStartMultiplayerMatch,
  leaveMultiplayerRoom,
  loadRoomWorldStateOnce,
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
  const { user, canAccessOnline, authBusy, campaigns, signInWithGoogle } = useFirebase();

  const [screen, setScreen] = useState<GameScreen>('DEVICE_SELECT');
  const [selectedDifficulty, setSelectedDifficulty] = useState<GameDifficulty>('normal');
  const deviceMode: DeviceMode = 'mobile';
  const [onlineDevNotice, setOnlineDevNotice] = useState(false);
  const onlineNoticeTimerRef = useRef<number | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const simRef = useRef<SimulationState | null>(null);
  const cachedMapDataRef = useRef<WorldMapData | null>(null);

  // Singleplayer automatic local (offline) + cloud save state & refs
  const [localCampaigns, setLocalCampaigns] = useState<LocalCampaignSummary[]>(() =>
    listLocalCampaigns()
  );
  const activeCampaignIdRef = useRef<string>(`camp_${Date.now()}`);
  const isSavingRef = useRef<boolean>(false);
  const pendingSaveRef = useRef<boolean>(false);
  const isSyncingOfflineRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastOutcomeRef = useRef<'none' | 'victory' | 'defeat'>('none');

  // Multiplayer room state & host sync refs
  const [mpRoomCode, setMpRoomCode] = useState<string | null>(null);
  const [mpRoom, setMpRoom] = useState<MultiplayerRoom | null>(null);
  const [mpMembers, setMpMembers] = useState<RoomMember[]>([]);
  const mpMembersRef = useRef<RoomMember[]>([]);
  const [mpSyncError, setMpSyncError] = useState<string | null>(null);
  const [respondedOfferIds, setRespondedOfferIds] = useState<number[]>([]);
  const mpTickRef = useRef<number>(1);
  const lastAppliedTickRef = useRef<number>(0);
  const lastBroadcastAtRef = useRef<number>(0);
  const isBroadcastingRef = useRef<boolean>(false);
  const pendingBroadcastRef = useRef<boolean>(false);
  const finishedBroadcastSentRef = useRef<boolean>(false);
  const broadcastThrottleRef = useRef<number | null>(null);
  const quotaCooldownUntilRef = useRef<number>(0);
  const lastCloudSaveAtRef = useRef<number>(0);
  const consecutiveSyncFailuresRef = useRef<number>(0);
  const processedActionIdsRef = useRef<Set<string>>(new Set());

  const [renderTick, setRenderTick] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const lastActiveSpeedRef = useRef<number>(1);
  const [mapMode, setMapMode] = useState<MapMode>('political');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('manage');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [treeCountryId, setTreeCountryId] = useState<number | null>(null);
  const [treeInitialNodeId, setTreeInitialNodeId] = useState<FocusNode['id'] | undefined>(undefined);
  const [meetingTargetId, setMeetingTargetId] = useState<number | null>(null);
  const [empireHighlight, setEmpireHighlight] = useState<EmpireHighlightConfig | null>(null);
  const [empireRemainingMs, setEmpireRemainingMs] = useState<number>(0);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [achievementProfile, setAchievementProfile] = useState<AchievementProfile>(() =>
    loadAchievementProfile(null)
  );
  const achievementProfileRef = useRef<AchievementProfile>(achievementProfile);
  const lastMatchAnnexedRef = useRef<number>(0);
  const matchVictoryCountedRef = useRef<boolean>(false);
  const [achievementToast, setAchievementToast] = useState<{
    ach: AchievementDef;
    extraCount: number;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [hardModeProgress, setHardModeProgress] = useState<HardModeUnlockProgress>(() =>
    loadHardModeUnlockProgress(null, achievementProfileRef.current)
  );
  const [hardModeUnlockToast, setHardModeUnlockToast] = useState(false);
  const hardModeToastTimerRef = useRef<number | null>(null);
  const [placingDefense, setPlacingDefense] = useState(false);
  const [placingAntiNuke, setPlacingAntiNuke] = useState(false);
  const [placingBarracks, setPlacingBarracks] = useState(false);
  const [launchingNuke, setLaunchingNuke] = useState(false);
  const [defenseFeedback, setDefenseFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [menuTutorialOpen, setMenuTutorialOpen] = useState(false);

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

  // Load user-specific achievements & hard-mode unlock progress when Firebase user changes
  useEffect(() => {
    const loaded = loadAchievementProfile(user?.uid);
    achievementProfileRef.current = loaded;
    setAchievementProfile(loaded);
    setHardModeProgress(loadHardModeUnlockProgress(user?.uid, loaded));
  }, [user?.uid]);

  useEffect(() => {
    mpMembersRef.current = mpMembers;
  }, [mpMembers]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (hardModeToastTimerRef.current !== null) {
        window.clearTimeout(hardModeToastTimerRef.current);
      }
      if (onlineNoticeTimerRef.current !== null) {
        window.clearTimeout(onlineNoticeTimerRef.current);
      }
      if (broadcastThrottleRef.current !== null) {
        window.clearTimeout(broadcastThrottleRef.current);
      }
    };
  }, []);

  const triggerOnlineDevNotice = useCallback(() => {
    setOnlineDevNotice(true);
    if (onlineNoticeTimerRef.current !== null) {
      window.clearTimeout(onlineNoticeTimerRef.current);
    }
    onlineNoticeTimerRef.current = window.setTimeout(() => {
      onlineNoticeTimerRef.current = null;
      setOnlineDevNotice(false);
    }, 5200);
  }, []);

  const handlePressOnline = useCallback(() => {
    if (canAccessOnline) {
      setOnlineDevNotice(false);
      setScreen('ONLINE_LOBBY');
    } else {
      triggerOnlineDevNotice();
    }
  }, [canAccessOnline, triggerOnlineDevNotice]);

  useEffect(() => {
    if (canAccessOnline && onlineDevNotice) {
      setOnlineDevNotice(false);
    }
  }, [canAccessOnline, onlineDevNotice]);

  const triggerAchievementToast = useCallback((newlyUnlocked: AchievementDef[]) => {
    if (newlyUnlocked.length === 0) return;
    soundEngine.playAllianceFormed();
    setAchievementToast({
      ach: newlyUnlocked[0],
      extraCount: newlyUnlocked.length - 1,
    });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setAchievementToast(null);
    }, 4800);
  }, []);

  const updateAchievements = useCallback(
    (mutator?: (stats: AchievementStats) => void, simOverride?: SimulationState | null) => {
      const current = achievementProfileRef.current;
      const nextStats: AchievementStats = {
        ...current.stats,
        restoredNames: [...current.stats.restoredNames],
        playedContinents: [...current.stats.playedContinents],
        playedCountries: [...current.stats.playedCountries],
      };
      if (mutator) {
        mutator(nextStats);
      }
      const simArg = simOverride !== undefined ? simOverride : simRef.current;
      const { updatedProfile, newlyUnlocked } = evaluateAchievements(
        { unlocked: { ...current.unlocked }, stats: nextStats },
        simArg
      );
      achievementProfileRef.current = updatedProfile;
      saveAchievementProfile(updatedProfile, user?.uid);
      setAchievementProfile(updatedProfile);
      if (newlyUnlocked.length > 0) {
        triggerAchievementToast(newlyUnlocked);
      }
    },
    [user?.uid, triggerAchievementToast]
  );

  const openCountryTree = useCallback(
    (countryId: number, initialNode?: FocusNode['id']) => {
      soundEngine.playClick();
      setEmpireHighlight(null);
      setTreeInitialNodeId(initialNode);
      setTreeCountryId(countryId);
      updateAchievements((s) => {
        s.treeOpened += 1;
      });
    },
    [updateAchievements]
  );

  const handlePreviewEmpireTerritory = useCallback(
    (ownerCountryId: number, empireName: string, targetCountryIds: number[]) => {
      const sim = simRef.current;
      if (!sim || targetCountryIds.length === 0) return;
      soundEngine.playClick();
      setTreeCountryId(null);
      setTreeInitialNodeId(undefined);
      setMobileDrawerOpen(false);
      setPlacingDefense(false);
      setPlacingAntiNuke(false);
      setPlacingBarracks(false);
      setLaunchingNuke(false);
      setSelectedId(sim.playerId);

      const durationMs = 10_000;
      setEmpireHighlight({
        ownerCountryId,
        empireName,
        targetCountryIds,
        expiresAtMs: Date.now() + durationMs,
        durationMs,
      });
      setEmpireRemainingMs(durationMs);

      const bounds = getEmpirePreviewBounds(sim, ownerCountryId, targetCountryIds);
      setFocusRequest({
        x: bounds.x,
        y: bounds.y,
        zoom: bounds.zoom,
        nonce: Date.now(),
      });
    },
    []
  );

  // Manage exact 10-second countdown for Empire Territory preview
  useEffect(() => {
    if (!empireHighlight) {
      setEmpireRemainingMs(0);
      return;
    }
    const tick = () => {
      const rem = empireHighlight.expiresAtMs - Date.now();
      if (rem <= 0) {
        setEmpireHighlight(null);
        setEmpireRemainingMs(0);
      } else {
        setEmpireRemainingMs(rem);
      }
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [empireHighlight]);

  const isOnlineMatch = Boolean(mpRoomCode && simRef.current?.isMultiplayer);
  const isOnlineHost = Boolean(
    isOnlineMatch && mpRoom && user && mpRoom.hostUid === user.uid
  );
  const isRemoteGuest = Boolean(isOnlineMatch && !isOnlineHost);

  const refreshLocalCampaigns = useCallback(() => {
    setLocalCampaigns(listLocalCampaigns());
  }, []);

  const saveLocalNow = useCallback(
    (dirtyForCloud = true) => {
      const sim = simRef.current;
      if (!sim || sim.isMultiplayer) return;
      saveCampaignLocally(sim, activeCampaignIdRef.current, {
        ownerUid: user?.uid,
        dirtyForCloud,
      });
      refreshLocalCampaigns();
    },
    [user?.uid, refreshLocalCampaigns]
  );

  const performCloudSave = useCallback(
    async (uidOverride?: string, forceImmediate = false) => {
      const sim = simRef.current;
      if (!sim || sim.isMultiplayer) return;

      // Always write a complete synchronous local snapshot first (works 100% offline & never loses defenses/barracks)
      saveLocalNow(true);

      const uid = uidOverride ?? user?.uid;
      if (!uid) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (Date.now() < quotaCooldownUntilRef.current || isFirestoreQuotaCooldownActive()) return;
      // Preserve Firestore free-tier daily write quota by enforcing a minimum 120s interval between background cloud writes
      if (!forceImmediate && Date.now() - lastCloudSaveAtRef.current < 120_000) return;
      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      pendingSaveRef.current = false;
      let failed = false;
      try {
        const res = await saveCampaignToCloud(uid, activeCampaignIdRef.current, sim);
        if (res.skippedQuota) {
          failed = true;
          quotaCooldownUntilRef.current = Date.now() + 2 * 60 * 60_000;
        } else if (res.saved) {
          lastCloudSaveAtRef.current = Date.now();
          refreshLocalCampaigns();
        }
      } catch (err) {
        failed = true;
        pendingSaveRef.current = false;
        if (isQuotaExceededError(err) || isFirestoreQuotaCooldownActive()) {
          quotaCooldownUntilRef.current = Date.now() + 2 * 60 * 60_000;
        } else {
          quotaCooldownUntilRef.current = Date.now() + 60_000;
        }
      } finally {
        isSavingRef.current = false;
        if (
          !failed &&
          pendingSaveRef.current &&
          Date.now() >= quotaCooldownUntilRef.current &&
          !isFirestoreQuotaCooldownActive() &&
          Date.now() - lastCloudSaveAtRef.current >= 120_000
        ) {
          pendingSaveRef.current = false;
          void performCloudSave(uid);
        } else {
          pendingSaveRef.current = false;
        }
      }
    },
    [user?.uid, saveLocalNow, refreshLocalCampaigns]
  );

  const scheduleAutoCloudSave = useCallback(() => {
    const sim = simRef.current;
    if (!sim || sim.isMultiplayer) return;

    // Immediate synchronous local save on every player action (defenses, barracks, anti-nukes, diplomacy, war)
    saveLocalNow(true);

    if (!user?.uid) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (Date.now() < quotaCooldownUntilRef.current || isFirestoreQuotaCooldownActive()) return;
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void performCloudSave(user.uid);
    }, 45_000);
  }, [user?.uid, saveLocalNow, performCloudSave]);

  const handlePlayerMutation = useCallback(() => {
    bumpRender();
    scheduleAutoCloudSave();
  }, [bumpRender, scheduleAutoCloudSave]);

  const performHostBroadcast = useCallback(async () => {
    const sim = simRef.current;
    if (!mpRoomCode || !user?.uid || !sim || !sim.isMultiplayer) return;
    if (mpRoom && mpRoom.hostUid !== user.uid) return;
    if (sim.outcome !== 'none' && finishedBroadcastSentRef.current) return;
    if (Date.now() < quotaCooldownUntilRef.current || isFirestoreQuotaCooldownActive()) {
      pendingBroadcastRef.current = false;
      if (isFirestoreQuotaCooldownActive()) {
        setMpSyncError(
          'Se alcanzó el límite diario gratuito de escrituras de Firebase Firestore. La cuota se restablece mañana.'
        );
      }
      return;
    }

    if (isBroadcastingRef.current) {
      pendingBroadcastRef.current = true;
      return;
    }

    isBroadcastingRef.current = true;
    pendingBroadcastRef.current = false;
    lastBroadcastAtRef.current = Date.now();
    let failed = false;
    try {
      const nextTick = mpTickRef.current++;
      const shouldMarkFinished =
        sim.outcome !== 'none' &&
        !finishedBroadcastSentRef.current &&
        mpRoom?.status !== 'finished';
      await hostBroadcastWorldState(mpRoomCode, user.uid, sim, nextTick, shouldMarkFinished);
      consecutiveSyncFailuresRef.current = 0;
      setMpSyncError((prev) => (prev ? null : prev));
      if (sim.outcome !== 'none') {
        finishedBroadcastSentRef.current = true;
      }
    } catch (err) {
      failed = true;
      pendingBroadcastRef.current = false;
      if (broadcastThrottleRef.current !== null) {
        window.clearTimeout(broadcastThrottleRef.current);
        broadcastThrottleRef.current = null;
      }
      if (isQuotaExceededError(err) || isFirestoreQuotaCooldownActive()) {
        quotaCooldownUntilRef.current = Date.now() + 5 * 60_000;
        setMpSyncError(
          formatFirestoreUserError(
            err,
            'Se alcanzó el límite diario gratuito de escrituras de Firebase Firestore. La cuota se restablece mañana.'
          )
        );
      } else {
        consecutiveSyncFailuresRef.current += 1;
        const backoffMs = Math.min(
          60_000,
          12_000 * Math.pow(2, consecutiveSyncFailuresRef.current - 1)
        );
        quotaCooldownUntilRef.current = Date.now() + backoffMs;
        if (consecutiveSyncFailuresRef.current >= 2) {
          setMpSyncError(
            formatFirestoreUserError(
              err,
              'La sincronización online está pausada temporalmente por saturación o falta de conexión.'
            )
          );
        }
      }
    } finally {
      isBroadcastingRef.current = false;
      if (
        !failed &&
        pendingBroadcastRef.current &&
        Date.now() >= quotaCooldownUntilRef.current &&
        !isFirestoreQuotaCooldownActive() &&
        !(simRef.current?.outcome !== 'none' && finishedBroadcastSentRef.current)
      ) {
        pendingBroadcastRef.current = false;
        void performHostBroadcast();
      } else {
        pendingBroadcastRef.current = false;
      }
    }
  }, [mpRoomCode, mpRoom?.hostUid, mpRoom?.status, user?.uid]);

  const scheduleHostBroadcast = useCallback(
    (immediate = false) => {
      if (Date.now() < quotaCooldownUntilRef.current || isFirestoreQuotaCooldownActive()) return;
      const sim = simRef.current;

      if (immediate) {
        if (broadcastThrottleRef.current !== null) {
          window.clearTimeout(broadcastThrottleRef.current);
          broadcastThrottleRef.current = null;
        }
        // Match-end sends right away; rapid human actions coalesce over 300ms to save Firestore write units
        if (sim && sim.outcome !== 'none') {
          void performHostBroadcast();
          return;
        }
        broadcastThrottleRef.current = window.setTimeout(() => {
          broadcastThrottleRef.current = null;
          void performHostBroadcast();
        }, 300);
        return;
      }

      const isHighActivity = Boolean(
        sim && (sim.wars.length > 0 || sim.invasions.length > 0)
      );
      const minIntervalMs = isHighActivity ? 2500 : 4500;
      const elapsed = Date.now() - lastBroadcastAtRef.current;

      if (elapsed >= minIntervalMs && !isBroadcastingRef.current) {
        if (broadcastThrottleRef.current !== null) {
          window.clearTimeout(broadcastThrottleRef.current);
          broadcastThrottleRef.current = null;
        }
        void performHostBroadcast();
        return;
      }

      if (broadcastThrottleRef.current !== null) return;
      const delay = Math.max(250, minIntervalMs - elapsed);
      broadcastThrottleRef.current = window.setTimeout(() => {
        broadcastThrottleRef.current = null;
        void performHostBroadcast();
      }, delay);
    },
    [performHostBroadcast]
  );

  const handleExecuteAction = useCallback(
    async (action: GameActionPayload): Promise<GameActionResult> => {
      const sim = simRef.current;
      if (!sim) {
        return { ok: false, message: 'No hay partida activa.' };
      }

      const hadActiveWarBefore = getEnemies(sim, sim.playerId).length > 0;
      const suppressTargetStrength =
        action.type === 'suppress_rebellion' && sim.countries[action.targetId]
          ? getCountryRebellionStrength(sim.countries[action.targetId])
          : 0;

      const trackActionSuccess = (resultMessage: string) => {
        updateAchievements((s) => {
          switch (action.type) {
            case 'recruit_soldiers':
            case 'recruit_soldiers_max':
              s.recruitsDone += 1;
              break;
            case 'declare_war':
              s.warsDeclared += 1;
              break;
            case 'build_gold_mine':
              s.minesBuiltTotal += 1;
              break;
            case 'build_city':
              s.citiesBuiltTotal += 1;
              break;
            case 'build_port':
              s.portsBuilt += 1;
              break;
            case 'build_defense':
              s.defensesBuilt += 1;
              break;
            case 'build_barracks':
              s.barracksBuilt += 1;
              break;
            case 'build_anti_nuke':
              s.antiNukesBuilt += 1;
              break;
            case 'launch_nuke':
              s.nukesLaunched += 1;
              if (hadActiveWarBefore) s.nukeInWarLaunched += 1;
              if (resultMessage.toLowerCase().includes('defensa')) {
                s.nukeDefensesBroken += 1;
              }
              if (s.nukesLaunched >= 2) {
                s.nukeAfterCooldown += 1;
              }
              break;
            case 'send_gift':
              s.giftsSent += 1;
              break;
            case 'make_peace':
              s.peacesSigned += 1;
              break;
            case 'request_ally_help':
              s.allyHelpsRequested += 1;
              break;
            case 'complete_focus':
              s.focusNodesCompletedTotal += 1;
              break;
            case 'suppress_rebellion':
              s.rebellionsSuppressed += 1;
              if (suppressTargetStrength >= 60) {
                s.strongRebellionSuppressed += 1;
              }
              break;
            case 'recruit_rebel_army':
              s.onlineRebelRecruits += 1;
              break;
            case 'start_rebellion':
              s.onlineRebellionsStarted += 1;
              break;
            default:
              break;
          }
        });
      };

      if (sim.isMultiplayer && mpRoom && user && mpRoom.hostUid !== user.uid) {
        const localError = validateGameActionLocally(sim, sim.playerId, action);
        if (localError) {
          return localError;
        }

        // Optimistic local execution so Guest sees immediate 0ms feedback while Host commits authoritatively
        const optimisticRes = executeGameAction(sim, sim.playerId, action);
        if (!optimisticRes.ok) {
          return optimisticRes;
        }
        if (action.type === 'respond_human_offer') {
          setRespondedOfferIds((prev) =>
            prev.includes(action.offerId) ? prev : [...prev.slice(-31), action.offerId]
          );
        }
        bumpRender();

        try {
          await sendRoomAction(
            mpRoom.roomCode,
            mpRoom.hostUid,
            user.uid,
            sim.playerId,
            action
          );
          trackActionSuccess(optimisticRes.message);
          return optimisticRes;
        } catch (err) {
          // Roll back optimistic local mutation by reloading latest authoritative world state
          const latestRaw = await loadRoomWorldStateOnce(mpRoom.roomCode);
          if (latestRaw && simRef.current?.isMultiplayer) {
            if (!cachedMapDataRef.current) {
              cachedMapDataRef.current = buildWorldMapData();
            }
            simRef.current = restoreRoomWorldState(
              latestRaw,
              sim.playerId,
              cachedMapDataRef.current,
              simRef.current.playerHistory
            );
            bumpRender();
          }
          return {
            ok: false,
            message: err instanceof Error ? err.message : 'Error al enviar orden online.',
          };
        }
      }

      const res = executeGameAction(sim, sim.playerId, action);
      if (res.ok) {
        trackActionSuccess(res.message);
      }
      if (sim.isMultiplayer) {
        bumpRender();
        scheduleHostBroadcast(true);
      } else {
        handlePlayerMutation();
      }
      return res;
    },
    [mpRoom, user, bumpRender, scheduleHostBroadcast, handlePlayerMutation, updateAchievements]
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
          if (broadcastThrottleRef.current !== null) {
            window.clearTimeout(broadcastThrottleRef.current);
            broadcastThrottleRef.current = null;
          }
          const wasPlayingMp = Boolean(simRef.current?.isMultiplayer);
          setMpRoomCode(null);
          setMpRoom(null);
          setMpMembers([]);
          setRespondedOfferIds([]);
          finishedBroadcastSentRef.current = false;
          if (wasPlayingMp) {
            simRef.current = null;
            setScreen('ONLINE_LOBBY');
            setMpSyncError('El anfitrión cerró la sala o abandonó la partida.');
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

  // Guest live sync & Host reconnect recovery when room is already 'playing' or 'finished'
  const mpRoomHostUid = mpRoom?.hostUid ?? null;
  const mpRoomStatus = mpRoom?.status ?? null;
  useEffect(() => {
    if (
      !mpRoomCode ||
      !user?.uid ||
      !mpRoomHostUid ||
      (mpRoomStatus !== 'playing' && mpRoomStatus !== 'finished')
    ) {
      return;
    }

    // Host reconnecting after reload to an already active room
    if (mpRoomHostUid === user.uid) {
      if (simRef.current?.isMultiplayer) return;
      let cancelled = false;
      void loadRoomWorldStateOnce(mpRoomCode).then((raw) => {
        if (cancelled || !raw || simRef.current?.isMultiplayer) return;
        const myMember = mpMembersRef.current.find((m) => m.uid === user.uid);
        let myCountryId = myMember && myMember.countryId >= 0 ? myMember.countryId : -1;
        if (myCountryId < 0 && raw.humanPlayers && typeof raw.humanPlayers === 'object') {
          const slots = Object.values(
            raw.humanPlayers as Record<string, { uid?: string; countryId?: number }>
          );
          const mine = slots.find((s) => s.uid === user.uid);
          if (mine && typeof mine.countryId === 'number') {
            myCountryId = mine.countryId;
          }
        }
        if (myCountryId < 0) return;

        if (!cachedMapDataRef.current) {
          cachedMapDataRef.current = buildWorldMapData();
        }
        const restoredSim = restoreRoomWorldState(raw, myCountryId, cachedMapDataRef.current, []);
        simRef.current = restoredSim;
        mpTickRef.current = Math.max(2, Number(raw.tick ?? 1) + 1);
        lastOutcomeRef.current = restoredSim.outcome;
        finishedBroadcastSentRef.current =
          mpRoomStatus === 'finished' || restoredSim.outcome !== 'none';
        setSelectedId(myCountryId);
        setDrawerTab('manage');
        setMobileDrawerOpen(false);
        setMapMode('political');
        setSpeed(restoredSim.outcome === 'none' ? 1 : 0);
        setShowTutorial(false);
        setScreen('PLAYING');
        const c = restoredSim.countries[myCountryId];
        if (c) {
          setFocusRequest({
            x: c.capitalX,
            y: c.capitalY,
            zoom: c.pixels < 20 ? 3.5 : 2.0,
            nonce: Date.now(),
          });
        }
        bumpRender();
      });
      return () => {
        cancelled = true;
      };
    }

    // Guest live state listener (stable subscription — does not reconnect on member/room ticks)
    const unsubState = subscribeRoomState(
      mpRoomCode,
      (raw) => {
        const incomingTick = Number(raw.tick ?? 0);
        const prevSim = simRef.current;

        // Guard against stale or duplicate snapshots rewinding Guest state
        if (
          prevSim?.isMultiplayer &&
          incomingTick > 0 &&
          incomingTick <= lastAppliedTickRef.current
        ) {
          return;
        }

        const myMember = mpMembersRef.current.find((m) => m.uid === user.uid);
        let myCountryId = myMember && myMember.countryId >= 0 ? myMember.countryId : -1;

        if (myCountryId < 0 && raw.humanPlayers && typeof raw.humanPlayers === 'object') {
          const slots = Object.values(
            raw.humanPlayers as Record<string, { uid?: string; countryId?: number }>
          );
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

        if (incomingTick > 0) {
          lastAppliedTickRef.current = incomingTick;
        }

        // Preserve live particles & synthesize frontline/nuke particles + audio cues from Host diff
        if (prevSim?.isMultiplayer) {
          const carriedParticles = prevSim.particles
            .filter((p) => p.life > 1)
            .map((p) => ({ ...p, life: p.life - 1 }));
          nextSim.particles = carriedParticles;

          // Frontline border-change sparks (sampled so it stays sub-millisecond)
          const prevGrid = prevSim.ownerGrid;
          const nextGrid = nextSim.ownerGrid;
          let addedSparks = 0;
          const totalPx = nextGrid.length;
          for (let idx = 0; idx < totalPx && addedSparks < 48; idx += 3) {
            const nextOwner = nextGrid[idx];
            if (nextOwner !== prevGrid[idx] && nextOwner >= 0) {
              const col = nextSim.countries[nextOwner]?.color;
              if (col) {
                nextSim.particles.push({
                  x: idx % MAP_W,
                  y: Math.floor(idx / MAP_W),
                  r: col[0],
                  g: col[1],
                  b: col[2],
                  life: 10,
                  maxLife: 10,
                });
                addedSparks++;
              }
            }
          }

          // Detect newly detonated nuclear strikes & play blast sound/particles
          let heardNuke = false;
          for (let cid = 0; cid < nextSim.countries.length; cid++) {
            const ns = nextSim.countries[cid]?.lastNukeStrike;
            const ps = prevSim.countries[cid]?.lastNukeStrike;
            if (ns && (!ps || ns.id !== ps.id)) {
              if (!heardNuke && (cid === myCountryId || nextSim.ownerGrid[ns.y * MAP_W + ns.x] === myCountryId || prevSim.ownerGrid[ns.y * MAP_W + ns.x] === myCountryId)) {
                soundEngine.playNuclearExplosion();
                heardNuke = true;
              }
              for (let k = 0; k < 14; k++) {
                const ang = (Math.PI * 2 * k) / 14;
                const dist = Math.round(ns.radius * (0.35 + (k % 3) * 0.25));
                nextSim.particles.push({
                  x: Math.max(0, Math.min(MAP_W - 1, Math.round(ns.x + Math.cos(ang) * dist))),
                  y: Math.max(0, Math.min(MAP_H - 1, Math.round(ns.y + Math.sin(ang) * dist))),
                  r: 255,
                  g: k % 2 === 0 ? 180 : 90,
                  b: 30,
                  life: 14,
                  maxLife: 14,
                });
              }
            }
          }
          if (nextSim.particles.length > 180) {
            nextSim.particles = nextSim.particles.slice(-180);
          }

          // Contextual sound cues on guest updates
          const prevMyWars = prevSim.wars.filter(
            (w) => w.a === myCountryId || w.b === myCountryId
          ).length;
          const nextMyWars = nextSim.wars.filter(
            (w) => w.a === myCountryId || w.b === myCountryId
          ).length;
          if (nextMyWars > prevMyWars) {
            soundEngine.playWarDeclared();
          } else if (nextMyWars < prevMyWars && nextSim.countries[myCountryId]?.alive) {
            soundEngine.playPeaceTreaty();
          }

          const prevIncomingOffers = prevSim.diplomaticOffers.filter(
            (o) => o.toCountryId === myCountryId
          ).length;
          const nextIncomingOffers = nextSim.diplomaticOffers.filter(
            (o) => o.toCountryId === myCountryId
          ).length;
          if (nextIncomingOffers > prevIncomingOffers) {
            soundEngine.playEvent();
          }

          if (prevSim.countries[myCountryId]?.alive && !nextSim.countries[myCountryId]?.alive) {
            soundEngine.playAnnexation(false);
          } else if (prevSim.outcome === 'none' && nextSim.outcome !== 'none') {
            soundEngine.playAnnexation(nextSim.winnerCountryId === myCountryId);
          }
        }

        // Clear respondedOfferIds for offers that the Host has already removed
        const activeOfferIdSet = new Set(nextSim.diplomaticOffers.map((o) => o.id));
        setRespondedOfferIds((prev) => {
          const filtered = prev.filter((id) => activeOfferIdSet.has(id));
          return filtered.length === prev.length ? prev : filtered;
        });

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
            updateAchievements((s) => {
              s.onlineMatchesPlayed += 1;
            }, nextSim);
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
      },
      (errMsg) => setMpSyncError(errMsg)
    );

    return () => {
      unsubState();
    };
  }, [mpRoomCode, mpRoomHostUid, mpRoomStatus, user?.uid, bumpRender, updateAchievements]);

  // Host: subscribe to pending player actions and execute them on authoritative sim
  useEffect(() => {
    if (screen !== 'PLAYING' || !isOnlineHost || !mpRoomCode || !user?.uid) return;

    const unsubActions = subscribePendingRoomActions(
      mpRoomCode,
      user.uid,
      (actions) => {
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
      },
      (errMsg) => setMpSyncError(errMsg)
    );

    return () => {
      unsubActions();
    };
  }, [screen, isOnlineHost, mpRoomCode, user?.uid, bumpRender, scheduleHostBroadcast]);

  const handleStartCampaign = (countryId: number) => {
    setMpRoomCode(null);
    setMpRoom(null);
    setMpMembers([]);
    const sim = createSimulation(countryId, { difficulty: selectedDifficulty });
    simRef.current = sim;
    lastOutcomeRef.current = 'none';
    activeCampaignIdRef.current = `${selectedDifficulty === 'hard' ? 'hard' : 'camp'}_${Date.now()}`;
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
    lastMatchAnnexedRef.current = 0;
    matchVictoryCountedRef.current = false;
    bumpRender();
    updateAchievements((s) => {
      if (sim.difficulty === 'hard') {
        s.hardModePlayed += 1;
      }
    }, sim);
    saveLocalNow(true);
    if (user?.uid) {
      void performCloudSave(user.uid);
    }
  };

  const handleResumeCampaign = useCallback(
    async (summary: UnifiedSavedCampaign) => {
      setMpRoomCode(null);
      setMpRoom(null);
      setMpMembers([]);

      const localEntry = loadLocalCampaignSnapshot(summary.campaignId);
      let cloudEntry: Awaited<ReturnType<typeof loadCampaignSnapshotWithMetaFromCloud>> = null;
      const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;

      if (user?.uid && summary.storageSource !== 'local' && isOnline) {
        try {
          cloudEntry = await loadCampaignSnapshotWithMetaFromCloud(user.uid, summary.campaignId);
        } catch (err) {
          // If offline or server unreachable, silently fall back to local snapshot when present
          if (!localEntry) {
            throw err;
          }
        }
      }

      if (!localEntry && !cloudEntry) {
        throw new Error(
          'No se encontró el estado de la partida. Si estaba guardada solo en la nube, conéctate a internet.'
        );
      }

      const countStructures = (s: SimulationState): number => {
        let total = 0;
        for (let i = 0; i < s.countries.length; i++) {
          const c = s.countries[i];
          total +=
            c.defenses.length + c.barracks.length + c.antiNukes.length + c.ports.length;
        }
        return total;
      };

      let chosenSim: SimulationState;
      let chosenFrom: 'local' | 'cloud';

      if (localEntry && cloudEntry) {
        const lSim = localEntry.sim;
        const cSim = cloudEntry.sim;
        if (lSim.totalDays !== cSim.totalDays) {
          chosenFrom = lSim.totalDays > cSim.totalDays ? 'local' : 'cloud';
        } else if (lSim.elapsedSeconds !== cSim.elapsedSeconds) {
          chosenFrom = lSim.elapsedSeconds > cSim.elapsedSeconds ? 'local' : 'cloud';
        } else {
          const lStructs = countStructures(lSim);
          const cStructs = countStructures(cSim);
          if (lStructs !== cStructs) {
            chosenFrom = lStructs > cStructs ? 'local' : 'cloud';
          } else {
            chosenFrom = localEntry.summary.updatedAtMs >= cloudEntry.updatedAtMs ? 'local' : 'cloud';
          }
        }
        chosenSim = chosenFrom === 'local' ? lSim : cSim;
      } else if (localEntry) {
        chosenFrom = 'local';
        chosenSim = localEntry.sim;
      } else {
        chosenFrom = 'cloud';
        chosenSim = cloudEntry!.sim;
      }

      simRef.current = chosenSim;
      lastOutcomeRef.current = chosenSim.outcome;
      activeCampaignIdRef.current = summary.campaignId;
      setSelectedDifficulty(chosenSim.difficulty);

      // Always mirror the resumed snapshot locally so it is instantly available offline too
      const keepDirty = chosenFrom === 'local' ? Boolean(localEntry?.summary.dirtyForCloud) : false;
      saveCampaignLocally(chosenSim, summary.campaignId, {
        ownerUid: user?.uid,
        dirtyForCloud: keepDirty,
      });
      refreshLocalCampaigns();

      if (keepDirty && user?.uid && isOnline) {
        void performCloudSave(user.uid);
      }

      setSelectedId(chosenSim.playerId);
      setDrawerTab('manage');
      setMobileDrawerOpen(false);
      setMapMode('political');
      setSpeed(1);
      lastActiveSpeedRef.current = 1;
      setShowTutorial(false);
      setScreen('PLAYING');
      const c = chosenSim.countries[chosenSim.playerId];
      setFocusRequest({
        x: c.capitalX,
        y: c.capitalY,
        zoom: c.pixels < 20 ? 3.5 : 2.0,
        nonce: Date.now(),
      });
      let resumedAnnexed = 0;
      for (let i = 0; i < chosenSim.countries.length; i++) {
        const cn = chosenSim.countries[i];
        if (!cn.alive && cn.annexedById === chosenSim.playerId && cn.id !== chosenSim.playerId) {
          resumedAnnexed++;
        }
      }
      lastMatchAnnexedRef.current = resumedAnnexed;
      matchVictoryCountedRef.current = chosenSim.outcome === 'victory';
      bumpRender();
      updateAchievements(undefined, chosenSim);
    },
    [user?.uid, bumpRender, updateAchievements, refreshLocalCampaigns, performCloudSave]
  );

  const handleDeleteCampaign = useCallback(
    async (summary: UnifiedSavedCampaign) => {
      deleteLocalCampaign(summary.campaignId);
      refreshLocalCampaigns();
      if (user?.uid && summary.storageSource !== 'local') {
        await deleteCampaignFromCloud(user.uid, summary.campaignId);
      }
    },
    [user?.uid, refreshLocalCampaigns]
  );

  const handleHostStartMatch = useCallback(async () => {
    if (!mpRoomCode || !user?.uid) return;
    const myMember = mpMembers.find((m) => m.uid === user.uid);
    if (!myMember || myMember.countryId < 0) {
      throw new Error('Debes escoger un país antes de empezar la partida.');
    }

    const pickedMembers = mpMembers.filter((m) => m.countryId >= 0);
    const seenCountries = new Set<number>();
    for (const m of pickedMembers) {
      if (seenCountries.has(m.countryId)) {
        throw new Error('Dos jugadores eligieron el mismo país. Uno debe cambiar antes de empezar.');
      }
      seenCountries.add(m.countryId);
    }

    const humanSlots = pickedMembers.map((m) => ({
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
    lastAppliedTickRef.current = 0;
    lastBroadcastAtRef.current = Date.now();
    processedActionIdsRef.current.clear();
    finishedBroadcastSentRef.current = false;
    consecutiveSyncFailuresRef.current = 0;
    setMpSyncError(null);
    setRespondedOfferIds([]);
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
    lastMatchAnnexedRef.current = 0;
    matchVictoryCountedRef.current = false;
    bumpRender();
    updateAchievements((s) => {
      s.onlineMatchesPlayed += 1;
    }, sim);
  }, [mpRoomCode, user?.uid, mpMembers, bumpRender, updateAchievements]);

  const handleLeaveOnlineRoom = useCallback(async () => {
    if (broadcastThrottleRef.current !== null) {
      window.clearTimeout(broadcastThrottleRef.current);
      broadcastThrottleRef.current = null;
    }
    pendingBroadcastRef.current = false;
    finishedBroadcastSentRef.current = false;
    consecutiveSyncFailuresRef.current = 0;
    lastAppliedTickRef.current = 0;
    lastBroadcastAtRef.current = 0;
    setRespondedOfferIds([]);
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

  const handleResetTutorial = useCallback(() => {
    try {
      window.localStorage.removeItem('paises_en_guerra_tutorial_done');
    } catch {
      // ignore storage errors
    }
    setMenuTutorialOpen(true);
  }, []);

  const handleSetSpeed = useCallback(
    (s: number) => {
      if (isRemoteGuest) return;
      if (s > 0) lastActiveSpeedRef.current = s;
      setSpeed(s);
      soundEngine.playClick();
      if (simRef.current?.isMultiplayer) {
        scheduleHostBroadcast(true);
      } else if (s === 0) {
        saveLocalNow(true);
        if (user?.uid) {
          void performCloudSave(user.uid);
        }
      }
    },
    [isRemoteGuest, user?.uid, saveLocalNow, performCloudSave, scheduleHostBroadcast]
  );

  // PC Keyboard Shortcuts
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (meetingTargetId !== null) {
        return;
      }
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
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (simRef.current) {
          if (treeCountryId !== null) {
            setTreeCountryId(null);
          } else {
            openCountryTree(simRef.current.playerId);
          }
        }
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setAchievementsOpen((prev) => !prev);
      } else if (e.key === '1') {
        setMapMode('political');
      } else if (e.key === '2') {
        setMapMode('diplomatic');
      } else if (e.key === 'Escape') {
        if (achievementsOpen) {
          setAchievementsOpen(false);
        } else if (treeCountryId !== null) {
          setTreeCountryId(null);
        } else if (empireHighlight) {
          setEmpireHighlight(null);
        } else if (showTutorial) {
          dismissTutorial();
        } else if (launchingNuke) {
          setLaunchingNuke(false);
        } else if (placingAntiNuke) {
          setPlacingAntiNuke(false);
        } else if (placingBarracks) {
          setPlacingBarracks(false);
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
  }, [
    screen,
    isRemoteGuest,
    searchOpen,
    treeCountryId,
    meetingTargetId,
    empireHighlight,
    achievementsOpen,
    launchingNuke,
    placingAntiNuke,
    placingBarracks,
    placingDefense,
    showTutorial,
    dismissTutorial,
    openCountryTree,
  ]);

  // Simulation Day Accumulator (Singleplayer or Multiplayer Host only)
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0 || isRemoteGuest) return;

    const intervalMs = Math.max(45, Math.round(420 / speed));

    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      if (meetingTargetId !== null && !sim.isMultiplayer) return;
      if (sim.isMultiplayer && sim.outcome !== 'none') return;

      const prevOfferCount = sim.diplomaticOffers.length;

      stepSimulationDay(sim);

      if (sim.outcome !== lastOutcomeRef.current) {
        lastOutcomeRef.current = sim.outcome;
        if (sim.isMultiplayer) {
          scheduleHostBroadcast(true);
        } else {
          saveLocalNow(true);
          if (user?.uid) {
            void performCloudSave(user.uid);
          }
        }
      } else if (sim.isMultiplayer) {
        if (sim.diplomaticOffers.length > prevOfferCount) {
          scheduleHostBroadcast(true);
        } else if (sim.wars.length > 0 || sim.invasions.length > 0) {
          scheduleHostBroadcast(false);
        }
      }
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [
    screen,
    speed,
    isRemoteGuest,
    meetingTargetId,
    bumpRender,
    user?.uid,
    saveLocalNow,
    performCloudSave,
    scheduleHostBroadcast,
  ]);

  // Per-second Economy Income Tick & Host Multiplayer Sync
  useEffect(() => {
    if (screen !== 'PLAYING' || speed === 0 || isRemoteGuest) return;

    const intervalMs = Math.round(1000 / speed);
    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      if (meetingTargetId !== null && !sim.isMultiplayer) return;
      if (sim.isMultiplayer && sim.outcome !== 'none') return;
      stepSimulationSecond(sim);
      if (sim.isMultiplayer) {
        scheduleHostBroadcast(false);
      }
      bumpRender();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [screen, speed, isRemoteGuest, meetingTargetId, bumpRender, scheduleHostBroadcast]);

  // Guest smooth visual interpolation for particles and active naval landings between Host snapshots
  useEffect(() => {
    if (screen !== 'PLAYING' || !isRemoteGuest) return;

    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim || !sim.isMultiplayer || sim.outcome !== 'none') return;
      let visualChanged = false;

      if (sim.particles.length > 0) {
        for (let i = sim.particles.length - 1; i >= 0; i--) {
          sim.particles[i].life -= 1;
          if (sim.particles[i].life <= 0) {
            sim.particles.splice(i, 1);
          }
        }
        visualChanged = true;
      }

      if (sim.invasions.length > 0) {
        for (const inv of sim.invasions) {
          if (inv.progress < 96) {
            inv.progress = Math.min(96, inv.progress + 1.8);
            visualChanged = true;
          }
        }
      }

      if (visualChanged) {
        bumpRender();
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [screen, isRemoteGuest, bumpRender]);

  // Periodic Achievement Evaluator & Active Play-Time Tracker (every 1s while playing)
  useEffect(() => {
    if (screen !== 'PLAYING') return;

    let tickCount = 0;
    const timer = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      tickCount += 1;

      const current = achievementProfileRef.current;
      const nextProfile: AchievementProfile = {
        unlocked: { ...current.unlocked },
        stats: {
          ...current.stats,
          totalPlaySeconds: current.stats.totalPlaySeconds + 1,
          restoredNames: [...current.stats.restoredNames],
          playedContinents: [...current.stats.playedContinents],
          playedCountries: [...current.stats.playedCountries],
        },
      };

      if (tickCount % 2 === 0) {
        // Count countries captured in this single match (used for cumulative totalAnnexed & Modo Difícil unlock)
        let capturedInMatch = 0;
        for (let i = 0; i < sim.countries.length; i++) {
          const c = sim.countries[i];
          if (!c.alive && c.annexedById === sim.playerId && c.id !== sim.playerId) {
            capturedInMatch++;
          }
        }
        if (capturedInMatch > lastMatchAnnexedRef.current) {
          nextProfile.stats.totalAnnexed += capturedInMatch - lastMatchAnnexedRef.current;
          lastMatchAnnexedRef.current = capturedInMatch;
        }
        const wonNow =
          (sim.outcome === 'victory' && !sim.isMultiplayer) ||
          (sim.isMultiplayer && sim.winnerCountryId === sim.playerId);
        if (wonNow && !matchVictoryCountedRef.current) {
          matchVictoryCountedRef.current = true;
          nextProfile.stats.victories += 1;
          if (sim.difficulty === 'hard') {
            nextProfile.stats.hardModeVictories += 1;
          }
        }

        const { updatedProfile, newlyUnlocked } = evaluateAchievements(nextProfile, sim);
        achievementProfileRef.current = updatedProfile;
        if (newlyUnlocked.length > 0) {
          saveAchievementProfile(updatedProfile, user?.uid);
          setAchievementProfile(updatedProfile);
          triggerAchievementToast(newlyUnlocked);
        } else if (tickCount % 10 === 0) {
          saveAchievementProfile(updatedProfile, user?.uid);
          if (achievementsOpen) {
            setAchievementProfile(updatedProfile);
          }
        }

        if (capturedInMatch > 0) {
          const { progress, justUnlocked } = recordSingleMatchCaptures(
            capturedInMatch,
            user?.uid,
            updatedProfile
          );
          setHardModeProgress((prev) =>
            prev.unlocked !== progress.unlocked ||
            prev.bestCapturedInMatch !== progress.bestCapturedInMatch
              ? progress
              : prev
          );
          if (justUnlocked) {
            soundEngine.playAllianceFormed();
            setHardModeUnlockToast(true);
            if (hardModeToastTimerRef.current !== null) {
              window.clearTimeout(hardModeToastTimerRef.current);
            }
            hardModeToastTimerRef.current = window.setTimeout(() => {
              hardModeToastTimerRef.current = null;
              setHardModeUnlockToast(false);
            }, 6500);
          }
        }
      } else {
        achievementProfileRef.current = nextProfile;
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, user?.uid, achievementsOpen, triggerAchievementToast]);

  // Close achievements or tutorial modal on Escape when outside active gameplay
  useEffect(() => {
    if (screen === 'PLAYING' || (!achievementsOpen && !menuTutorialOpen)) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (menuTutorialOpen) {
          setMenuTutorialOpen(false);
        } else if (achievementsOpen) {
          setAchievementsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, achievementsOpen, menuTutorialOpen]);

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

  // Automatic local (offline) + cloud save during gameplay & on tab/app exit (singleplayer)
  useEffect(() => {
    if (screen !== 'PLAYING' || simRef.current?.isMultiplayer) return;

    const localTimer = window.setInterval(() => {
      saveLocalNow(true);
    }, 15000);

    const cloudTimer = window.setInterval(() => {
      if (user?.uid) {
        void performCloudSave(user.uid);
      }
    }, 240_000);

    const persistOnLeave = () => {
      // Synchronous localStorage snapshot guarantees zero loss even offline or on instant app close
      saveLocalNow(true);
      if (
        user?.uid &&
        !isFirestoreQuotaCooldownActive() &&
        Date.now() - lastCloudSaveAtRef.current >= 45_000
      ) {
        void performCloudSave(user.uid, true);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistOnLeave();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', persistOnLeave);
    window.addEventListener('beforeunload', persistOnLeave);

    return () => {
      window.clearInterval(localTimer);
      window.clearInterval(cloudTimer);
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', persistOnLeave);
      window.removeEventListener('beforeunload', persistOnLeave);
    };
  }, [screen, user?.uid, saveLocalNow, performCloudSave]);

  // Background cloud catch-up: when signed in and back online, sync dirty offline saves gently to Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const syncDirtyLocalCampaigns = async () => {
      if (isSyncingOfflineRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (Date.now() < quotaCooldownUntilRef.current || isFirestoreQuotaCooldownActive()) return;

      const dirtyList = listLocalCampaigns().filter((item) => item.dirtyForCloud);
      if (dirtyList.length === 0) return;

      isSyncingOfflineRef.current = true;
      try {
        for (const item of dirtyList.slice(0, 1)) {
          if (screen === 'PLAYING' && item.campaignId === activeCampaignIdRef.current) {
            continue;
          }
          if (isFirestoreQuotaCooldownActive()) break;
          const loaded = loadLocalCampaignSnapshot(item.campaignId);
          if (!loaded) continue;
          const res = await saveCampaignToCloud(user.uid, item.campaignId, loaded.sim);
          if (res.skippedQuota) {
            quotaCooldownUntilRef.current = Date.now() + 2 * 60 * 60_000;
            break;
          }
        }
        refreshLocalCampaigns();
      } catch (err) {
        if (isQuotaExceededError(err) || isFirestoreQuotaCooldownActive()) {
          quotaCooldownUntilRef.current = Date.now() + 2 * 60 * 60_000;
        }
      } finally {
        isSyncingOfflineRef.current = false;
      }
    };

    const onOnline = () => {
      void syncDirtyLocalCampaigns();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [user?.uid, screen, localCampaigns.length, refreshLocalCampaigns]);

  // Unified saved campaigns list (merges offline local snapshots + Firestore cloud campaigns)
  const mergedCampaigns = useMemo<UnifiedSavedCampaign[]>(() => {
    const map = new Map<string, UnifiedSavedCampaign>();

    for (const cloud of campaigns) {
      map.set(cloud.campaignId, {
        ...cloud,
        storageSource: 'cloud',
        difficulty: cloud.campaignId.startsWith('hard_') ? 'hard' : 'normal',
      });
    }

    for (const local of localCampaigns) {
      const existingCloud = map.get(local.campaignId);
      const difficulty: GameDifficulty = local.campaignId.startsWith('hard_') ? 'hard' : 'normal';
      if (!existingCloud) {
        map.set(local.campaignId, {
          ...local,
          storageSource: 'local',
          dirtyForCloud: local.dirtyForCloud,
          defensesCount: local.defensesCount,
          barracksCount: local.barracksCount,
          antiNukesCount: local.antiNukesCount,
          difficulty,
        });
      } else {
        const localDateScore = local.year * 400 + local.month * 32 + local.day;
        const cloudDateScore = existingCloud.year * 400 + existingCloud.month * 32 + existingCloud.day;
        const localIsNewer =
          localDateScore > cloudDateScore ||
          (localDateScore === cloudDateScore && local.elapsedSeconds > existingCloud.elapsedSeconds) ||
          (localDateScore === cloudDateScore &&
            local.elapsedSeconds === existingCloud.elapsedSeconds &&
            local.updatedAtMs >= existingCloud.updatedAtMs);

        const base = localIsNewer ? local : existingCloud;
        map.set(local.campaignId, {
          ...base,
          updatedAtMs: Math.max(local.updatedAtMs, existingCloud.updatedAtMs),
          storageSource: 'both',
          dirtyForCloud: local.dirtyForCloud,
          defensesCount: local.defensesCount,
          barracksCount: local.barracksCount,
          antiNukesCount: local.antiNukesCount,
          difficulty,
        });
      }
    }

    const list = Array.from(map.values()).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    const lastLocal = getLastPlayedLocalCampaign();
    if (lastLocal) {
      const idx = list.findIndex((c) => c.campaignId === lastLocal.campaignId);
      if (idx > 0) {
        const [item] = list.splice(idx, 1);
        list.unshift(item);
      }
    }
    return list;
  }, [localCampaigns, campaigns]);

  const lastCampaign = mergedCampaigns[0] ?? null;

  const renderOnlineDevBanner = () =>
    onlineDevNotice ? (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] w-[min(94vw,470px)] bg-[#111B2B]/98 border border-amber-500/80 shadow-2xl px-3.5 py-2.5 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-2 py-1 bg-amber-500/15 border border-amber-500/50 flex items-center justify-center shrink-0">
            <span className="font-mono-num text-[10px] font-bold text-amber-300">28/11/2026</span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-amber-200 leading-snug">
            El online estará listo para el 28/11/2026.
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!user && (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              disabled={authBusy}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-[11px] font-semibold cursor-pointer"
            >
              Google
            </button>
          )}
          <button
            type="button"
            onClick={() => setOnlineDevNotice(false)}
            aria-label="Cerrar aviso"
            className="p-1 text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : null;

  if (screen === 'DEVICE_SELECT') {
    return (
      <>
        {renderOnlineDevBanner()}
        <DeviceModeScreen
          onStartPlay={(difficulty) => {
            setSelectedDifficulty(difficulty);
            setScreen('COUNTRY_SELECT');
          }}
          onPressOnline={handlePressOnline}
          onResetTutorial={handleResetTutorial}
          lastCampaign={lastCampaign}
          onResumeLastCampaign={handleResumeCampaign}
          hardModeProgress={hardModeProgress}
        />
        {menuTutorialOpen && (
          <TutorialOverlay
            deviceMode={deviceMode}
            isMainMenuPreview
            onFinish={() => {
              soundEngine.playClick();
              setMenuTutorialOpen(false);
            }}
          />
        )}
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  if (screen === 'ONLINE_LOBBY') {
    return (
      <>
        {renderOnlineDevBanner()}
        <OnlineLobbyScreen
          deviceMode={deviceMode}
          onChangeDeviceMode={() => {}}
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

  const achievementsUnlockedCount = Object.keys(achievementProfile.unlocked).length;

  const renderAchievementToast = () =>
    achievementToast ? (
      <div
        className={`fixed z-[70] ${
          deviceMode === 'mobile'
            ? 'bottom-16 left-2 right-2'
            : 'bottom-4 right-4 w-[350px]'
        } bg-[#111B2B]/98 border border-amber-500/80 shadow-2xl p-3 flex items-start gap-2.5`}
      >
        <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/50 flex items-center justify-center shrink-0 mt-0.5">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <button
          onClick={() => {
            setAchievementToast(null);
            setAchievementsOpen(true);
          }}
          className="flex-1 min-w-0 text-left cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono-num uppercase tracking-wide text-amber-400">
            <span>Logro desbloqueado #{String(achievementToast.ach.number).padStart(3, '0')}</span>
            {achievementToast.extraCount > 0 && (
              <span className="text-emerald-300">+{achievementToast.extraCount} más</span>
            )}
          </div>
          <div className="text-xs font-bold text-white truncate mt-0.5">
            {achievementToast.ach.title}
          </div>
          <div className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
            {achievementToast.ach.description}
          </div>
        </button>
        <button
          onClick={() => setAchievementToast(null)}
          aria-label="Cerrar notificación"
          className="p-1 text-slate-400 hover:text-white cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : null;

  if (screen === 'COUNTRY_SELECT' || !simRef.current) {
    return (
      <>
        {renderOnlineDevBanner()}
        <CountrySelectScreen
          deviceMode={deviceMode}
          difficulty={selectedDifficulty}
          onBackToMenu={() => setScreen('DEVICE_SELECT')}
          onChangeDeviceMode={() => {}}
          onStartCampaign={handleStartCampaign}
          savedCampaigns={mergedCampaigns}
          onResumeCampaign={handleResumeCampaign}
          onDeleteCampaign={handleDeleteCampaign}
          onOpenOnline={handlePressOnline}
          onOpenAchievements={() => setAchievementsOpen(true)}
          achievementsUnlockedCount={achievementsUnlockedCount}
          onResetTutorial={handleResetTutorial}
        />
        {achievementsOpen && (
          <AchievementsModal
            profile={achievementProfile}
            sim={null}
            onClose={() => setAchievementsOpen(false)}
          />
        )}
        {menuTutorialOpen && (
          <TutorialOverlay
            deviceMode={deviceMode}
            isMainMenuPreview
            onFinish={() => {
              soundEngine.playClick();
              setMenuTutorialOpen(false);
            }}
          />
        )}
        {renderAchievementToast()}
        <PWAInstallBanner />
        <OfflineIndicator />
      </>
    );
  }

  const sim = simRef.current;
  const isMobile = deviceMode === 'mobile';
  const showForeignPopup = selectedId !== null && selectedId !== sim.playerId;
  const incomingHumanOffers = sim.isMultiplayer
    ? sim.diplomaticOffers.filter(
        (o) =>
          o.toCountryId === sim.playerId &&
          !respondedOfferIds.includes(o.id) &&
          sim.countries[o.fromCountryId]?.alive &&
          sim.countries[o.toCountryId]?.alive
      )
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
    setMobileDrawerOpen(false);
    setTreeCountryId(null);
    setTreeInitialNodeId(undefined);
    setEmpireHighlight(null);
    setPlacingDefense(false);
    setPlacingAntiNuke(false);
    setPlacingBarracks(false);
    setLaunchingNuke(false);
    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    if (sim.isMultiplayer) {
      await handleLeaveOnlineRoom();
    } else {
      // Save synchronously to local storage first (always succeeds offline)
      saveLocalNow(true);
      // Wait briefly for cloud sync before leaving so all defenses/barracks/territory commit cleanly
      if (user?.uid && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        await Promise.race([
          performCloudSave(user.uid),
          new Promise<void>((resolve) => window.setTimeout(resolve, 3500)),
        ]);
      }
    }
    setScreen('COUNTRY_SELECT');
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0B121E] text-slate-100 overflow-hidden">
      <TopCommandBar
        deviceMode={deviceMode}
        onSwitchDeviceMode={() => {}}
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
        onOpenTree={() => openCountryTree(sim.playerId)}
        onOpenAchievements={() => {
          soundEngine.playClick();
          setAchievementProfile(achievementProfileRef.current);
          setAchievementsOpen(true);
        }}
        achievementsUnlockedCount={achievementsUnlockedCount}
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
              if (res.ok) {
                setPlacingDefense(false);
              }
            }}
            onCancelPlaceDefense={() => setPlacingDefense(false)}
            placingAntiNuke={placingAntiNuke}
            onPlaceAntiNuke={async (mx, my) => {
              const res = await handleExecuteAction({ type: 'build_anti_nuke', x: mx, y: my });
              setDefenseFeedback({ text: res.message, ok: res.ok });
              if (res.ok) {
                setPlacingAntiNuke(false);
              }
            }}
            onCancelPlaceAntiNuke={() => setPlacingAntiNuke(false)}
            placingBarracks={placingBarracks}
            onPlaceBarracks={async (mx, my) => {
              const res = await handleExecuteAction({ type: 'build_barracks', x: mx, y: my });
              setDefenseFeedback({ text: res.message, ok: res.ok });
              if (res.ok) {
                setPlacingBarracks(false);
              }
            }}
            onCancelPlaceBarracks={() => setPlacingBarracks(false)}
            launchingNuke={launchingNuke}
            onLaunchNuke={async (mx, my) => {
              const res = await handleExecuteAction({ type: 'launch_nuke', x: mx, y: my });
              setDefenseFeedback({ text: res.message, ok: res.ok });
              if (res.ok) {
                setLaunchingNuke(false);
              }
            }}
            onCancelLaunchNuke={() => setLaunchingNuke(false)}
            empireHighlight={empireHighlight}
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

          {placingAntiNuke && (
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,540px)] bg-cyan-950/95 border border-cyan-400 px-3 sm:px-4 py-2 shadow-2xl flex items-center justify-between gap-2.5 text-xs text-cyan-100">
              <span>
                Toca en tu país para colocar el Antibombas (radar {ANTI_NUKE_RADIUS * 10} km · ${getAntiNukeCost(sim.difficulty).toLocaleString('es-ES')})
              </span>
              <button
                onClick={() => setPlacingAntiNuke(false)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {placingBarracks && (
            <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[min(94vw,560px)] bg-purple-950/95 border border-purple-400 px-3 sm:px-4 py-2 shadow-2xl flex items-center justify-between gap-2.5 text-xs text-purple-100">
              <span>
                Toca en tu país para colocar el Cuartel Militar (+{BARRACKS_ARMY_CAP_BONUS} cap. · radio {BARRACKS_RADIUS * 10} km · -50% rebeldía en esa zona · ${getBarracksCost(sim.difficulty).toLocaleString('es-ES')})
              </span>
              <button
                onClick={() => setPlacingBarracks(false)}
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
                  ? `Toca territorio extranjero para detonar la Bomba Nuclear (radio ${NUKE_RADIUS * 10} km)`
                  : `Haz clic en territorio extranjero para detonar la Bomba Nuclear (radio ${NUKE_RADIUS * 10} km · Esc para cancelar)`}
              </span>
              <button
                onClick={() => setLaunchingNuke(false)}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 shrink-0 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {empireHighlight && !placingDefense && !placingAntiNuke && !placingBarracks && !launchingNuke && (() => {
            const targetIso2s = empireHighlight.targetCountryIds
              .map((tid) => sim.countries[tid]?.seed.iso2)
              .filter((iso): iso is string => Boolean(iso));
            const targetStatuses = getEmpireTargetProgress(
              sim,
              empireHighlight.ownerCountryId,
              targetIso2s
            );
            const secLeft = Math.max(1, Math.ceil(empireRemainingMs / 1000));
            const pctLeft = Math.max(
              0,
              Math.min(100, (empireRemainingMs / empireHighlight.durationMs) * 100)
            );
            return (
              <div className="absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-30 w-[min(95vw,580px)] bg-[#111B2B]/96 border border-amber-500/80 shadow-2xl overflow-hidden">
                <div className="px-3 sm:px-3.5 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-amber-200 truncate">
                        Territorio a invadir · {empireHighlight.empireName}
                      </div>
                      <div className="text-[10px] text-slate-300">
                        Conquista las zonas resaltadas en rojo/dorado para proclamarlo gratis
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono-num text-xs font-bold text-amber-300 px-1.5 py-0.5 bg-[#0B121E] border border-amber-500/40">
                      {secLeft}s
                    </span>
                    <button
                      onClick={() => openCountryTree(empireHighlight.ownerCountryId, 'restore')}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-200 text-[11px] font-semibold cursor-pointer"
                    >
                      Árbol
                    </button>
                    <button
                      onClick={() => setEmpireHighlight(null)}
                      aria-label="Cerrar vista de territorio"
                      className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {targetStatuses.length > 0 && (
                  <div className="px-3 sm:px-3.5 pb-2 flex flex-wrap items-center gap-1.5">
                    {targetStatuses.map((ts) => (
                      <button
                        key={ts.countryId}
                        type="button"
                        onClick={() => {
                          setSelectedId(ts.countryId);
                          handleJumpToCountry(ts.countryId);
                          soundEngine.playSelectCountry();
                        }}
                        className={`px-2 py-0.5 border text-[11px] font-mono-num flex items-center gap-1 cursor-pointer transition-colors ${
                          ts.conquered
                            ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                            : 'bg-rose-950/50 hover:bg-rose-900/60 border-amber-500/60 text-amber-200'
                        }`}
                      >
                        <span>{ts.conquered ? '✓' : '⚔'}</span>
                        <span>{ts.name}</span>
                        {!ts.conquered && ts.ownedPct > 0 && (
                          <span className="text-amber-300">({ts.ownedPct}%)</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="h-1 w-full bg-slate-900">
                  <div
                    className="h-full bg-amber-400 transition-[width] duration-100 ease-linear"
                    style={{ width: `${pctLeft}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Multiplayer Sync / Quota Alert Banner */}
          {sim.isMultiplayer && mpSyncError && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 w-[min(94vw,520px)] bg-amber-950/95 border border-amber-500/80 px-3 py-2 shadow-2xl flex items-center justify-between gap-2.5 text-xs text-amber-100">
              <span className="leading-snug">{mpSyncError}</span>
              <button
                type="button"
                onClick={() => setMpSyncError(null)}
                aria-label="Cerrar aviso de sincronización"
                className="p-1 bg-amber-900/70 hover:bg-amber-800 border border-amber-600/60 text-amber-200 shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Live Autonomous AI Geopolitical Feed (top-left of map) */}
          {sim.chronicle.length > 0 && !(isMobile && (activeHumanOffer || sim.pendingProposal || placingDefense || placingAntiNuke || placingBarracks || launchingNuke || empireHighlight || mpSyncError)) && (
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

          {/* Pantalla completa al tocar o hacer clic en cualquier país extranjero */}
          {showForeignPopup && meetingTargetId === null && (
            <CountryActionPopup
              deviceMode={deviceMode}
              sim={sim}
              targetId={selectedId}
              onClose={() => setSelectedId(sim.playerId)}
              onExecuteAction={handleExecuteAction}
              onOpenCountryTree={(id) => openCountryTree(id)}
              onStartMeeting={(id) => {
                soundEngine.playClick();
                setMeetingTargetId(id);
              }}
              onStartNukeTarget={() => {
                soundEngine.playClick();
                setDefenseFeedback(null);
                setPlacingDefense(false);
                setPlacingAntiNuke(false);
                setPlacingBarracks(false);
                setLaunchingNuke(true);
                setSelectedId(sim.playerId);
                if (isMobile) setMobileDrawerOpen(false);
              }}
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
                    {getCountryName(sim.countries[activeHumanOffer.fromCountryId])}
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
                    Propuesta · {getCountryName(sim.countries[sim.pendingProposal.fromId])}
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
              WASD / Arrastrar: Mover · Rueda: Zoom · Espacio: Pausa · F: Buscar · T: Árbol · L: Logros
            </div>
          )}

          {showTutorial && (
            <TutorialOverlay
              countryName={getCountryName(sim.countries[sim.playerId])}
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
            onExecuteAction={async (act) => {
              setDefenseFeedback(null);
              return handleExecuteAction(act);
            }}
            placingDefense={placingDefense}
            onTogglePlaceDefense={() => {
              setDefenseFeedback(null);
              setPlacingAntiNuke(false);
              setPlacingBarracks(false);
              setLaunchingNuke(false);
              setPlacingDefense((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            placingAntiNuke={placingAntiNuke}
            onTogglePlaceAntiNuke={() => {
              setDefenseFeedback(null);
              setPlacingDefense(false);
              setPlacingBarracks(false);
              setLaunchingNuke(false);
              setPlacingAntiNuke((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            placingBarracks={placingBarracks}
            onTogglePlaceBarracks={() => {
              setDefenseFeedback(null);
              setPlacingDefense(false);
              setPlacingAntiNuke(false);
              setLaunchingNuke(false);
              setPlacingBarracks((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            launchingNuke={launchingNuke}
            onToggleLaunchNuke={() => {
              setDefenseFeedback(null);
              setPlacingDefense(false);
              setPlacingAntiNuke(false);
              setPlacingBarracks(false);
              setLaunchingNuke((v) => !v);
              if (isMobile) {
                setMobileDrawerOpen(false);
              }
            }}
            defenseFeedback={defenseFeedback}
            onOpenTree={() => openCountryTree(sim.playerId)}
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

      {treeCountryId !== null && (
        <GenealogyTreeModal
          sim={sim}
          countryId={treeCountryId}
          deviceMode={deviceMode}
          initialSelectedNodeId={treeInitialNodeId}
          onClose={() => {
            setTreeCountryId(null);
            setTreeInitialNodeId(undefined);
          }}
          onExecuteAction={handleExecuteAction}
          onSwitchCountry={(id) => {
            setTreeInitialNodeId(undefined);
            setTreeCountryId(id);
          }}
          onPreviewEmpireTerritory={handlePreviewEmpireTerritory}
        />
      )}

      {meetingTargetId !== null && (
        <DiplomaticMeetingModal
          deviceMode={deviceMode}
          sim={sim}
          targetId={meetingTargetId}
          onApplyOutcome={async (tId, outcome) => {
            const res = await handleExecuteAction({
              type: 'apply_meeting_outcome',
              targetId: tId,
              outcome,
            });
            return res.meetingResult ?? null;
          }}
          onClose={() => {
            setMeetingTargetId(null);
            setSelectedId(sim.playerId);
          }}
        />
      )}

      {achievementsOpen && (
        <AchievementsModal
          profile={achievementProfile}
          sim={sim}
          onClose={() => setAchievementsOpen(false)}
        />
      )}

      <EventModal
        sim={sim}
        eventModal={sim.activeEvent}
        onResolved={() => {
          updateAchievements((s) => {
            s.eventsResolved += 1;
          });
          handlePlayerMutation();
        }}
        onContinueSandbox={() => {
          sim.outcome = 'none';
          sim.sandboxAfterVictory = true;
          lastOutcomeRef.current = 'none';
          handlePlayerMutation();
        }}
        onRestartMenu={() => void handleExitToMenu()}
      />

      {renderAchievementToast()}

      {hardModeUnlockToast && (
        <div
          className={`fixed z-[75] ${
            deviceMode === 'mobile'
              ? 'top-16 left-2 right-2'
              : 'top-16 right-4 w-[360px]'
          } bg-[#1A0E16]/98 border-2 border-red-500 shadow-2xl p-3 flex items-start gap-2.5`}
        >
          <div className="w-8 h-8 bg-red-500/20 border border-red-500/60 flex items-center justify-center shrink-0 mt-0.5">
            <Skull className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono-num uppercase tracking-wide text-red-400 font-bold">
              ¡Cadenas Rotas · 50 Países Capturados!
            </div>
            <div className="text-xs font-extrabold text-white mt-0.5">
              ¡Modo Difícil Desbloqueado!
            </div>
            <div className="text-[11px] text-red-100/90 leading-snug mt-0.5">
              Ya puedes seleccionarlo al pulsar «Jugar» en el menú principal.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHardModeUnlockToast(false)}
            aria-label="Cerrar notificación"
            className="p-1 text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <PWAInstallBanner liftAboveBottomNav={isMobile} />
      <OfflineIndicator liftAboveBottomNav={isMobile} />
    </div>
  );
}
