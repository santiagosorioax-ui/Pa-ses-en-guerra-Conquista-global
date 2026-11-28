import type { User } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore';
import {
  buildCampaignMetaPayload,
  buildCampaignSnapshotPayload,
  restoreSimulationFromSnapshot,
  stripUndefinedForFirestore,
} from '../engine/campaignSerializer';
import type { SimulationState } from '../engine/gameSimulation';
import {
  OperationType,
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  isFirestoreNetworkSuspended,
  isFirestoreQuotaCooldownActive,
  isFirestoreTimeoutError,
  isQuotaExceededError,
  markFirestoreQuotaExceeded,
  withTimeout,
} from '../firebase';
import { markLocalCampaignSyncedToCloud } from './localSaves';

const knownExistingCloudCampaigns = new Set<string>();
const lastWrittenUserCampaignByUid = new Map<string, string>();

export interface SavedCampaignSummary {
  campaignId: string;
  countryId: number;
  countryName: string;
  countryIso2: string;
  dateLabel: string;
  day: number;
  month: number;
  year: number;
  elapsedSeconds: number;
  money: number;
  netIncome: number;
  army: number;
  pixels: number;
  outcome: 'none' | 'victory' | 'defeat';
  updatedAtMs: number;
}

export async function ensureUserProfile(user: User): Promise<void> {
  if (isFirestoreQuotaCooldownActive()) return;
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  const displayName = (user.displayName || user.email?.split('@')[0] || 'Comandante').slice(0, 100);
  const email = (user.email || '').slice(0, 200);
  const photoUrl = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

  let existingSnap;
  try {
    existingSnap = await withTimeout(getDoc(ref), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path, false);
    if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) return;
    throw new Error(formatFirestoreUserError(error, 'Error al verificar tu perfil en la nube.'));
  }

  if (!existingSnap.exists()) {
    try {
      await withTimeout(
        setDoc(ref, {
          uid: user.uid,
          displayName,
          email,
          ...(photoUrl ? { photoUrl } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
        8000
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path, false);
      if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) return;
      throw new Error(formatFirestoreUserError(error, 'Error al crear perfil en la nube.'));
    }
  } else {
    const prev = existingSnap.data();
    const sameName = prev.displayName === displayName;
    const sameEmail = prev.email === email;
    const samePhoto = (prev.photoUrl ?? undefined) === photoUrl;
    if (sameName && sameEmail && samePhoto) {
      return;
    }
    try {
      await withTimeout(
        updateDoc(ref, {
          displayName,
          email,
          ...(photoUrl ? { photoUrl } : {}),
          updatedAt: serverTimestamp(),
        }),
        8000
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path, false);
      if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) return;
      throw new Error(formatFirestoreUserError(error, 'Error al actualizar perfil en la nube.'));
    }
  }
}

export function subscribeUserCampaigns(
  uid: string,
  onData: (campaigns: SavedCampaignSummary[]) => void,
  onError?: (msg: string) => void
): () => void {
  const path = `users/${uid}/campaigns`;
  const q = query(collection(db, 'users', uid, 'campaigns'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedCampaignSummary[] = snapshot.docs.map((d) => {
        const data = d.data();
        const ts = data.updatedAt as Timestamp | undefined;
        const updatedAtMs = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now();
        return {
          campaignId: String(data.campaignId || d.id),
          countryId: Number(data.countryId ?? 0),
          countryName: String(data.countryName ?? ''),
          countryIso2: String(data.countryIso2 ?? 'ES'),
          dateLabel: String(data.dateLabel ?? ''),
          day: Number(data.day ?? 1),
          month: Number(data.month ?? 1),
          year: Number(data.year ?? 2026),
          elapsedSeconds: Number(data.elapsedSeconds ?? 0),
          money: Number(data.money ?? 0),
          netIncome: Number(data.netIncome ?? 0),
          army: Number(data.army ?? 0),
          pixels: Number(data.pixels ?? 0),
          outcome: (data.outcome as 'none' | 'victory' | 'defeat') ?? 'none',
          updatedAtMs,
        };
      });

      items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path, false);
      onError?.(formatFirestoreUserError(error, 'No se pudieron cargar las partidas guardadas.'));
    }
  );
}

