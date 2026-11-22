import type { User } from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  OperationType,
  db,
  formatFirestoreUserError,
  handleFirestoreError,
  isOnlineTesterUser,
  withTimeout,
} from '../firebase';
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

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

export async function createMultiplayerRoom(user: User): Promise<string> {
  if (!isOnlineTesterUser(user)) {
    throw new Error('El modo online está en desarrollo y solo está habilitado para cuentas autorizadas de prueba.');
  }
  const hostName = sanitizeDisplayName(user);
  let chosenCode: string | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = generateFourDigitCode();
    const roomRef = doc(db, 'rooms', candidate);
    try {
      const snap = await withTimeout(
        getDocFromServer(roomRef),
        8000,
        'La conexión al servidor tardó demasiado al verificar el código de sala.'
      );
      if (!snap.exists()) {
        chosenCode = candidate;
        break;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `rooms/${candidate}`, false);
      throw new Error(formatFirestoreUserError(error, 'No se pudo conectar para crear la sala.'));
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
    await withTimeout(
      batch.commit(),
      9000,
      'El servidor tardó demasiado al crear la sala (posible límite diario de escrituras o red lenta).'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${chosenCode}`, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo crear la sala.'));
  }

  return chosenCode;
}

export async function joinMultiplayerRoom(user: User, rawCode: string): Promise<MultiplayerRoom> {
  if (!isOnlineTesterUser(user)) {
    throw new Error('El modo online está en desarrollo y solo está habilitado para cuentas autorizadas de prueba.');
  }
  const code = rawCode.trim();
  if (!/^[0-9]{4}$/.test(code)) {
    throw new Error('El código debe tener exactamente 4 dígitos numéricos.');
  }

  const roomRef = doc(db, 'rooms', code);
  const memberRef = doc(db, 'rooms', code, 'members', user.uid);

  let roomSnap;
  let existingMember;
  try {
    [roomSnap, existingMember] = await withTimeout(
      Promise.all([getDocFromServer(roomRef), getDocFromServer(memberRef)]),
      8000,
      'La conexión tardó demasiado al buscar la sala.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rooms/${code}`, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo consultar la sala.'));
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
    await withTimeout(
      setDoc(memberRef, memberPayload),
      9000,
      'El servidor tardó demasiado al entrar en la sala (posible límite diario de escrituras o red lenta).'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${code}/members/${user.uid}`, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo unir a la sala.'));
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
    await withTimeout(
      updateDoc(memberRef, patch),
      8000,
      'Tardó demasiado al guardar tu selección de país.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}/members/${user.uid}`, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo seleccionar el país.'));
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
  const stateRef = doc(db, 'rooms', roomCode, 'state', 'current');
  try {
    if (isHost) {
      if (roomStatus !== 'lobby') {
        try {
          await withTimeout(deleteDoc(stateRef), 3500);
        } catch {
          // state/current may not exist yet or already deleted
        }
      }
      const batch = writeBatch(db);
      batch.delete(memberRef);
      batch.delete(roomRef);
      await withTimeout(batch.commit(), 5000);
    } else {
      await withTimeout(deleteDoc(memberRef), 5000);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `rooms/${roomCode}/members/${uid}`, false);
  }
}

export async function loadRoomWorldStateOnce(
  roomCode: string
): Promise<Record<string, unknown> | null> {
  const stateRef = doc(db, 'rooms', roomCode, 'state', 'current');
  try {
    const snap = await withTimeout(
      getDocFromServer(stateRef),
      8000,
      'Tardó demasiado al recuperar el estado de la partida.'
    );
    if (!snap.exists()) return null;
    return snap.data() as Record<string, unknown>;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rooms/${roomCode}/state/current`, false);
    return null;
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
    await withTimeout(
      batch.commit(),
      10000,
      'Tardó demasiado al iniciar la partida en el servidor.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${roomCode}`, false);
    throw new Error(formatFirestoreUserError(error, 'No se pudo iniciar la partida.'));
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
      await withTimeout(batch.commit(), 9000);
    } else {
      await withTimeout(
        setDoc(stateRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        }),
        9000
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `rooms/${roomCode}/state/current`, false);
    throw error;
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
  const sanitizedPayload = stripUndefinedDeep(payload);

  try {
    await withTimeout(
      setDoc(actionRef, {
        roomCode,
        hostUid,
        senderUid,
        actorCountryId,
        payload: sanitizedPayload,
        status: 'pending',
        createdAt: serverTimestamp(),
      }),
      8000,
      'Tardó demasiado al enviar la orden al anfitrión.'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${roomCode}/actions/${actionId}`, false);
    throw new Error(formatFirestoreUserError(error, 'Error al enviar orden online.'));
  }

  return actionId;
}

export async function markRoomActionProcessed(
  roomCode: string,
  actionId: string
): Promise<void> {
  const actionRef = doc(db, 'rooms', roomCode, 'actions', actionId);
  try {
    await deleteDoc(actionRef);
  } catch {
    try {
      await updateDoc(actionRef, {
        status: 'processed',
        processedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}/actions/${actionId}`, false);
    }
  }
}

export function subscribeRoom(
  roomCode: string,
  onRoom: (room: MultiplayerRoom | null, meta?: { fromCache: boolean }) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const path = `rooms/${roomCode}`;
  return onSnapshot(
    doc(db, 'rooms', roomCode),
    (snap) => {
      if (!snap.exists()) {
        onRoom(null, { fromCache: snap.metadata.fromCache });
        return;
      }
      const d = snap.data();
      onRoom(
        {
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
        },
        { fromCache: snap.metadata.fromCache }
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path, false);
      onError?.(formatFirestoreUserError(error, 'Error al sincronizar la sala.'));
    }
  );
}

export function subscribeRoomMembers(
  roomCode: string,
  onMembers: (members: RoomMember[]) => void,
  onError?: (message: string) => void
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
      handleFirestoreError(error, OperationType.LIST, path, false);
      onError?.(formatFirestoreUserError(error, 'Error al cargar jugadores de la sala.'));
    }
  );
}

export function subscribeRoomState(
  roomCode: string,
  onState: (raw: Record<string, unknown>) => void,
  onError?: (message: string) => void
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
      handleFirestoreError(error, OperationType.GET, path, false);
      onError?.(formatFirestoreUserError(error, 'Error al sincronizar la partida online.'));
    }
  );
}

export function subscribePendingRoomActions(
  roomCode: string,
  hostUid: string,
  onActions: (actions: RoomActionDoc[]) => void,
  onError?: (message: string) => void
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
      handleFirestoreError(error, OperationType.LIST, path, false);
      onError?.(formatFirestoreUserError(error, 'Error al recibir órdenes de los jugadores.'));
    }
  );
}
