import type { AchievementProfile } from '../data/achievements';

export const HARD_MODE_UNLOCK_TARGET = 50;

export interface HardModeUnlockProgress {
  unlocked: boolean;
  bestCapturedInMatch: number;
  unlockedAtMs?: number;
}

function getHardModeStorageKey(uid?: string | null): string {
  return uid ? `paises_en_guerra_hard_mode_${uid}` : 'paises_en_guerra_hard_mode_guest';
}

export function loadHardModeUnlockProgress(
  uid?: string | null,
  achievementProfile?: AchievementProfile | null
): HardModeUnlockProgress {
  const fallback: HardModeUnlockProgress = {
    unlocked: false,
    bestCapturedInMatch: 0,
  };

  let stored: HardModeUnlockProgress = { ...fallback };
  if (typeof window !== 'undefined') {
    try {
      const rawUser = uid ? window.localStorage.getItem(getHardModeStorageKey(uid)) : null;
      const rawGuest = window.localStorage.getItem(getHardModeStorageKey(null));
      for (const raw of [rawUser, rawGuest]) {
        if (!raw) continue;
        const parsed = JSON.parse(raw) as Partial<HardModeUnlockProgress>;
        const best = Number(parsed.bestCapturedInMatch ?? 0);
        if (Number.isFinite(best) && best > stored.bestCapturedInMatch) {
          stored.bestCapturedInMatch = Math.max(0, Math.floor(best));
        }
        if (parsed.unlocked) {
          stored.unlocked = true;
          if (typeof parsed.unlockedAtMs === 'number') {
            stored.unlockedAtMs = parsed.unlockedAtMs;
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  // Also credit returning players who already earned the 50+ annexations in a single match achievement
  if (achievementProfile?.unlocked) {
    const alreadyEarned = Boolean(
      achievementProfile.unlocked['conq_annex_50'] ||
        achievementProfile.unlocked['conq_annex_100'] ||
        achievementProfile.unlocked['conq_victory']
    );
    if (alreadyEarned) {
      stored.unlocked = true;
      stored.bestCapturedInMatch = Math.max(
        stored.bestCapturedInMatch,
        HARD_MODE_UNLOCK_TARGET
      );
      if (!stored.unlockedAtMs) {
        stored.unlockedAtMs =
          achievementProfile.unlocked['conq_annex_50'] ??
          achievementProfile.unlocked['conq_annex_100'] ??
          achievementProfile.unlocked['conq_victory'] ??
          Date.now();
      }
    }
  }

  if (stored.bestCapturedInMatch >= HARD_MODE_UNLOCK_TARGET) {
    stored.unlocked = true;
  }

  return stored;
}

export function saveHardModeUnlockProgress(
  progress: HardModeUnlockProgress,
  uid?: string | null
): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(progress);
    window.localStorage.setItem(getHardModeStorageKey(uid), json);
    if (uid) {
      window.localStorage.setItem(getHardModeStorageKey(null), json);
    }
  } catch {
    // ignore storage errors
  }
}

export function recordSingleMatchCaptures(
  capturedCount: number,
  uid?: string | null,
  achievementProfile?: AchievementProfile | null
): { progress: HardModeUnlockProgress; justUnlocked: boolean } {
  const safeCount = Math.max(0, Math.floor(capturedCount));
  const prev = loadHardModeUnlockProgress(uid, achievementProfile);
  const nextBest = Math.max(prev.bestCapturedInMatch, safeCount);
  const nowUnlocked = prev.unlocked || nextBest >= HARD_MODE_UNLOCK_TARGET;
  const justUnlocked = !prev.unlocked && nowUnlocked;

  const progress: HardModeUnlockProgress = {
    unlocked: nowUnlocked,
    bestCapturedInMatch: nextBest,
    ...(nowUnlocked ? { unlockedAtMs: prev.unlockedAtMs ?? Date.now() } : {}),
  };

  if (nextBest !== prev.bestCapturedInMatch || justUnlocked) {
    saveHardModeUnlockProgress(progress, uid);
  }

  return { progress, justUnlocked };
}
