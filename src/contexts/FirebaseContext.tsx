import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutFirebase } from '../firebase';
import {
  ensureUserProfile,
  subscribeUserCampaigns,
  type SavedCampaignSummary,
} from '../services/cloudSaves';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  authBusy: boolean;
  authError: string | null;
  campaigns: SavedCampaignSummary[];
  campaignsLoading: boolean;
  signInWithGoogle: () => Promise<User | null>;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<SavedCampaignSummary[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setCampaigns([]);
        setCampaignsLoading(false);
      }
    });
    return unsub;
  }, []);

  // Sync profile & subscribe to campaigns when auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    setCampaignsLoading(true);
    setAuthError(null);

    void ensureUserProfile(user).catch((err) => {
      if (!cancelled) {
        setAuthError(err instanceof Error ? err.message : 'Error al sincronizar perfil.');
      }
    });

    const unsubCampaigns = subscribeUserCampaigns(
      user.uid,
      (list) => {
        if (!cancelled) {
          setCampaigns(list);
          setCampaignsLoading(false);
        }
      },
      (errMsg) => {
        if (!cancelled) {
          setCampaignsLoading(false);
          setAuthError(errMsg);
        }
      }
    );

    return () => {
      cancelled = true;
      unsubCampaigns();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const cred = await loginWithGoogle();
      return cred.user;
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Inicio de sesión cancelado.'
          : 'No se pudo iniciar sesión con Google.';
      setAuthError(msg);
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await logoutFirebase();
    } catch {
      setAuthError('No se pudo cerrar sesión.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        user,
        authReady,
        authBusy,
        authError,
        campaigns,
        campaignsLoading,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error('useFirebase debe usarse dentro de FirebaseProvider');
  return ctx;
}
