import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  disableNetwork,
  doc,
  getDocFromServer,
  initializeFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = 'santiagosorioax@gmail.com';

export function isAdminUser(
  user: { email?: string | null; emailVerified?: boolean | null } | null | undefined
): boolean {
  if (!user || !user.email) return false;
  if (user.emailVerified === false) return false;
  return user.email.trim().toLowerCase() === ADMIN_EMAIL;
}

export const ONLINE_TESTER_EMAILS = [
  'santiagosorioax@gmail.com',
  'leonelosorioa@gmail.com',
] as const;

export function isOnlineTesterUser(
  user: { email?: string | null; emailVerified?: boolean | null } | null | undefined
): boolean {
  if (!user || !user.email) return false;
  if (user.emailVerified === false) return false;
  const normalized = user.email.trim().toLowerCase();
  return (ONLINE_TESTER_EMAILS as readonly string[]).includes(normalized);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function isQuotaExceededError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('resource-exhausted') ||
    lower.includes('quota limit exceeded') ||
    lower.includes('quota exceeded')
  );
}

export function isFirestoreTimeoutError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return lower.includes('tardó demasiado') || lower.includes('timeout');
}

const QUOTA_COOLDOWN_STORAGE_KEY = 'paises_en_guerra_firestore_quota_until_v1';

/**
 * Firebase Firestore daily free-tier quotas reset at midnight Pacific Time (~08:00 UTC).
 * Return the next 08:05 UTC timestamp (at least 2 hours from now) so the client stops
 * hammering an exhausted daily write quota until the next reset window.
 */
function getNextDailyQuotaResetMs(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  const nextReset = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    8,
    5,
    0,
    0
  );
  const target = nextReset <= nowMs + 15 * 60_000 ? nextReset + 24 * 60 * 60_000 : nextReset;
  return Math.max(nowMs + 2 * 60 * 60_000, target);
}

function readPersistedQuotaCooldown(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(QUOTA_COOLDOWN_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

let globalQuotaCooldownUntilMs = readPersistedQuotaCooldown();
let networkSuspendedForQuota = false;

export function isFirestoreNetworkSuspended(): boolean {
  return networkSuspendedForQuota;
}

export function markFirestoreQuotaExceeded(durationMs?: number): void {
  const targetUntil =
    typeof durationMs === 'number'
      ? Date.now() + durationMs
      : getNextDailyQuotaResetMs();
  const nextUntil = Math.max(globalQuotaCooldownUntilMs, targetUntil);
  globalQuotaCooldownUntilMs = nextUntil;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(QUOTA_COOLDOWN_STORAGE_KEY, String(nextUntil));
    } catch {
      // ignore storage errors
    }
  }
  // Immediately halt Firestore's internal WriteStream exponential backoff loop in this tab
  if (!networkSuspendedForQuota) {
    networkSuspendedForQuota = true;
    void disableNetwork(db).catch(() => {
      // ignore network disable errors
    });
  }
}

export function isFirestoreQuotaCooldownActive(): boolean {
  if (Date.now() < globalQuotaCooldownUntilMs) return true;
  if (globalQuotaCooldownUntilMs > 0) {
    globalQuotaCooldownUntilMs = 0;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(QUOTA_COOLDOWN_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
  }
  return false;
}

export function formatFirestoreUserError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (isQuotaExceededError(error)) {
    return 'Se alcanzó el límite diario gratuito de escrituras de Firebase Firestore. Tus partidas siguen guardándose localmente y la cuota en la nube se restablece mañana.';
  }
  if (lower.includes('tardó demasiado') || lower.includes('timeout')) {
    return msg;
  }
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'Permiso denegado por Firestore. Cierra sesión y vuelve a entrar con Google.';
  }
  if (lower.includes('unavailable') || lower.includes('client is offline') || lower.includes('network')) {
    return 'No se pudo conectar con Firebase. Verifica tu conexión a internet e intenta de nuevo.';
  }
  return fallback;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms = 9000,
  timeoutMessage = 'La conexión con Firebase tardó demasiado. Es posible que el servidor esté saturado o sin red.'
): Promise<T> {
  // Observe late quota rejections even if the timeout wins the race first
  promise.then(undefined, (err) => {
    if (isQuotaExceededError(err)) {
      markFirestoreQuotaExceeded();
    }
  });

  let timer: number | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(timeoutMessage)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = true
): void {
  const isWriteOp =
    operationType === OperationType.WRITE ||
    operationType === OperationType.CREATE ||
    operationType === OperationType.UPDATE ||
    operationType === OperationType.DELETE;

  if (isQuotaExceededError(error)) {
    markFirestoreQuotaExceeded();
  } else if (isFirestoreTimeoutError(error) && isWriteOp) {
    // Firestore holds write commits in internal WriteStream backoff when daily write quota is exhausted.
    // Suspend network writes immediately to stop repeated SDK backoff errors.
    markFirestoreQuotaExceeded();
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  if (rethrow) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
  if (isQuotaExceededError(error) || isFirestoreTimeoutError(error)) {
    console.warn('Firestore background sync paused:', errInfo.error, path);
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logoutFirebase() {
  return signOut(auth);
}
