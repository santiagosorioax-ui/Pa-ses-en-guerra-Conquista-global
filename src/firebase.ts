import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  initializeFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

export function formatFirestoreUserError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (isQuotaExceededError(error)) {
    return 'Se alcanzó el límite diario gratuito de escrituras de Firebase Firestore. La cuota se restablece mañana.';
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
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
