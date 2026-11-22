import type { User } from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  getDoc,
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
} from '../engine/campaignSerializer';
import type { SimulationState } from '../engine/gameSimulation';
import {
  OperationType,
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  isFirestoreQuotaCooldownActive,
  withTimeout,
} from '../firebase';

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
): Promise<{ saved: boolean; skippedDefeated?: boolean }> {
  if (isFirestoreQuotaCooldownActive()) {
    throw new Error('resource-exhausted: Quota limit exceeded.');
  }
  const metaPath = `users/${uid}/campaigns/${campaignId}`;
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const metaRef = doc(db, 'users', uid, 'campaigns', campaignId);
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');
  const userRef = doc(db, 'users', uid);

  let exists = false;
  let alreadyDefeated = false;
  try {
    const existingMeta = await withTimeout(getDoc(metaRef), 8000);
    exists = existingMeta.exists();
    if (exists && existingMeta.data()?.outcome === 'defeat') {
      alreadyDefeated = true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, metaPath, false);
    throw error;
  }

  if (alreadyDefeated) {
    return { saved: false, skippedDefeated: true };
  }

  const metaPayload = buildCampaignMetaPayload(uid, campaignId, sim);
  const snapPayload = buildCampaignSnapshotPayload(uid, campaignId, sim);

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

  batch.update(userRef, {
    lastCampaignId: campaignId,
    updatedAt: serverTimestamp(),
  });

  try {
    await withTimeout(batch.commit(), 9000);
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, snapPath, false);
    throw error;
  }
}

export async function loadCampaignFromCloud(
  uid: string,
  campaignId: string
): Promise<SimulationState | null> {
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');

  try {
    const docSnap = await withTimeout(getDoc(snapRef), 9000);
    if (!docSnap.exists()) return null;
    return restoreSimulationFromSnapshot(docSnap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, snapPath, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo cargar la partida guardada.'));
  }
}

export async function deleteCampaignFromCloud(
  uid: string,
  campaignId: string
): Promise<void> {
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