export async function saveCampaignToCloud(
  uid: string,
  campaignId: string,
  sim: SimulationState
): Promise<{ saved: boolean; skippedDefeated?: boolean; skippedQuota?: boolean }> {
  if (isFirestoreQuotaCooldownActive()) {
    return { saved: false, skippedQuota: true };
  }
  const cacheKey = `${uid}:${campaignId}`;
  const metaPath = `users/${uid}/campaigns/${campaignId}`;
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const metaRef = doc(db, 'users', uid, 'campaigns', campaignId);
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');
  const userRef = doc(db, 'users', uid);

  let exists = knownExistingCloudCampaigns.has(cacheKey);
  let alreadyDefeated = false;
  if (!exists) {
    try {
      const existingMeta = await withTimeout(getDoc(metaRef), 8000);
      exists = existingMeta.exists();
      if (exists) {
        knownExistingCloudCampaigns.add(cacheKey);
        if (existingMeta.data()?.outcome === 'defeat') {
          alreadyDefeated = true;
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, metaPath, false);
      if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) {
        return { saved: false, skippedQuota: true };
      }
      throw error;
    }
  }

  if (alreadyDefeated) {
    return { saved: false, skippedDefeated: true };
  }

  const metaPayload = stripUndefinedForFirestore(buildCampaignMetaPayload(uid, campaignId, sim));
  const snapPayload = stripUndefinedForFirestore(buildCampaignSnapshotPayload(uid, campaignId, sim));

  const batch = writeBatch(db);

  if (!exists) {
    batch.set(metaRef, {
      ...metaPayload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(snapRef, {
      ...snapPayload,
      updatedAt: serverTimestamp(),
    });
  } else {
    batch.update(metaRef, {
      dateLabel: metaPayload.dateLabel,
      day: metaPayload.day,
      month: metaPayload.month,
      year: metaPayload.year,
      elapsedSeconds: metaPayload.elapsedSeconds,
      money: metaPayload.money,
      netIncome: metaPayload.netIncome,
      army: metaPayload.army,
      pixels: metaPayload.pixels,
      outcome: metaPayload.outcome,
      updatedAt: serverTimestamp(),
    });

    batch.update(snapRef, {
      day: snapPayload.day,
      month: snapPayload.month,
      year: snapPayload.year,
      totalDays: snapPayload.totalDays,
      elapsedSeconds: snapPayload.elapsedSeconds,
      globalStability: snapPayload.globalStability,
      globalTension: snapPayload.globalTension,
      sandboxAfterVictory: snapPayload.sandboxAfterVictory,
      outcome: snapPayload.outcome,
      nextEventDay: snapPayload.nextEventDay,
      nextIdCounter: snapPayload.nextIdCounter,
      aiCursor: snapPayload.aiCursor,
      lastAiWarMonth: snapPayload.lastAiWarMonth,
      ownerGridRle: snapPayload.ownerGridRle,
      relationsBytes: snapPayload.relationsBytes,
      treatiesBytes: snapPayload.treatiesBytes,
      truceMonthsBytes: snapPayload.truceMonthsBytes,
      countries: snapPayload.countries,
      wars: snapPayload.wars,
      invasions: snapPayload.invasions,
      chronicle: snapPayload.chronicle,
      playerHistory: snapPayload.playerHistory,
      pendingProposal: snapPayload.pendingProposal ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
  }

  // Only update user profile pointer when active campaign changes (saves 33% of writes)
  const shouldUpdateUserPointer = lastWrittenUserCampaignByUid.get(uid) !== campaignId;
  if (shouldUpdateUserPointer) {
    batch.update(userRef, {
      lastCampaignId: campaignId,
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await withTimeout(batch.commit(), 9000);
    knownExistingCloudCampaigns.add(cacheKey);
    lastWrittenUserCampaignByUid.set(uid, campaignId);
    markLocalCampaignSyncedToCloud(campaignId, uid);
    return { saved: true };
  } catch (error) {
    if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) {
      markFirestoreQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.WRITE, snapPath, false);
    if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) {
      return { saved: false, skippedQuota: true };
    }
    throw error;
  }
}

export interface LoadedCloudCampaign {
  sim: SimulationState;
  updatedAtMs: number;
  totalDays: number;
  elapsedSeconds: number;
}

export async function loadCampaignSnapshotWithMetaFromCloud(
  uid: string,
  campaignId: string
): Promise<LoadedCloudCampaign | null> {
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');

  try {
    let docSnap = null;
    const isOnline =
      (typeof navigator === 'undefined' || navigator.onLine !== false) &&
      !isFirestoreNetworkSuspended();
    if (isOnline) {
      try {
        docSnap = await withTimeout(getDocFromServer(snapRef), 8000);
      } catch {
        // Fallback to local Firestore cache if server fetch times out or drops offline
        docSnap = await withTimeout(getDoc(snapRef), 4500);
      }
    } else {
      docSnap = await withTimeout(getDoc(snapRef), 4500);
    }

    if (!docSnap || !docSnap.exists()) return null;
    const raw = docSnap.data();
    const ts = raw.updatedAt as Timestamp | undefined;
    const updatedAtMs = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : 0;
    const sim = restoreSimulationFromSnapshot(raw);
    return {
      sim,
      updatedAtMs,
      totalDays: sim.totalDays,
      elapsedSeconds: sim.elapsedSeconds,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, snapPath, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo cargar la partida guardada.'));
  }
}

export async function loadCampaignFromCloud(
  uid: string,
  campaignId: string
): Promise<SimulationState | null> {
  const loaded = await loadCampaignSnapshotWithMetaFromCloud(uid, campaignId);
  return loaded ? loaded.sim : null;
}

export async function deleteCampaignFromCloud(
  uid: string,
  campaignId: string
): Promise<void> {
  if (isFirestoreQuotaCooldownActive()) {
    throw new Error(
      'Se alcanzó el límite diario gratuito de escrituras de Firebase Firestore. Podrás eliminar partidas en la nube cuando se restablezca la cuota mañana.'
    );
  }
  const metaPath = `users/${uid}/campaigns/${campaignId}`;
  const metaRef = doc(db, 'users', uid, 'campaigns', campaignId);
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');

  const batch = writeBatch(db);
  batch.delete(snapRef);
  batch.delete(metaRef);

  try {
    await withTimeout(batch.commit(), 8000);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, metaPath, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo eliminar la partida.'));
  }
}
