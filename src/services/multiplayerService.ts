import type { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import {
  buildRoomWorldStatePayload,
  type RoomWorldStatePayload,
} from '../engine/campaignSerializer';
import type { GameActionPayload } from '../engine/gameActions';
import type { SimulationState } from '../engine/gameSimulation';

export interface MultiplayerRoom {
  roomCode: string;
  hostUid: string;
  hostName: string;
  status: 'lobby' | 'playing' | 'finished';
  winnerCountryId: number | null;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface RoomMember {
  uid: string;
  roomCode: string;
  displayName: string;
  photoUrl?: string;
  countryId: number;
  ready: boolean;
  isHost: boolean;
  joinedAtMs: number;
  updatedAtMs: number;
}

export interface RoomActionDoc {
  id: string;
  roomCode: string;
  hostUid: string;
  senderUid: string;
  actorCountryId: number;
  payload: GameActionPayload;
  status: 'pending' | 'processed';
}

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  return Date.now();
}

function sanitizeDisplayName(user: User): string {
  const raw = (user.displayName || user.email?.split('@')[0] || 'Comandante').trim();
  return raw.slice(0, 100) || 'Comandante';
}

function generateFourDigitCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createMultiplayerRoom(user: User): Promise<string> {
  const hostName = sanitizeDisplayName(user);
  let chosenCode: string | null = null;

  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateFourDigitCode();
    const roomRef = doc(db, 'rooms', candidate);
    try {
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        chosenCode = candidate;
        break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${candidate}`);
    }
  }

  if (!chosenCode) {
    throw new Error('No se pudo generar un código de sala libre. Intenta de nuevo.');
  }

  const roomRef = doc(db, 'rooms', chosenCode);
  const memberRef = doc(db, 'rooms', chosenCode, 'members', user.uid);

  const batch = writeBatch(db);
  batch.set(roomRef, {
    roomCode: chosenCode,
    hostUid: user.uid,
    hostName,
    status: 'lobby',
    winnerCountryId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const memberPayload: Record<string, unknown> = {
    uid: user.uid,
    roomCode: chosenCode,
    displayName: hostName,
    countryId: -1,
    ready: false,
    isHost: true,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (user.photoURL) {
    memberPayload.photoUrl = user.photoURL.slice(0, 500);
  }
  batch.set(memberRef, memberPayload);

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${chosenCode}`);
  }

  return chosenCode;
}

