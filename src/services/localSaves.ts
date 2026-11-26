import {
  buildCampaignMetaPayload,
  buildCampaignSnapshotPayload,
  restoreSimulationFromSnapshot,
  type SerializedCampaignData,
} from '../engine/campaignSerializer';
import { Bytes } from 'firebase/firestore';
import type { SimulationState } from '../engine/gameSimulation';
import type { SavedCampaignSummary } from './cloudSaves';

const LOCAL_INDEX_KEY = 'paises_en_guerra_local_campaigns_v2';
const LOCAL_SNAP_PREFIX = 'paises_en_guerra_local_snap_v2_';
const LAST_CAMPAIGN_ID_KEY = 'paises_en_guerra_last_campaign_id_v2';
const MAX_LOCAL_CAMPAIGNS = 4;

export interface LocalCampaignSummary extends SavedCampaignSummary {
  totalDays: number;
  defensesCount: number;
  barracksCount: number;
  antiNukesCount: number;
  portsCount: number;
  dirtyForCloud: boolean;
  ownerUid?: string;
}

interface StoredLocalSnapshot {
  version: number;
  ownerId: string;
  campaignId: string;
  playerId: number;
  day: number;
  month: number;
  year: number;
  totalDays: number;
  elapsedSeconds: number;
  globalStability: number;
  globalTension: number;
  sandboxAfterVictory: boolean;
  outcome: 'none' | 'victory' | 'defeat';
  nextEventDay: number;
  nextIdCounter: number;
  aiCursor: number;
  lastAiWarMonth: number;
  ownerGridRleB64: string;
  relationsB64: string;
  treatiesB64: string;
  truceMonthsB64: string;
  countries: SerializedCampaignData['countries'];
  wars: SerializedCampaignData['wars'];
  invasions: SerializedCampaignData['invasions'];
  chronicle: SerializedCampaignData['chronicle'];
  playerHistory: SerializedCampaignData['playerHistory'];
  pendingProposal?: SerializedCampaignData['pendingProposal'];
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...sub);
  }
  return window.btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = window.atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function readLocalIndex(): LocalCampaignSummary[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is LocalCampaignSummary =>
          Boolean(item && typeof item === 'object' && typeof item.campaignId === 'string')
      )
      .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  } catch {
    return [];
  }
}

