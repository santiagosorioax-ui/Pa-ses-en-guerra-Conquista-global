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
import { OperationType, db, handleFirestoreError } from '../firebase';

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

  let exists = false;
  try {
    const snap = await getDoc(ref);
    exists = snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!exists) {
    try {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        ...(photoUrl ? { photoUrl } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    try {
      await updateDoc(ref, {
        displayName,
        email,
        ...(photoUrl ? { photoUrl } : {}),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export function subscribeUserCampaigns(
  uid: string,
  onData: (campaigns: SavedCampaignSummary[]) => void
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
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveCampaignToCloud(
  uid: string,
  campaignId: string,
  sim: SimulationState
): Promise<{ saved: boolean; skippedDefeated?: boolean }> {
  const metaPath = `users/${uid}/campaigns/${campaignId}`;
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const metaRef = doc(db, 'users', uid, 'campaigns', campaignId);
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');
  const userRef = doc(db, 'users', uid);

  let exists = false;
  let alreadyDefeated = false;
  try {
    const existingMeta = await getDoc(metaRef);
    exists = existingMeta.exists();
    if (exists && existingMeta.data()?.outcome === 'defeat') {
      alreadyDefeated = true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, metaPath);
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
    await batch.commit();
    return { saved: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, snapPath);
  }
}

export async function loadCampaignFromCloud(
  uid: string,
  campaignId: string
): Promise<SimulationState | null> {
  const snapPath = `users/${uid}/campaigns/${campaignId}/data/state`;
  const snapRef = doc(db, 'users', uid, 'campaigns', campaignId, 'data', 'state');

  try {
    const docSnap = await getDoc(snapRef);
    if (!docSnap.exists()) return null;
    return restoreSimulationFromSnapshot(docSnap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, snapPath);
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
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, metaPath);
  }
}