export async function joinMultiplayerRoom(user: User, rawCode: string): Promise<MultiplayerRoom> {
  const code = rawCode.trim();
  if (!/^[0-9]{4}$/.test(code)) {
    throw new Error('El código debe tener exactamente 4 dígitos numéricos.');
  }

  const roomRef = doc(db, 'rooms', code);
  let roomSnap;
  try {
    roomSnap = await getDoc(roomRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rooms/${code}`);
  }

  if (!roomSnap.exists()) {
    throw new Error(`No existe ninguna sala con el código ${code}.`);
  }

  const data = roomSnap.data();
  const room: MultiplayerRoom = {
    roomCode: String(data.roomCode),
    hostUid: String(data.hostUid),
    hostName: String(data.hostName),
    status: (data.status as MultiplayerRoom['status']) ?? 'lobby',
    winnerCountryId:
      data.winnerCountryId === null || data.winnerCountryId === undefined
        ? null
        : Number(data.winnerCountryId),
    createdAtMs: toMillis(data.createdAt),
    updatedAtMs: toMillis(data.updatedAt),
  };

  const memberRef = doc(db, 'rooms', code, 'members', user.uid);
  let existingMember;
  try {
    existingMember = await getDoc(memberRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rooms/${code}/members/${user.uid}`);
  }

  if (existingMember.exists()) {
    return room;
  }

  if (room.status !== 'lobby') {
    throw new Error('La partida de esta sala ya ha comenzado o terminado.');
  }

  const memberPayload: Record<string, unknown> = {
    uid: user.uid,
    roomCode: code,
    displayName: sanitizeDisplayName(user),
    countryId: -1,
    ready: false,
    isHost: room.hostUid === user.uid,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (user.photoURL) {
    memberPayload.photoUrl = user.photoURL.slice(0, 500);
  }

  try {
    await setDoc(memberRef, memberPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${code}/members/${user.uid}`);
  }

  return room;
}

export async function updateMemberSelection(
  roomCode: string,
  user: User,
  countryId: number,
  ready: boolean
): Promise<void> {
  const memberRef = doc(db, 'rooms', roomCode, 'members', user.uid);
  const patch: Record<string, unknown> = {
    countryId,
    ready,
    displayName: sanitizeDisplayName(user),
    updatedAt: serverTimestamp(),
  };
  if (user.photoURL) {
    patch.photoUrl = user.photoURL.slice(0, 500);
  }
  try {
    await updateDoc(memberRef, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}/members/${user.uid}`);
  }
}

export async function leaveMultiplayerRoom(
  roomCode: string,
  uid: string,
  isHost: boolean,
  roomStatus: 'lobby' | 'playing' | 'finished' = 'lobby'
): Promise<void> {
  const memberRef = doc(db, 'rooms', roomCode, 'members', uid);
  const roomRef = doc(db, 'rooms', roomCode);
  try {
    if (isHost && roomStatus === 'lobby') {
      const batch = writeBatch(db);
      batch.delete(memberRef);
      batch.delete(roomRef);
      await batch.commit();
    } else {
      await deleteDoc(memberRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `rooms/${roomCode}/members/${uid}`);
  }
}

export async function hostStartMultiplayerMatch(
  roomCode: string,
  hostUid: string,
  sim: SimulationState
): Promise<void> {
  const stateRef = doc(db, 'rooms', roomCode, 'state', 'current');
  const roomRef = doc(db, 'rooms', roomCode);
  const statePayload: RoomWorldStatePayload = buildRoomWorldStatePayload(
    roomCode,
    hostUid,
    sim,
    1
  );

  const batch = writeBatch(db);
  batch.set(stateRef, {
    ...statePayload,
    updatedAt: serverTimestamp(),
  });
  batch.update(roomRef, {
    status: 'playing',
    winnerCountryId: null,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${roomCode}`);
  }
}

export async function hostBroadcastWorldState(
  roomCode: string,
  hostUid: string,
  sim: SimulationState,
  tick: number,
  markFinished = false
): Promise<void> {
  const stateRef = doc(db, 'rooms', roomCode, 'state', 'current');
  const payload = buildRoomWorldStatePayload(roomCode, hostUid, sim, tick);

  try {
    if (markFinished) {
      const batch = writeBatch(db);
      batch.set(stateRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'rooms', roomCode), {
        status: 'finished',
        winnerCountryId: sim.winnerCountryId ?? null,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      await setDoc(stateRef, {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${roomCode}/state/current`);
  }
}

export async function sendRoomAction(
  roomCode: string,
  hostUid: string,
  senderUid: string,
  actorCountryId: number,
  payload: GameActionPayload
): Promise<string> {
  const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const actionRef = doc(db, 'rooms', roomCode, 'actions', actionId);

  try {
    await setDoc(actionRef, {
      roomCode,
      hostUid,
      senderUid,
      actorCountryId,
      payload,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${roomCode}/actions/${actionId}`);
  }

  return actionId;
}

export async function markRoomActionProcessed(
  roomCode: string,
  actionId: string
): Promise<void> {
  const actionRef = doc(db, 'rooms', roomCode, 'actions', actionId);
  try {
    await updateDoc(actionRef, {
      status: 'processed',
      processedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}/actions/${actionId}`);
  }
}

export function subscribeRoom(
  roomCode: string,
  onRoom: (room: MultiplayerRoom | null) => void
): Unsubscribe {
  const path = `rooms/${roomCode}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode),
    (snap) => {
      if (!snap.exists()) {
        onRoom(null);
        return;
      }
      const d = snap.data();
      onRoom({
        roomCode: String(d.roomCode),
        hostUid: String(d.hostUid),
        hostName: String(d.hostName),
        status: (d.status as MultiplayerRoom['status']) ?? 'lobby',
        winnerCountryId:
          d.winnerCountryId === null || d.winnerCountryId === undefined
            ? null
            : Number(d.winnerCountryId),
        createdAtMs: toMillis(d.createdAt),
        updatedAtMs: toMillis(d.updatedAt),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeRoomMembers(
  roomCode: string,
  onMembers: (members: RoomMember[]) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/members`;
  const q = query(collection(db, 'rooms', roomCode, 'members'), where('roomCode', '==', roomCode));
  return onSnapshot(
    q,
    (snap) => {
      const list: RoomMember[] = snap.docs.map((d) => {
        const raw = d.data();
        return {
          uid: String(raw.uid),
          roomCode: String(raw.roomCode),
          displayName: String(raw.displayName),
          photoUrl: typeof raw.photoUrl === 'string' ? raw.photoUrl : undefined,
          countryId: Number(raw.countryId),
          ready: Boolean(raw.ready),
          isHost: Boolean(raw.isHost),
          joinedAtMs: toMillis(raw.joinedAt),
          updatedAtMs: toMillis(raw.updatedAt),
        };
      });
      list.sort((a, b) => (a.isHost === b.isHost ? a.joinedAtMs - b.joinedAtMs : a.isHost ? -1 : 1));
      onMembers(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeRoomState(
  roomCode: string,
  onState: (raw: Record<string, unknown>) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/state/current`;
  return onSnapshot(
    doc(db, 'rooms', roomCode, 'state', 'current'),
    (snap) => {
      if (snap.exists()) {
        onState(snap.data() as Record<string, unknown>);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribePendingRoomActions(
  roomCode: string,
  hostUid: string,
  onActions: (actions: RoomActionDoc[]) => void
): Unsubscribe {
  const path = `rooms/${roomCode}/actions`;
  const q = query(
    collection(db, 'rooms', roomCode, 'actions'),
    where('roomCode', '==', roomCode),
    where('hostUid', '==', hostUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const pending: RoomActionDoc[] = [];
      for (const d of snap.docs) {
        const raw = d.data();
        if (raw.status === 'pending') {
          pending.push({
            id: d.id,
            roomCode: String(raw.roomCode),
            hostUid: String(raw.hostUid),
            senderUid: String(raw.senderUid),
            actorCountryId: Number(raw.actorCountryId),
            payload: raw.payload as GameActionPayload,
            status: 'pending',
          });
        }
      }
      onActions(pending);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