function writeLocalIndex(list: LocalCampaignSummary[]): void {
  try {
    window.localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function listLocalCampaigns(): LocalCampaignSummary[] {
  return readLocalIndex();
}

export function getLastPlayedLocalCampaign(): LocalCampaignSummary | null {
  const list = readLocalIndex();
  if (list.length === 0) return null;
  try {
    const lastId = window.localStorage.getItem(LAST_CAMPAIGN_ID_KEY);
    if (lastId) {
      const found = list.find((c) => c.campaignId === lastId);
      if (found) return found;
    }
  } catch {
    // fallback to newest
  }
  return list[0] ?? null;
}

export function saveCampaignLocally(
  sim: SimulationState,
  campaignId: string,
  opts?: { ownerUid?: string; dirtyForCloud?: boolean }
): LocalCampaignSummary | null {
  if (sim.isMultiplayer) return null;

  const ownerUid = opts?.ownerUid || 'offline';
  const now = Date.now();
  const meta = buildCampaignMetaPayload(ownerUid, campaignId, sim);
  const snap = buildCampaignSnapshotPayload(ownerUid, campaignId, sim);
  const player = sim.countries[sim.playerId];

  const summary: LocalCampaignSummary = {
    campaignId: meta.campaignId,
    countryId: meta.countryId,
    countryName: meta.countryName,
    countryIso2: meta.countryIso2,
    dateLabel: meta.dateLabel,
    day: meta.day,
    month: meta.month,
    year: meta.year,
    elapsedSeconds: meta.elapsedSeconds,
    money: meta.money,
    netIncome: meta.netIncome,
    army: meta.army,
    pixels: meta.pixels,
    outcome: meta.outcome,
    updatedAtMs: now,
    totalDays: sim.totalDays,
    defensesCount: player?.defenses?.length ?? 0,
    barracksCount: player?.barracks?.length ?? 0,
    antiNukesCount: player?.antiNukes?.length ?? 0,
    portsCount: player?.ports?.length ?? 0,
    dirtyForCloud: opts?.dirtyForCloud ?? true,
    ownerUid: opts?.ownerUid,
  };

  const stored: StoredLocalSnapshot = {
    version: snap.version,
    ownerId: snap.ownerId,
    campaignId: snap.campaignId,
    playerId: snap.playerId,
    day: snap.day,
    month: snap.month,
    year: snap.year,
    totalDays: snap.totalDays,
    elapsedSeconds: snap.elapsedSeconds,
    globalStability: snap.globalStability,
    globalTension: snap.globalTension,
    sandboxAfterVictory: snap.sandboxAfterVictory,
    outcome: snap.outcome,
    nextEventDay: snap.nextEventDay,
    nextIdCounter: snap.nextIdCounter,
    aiCursor: snap.aiCursor,
    lastAiWarMonth: snap.lastAiWarMonth,
    ownerGridRleB64: uint8ToBase64(snap.ownerGridRle.toUint8Array()),
    relationsB64: uint8ToBase64(snap.relationsBytes.toUint8Array()),
    treatiesB64: uint8ToBase64(snap.treatiesBytes.toUint8Array()),
    truceMonthsB64: uint8ToBase64(snap.truceMonthsBytes.toUint8Array()),
    countries: snap.countries,
    wars: snap.wars,
    invasions: snap.invasions,
    chronicle: snap.chronicle,
    playerHistory: snap.playerHistory,
    ...(snap.pendingProposal ? { pendingProposal: snap.pendingProposal } : {}),
  };

  const serializedSnap = JSON.stringify(stored);
  const snapKey = `${LOCAL_SNAP_PREFIX}${campaignId}`;

  const currentIndex = readLocalIndex().filter((item) => item.campaignId !== campaignId);
  const nextIndex = [summary, ...currentIndex];

  // Evict beyond MAX_LOCAL_CAMPAIGNS first
  while (nextIndex.length > MAX_LOCAL_CAMPAIGNS) {
    const removed = nextIndex.pop();
    if (removed) {
      try {
        window.localStorage.removeItem(`${LOCAL_SNAP_PREFIX}${removed.campaignId}`);
      } catch {
        // ignore
      }
    }
  }

  // Try writing snapshot; if localStorage quota is tight, evict older local saves so the latest always succeeds
  let wroteSnap = false;
  for (let attempt = 0; attempt < MAX_LOCAL_CAMPAIGNS + 1; attempt++) {
    try {
      window.localStorage.setItem(snapKey, serializedSnap);
      wroteSnap = true;
      break;
    } catch {
      if (nextIndex.length > 1) {
        const oldest = nextIndex.pop();
        if (oldest) {
          try {
            window.localStorage.removeItem(`${LOCAL_SNAP_PREFIX}${oldest.campaignId}`);
          } catch {
            // ignore
          }
        }
      } else {
        break;
      }
    }
  }

  if (!wroteSnap) return null;

  writeLocalIndex(nextIndex);
  try {
    window.localStorage.setItem(LAST_CAMPAIGN_ID_KEY, campaignId);
  } catch {
    // ignore
  }
  return summary;
}

export function markLocalCampaignSyncedToCloud(campaignId: string, ownerUid: string): void {
  const list = readLocalIndex();
  let changed = false;
  const next = list.map((item) => {
    if (item.campaignId === campaignId) {
      changed = true;
      return { ...item, dirtyForCloud: false, ownerUid };
    }
    return item;
  });
  if (changed) {
    writeLocalIndex(next);
  }
}

export function loadLocalCampaignSnapshot(
  campaignId: string
): { summary: LocalCampaignSummary; sim: SimulationState } | null {
  try {
    const rawSnap = window.localStorage.getItem(`${LOCAL_SNAP_PREFIX}${campaignId}`);
    if (!rawSnap) return null;
    const stored = JSON.parse(rawSnap) as StoredLocalSnapshot;
    if (!stored || typeof stored.ownerGridRleB64 !== 'string') return null;

    const hydratedRaw: Record<string, unknown> = {
      ...stored,
      ownerGridRle: Bytes.fromUint8Array(base64ToUint8(stored.ownerGridRleB64)),
      relationsBytes: Bytes.fromUint8Array(base64ToUint8(stored.relationsB64)),
      treatiesBytes: Bytes.fromUint8Array(base64ToUint8(stored.treatiesB64)),
      truceMonthsBytes: Bytes.fromUint8Array(base64ToUint8(stored.truceMonthsB64)),
    };

    const sim = restoreSimulationFromSnapshot(hydratedRaw);
    const list = readLocalIndex();
    const summary =
      list.find((item) => item.campaignId === campaignId) ?? {
        ...buildCampaignMetaPayload(stored.ownerId || 'offline', campaignId, sim),
        updatedAtMs: Date.now(),
        totalDays: sim.totalDays,
        defensesCount: sim.countries[sim.playerId]?.defenses?.length ?? 0,
        barracksCount: sim.countries[sim.playerId]?.barracks?.length ?? 0,
        antiNukesCount: sim.countries[sim.playerId]?.antiNukes?.length ?? 0,
        portsCount: sim.countries[sim.playerId]?.ports?.length ?? 0,
        dirtyForCloud: true,
      };
    return { summary, sim };
  } catch {
    return null;
  }
}

export function deleteLocalCampaign(campaignId: string): void {
  try {
    window.localStorage.removeItem(`${LOCAL_SNAP_PREFIX}${campaignId}`);
  } catch {
    // ignore
  }
  const next = readLocalIndex().filter((item) => item.campaignId !== campaignId);
  writeLocalIndex(next);
  try {
    const lastId = window.localStorage.getItem(LAST_CAMPAIGN_ID_KEY);
    if (lastId === campaignId) {
      if (next[0]) {
        window.localStorage.setItem(LAST_CAMPAIGN_ID_KEY, next[0].campaignId);
      } else {
        window.localStorage.removeItem(LAST_CAMPAIGN_ID_KEY);
      }
    }
  } catch {
    // ignore
  }
}
