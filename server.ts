import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json';
import type {
  DiplomaticMeetingContext,
  DiplomaticMeetingOutcome,
  DiplomaticMessage,
  DiplomaticReplySentiment,
} from './src/types/diplomacy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_EMAIL = 'santiagosorioax@gmail.com';
const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface ActivePlayerSession {
  sessionId: string;
  screen: string;
  countryName: string;
  difficulty: 'normal' | 'hard' | '';
  playerLabel: string;
  isSignedIn: boolean;
  firstSeenMs: number;
  lastSeenMs: number;
}

const SESSION_TTL_MS = 45_000;
const MAX_TRACKED_SESSIONS = 5_000;
const activeSessions = new Map<string, ActivePlayerSession>();
let peakOnlinePlayers = 0;
const serverStartedAtMs = Date.now();

function pruneExpiredSessions(now = Date.now()): void {
  for (const [id, sess] of activeSessions.entries()) {
    if (now - sess.lastSeenMs > SESSION_TTL_MS) {
      activeSessions.delete(id);
    }
  }
  if (activeSessions.size > peakOnlinePlayers) {
    peakOnlinePlayers = activeSessions.size;
  }
}

let cachedCerts: Record<string, string> = {};
let certsExpiresAtMs = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiresAtMs && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(FIREBASE_CERTS_URL);
  if (!resp.ok) {
    throw new Error('No se pudieron obtener los certificados públicos de Firebase Auth.');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.min(86400, Math.max(60, Number(maxAgeMatch[1]))) : 3600;
  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = certs;
  certsExpiresAtMs = now + maxAgeSec * 1000;
  return certs;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

interface VerifiedFirebaseClaims {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
}

async function verifyAdminFirebaseToken(idToken: string): Promise<VerifiedFirebaseClaims | null> {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(headerB64);
    if (header.alg !== 'RS256' || !header.kid) return null;

    const certs = await getFirebasePublicCerts();
    const certPem = certs[header.kid];
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const sigNorm = sigB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigBuf = Buffer.from(
      sigNorm + '='.repeat((4 - (sigNorm.length % 4)) % 4),
      'base64'
    );
    if (!verifier.verify(certPem, sigBuf)) return null;

    const claims = decodeBase64UrlJson<VerifiedFirebaseClaims>(payloadB64);
    const nowSec = Math.floor(Date.now() / 1000);
    if (claims.aud !== FIREBASE_PROJECT_ID) return null;
    if (claims.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    if (!claims.sub || typeof claims.sub !== 'string') return null;
    if (typeof claims.exp !== 'number' || claims.exp <= nowSec) return null;
    if (typeof claims.iat !== 'number' || claims.iat > nowSec + 300) return null;
    if (claims.email_verified !== true) return null;
    if ((claims.email || '').trim().toLowerCase() !== ADMIN_EMAIL) return null;

    return claims;
  } catch {
    return null;
  }
}

const PORT = Number(process.env.PORT) || 3000;
const FAST_REPLY_MODEL = 'gemini-3.1-flash-lite';
const EVALUATOR_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-4-hydrogen';

let cachedAi: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Falta configurar GEMINI_API_KEY en el servidor (Settings > Secrets) para usar la IA diplomática.'
    );
  }
  if (!cachedAi) {
    cachedAi = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAi;
}

const REPLY_HEDGE_DELAY_MS = 2800;
const REPLY_HARD_TIMEOUT_MS = 9200;
const EVAL_HEDGE_DELAY_MS = 3500;
const EVAL_HARD_TIMEOUT_MS = 12000;

async function runHedgedAttempt<T>(
  primaryFn: (signal: AbortSignal) => Promise<T>,
  secondaryFn: (signal: AbortSignal) => Promise<T>,
  hedgeDelayMs: number,
  remainingTimeoutMs: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const primaryCtrl = new AbortController();
    const secondaryCtrl = new AbortController();
    let settled = false;
    let secondaryStarted = false;
    let primaryFailed = false;
    let secondaryFailed = false;
    let lastError: unknown = new Error('Tiempo de espera agotado.');

    let hedgeTimer: ReturnType<typeof setTimeout> | null = null;
    let hardTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (hedgeTimer) {
        clearTimeout(hedgeTimer);
        hedgeTimer = null;
      }
      if (hardTimer) {
        clearTimeout(hardTimer);
        hardTimer = null;
      }
    };

    const succeed = (value: T, winner: 'primary' | 'secondary') => {
      if (settled) return;
      settled = true;
      cleanup();
      if (winner === 'primary') {
        secondaryCtrl.abort();
      } else {
        primaryCtrl.abort();
      }
      resolve(value);
    };

    const failIfAllDone = (err: unknown) => {
      lastError = err;
      if (settled) return;
      if (primaryFailed && secondaryStarted && secondaryFailed) {
        settled = true;
        cleanup();
        reject(lastError);
      }
    };

    const startSecondary = () => {
      if (settled || secondaryStarted) return;
      secondaryStarted = true;
      secondaryFn(secondaryCtrl.signal).then(
        (res) => succeed(res, 'secondary'),
        (err) => {
          secondaryFailed = true;
          failIfAllDone(err);
        }
      );
    };

    hardTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      primaryCtrl.abort();
      secondaryCtrl.abort();
      reject(new Error('TIMEOUT_10S'));
    }, Math.max(500, remainingTimeoutMs));

    hedgeTimer = setTimeout(() => {
      startSecondary();
    }, Math.min(hedgeDelayMs, Math.max(400, remainingTimeoutMs - 1000)));

    primaryFn(primaryCtrl.signal).then(
      (res) => succeed(res, 'primary'),
      (err) => {
        primaryFailed = true;
        if (settled) return;
        if (!secondaryStarted) {
          if (hedgeTimer) {
            clearTimeout(hedgeTimer);
            hedgeTimer = null;
          }
          startSecondary();
        } else {
          failIfAllDone(err);
        }
      }
    );
  });
}

async function raceModelsWithDeadline<T>(
  primaryFn: (signal: AbortSignal) => Promise<T>,
  secondaryFn: (signal: AbortSignal) => Promise<T>,
  hedgeDelayMs: number,
  hardTimeoutMs: number
): Promise<T> {
  const deadline = Date.now() + hardTimeoutMs;
  try {
    return await runHedgedAttempt(primaryFn, secondaryFn, hedgeDelayMs, hardTimeoutMs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTransient =
      msg.includes('503') || msg.includes('500') || msg.includes('UNAVAILABLE');
    const remaining = deadline - Date.now();
    if (!isTransient || remaining < 2200) {
      throw err;
    }
    await new Promise((r) => setTimeout(r, 350));
    return await runHedgedAttempt(
      primaryFn,
      secondaryFn,
      Math.min(1800, hedgeDelayMs),
      Math.max(800, deadline - Date.now())
    );
  }
}

function describeRelationTier(relation: number): {
  label: string;
  guidance: string;
} {
  if (relation < 35) {
    return {
      label: 'Tensa/desconfiada',
      guidance: 'Frío y escéptico; rechaza regalos y exige fuertes concesiones.',
    };
  }
  if (relation < 55) {
    return {
      label: 'Cautelosa',
      guidance: 'Formal y pragmático; acepta solo si hay beneficio o pago justo.',
    };
  }
  if (relation < 75) {
    return {
      label: 'Cordial',
      guidance: 'Respetuoso y cooperativo; abierto a tratos razonables y alianzas.',
    };
  }
  return {
    label: 'Hermandad',
    guidance: 'Cálido y leal; muy dispuesto a ayudar con dinero, tropas, territorio o acuerdos.',
  };
}

function buildLeaderSystemInstruction(ctx: DiplomaticMeetingContext): string {
  const tier = describeRelationTier(ctx.relation);
  const statusText = ctx.atWar ? 'GUERRA' : ctx.allied ? 'ALIADOS' : 'PAZ';
  const maxAid = Math.max(
    Math.floor(ctx.target.money * 0.6),
    Math.round(Math.max(0, ctx.target.netIncome) * 2)
  );
  const maxTroops = Math.max(0, Math.floor(ctx.target.army * 0.4));

  return [
    `Eres el líder de ${ctx.target.name} hablando con ${ctx.player.name}.`,
    `Estado: ${statusText} | Relación: ${ctx.relation}/100 (${tier.label}) | ${ctx.difficulty === 'hard' ? 'Difícil (duro)' : 'Normal'}. ${tier.guidance}`,
    `${ctx.target.name}: $${Math.round(ctx.target.money)} (ayuda máx ~$${maxAid}), Ejército ${Math.round(ctx.target.army)} (máx ${maxTroops}), ${Math.round(ctx.target.territoryKm2)} km². ${ctx.player.name}: $${Math.round(ctx.player.money)}, Ejército ${Math.round(ctx.player.army)}.`,
    'Puedes acordar: dinero, soldados, % de territorio (o unificación 100% solo si relación>=90 o derrota), minas, ciudades, puertos, defensas, cuarteles, antibombas, alianza, paz, guerra, tregua en meses, acciones contra terceros, ataques/recarga nuclear o rebeliones.',
    'Responde en 1 o 2 frases cortas en español, muy directo. Si aceptas dar algo, di cifra exacta (ej: "$500", "15% de territorio", "2 minas").',
    'FORMATO OBLIGATORIO: Empieza SIEMPRE exactamente con POS| (si aceptas/apoyas/amistoso), NEG| (si rechazas/hostil/adviertes) o NEU| (si es informativo/condicional), seguido de tu respuesta.',
  ].join('\n');
}

function buildArbiterSystemInstruction(ctx: DiplomaticMeetingContext): string {
  const suggestedMoneyAid = Math.max(
    300,
    Math.round(Math.max(ctx.target.money * 0.3, Math.max(0, ctx.target.netIncome) * 1.5))
  );
  const maxMoneyAid = Math.max(
    600,
    Math.round(Math.max(ctx.target.money * 0.65, Math.max(0, ctx.target.netIncome) * 3))
  );
  const suggestedTroopAid = Math.max(
    100,
    Math.round(ctx.target.army * 0.2)
  );
  const maxTroopAid = Math.max(
    150,
    Math.round(ctx.target.army * 0.45)
  );

  return [
    'Eres la 2ª IA: el Árbitro Diplomático Oficial de "Países en Guerra".',
    'Tu misión CRÍTICA es leer la transcripción completa de la reunión entre el JUGADOR y el PAÍS IA y HACER CUMPLIR EN EL JUEGO ABSOLUTAMENTE TODO LO QUE SE ACORDÓ.',
    '',
    'DATOS REALES DE LA PARTIDA AL MOMENTO DE LA REUNIÓN:',
    `- País del Jugador: ${ctx.player.name} (Dinero: $${Math.round(ctx.player.money)}, Ingreso: $${Math.round(ctx.player.netIncome)}/mes, Ejército: ${Math.round(ctx.player.army)}/${Math.round(ctx.player.armyCap)}, Territorio: ${Math.round(ctx.player.territoryKm2)} km²).`,
    `- País IA Interlocutor: ${ctx.target.name} (Dinero: $${Math.round(ctx.target.money)}, Ingreso: $${Math.round(ctx.target.netIncome)}/mes, Ejército: ${Math.round(ctx.target.army)}/${Math.round(ctx.target.armyCap)}, Territorio: ${Math.round(ctx.target.territoryKm2)} km²).`,
    `- Aliados de ${ctx.target.name}: ${ctx.target.allies.join(', ') || 'Ninguno'}. Enemigos de ${ctx.target.name}: ${ctx.target.enemies.join(', ') || 'Ninguno'}.`,
    `- Relación antes de la reunión: ${ctx.relation}/100 | En guerra: ${ctx.atWar ? 'SÍ' : 'NO'} | Aliados: ${ctx.allied ? 'SÍ' : 'NO'} | Dificultad: ${ctx.difficulty === 'hard' ? 'Difícil' : 'Normal'}.`,
    `- Países activos disponibles: ${ctx.aliveCountryNames.slice(0, 195).join(', ')}.`,
    '',
    'REGLAS ESTRICTAS PARA APLICAR LOS ACUERDOS AL JUEGO (NUNCA DEJES EN 0 ALGO QUE EL PAÍS IA ACEPTÓ):',
    '1. relationDelta (-40 a +35): acuerdos/trato excelente +8..+25 (hasta +35 histórico), cordial +2..+8, neutro -2..+2, tensión -5..-18, insultos/amenazas -20..-40.',
    '2. treatyAction: "form_alliance" (aceptó alianza/pacto estratégico/comercial/militar), "make_peace" (están en guerra y aceptó paz), "break_alliance" (eran aliados y rompieron), "declare_war" (ruptura armada/declaración de guerra), o "none".',
    `3. Dinero: moneyTransferToPlayer (si el país IA dijo SÍ a dar dinero/ayuda financiera: usa la cifra acordada hasta $${maxMoneyAid}, o OBLIGATORIAMENTE ~$${suggestedMoneyAid} si dijo SÍ sin cifra; 0 solo si rechazó o no se habló). moneyTransferToTarget (dinero que el jugador aceptó pagar al país IA por compra de territorio, paz, minas, etc.).`,
    `4. Soldados: soldiersTransferToPlayer (si el país IA dijo SÍ a enviar tropas: usa cifra acordada hasta ${maxTroopAid}, o OBLIGATORIAMENTE ~${suggestedTroopAid} si dijo SÍ sin cifra). soldiersTransferToTarget (tropas que el jugador aceptó enviar).`,
    '5. Territorio (MUY IMPORTANTE):',
    '   - territoryPctToPlayer (0..100): Si el país IA aceptó ceder, regalar o vender territorio/tierras/provincias al jugador, pon el porcentaje exacto acordado (si dijo SÍ sin porcentaje, pon 15; si aceptó rendirse/anexarse/unirse por completo al país del jugador, pon 100). Pon 0 si no hubo cesión.',
    '   - territoryPctToTarget (0..60): Si el jugador aceptó ceder parte de su territorio al país IA, pon el porcentaje acordado (o 15 si no se dijo cifra).',
    '6. Economía y estructuras para el jugador (si el país IA aceptó construir, financiar o transferir):',
    '   - goldMinesToPlayer (0..5): Minas de oro acordadas (si dijo sí a minas sin cantidad, pon 2).',
    '   - citiesToPlayer (0..5): Ciudades/desarrollo urbano acordado (si dijo sí sin cantidad, pon 2).',
    '   - portsToPlayer (0..2): Puertos/infraestructura naval acordada (si dijo sí sin cantidad, pon 1).',
    '   - defensesToPlayer (0..4): Defensas militares acordadas (si dijo sí sin cantidad, pon 2).',
    '   - barracksToPlayer (0..3): Cuarteles militares acordados (si dijo sí sin cantidad, pon 1).',
    '   - antiNukesToPlayer (0..2): Sistemas antibombas / escudo antimisiles acordados (si dijo sí sin cantidad, pon 1).',
    '7. Pacto de no agresión / Tregua: truceMonthsToSet (0..24): si acordaron pacto de no agresión o tregua, pon los meses acordados (por defecto 12 si no dijeron meses).',
    '8. Diplomacia con terceros y respaldo:',
    '   - targetDeclaresWarOnCountryName: nombre exacto de un país activo al que el país IA prometió declarar la guerra/atacar ("" si no aplica).',
    '   - targetMakesPeaceWithCountryName: nombre exacto de un enemigo con el que el país IA aceptó firmar la paz ("" si no aplica).',
    '   - targetBreaksAllianceWithCountryName: nombre exacto de un aliado con el que el país IA aceptó romper alianza ("" si no aplica).',
    '   - improveRelationsWithAlliesDelta (-15..+15): si el país IA aceptó recomendar/respaldar al jugador ante sus aliados (+8..+15) o desprestigiarlo (-8..-15); 0 si no aplica.',
    '9. Nuclear y Rebeliones:',
    '   - targetLaunchesNukeOnCountryName: nombre exacto de un país activo al que el país IA aceptó lanzar una bomba nuclear ("" si no aplica).',
    '   - resetPlayerNukeCooldown (boolean): true si aceptó compartir tecnología/enriquecimiento nuclear para acelerar/recargar las bombas nucleares del jugador.',
    '   - suppressPlayerRebellions (boolean): true si aceptó enviar fuerzas de paz o inteligencia para calmar/sofocar rebeliones del jugador.',
    '   - inciteRebellionInCountryName: nombre exacto de un país activo donde el país IA aceptó fomentar/financiar rebeliones internas ("" si no aplica).',
    '10. summary (2-3 oraciones en español), diplomaticHeadline (4-9 palabras), reasons (1-4 puntos).',
  ].join('\n');
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('TIMEOUT_10S') || raw.includes('AbortError')) {
    return {
      status: 504,
      message: 'La IA tardó más de 10 segundos en responder. Pulsa Reintentar para recibir respuesta al instante.',
    };
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return { status: 500, message: raw };
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'La clave de Gemini API no es válida o no tiene permisos. Revísala en Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Se alcanzó el límite temporal de consultas de la IA. Espera unos segundos e inténtalo de nuevo.',
    };
  }
  return {
    status: 502,
    message: `No se pudo completar la respuesta de la IA diplomática (${raw.slice(0, 140)}).`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.text({ type: 'text/plain', limit: '8kb' }));

  // Live Player Presence Heartbeat (zero Firestore writes)
  app.post('/api/presence/heartbeat', (req, res) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const rawSessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(rawSessionId)) {
      res.status(400).json({ error: 'sessionId inválido.' });
      return;
    }

    const now = Date.now();
    pruneExpiredSessions(now);

    if (!activeSessions.has(rawSessionId) && activeSessions.size >= MAX_TRACKED_SESSIONS) {
      res.status(200).json({ ok: true });
      return;
    }

    const allowedScreens = new Set([
      'DEVICE_SELECT',
      'COUNTRY_SELECT',
      'DEVICE_MODE',
      'SELECT',
      'ONLINE_LOBBY',
      'PLAYING',
    ]);
    const screen =
      typeof body.screen === 'string' && allowedScreens.has(body.screen)
        ? body.screen
        : 'DEVICE_SELECT';
    const countryName =
      typeof body.countryName === 'string' ? body.countryName.trim().slice(0, 60) : '';
    const difficulty =
      body.difficulty === 'hard' ? 'hard' : body.difficulty === 'normal' ? 'normal' : '';
    const playerLabel =
      typeof body.playerLabel === 'string' && body.playerLabel.trim()
        ? body.playerLabel.trim().slice(0, 60)
        : 'Invitado';
    const isSignedIn = Boolean(body.isSignedIn);

    const existing = activeSessions.get(rawSessionId);
    activeSessions.set(rawSessionId, {
      sessionId: rawSessionId,
      screen,
      countryName,
      difficulty,
      playerLabel,
      isSignedIn,
      firstSeenMs: existing?.firstSeenMs ?? now,
      lastSeenMs: now,
    });
    if (activeSessions.size > peakOnlinePlayers) {
      peakOnlinePlayers = activeSessions.size;
    }

    res.json({ ok: true });
  });

  // Immediate session cleanup when a player closes the tab
  app.post('/api/presence/leave', (req, res) => {
    let sessionId = '';
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body) as { sessionId?: unknown };
        if (typeof parsed.sessionId === 'string') sessionId = parsed.sessionId.trim();
      } catch {
        // ignore invalid beacon
      }
    } else if (req.body && typeof req.body === 'object') {
      const candidate = (req.body as { sessionId?: unknown }).sessionId;
      if (typeof candidate === 'string') sessionId = candidate.trim();
    }
    if (sessionId) {
      activeSessions.delete(sessionId);
    }
    res.status(204).end();
  });

  // Strictly Protected Admin Telemetry Endpoint (verified Firebase ID token for santiagosorioax@gmail.com)
  app.get('/api/admin/stats', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ error: 'No autorizado.' });
      return;
    }

    const claims = await verifyAdminFirebaseToken(match[1].trim());
    if (!claims) {
      res.status(403).json({ error: 'Acceso restringido al administrador.' });
      return;
    }

    const now = Date.now();
    pruneExpiredSessions(now);

    const sessions = Array.from(activeSessions.values())
      .sort((a, b) => b.lastSeenMs - a.lastSeenMs)
      .slice(0, 150)
      .map((s) => ({
        id: s.sessionId.slice(0, 8),
        playerLabel: s.playerLabel,
        isSignedIn: s.isSignedIn,
        screen: s.screen,
        countryName: s.countryName,
        difficulty: s.difficulty,
        activeSeconds: Math.max(0, Math.round((now - s.firstSeenMs) / 1000)),
        lastSeenSecondsAgo: Math.max(0, Math.round((now - s.lastSeenMs) / 1000)),
      }));

    let playingNow = 0;
    let menuNow = 0;
    let onlineLobbyNow = 0;
    for (const s of activeSessions.values()) {
      if (s.screen === 'PLAYING') playingNow++;
      else if (s.screen === 'ONLINE_LOBBY') onlineLobbyNow++;
      else menuNow++;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      onlineNow: activeSessions.size,
      playingNow,
      menuNow,
      onlineLobbyNow,
      peakOnline: peakOnlinePlayers,
      serverUptimeSeconds: Math.max(0, Math.round((now - serverStartedAtMs) / 1000)),
      sessions,
    });
  });

  // AI #1: Diplomatic Leader Responder
  app.post('/api/diplomacy/reply', async (req, res) => {
    try {
      const { context, messages } = req.body as {
        context?: DiplomaticMeetingContext;
        messages?: DiplomaticMessage[];
      };

      if (!context || !context.player || !context.target || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Datos de reunión diplomática incompletos.' });
        return;
      }
      if (context.relation < 20) {
        res.status(400).json({
          error: 'Se requiere al menos 20/100 de relación para mantener una reunión diplomática.',
        });
        return;
      }

      const trimmedMessages = messages.slice(-4);
      const ai = getGeminiClient();

      const contents =
        trimmedMessages.length === 0
          ? [
              {
                role: 'user' as const,
                parts: [
                  {
                    text: `Saludo inicial en 1 frase directa para ${context.player.name}.`,
                  },
                ],
              },
            ]
          : trimmedMessages.map((m) => ({
              role: m.role === 'player' ? ('user' as const) : ('model' as const),
              parts: [{ text: m.text.slice(0, 500) }],
            }));

      // Ensure first turn is 'user' as required by Gemini multi-turn conversation format
      if (contents[0]?.role !== 'user') {
        contents.unshift({
          role: 'user',
          parts: [
            {
              text: `[Cumbre: ${context.player.name} ↔ ${context.target.name}]`,
            },
          ],
        });
      }

      const leaderInstruction = buildLeaderSystemInstruction(context);

      const response = await raceModelsWithDeadline(
        (signal) =>
          ai.models.generateContent({
            model: FAST_REPLY_MODEL,
            contents,
            config: {
              systemInstruction: leaderInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              maxOutputTokens: 120,
              abortSignal: signal,
            },
          }),
        (signal) =>
          ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents,
            config: {
              systemInstruction: leaderInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              maxOutputTokens: 160,
              abortSignal: signal,
            },
          }),
        REPLY_HEDGE_DELAY_MS,
        REPLY_HARD_TIMEOUT_MS
      );

      const rawText = (response.text ?? '').trim();
      let reply = rawText;
      let sentiment: DiplomaticReplySentiment = 'neutral';

      const tagMatch = rawText.match(/^(POS|NEG|NEU)\s*[:|-]\s*([\s\S]+)$/i);
      if (tagMatch) {
        const tag = tagMatch[1].toUpperCase();
        sentiment = tag === 'POS' ? 'positive' : tag === 'NEG' ? 'negative' : 'neutral';
        reply = tagMatch[2].trim();
      } else if (rawText.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawText) as { reply?: string; sentiment?: string };
          if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
            reply = parsed.reply.trim();
          }
          if (
            parsed.sentiment === 'positive' ||
            parsed.sentiment === 'negative' ||
            parsed.sentiment === 'neutral'
          ) {
            sentiment = parsed.sentiment;
          }
        } catch {
          // keep rawText
        }
      }

      if (!reply) {
        res.status(502).json({
          error: 'El representante extranjero no devolvió respuesta. Intenta enviar tu mensaje nuevamente.',
        });
        return;
      }

      res.json({ reply, sentiment });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // AI #2: Independent Diplomatic Arbiter & Consequence Applier
  app.post('/api/diplomacy/evaluate', async (req, res) => {
    try {
      const { context, messages } = req.body as {
        context?: DiplomaticMeetingContext;
        messages?: DiplomaticMessage[];
      };

      if (!context || !context.player || !context.target || !Array.isArray(messages)) {
        res.status(400).json({ error: 'Datos de reunión incompletos para evaluación.' });
        return;
      }

      const playerTurns = messages.filter((m) => m.role === 'player');
      if (playerTurns.length === 0) {
        res.status(400).json({ error: 'No hubo mensajes del jugador para evaluar.' });
        return;
      }

      const transcript = messages
        .slice(-30)
        .map((m) =>
          `${m.role === 'player' ? `JUGADOR (${context.player.name})` : `PAÍS IA (${context.target.name})`}: ${m.text.slice(0, 1200)}`
        )
        .join('\n');

      const ai = getGeminiClient();

      const arbiterInstruction = buildArbiterSystemInstruction(context);
      const evalContents = [
        {
          role: 'user' as const,
          parts: [
            {
              text: `Revisa la siguiente conversación diplomática completa y emite el veredicto oficial en JSON:\n\n${transcript}`,
            },
          ],
        },
      ];
      const evalSchema = {
        type: Type.OBJECT,
        properties: {
                summary: {
                  type: Type.STRING,
                  description: 'Resumen de 2 a 3 oraciones en español sobre lo ocurrido y acordado.',
                },
                diplomaticHeadline: {
                  type: Type.STRING,
                  description: 'Titular corto en español (4-9 palabras) para la crónica del juego.',
                },
                tone: {
                  type: Type.STRING,
                  description: 'Uno de: hostile, tense, neutral, friendly, historic',
                },
                relationDelta: {
                  type: Type.INTEGER,
                  description: 'Cambio de relación bilateral entre -40 y +35.',
                },
                treatyAction: {
                  type: Type.STRING,
                  description:
                    'Uno de: none, form_alliance, break_alliance, make_peace, declare_war',
                },
                moneyTransferToTarget: {
                  type: Type.INTEGER,
                  description: 'Dinero acordado que el jugador envía al país IA (0 si no aplica).',
                },
                moneyTransferToPlayer: {
                  type: Type.INTEGER,
                  description: 'Dinero acordado que el país IA entrega al jugador (0 si no aplica).',
                },
                soldiersTransferToPlayer: {
                  type: Type.INTEGER,
                  description:
                    'Soldados acordados que el país IA envía al jugador (0 si no aplica).',
                },
                soldiersTransferToTarget: {
                  type: Type.INTEGER,
                  description:
                    'Soldados acordados que el jugador envía al país IA (0 si no aplica).',
                },
                territoryPctToPlayer: {
                  type: Type.INTEGER,
                  description:
                    'Porcentaje de territorio (0 a 100) que el país IA acordó ceder/vender al jugador (100 = anexión pacífica/rendición total).',
                },
                territoryPctToTarget: {
                  type: Type.INTEGER,
                  description:
                    'Porcentaje de territorio (0 a 60) que el jugador acordó ceder al país IA.',
                },
                goldMinesToPlayer: {
                  type: Type.INTEGER,
                  description: 'Minas de oro (0 a 5) que el país IA acordó financiar/construir para el jugador.',
                },
                citiesToPlayer: {
                  type: Type.INTEGER,
                  description: 'Ciudades (0 a 5) que el país IA acordó financiar/desarrollar para el jugador.',
                },
                portsToPlayer: {
                  type: Type.INTEGER,
                  description: 'Puertos (0 a 2) que el país IA acordó construir para el jugador.',
                },
                defensesToPlayer: {
                  type: Type.INTEGER,
                  description: 'Defensas militares (0 a 4) que el país IA acordó construir para el jugador.',
                },
                barracksToPlayer: {
                  type: Type.INTEGER,
                  description: 'Cuarteles militares (0 a 3) que el país IA acordó construir para el jugador.',
                },
                antiNukesToPlayer: {
                  type: Type.INTEGER,
                  description: 'Sistemas antibombas (0 a 2) que el país IA acordó instalar para el jugador.',
                },
                truceMonthsToSet: {
                  type: Type.INTEGER,
                  description: 'Meses de tregua / pacto de no agresión acordados (0 a 24).',
                },
                targetDeclaresWarOnCountryName: {
                  type: Type.STRING,
                  description:
                    'Nombre exacto de un tercer país al que el país IA acordó declarar la guerra, o cadena vacía.',
                },
                targetMakesPeaceWithCountryName: {
                  type: Type.STRING,
                  description:
                    'Nombre exacto de un tercer país con el que el país IA acordó firmar la paz, o cadena vacía.',
                },
                targetBreaksAllianceWithCountryName: {
                  type: Type.STRING,
                  description:
                    'Nombre exacto de un aliado con el que el país IA acordó romper la alianza, o cadena vacía.',
                },
                targetLaunchesNukeOnCountryName: {
                  type: Type.STRING,
                  description:
                    'Nombre exacto de un país enemigo al que el país IA acordó lanzar una bomba nuclear, o cadena vacía.',
                },
                improveRelationsWithAlliesDelta: {
                  type: Type.INTEGER,
                  description:
                    'Cambio de relación (-15 a +15) con los aliados del país IA por respaldo o desprestigio diplomático.',
                },
                resetPlayerNukeCooldown: {
                  type: Type.BOOLEAN,
                  description: 'true si el país IA acordó cooperación nuclear para acelerar/recargar misiles del jugador.',
                },
                suppressPlayerRebellions: {
                  type: Type.BOOLEAN,
                  description: 'true si el país IA acordó enviar fuerzas de paz para reducir rebeliones del jugador.',
                },
                inciteRebellionInCountryName: {
                  type: Type.STRING,
                  description:
                    'Nombre exacto de un país activo donde el país IA acordó fomentar rebeliones, o cadena vacía.',
                },
                reasons: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista de 1 a 4 motivos cortos del veredicto en español.',
                },
              },
              required: [
                'summary',
                'diplomaticHeadline',
                'tone',
                'relationDelta',
                'treatyAction',
                'moneyTransferToTarget',
                'moneyTransferToPlayer',
                'soldiersTransferToPlayer',
                'soldiersTransferToTarget',
                'territoryPctToPlayer',
                'territoryPctToTarget',
                'goldMinesToPlayer',
                'citiesToPlayer',
                'portsToPlayer',
                'defensesToPlayer',
                'barracksToPlayer',
                'antiNukesToPlayer',
                'truceMonthsToSet',
                'targetDeclaresWarOnCountryName',
                'targetMakesPeaceWithCountryName',
                'targetBreaksAllianceWithCountryName',
                'targetLaunchesNukeOnCountryName',
                'improveRelationsWithAlliesDelta',
                'resetPlayerNukeCooldown',
                'suppressPlayerRebellions',
          'inciteRebellionInCountryName',
          'reasons',
        ],
      };

      const response = await raceModelsWithDeadline(
        (signal) =>
          ai.models.generateContent({
            model: EVALUATOR_MODEL,
            contents: evalContents,
            config: {
              systemInstruction: arbiterInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              responseMimeType: 'application/json',
              responseSchema: evalSchema,
              abortSignal: signal,
            },
          }),
        (signal) =>
          ai.models.generateContent({
            model: FALLBACK_MODEL,
            contents: evalContents,
            config: {
              systemInstruction: arbiterInstruction,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: evalSchema,
              abortSignal: signal,
            },
          }),
        EVAL_HEDGE_DELAY_MS,
        EVAL_HARD_TIMEOUT_MS
      );

      const rawText = (response.text ?? '').trim();
      const parsed = JSON.parse(rawText) as Partial<DiplomaticMeetingOutcome>;

      const allowedTones = new Set(['hostile', 'tense', 'neutral', 'friendly', 'historic']);
      const allowedTreaties = new Set([
        'none',
        'form_alliance',
        'break_alliance',
        'make_peace',
        'declare_war',
      ]);

      const clampInt = (v: unknown, min: number, max: number): number => {
        const parsedNum =
          typeof v === 'number'
            ? v
            : typeof v === 'string'
              ? Number(v.replace(/[^0-9.-]/g, ''))
              : 0;
        const n = Number.isFinite(parsedNum) ? Math.round(parsedNum) : 0;
        return Math.max(min, Math.min(max, n));
      };

      const cleanStr = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

      const outcome: DiplomaticMeetingOutcome = {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : `La cumbre diplomática con ${context.target.name} ha concluido.`,
        diplomaticHeadline:
          typeof parsed.diplomaticHeadline === 'string' && parsed.diplomaticHeadline.trim()
            ? parsed.diplomaticHeadline.trim()
            : `Cumbre diplomática con ${context.target.name}`,
        tone:
          typeof parsed.tone === 'string' && allowedTones.has(parsed.tone)
            ? (parsed.tone as DiplomaticMeetingOutcome['tone'])
            : 'neutral',
        relationDelta: clampInt(parsed.relationDelta, -40, 35),
        treatyAction:
          typeof parsed.treatyAction === 'string' && allowedTreaties.has(parsed.treatyAction)
            ? (parsed.treatyAction as DiplomaticMeetingOutcome['treatyAction'])
            : 'none',
        moneyTransferToTarget: clampInt(parsed.moneyTransferToTarget, 0, 10_000_000),
        moneyTransferToPlayer: clampInt(parsed.moneyTransferToPlayer, 0, 10_000_000),
        soldiersTransferToPlayer: clampInt(parsed.soldiersTransferToPlayer, 0, 500_000),
        soldiersTransferToTarget: clampInt(parsed.soldiersTransferToTarget, 0, 500_000),
        territoryPctToPlayer: clampInt(parsed.territoryPctToPlayer, 0, 100),
        territoryPctToTarget: clampInt(parsed.territoryPctToTarget, 0, 60),
        goldMinesToPlayer: clampInt(parsed.goldMinesToPlayer, 0, 5),
        citiesToPlayer: clampInt(parsed.citiesToPlayer, 0, 5),
        portsToPlayer: clampInt(parsed.portsToPlayer, 0, 2),
        defensesToPlayer: clampInt(parsed.defensesToPlayer, 0, 4),
        barracksToPlayer: clampInt(parsed.barracksToPlayer, 0, 3),
        antiNukesToPlayer: clampInt(parsed.antiNukesToPlayer, 0, 2),
        truceMonthsToSet: clampInt(parsed.truceMonthsToSet, 0, 24),
        targetDeclaresWarOnCountryName: cleanStr(parsed.targetDeclaresWarOnCountryName),
        targetMakesPeaceWithCountryName: cleanStr(parsed.targetMakesPeaceWithCountryName),
        targetBreaksAllianceWithCountryName: cleanStr(parsed.targetBreaksAllianceWithCountryName),
        targetLaunchesNukeOnCountryName: cleanStr(parsed.targetLaunchesNukeOnCountryName),
        improveRelationsWithAlliesDelta: clampInt(parsed.improveRelationsWithAlliesDelta, -15, 15),
        resetPlayerNukeCooldown: Boolean(parsed.resetPlayerNukeCooldown),
        suppressPlayerRebellions: Boolean(parsed.suppressPlayerRebellions),
        inciteRebellionInCountryName: cleanStr(parsed.inciteRebellionInCountryName),
        reasons: Array.isArray(parsed.reasons)
          ? parsed.reasons
              .filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
              .slice(0, 5)
          : [],
      };

      res.json({ outcome });
    } catch (err) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Países en Guerra server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
