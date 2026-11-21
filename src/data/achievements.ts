import type { Continent } from './countries195';
import {
  getAllies,
  getCountryDefensePct,
  getCountryRebellionStrength,
  getEnemies,
  getOccupiedNationsBy,
  getRelation,
  type SimulationState,
} from '../engine/gameSimulation';

export type AchievementCategory =
  | 'conquest'
  | 'economy'
  | 'military'
  | 'defense'
  | 'nuclear'
  | 'diplomacy'
  | 'history'
  | 'rebellion'
  | 'timeline'
  | 'world';

export interface AchievementCategoryInfo {
  id: AchievementCategory;
  label: string;
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryInfo[] = [
  { id: 'conquest', label: 'Conquista' },
  { id: 'economy', label: 'Economía' },
  { id: 'military', label: 'Ejército' },
  { id: 'defense', label: 'Armada y Defensa' },
  { id: 'nuclear', label: 'Nuclear' },
  { id: 'diplomacy', label: 'Diplomacia' },
  { id: 'history', label: 'Historia' },
  { id: 'rebellion', label: 'Rebeliones' },
  { id: 'timeline', label: 'Supervivencia' },
  { id: 'world', label: 'Mundo y Online' },
];

export interface AchievementStats {
  warsDeclared: number;
  recruitsDone: number;
  portsBuilt: number;
  defensesBuilt: number;
  navalInvasionsSeen: number;
  nukesLaunched: number;
  nukeDefensesBroken: number;
  nukeInWarLaunched: number;
  nukeAfterCooldown: number;
  giftsSent: number;
  peacesSigned: number;
  allyHelpsRequested: number;
  treeOpened: number;
  focusNodesCompletedTotal: number;
  restoredNames: string[];
  granColombiaRestored: boolean;
  rebellionsSuppressed: number;
  strongRebellionSuppressed: number;
  aiRebellionWitnessed: number;
  aiRebellionSurvived: number;
  onlineRebelRecruits: number;
  onlineRebellionsStarted: number;
  eventsResolved: number;
  totalPlaySeconds: number;
  playedContinents: Continent[];
  playedCountries: string[];
  onlineMatchesPlayed: number;
  victories: number;
}

export interface AchievementProfile {
  unlocked: Record<string, number>; // achievementId -> unlocked timestamp ms
  stats: AchievementStats;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementDef {
  id: string;
  number: number;
  category: AchievementCategory;
  title: string;
  description: string;
  target: number;
  evaluate: (profile: AchievementProfile, sim: SimulationState | null) => number;
}

export function createEmptyAchievementProfile(): AchievementProfile {
  return {
    unlocked: {},
    stats: {
      warsDeclared: 0,
      recruitsDone: 0,
      portsBuilt: 0,
      defensesBuilt: 0,
      navalInvasionsSeen: 0,
      nukesLaunched: 0,
      nukeDefensesBroken: 0,
      nukeInWarLaunched: 0,
      nukeAfterCooldown: 0,
      giftsSent: 0,
      peacesSigned: 0,
      allyHelpsRequested: 0,
      treeOpened: 0,
      focusNodesCompletedTotal: 0,
      restoredNames: [],
      granColombiaRestored: false,
      rebellionsSuppressed: 0,
      strongRebellionSuppressed: 0,
      aiRebellionWitnessed: 0,
      aiRebellionSurvived: 0,
      onlineRebelRecruits: 0,
      onlineRebellionsStarted: 0,
      eventsResolved: 0,
      totalPlaySeconds: 0,
      playedContinents: [],
      playedCountries: [],
      onlineMatchesPlayed: 0,
      victories: 0,
    },
  };
}

function getStorageKey(uid?: string | null): string {
  return uid ? `paises_en_guerra_achievements_${uid}` : 'paises_en_guerra_achievements_guest';
}

export function loadAchievementProfile(uid?: string | null): AchievementProfile {
  const empty = createEmptyAchievementProfile();
  if (typeof window === 'undefined') return empty;
  try {
    const raw =
      window.localStorage.getItem(getStorageKey(uid)) ??
      window.localStorage.getItem(getStorageKey(null));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AchievementProfile>;
    return {
      unlocked: parsed.unlocked && typeof parsed.unlocked === 'object' ? { ...parsed.unlocked } : {},
      stats: {
        ...empty.stats,
        ...(parsed.stats && typeof parsed.stats === 'object' ? parsed.stats : {}),
        restoredNames: Array.isArray(parsed.stats?.restoredNames)
          ? parsed.stats.restoredNames.filter((x): x is string => typeof x === 'string')
          : [],
        playedContinents: Array.isArray(parsed.stats?.playedContinents)
          ? (parsed.stats.playedContinents as Continent[])
          : [],
        playedCountries: Array.isArray(parsed.stats?.playedCountries)
          ? parsed.stats.playedCountries.filter((x): x is string => typeof x === 'string')
          : [],
      },
    };
  } catch {
    return empty;
  }
}

export function saveAchievementProfile(profile: AchievementProfile, uid?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(profile);
    window.localStorage.setItem(getStorageKey(uid), json);
    if (uid) {
      window.localStorage.setItem(getStorageKey(null), json);
    }
  } catch {
    // Ignore quota or storage unavailability
  }
}

function getPlayer(sim: SimulationState | null) {
  return sim ? sim.countries[sim.playerId] ?? null : null;
}

function countPlayerAnnexed(sim: SimulationState | null): number {
  if (!sim) return 0;
  let count = 0;
  for (const c of sim.countries) {
    if (!c.alive && c.annexedById === sim.playerId && c.id !== sim.playerId) count++;
  }
  return count;
}

function getMaxRelationWithAny(sim: SimulationState | null): number {
  if (!sim) return 0;
  let best = 0;
  for (const c of sim.countries) {
    if (!c.alive || c.id === sim.playerId) continue;
    const rel = getRelation(sim, sim.playerId, c.id);
    if (rel > best) best = rel;
  }
  return best;
}

function isTopArmyInWorld(sim: SimulationState | null): number {
  const p = getPlayer(sim);
  if (!sim || !p || !p.alive) return 0;
  for (const c of sim.countries) {
    if (c.alive && c.id !== p.id && c.army > p.army) return 0;
  }
  return 1;
}

export const ACHIEVEMENTS_100: AchievementDef[] = [
  // ==================== 1. CONQUISTA (10) ====================
  {
    id: 'conq_first_gain',
    number: 1,
    category: 'conquest',
    title: 'Primera Expansión',
    description: 'Gana al menos 1.000 km² adicionales respecto a tu territorio inicial.',
    target: 1000,
    evaluate: (_p, sim) => {
      const pl = getPlayer(sim);
      return pl ? Math.max(0, (pl.pixels - pl.initialPixels) * 100) : 0;
    },
  },
  {
    id: 'conq_annex_1',
    number: 2,
    category: 'conquest',
    title: 'Primera Anexión',
    description: 'Absorbe por completo a 1 país enemigo.',
    target: 1,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_3',
    number: 3,
    category: 'conquest',
    title: 'Expansión Regional',
    description: 'Absorbe 3 países en una misma campaña.',
    target: 3,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_5',
    number: 4,
    category: 'conquest',
    title: 'Conquistador',
    description: 'Absorbe 5 países en una misma campaña.',
    target: 5,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_10',
    number: 5,
    category: 'conquest',
    title: 'Imperio Continental',
    description: 'Absorbe 10 países en una misma campaña.',
    target: 10,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_25',
    number: 6,
    category: 'conquest',
    title: 'Gran Imperio',
    description: 'Absorbe 25 países en una misma campaña.',
    target: 25,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_50',
    number: 7,
    category: 'conquest',
    title: 'Hegemonía Intercontinental',
    description: 'Absorbe 50 países en una misma campaña.',
    target: 50,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_annex_100',
    number: 8,
    category: 'conquest',
    title: 'Mitad del Planeta',
    description: 'Absorbe 100 países en una misma campaña.',
    target: 100,
    evaluate: (_p, sim) => countPlayerAnnexed(sim),
  },
  {
    id: 'conq_km2_5m',
    number: 9,
    category: 'conquest',
    title: 'Gigante Territorial',
    description: 'Controla al menos 5.000.000 km² en el mapa mundial.',
    target: 5000000,
    evaluate: (_p, sim) => {
      const pl = getPlayer(sim);
      return pl ? pl.pixels * 100 : 0;
    },
  },
  {
    id: 'conq_victory',
    number: 10,
    category: 'conquest',
    title: 'Hegemonía Global',
    description: 'Alcanza la victoria en una campaña o sala Online.',
    target: 1,
    evaluate: (p, sim) => {
      const wonNow =
        sim &&
        ((sim.outcome === 'victory' && !sim.isMultiplayer) ||
          (sim.isMultiplayer && sim.winnerCountryId === sim.playerId))
          ? 1
          : 0;
      return Math.max(p.stats.victories, wonNow);
    },
  },

  // ==================== 2. ECONOMÍA (10) ====================
  {
    id: 'eco_mine_3',
    number: 11,
    category: 'economy',
    title: 'Fiebre del Oro',
    description: 'Posee 3 Minas de Oro activas en tu país.',
    target: 3,
    evaluate: (_p, sim) => getPlayer(sim)?.goldMines ?? 0,
  },
  {
    id: 'eco_mine_10',
    number: 12,
    category: 'economy',
    title: 'Consorcio Minero',
    description: 'Posee 10 Minas de Oro activas en tu país.',
    target: 10,
    evaluate: (_p, sim) => getPlayer(sim)?.goldMines ?? 0,
  },
  {
    id: 'eco_mine_25',
    number: 13,
    category: 'economy',
    title: 'El Dorado Moderno',
    description: 'Posee 25 Minas de Oro activas en tu país.',
    target: 25,
    evaluate: (_p, sim) => getPlayer(sim)?.goldMines ?? 0,
  },
  {
    id: 'eco_city_5',
    number: 14,
    category: 'economy',
    title: 'Red Urbana',
    description: 'Posee 5 Ciudades activas en tu país.',
    target: 5,
    evaluate: (_p, sim) => getPlayer(sim)?.cities ?? 0,
  },
  {
    id: 'eco_city_15',
    number: 15,
    category: 'economy',
    title: 'Nación Metrópoli',
    description: 'Posee 15 Ciudades activas en tu país.',
    target: 15,
    evaluate: (_p, sim) => getPlayer(sim)?.cities ?? 0,
  },
  {
    id: 'eco_city_30',
    number: 16,
    category: 'economy',
    title: 'Megalópolis Mundial',
    description: 'Posee 30 Ciudades activas en tu país.',
    target: 30,
    evaluate: (_p, sim) => getPlayer(sim)?.cities ?? 0,
  },
  {
    id: 'eco_money_1k',
    number: 17,
    category: 'economy',
    title: 'Primer Mil',
    description: 'Acumula $1.000 en tu tesoro nacional.',
    target: 1000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.money ?? 0),
  },
  {
    id: 'eco_money_5k',
    number: 18,
    category: 'economy',
    title: 'Tesoro Soberano',
    description: 'Acumula $5.000 en tu tesoro nacional.',
    target: 5000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.money ?? 0),
  },
  {
    id: 'eco_money_15k',
    number: 19,
    category: 'economy',
    title: 'Reserva Imperial',
    description: 'Acumula $15.000 en tu tesoro nacional.',
    target: 15000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.money ?? 0),
  },
  {
    id: 'eco_income_60',
    number: 20,
    category: 'economy',
    title: 'Motor Económico',
    description: 'Alcanza un ingreso neto de +$60 por segundo.',
    target: 60,
    evaluate: (_p, sim) => Math.max(0, Math.round(getPlayer(sim)?.netIncome ?? 0)),
  },

  // ==================== 3. EJÉRCITO Y GUERRA (10) ====================
  {
    id: 'mil_first_war',
    number: 21,
    category: 'military',
    title: 'Tambores de Guerra',
    description: 'Declara tu primera guerra contra otra nación.',
    target: 1,
    evaluate: (p, sim) => Math.max(p.stats.warsDeclared, sim ? getEnemies(sim, sim.playerId).length : 0),
  },
  {
    id: 'mil_recruit_10',
    number: 22,
    category: 'military',
    title: 'Reclutamiento Masivo',
    description: 'Recluta soldados 10 veces en total.',
    target: 10,
    evaluate: (p) => p.stats.recruitsDone,
  },
  {
    id: 'mil_recruit_50',
    number: 23,
    category: 'military',
    title: 'Máquina de Guerra',
    description: 'Recluta soldados 50 veces en total.',
    target: 50,
    evaluate: (p) => p.stats.recruitsDone,
  },
  {
    id: 'mil_army_1000',
    number: 24,
    category: 'military',
    title: 'Primer Batallón',
    description: 'Alcanza 1.000 soldados en tu ejército.',
    target: 1000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.army ?? 0),
  },
  {
    id: 'mil_army_2500',
    number: 25,
    category: 'military',
    title: 'Ejército Profesional',
    description: 'Alcanza 2.500 soldados en tu ejército.',
    target: 2500,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.army ?? 0),
  },
  {
    id: 'mil_army_5000',
    number: 26,
    category: 'military',
    title: 'Gran Ejército',
    description: 'Alcanza 5.000 soldados en tu ejército.',
    target: 5000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.army ?? 0),
  },
  {
    id: 'mil_army_10000',
    number: 27,
    category: 'military',
    title: 'Superpotencia Militar',
    description: 'Alcanza 10.000 soldados en tu ejército.',
    target: 10000,
    evaluate: (_p, sim) => Math.round(getPlayer(sim)?.army ?? 0),
  },
  {
    id: 'mil_two_front',
    number: 28,
    category: 'military',
    title: 'Guerra en Dos Frentes',
    description: 'Combate en 2 guerras simultáneamente.',
    target: 2,
    evaluate: (_p, sim) => (sim ? getEnemies(sim, sim.playerId).length : 0),
  },
  {
    id: 'mil_three_front',
    number: 29,
    category: 'military',
    title: 'Guerra Total',
    description: 'Combate en 3 o más guerras simultáneamente.',
    target: 3,
    evaluate: (_p, sim) => (sim ? getEnemies(sim, sim.playerId).length : 0),
  },
  {
    id: 'mil_world_1',
    number: 30,
    category: 'military',
    title: 'Potencia #1',
    description: 'Posee el ejército más grande de todo el planeta.',
    target: 1,
    evaluate: (_p, sim) => isTopArmyInWorld(sim),
  },

  // ==================== 4. ARMADA Y DEFENSA (10) ====================
  {
    id: 'def_port_1',
    number: 31,
    category: 'defense',
    title: 'Salida al Mar',
    description: 'Construye tu primer Puerto Naval.',
    target: 1,
    evaluate: (p, sim) => Math.max(p.stats.portsBuilt, getPlayer(sim)?.ports.length ?? 0),
  },
  {
    id: 'def_port_3',
    number: 32,
    category: 'defense',
    title: 'Flota Oceánica',
    description: 'Posee 3 Puertos Navales activos.',
    target: 3,
    evaluate: (_p, sim) => getPlayer(sim)?.ports.length ?? 0,
  },
  {
    id: 'def_port_6',
    number: 33,
    category: 'defense',
    title: 'Dominio Marítimo',
    description: 'Posee 6 Puertos Navales activos.',
    target: 6,
    evaluate: (_p, sim) => getPlayer(sim)?.ports.length ?? 0,
  },
  {
    id: 'def_build_1',
    number: 34,
    category: 'defense',
    title: 'Primera Fortaleza',
    description: 'Coloca tu primera Defensa estratégica en el mapa.',
    target: 1,
    evaluate: (p, sim) => Math.max(p.stats.defensesBuilt, getPlayer(sim)?.defenses.length ?? 0),
  },
  {
    id: 'def_build_3',
    number: 35,
    category: 'defense',
    title: 'Línea Defensiva',
    description: 'Mantén 3 Defensas activas simultáneamente.',
    target: 3,
    evaluate: (_p, sim) => getPlayer(sim)?.defenses.length ?? 0,
  },
  {
    id: 'def_build_6',
    number: 36,
    category: 'defense',
    title: 'Muralla Nacional',
    description: 'Mantén 6 Defensas activas simultáneamente.',
    target: 6,
    evaluate: (_p, sim) => getPlayer(sim)?.defenses.length ?? 0,
  },
  {
    id: 'def_build_10',
    number: 37,
    category: 'defense',
    title: 'Fortaleza Inexpugnable',
    description: 'Mantén 10 Defensas activas simultáneamente.',
    target: 10,
    evaluate: (_p, sim) => getPlayer(sim)?.defenses.length ?? 0,
  },
  {
    id: 'def_pct_30',
    number: 38,
    category: 'defense',
    title: 'Escudo Estratégico',
    description: 'Alcanza +30% de defensa nacional.',
    target: 30,
    evaluate: (_p, sim) => {
      const pl = getPlayer(sim);
      return pl ? getCountryDefensePct(pl) : 0;
    },
  },
  {
    id: 'def_pct_60',
    number: 39,
    category: 'defense',
    title: 'Búnker Soberano',
    description: 'Alcanza +60% de defensa nacional.',
    target: 60,
    evaluate: (_p, sim) => {
      const pl = getPlayer(sim);
      return pl ? getCountryDefensePct(pl) : 0;
    },
  },
  {
    id: 'def_naval_inv',
    number: 40,
    category: 'defense',
    title: 'Desembarco Anfibio',
    description: 'Despliega una invasión naval hacia otro país.',
    target: 1,
    evaluate: (p, sim) => {
      const activeInv = sim
        ? sim.invasions.filter((inv) => inv.attackerId === sim.playerId).length
        : 0;
      return Math.max(p.stats.navalInvasionsSeen, activeInv);
    },
  },

  // ==================== 5. ARSENAL NUCLEAR (10) ====================
  {
    id: 'nuke_first',
    number: 41,
    category: 'nuclear',
    title: 'Era Atómica',
    description: 'Lanza tu primera Bomba Nuclear.',
    target: 1,
    evaluate: (p) => p.stats.nukesLaunched,
  },
  {
    id: 'nuke_3',
    number: 42,
    category: 'nuclear',
    title: 'Disuasión Nuclear',
    description: 'Lanza 3 Bombas Nucleares en total.',
    target: 3,
    evaluate: (p) => p.stats.nukesLaunched,
  },
  {
    id: 'nuke_5',
    number: 43,
    category: 'nuclear',
    title: 'Invierno Atómico',
    description: 'Lanza 5 Bombas Nucleares en total.',
    target: 5,
    evaluate: (p) => p.stats.nukesLaunched,
  },
  {
    id: 'nuke_10',
    number: 44,
    category: 'nuclear',
    title: 'Arsenal Apocalíptico',
    description: 'Lanza 10 Bombas Nucleares en total.',
    target: 10,
    evaluate: (p) => p.stats.nukesLaunched,
  },
  {
    id: 'nuke_20',
    number: 45,
    category: 'nuclear',
    title: 'Señor del Átomo',
    description: 'Lanza 20 Bombas Nucleares en total.',
    target: 20,
    evaluate: (p) => p.stats.nukesLaunched,
  },
  {
    id: 'nuke_def_break',
    number: 46,
    category: 'nuclear',
    title: 'Rompebúnkeres',
    description: 'Destruye al menos una defensa enemiga con una Bomba Nuclear.',
    target: 1,
    evaluate: (p) => p.stats.nukeDefensesBroken,
  },
  {
    id: 'nuke_tension_80',
    number: 47,
    category: 'nuclear',
    title: 'Al Borde del Abismo',
    description: 'Lleva la tensión global al 80% o más.',
    target: 80,
    evaluate: (_p, sim) => Math.round(sim?.globalTension ?? 0),
  },
  {
    id: 'nuke_multi',
    number: 48,
    category: 'nuclear',
    title: 'Golpe en Plena Guerra',
    description: 'Detona una Bomba Nuclear mientras combates en una guerra activa.',
    target: 1,
    evaluate: (p) => p.stats.nukeInWarLaunched,
  },
  {
    id: 'nuke_fallout_zone',
    number: 49,
    category: 'nuclear',
    title: 'Zona Irradiada',
    description: 'Mantén una zona de radiación activa tras un impacto nuclear.',
    target: 1,
    evaluate: (p, sim) => (getPlayer(sim)?.lastNukeStrike ? 1 : p.stats.nukesLaunched > 0 ? 1 : 0),
  },
  {
    id: 'nuke_cooldown',
    number: 50,
    category: 'nuclear',
    title: 'Silos Recargados',
    description: 'Lanza una segunda Bomba Nuclear tras completar una recarga.',
    target: 1,
    evaluate: (p) => p.stats.nukeAfterCooldown,
  },

  // ==================== 6. DIPLOMACIA Y ALIANZAS (10) ====================
  {
    id: 'dip_gift_1',
    number: 51,
    category: 'diplomacy',
    title: 'Gesto de Amistad',
    description: 'Envía dinero diplomático a otro país.',
    target: 1,
    evaluate: (p) => p.stats.giftsSent,
  },
  {
    id: 'dip_gift_10',
    number: 52,
    category: 'diplomacy',
    title: 'Banquero Internacional',
    description: 'Envía ayuda económica diplomática 10 veces en total.',
    target: 10,
    evaluate: (p) => p.stats.giftsSent,
  },
  {
    id: 'dip_ally_1',
    number: 53,
    category: 'diplomacy',
    title: 'Primer Aliado',
    description: 'Forma tu primera Alianza Estratégica.',
    target: 1,
    evaluate: (_p, sim) => (sim ? getAllies(sim, sim.playerId).length : 0),
  },
  {
    id: 'dip_ally_3',
    number: 54,
    category: 'diplomacy',
    title: 'Coalición Regional',
    description: 'Mantén 3 alianzas activas al mismo tiempo.',
    target: 3,
    evaluate: (_p, sim) => (sim ? getAllies(sim, sim.playerId).length : 0),
  },
  {
    id: 'dip_ally_5',
    number: 55,
    category: 'diplomacy',
    title: 'Bloque Mundial',
    description: 'Mantén 5 alianzas activas al mismo tiempo.',
    target: 5,
    evaluate: (_p, sim) => (sim ? getAllies(sim, sim.playerId).length : 0),
  },
  {
    id: 'dip_ally_8',
    number: 56,
    category: 'diplomacy',
    title: 'Gran Confederación',
    description: 'Mantén 8 alianzas activas al mismo tiempo.',
    target: 8,
    evaluate: (_p, sim) => (sim ? getAllies(sim, sim.playerId).length : 0),
  },
  {
    id: 'dip_peace_1',
    number: 57,
    category: 'diplomacy',
    title: 'Tratado de Paz',
    description: 'Firma tu primer tratado de paz.',
    target: 1,
    evaluate: (p) => p.stats.peacesSigned,
  },
  {
    id: 'dip_peace_5',
    number: 58,
    category: 'diplomacy',
    title: 'Pacificador',
    description: 'Firma 5 tratados de paz en total.',
    target: 5,
    evaluate: (p) => p.stats.peacesSigned,
  },
  {
    id: 'dip_help_1',
    number: 59,
    category: 'diplomacy',
    title: 'Llamado a los Aliados',
    description: 'Pide ayuda militar a un aliado durante una guerra.',
    target: 1,
    evaluate: (p) => p.stats.allyHelpsRequested,
  },
  {
    id: 'dip_rel_100',
    number: 60,
    category: 'diplomacy',
    title: 'Hermandad Perfecta',
    description: 'Alcanza relación 100/100 con cualquier país.',
    target: 100,
    evaluate: (_p, sim) => getMaxRelationWithAny(sim),
  },

  // ==================== 7. ÁRBOL GENEALÓGICO E HISTORIA (10) ====================
  {
    id: 'hist_open_tree',
    number: 61,
    category: 'history',
    title: 'Historiador',
    description: 'Abre el Árbol Genealógico de un país.',
    target: 1,
    evaluate: (p) => p.stats.treeOpened,
  },
  {
    id: 'hist_node_1',
    number: 62,
    category: 'history',
    title: 'Primer Hito',
    description: 'Completa tu primer hito histórico en el Árbol Genealógico.',
    target: 1,
    evaluate: (p, sim) =>
      Math.max(p.stats.focusNodesCompletedTotal, getPlayer(sim)?.completedFocusIds.length ?? 0),
  },
  {
    id: 'hist_node_3',
    number: 63,
    category: 'history',
    title: 'Legado en Marcha',
    description: 'Completa 3 hitos del árbol de un mismo país.',
    target: 3,
    evaluate: (_p, sim) => getPlayer(sim)?.completedFocusIds.length ?? 0,
  },
  {
    id: 'hist_node_6',
    number: 64,
    category: 'history',
    title: 'Árbol Completo',
    description: 'Completa los 6 hitos del Árbol Genealógico de un país.',
    target: 6,
    evaluate: (_p, sim) => getPlayer(sim)?.completedFocusIds.length ?? 0,
  },
  {
    id: 'hist_restore_1',
    number: 65,
    category: 'history',
    title: 'Renacimiento Histórico',
    description: 'Restaura el nombre histórico de cualquier país (ej. Gran Colombia).',
    target: 1,
    evaluate: (p, sim) => Math.max(p.stats.restoredNames.length, getPlayer(sim)?.customName ? 1 : 0),
  },
  {
    id: 'hist_gran_col',
    number: 66,
    category: 'history',
    title: 'Sueño de Bolívar',
    description: 'Restaura oficialmente la Gran Colombia.',
    target: 1,
    evaluate: (p, sim) =>
      p.stats.granColombiaRestored || getPlayer(sim)?.customName === 'Gran Colombia' ? 1 : 0,
  },
  {
    id: 'hist_restore_3',
    number: 67,
    category: 'history',
    title: 'Cronista Imperial',
    description: 'Restaura 3 naciones históricas distintas entre tus partidas.',
    target: 3,
    evaluate: (p) => p.stats.restoredNames.length,
  },
  {
    id: 'hist_restore_5',
    number: 68,
    category: 'history',
    title: 'Guardián de la Historia',
    description: 'Restaura 5 naciones históricas distintas entre tus partidas.',
    target: 5,
    evaluate: (p) => p.stats.restoredNames.length,
  },
  {
    id: 'hist_total_15',
    number: 69,
    category: 'history',
    title: 'Enciclopedia Viva',
    description: 'Completa 15 hitos históricos acumulados entre partidas.',
    target: 15,
    evaluate: (p) => p.stats.focusNodesCompletedTotal,
  },
  {
    id: 'hist_total_30',
    number: 70,
    category: 'history',
    title: 'Maestro de Linajes',
    description: 'Completa 30 hitos históricos acumulados entre partidas.',
    target: 30,
    evaluate: (p) => p.stats.focusNodesCompletedTotal,
  },

  // ==================== 8. REBELIONES Y ORDEN INTERNO (10) ====================
  {
    id: 'reb_suppress_1',
    number: 71,
    category: 'rebellion',
    title: 'Mano Firme',
    description: 'Reprime un foco rebelde en un territorio anexado.',
    target: 1,
    evaluate: (p) => p.stats.rebellionsSuppressed,
  },
  {
    id: 'reb_suppress_5',
    number: 72,
    category: 'rebellion',
    title: 'Pacificación Imperial',
    description: 'Reprime rebeliones 5 veces en total.',
    target: 5,
    evaluate: (p) => p.stats.rebellionsSuppressed,
  },
  {
    id: 'reb_suppress_15',
    number: 73,
    category: 'rebellion',
    title: 'Control Absoluto',
    description: 'Reprime rebeliones 15 veces en total.',
    target: 15,
    evaluate: (p) => p.stats.rebellionsSuppressed,
  },
  {
    id: 'reb_occupy_5',
    number: 74,
    category: 'rebellion',
    title: 'Virreinato',
    description: 'Mantén 5 países anexados bajo tu control simultáneamente.',
    target: 5,
    evaluate: (_p, sim) => (sim ? getOccupiedNationsBy(sim, sim.playerId).length : 0),
  },
  {
    id: 'reb_occupy_15',
    number: 75,
    category: 'rebellion',
    title: 'Imperio Multinacional',
    description: 'Mantén 15 países anexados bajo tu control simultáneamente.',
    target: 15,
    evaluate: (_p, sim) => (sim ? getOccupiedNationsBy(sim, sim.playerId).length : 0),
  },
  {
    id: 'reb_calm_strong',
    number: 76,
    category: 'rebellion',
    title: 'Gobernador de Hierro',
    description: 'Reprime la rebeldía de un país absorbido con fuerza ≥ 60.',
    target: 1,
    evaluate: (p) => p.stats.strongRebellionSuppressed,
  },
  {
    id: 'reb_witness',
    number: 77,
    category: 'rebellion',
    title: 'Chispa Separatista',
    description: 'Presencia una rebelión de independencia en el mapa.',
    target: 1,
    evaluate: (p) => p.stats.aiRebellionWitnessed,
  },
  {
    id: 'reb_crush',
    number: 78,
    category: 'rebellion',
    title: 'Rebelión Enfrentada',
    description: 'Sobrevive a una rebelión de independencia contra tu país.',
    target: 1,
    evaluate: (p) => p.stats.aiRebellionSurvived,
  },
  {
    id: 'reb_online_recruit',
    number: 79,
    category: 'rebellion',
    title: 'Resistencia Clandestina',
    description: 'Recauda ejército rebelde en modo Online tras ser anexado.',
    target: 1,
    evaluate: (p) => p.stats.onlineRebelRecruits,
  },
  {
    id: 'reb_online_free',
    number: 80,
    category: 'rebellion',
    title: '¡Libertad!',
    description: 'Inicia una rebelión y recupera tu independencia en modo Online.',
    target: 1,
    evaluate: (p) => p.stats.onlineRebellionsStarted,
  },

  // ==================== 9. TIEMPO, EVENTOS Y SUPERVIVENCIA (10) ====================
  {
    id: 'time_year_2027',
    number: 81,
    category: 'timeline',
    title: 'Primer Año',
    description: 'Sobrevive con tu país hasta el año 2027.',
    target: 2027,
    evaluate: (_p, sim) => (getPlayer(sim)?.alive ? sim!.year : 0),
  },
  {
    id: 'time_year_2030',
    number: 82,
    category: 'timeline',
    title: 'Década de Estrategia',
    description: 'Llega vivo hasta el año 2030.',
    target: 2030,
    evaluate: (_p, sim) => (getPlayer(sim)?.alive ? sim!.year : 0),
  },
  {
    id: 'time_year_2035',
    number: 83,
    category: 'timeline',
    title: 'Largo Plazo',
    description: 'Llega vivo hasta el año 2035.',
    target: 2035,
    evaluate: (_p, sim) => (getPlayer(sim)?.alive ? sim!.year : 0),
  },
  {
    id: 'time_year_2045',
    number: 84,
    category: 'timeline',
    title: 'Visión de Estado',
    description: 'Llega vivo hasta el año 2045.',
    target: 2045,
    evaluate: (_p, sim) => (getPlayer(sim)?.alive ? sim!.year : 0),
  },
  {
    id: 'time_year_2060',
    number: 85,
    category: 'timeline',
    title: 'Siglo XXI Dominado',
    description: 'Llega vivo hasta el año 2060.',
    target: 2060,
    evaluate: (_p, sim) => (getPlayer(sim)?.alive ? sim!.year : 0),
  },
  {
    id: 'time_event_1',
    number: 86,
    category: 'timeline',
    title: 'Crisis Resuelta',
    description: 'Resuelve tu primer Evento Histórico.',
    target: 1,
    evaluate: (p) => p.stats.eventsResolved,
  },
  {
    id: 'time_event_5',
    number: 87,
    category: 'timeline',
    title: 'Estadista Veterano',
    description: 'Resuelve 5 Eventos Históricos en total.',
    target: 5,
    evaluate: (p) => p.stats.eventsResolved,
  },
  {
    id: 'time_event_15',
    number: 88,
    category: 'timeline',
    title: 'Líder Inquebrantable',
    description: 'Resuelve 15 Eventos Históricos en total.',
    target: 15,
    evaluate: (p) => p.stats.eventsResolved,
  },
  {
    id: 'time_5min',
    number: 89,
    category: 'timeline',
    title: 'Estratega Activo',
    description: 'Acumula 5 minutos (300 seg) jugando partidas.',
    target: 300,
    evaluate: (p) => Math.floor(p.stats.totalPlaySeconds),
  },
  {
    id: 'time_30min',
    number: 90,
    category: 'timeline',
    title: 'Comandante Dedicado',
    description: 'Acumula 30 minutos (1.800 seg) jugando partidas.',
    target: 1800,
    evaluate: (p) => Math.floor(p.stats.totalPlaySeconds),
  },

  // ==================== 10. EXPLORACIÓN MUNDIAL Y ONLINE (10) ====================
  {
    id: 'world_america',
    number: 91,
    category: 'world',
    title: 'Líder de América',
    description: 'Juega una partida dirigiendo un país de América.',
    target: 1,
    evaluate: (p) => (p.stats.playedContinents.includes('América') ? 1 : 0),
  },
  {
    id: 'world_europe',
    number: 92,
    category: 'world',
    title: 'Líder de Europa',
    description: 'Juega una partida dirigiendo un país de Europa.',
    target: 1,
    evaluate: (p) => (p.stats.playedContinents.includes('Europa') ? 1 : 0),
  },
  {
    id: 'world_asia',
    number: 93,
    category: 'world',
    title: 'Líder de Asia',
    description: 'Juega una partida dirigiendo un país de Asia.',
    target: 1,
    evaluate: (p) => (p.stats.playedContinents.includes('Asia') ? 1 : 0),
  },
  {
    id: 'world_africa',
    number: 94,
    category: 'world',
    title: 'Líder de África',
    description: 'Juega una partida dirigiendo un país de África.',
    target: 1,
    evaluate: (p) => (p.stats.playedContinents.includes('África') ? 1 : 0),
  },
  {
    id: 'world_oceania',
    number: 95,
    category: 'world',
    title: 'Líder de Oceanía',
    description: 'Juega una partida dirigiendo un país de Oceanía.',
    target: 1,
    evaluate: (p) => (p.stats.playedContinents.includes('Oceanía') ? 1 : 0),
  },
  {
    id: 'world_5_nations',
    number: 96,
    category: 'world',
    title: 'Trotamundos',
    description: 'Juega con 5 países diferentes en total.',
    target: 5,
    evaluate: (p) => p.stats.playedCountries.length,
  },
  {
    id: 'world_15_nations',
    number: 97,
    category: 'world',
    title: 'Diplomático Global',
    description: 'Juega con 15 países diferentes en total.',
    target: 15,
    evaluate: (p) => p.stats.playedCountries.length,
  },
  {
    id: 'world_small_rise',
    number: 98,
    category: 'world',
    title: 'David contra Goliat',
    description: 'Alcanza 1.500 soldados dirigiendo un país pequeño (fuerza ≤ 30).',
    target: 1500,
    evaluate: (_p, sim) => {
      const pl = getPlayer(sim);
      if (!pl || getCountryRebellionStrength(pl) > 30) return 0;
      return Math.round(pl.army);
    },
  },
  {
    id: 'world_online_join',
    number: 99,
    category: 'world',
    title: 'Comandante Online',
    description: 'Participa en una partida del modo Multijugador Online.',
    target: 1,
    evaluate: (p, sim) => Math.max(p.stats.onlineMatchesPlayed, sim?.isMultiplayer ? 1 : 0),
  },
  {
    id: 'world_master_50',
    number: 100,
    category: 'world',
    title: 'Leyenda de Países en Guerra',
    description: 'Desbloquea al menos 50 logros distintos en el juego.',
    target: 50,
    evaluate: (p) => Object.keys(p.unlocked).filter((id) => id !== 'world_master_50').length,
  },
];

export function getAchievementProgress(
  ach: AchievementDef,
  profile: AchievementProfile,
  sim: SimulationState | null
): AchievementProgress {
  if (profile.unlocked[ach.id]) {
    return { current: ach.target, target: ach.target };
  }
  const val = Math.max(0, Math.floor(ach.evaluate(profile, sim)));
  return { current: Math.min(ach.target, val), target: ach.target };
}

export function evaluateAchievements(
  profile: AchievementProfile,
  sim: SimulationState | null
): { updatedProfile: AchievementProfile; newlyUnlocked: AchievementDef[] } {
  const now = Date.now();
  const nextUnlocked = { ...profile.unlocked };
  const nextStats: AchievementStats = {
    ...profile.stats,
    restoredNames: [...profile.stats.restoredNames],
    playedContinents: [...profile.stats.playedContinents],
    playedCountries: [...profile.stats.playedCountries],
  };

  // Keep dynamic counters in sync with current simulation state
  const player = getPlayer(sim);
  if (sim && player) {
    if (!nextStats.playedContinents.includes(player.seed.continent)) {
      nextStats.playedContinents.push(player.seed.continent);
    }
    if (!nextStats.playedCountries.includes(player.seed.iso2)) {
      nextStats.playedCountries.push(player.seed.iso2);
    }
    if (player.customName && !nextStats.restoredNames.includes(player.customName)) {
      nextStats.restoredNames.push(player.customName);
    }
    if (player.customName === 'Gran Colombia') {
      nextStats.granColombiaRestored = true;
    }
    if (sim.invasions.some((inv) => inv.attackerId === sim.playerId)) {
      nextStats.navalInvasionsSeen = Math.max(1, nextStats.navalInvasionsSeen);
    }
    if (
      sim.chronicle.some((entry) => entry.text.includes('REBELIÓN DE INDEPENDENCIA'))
    ) {
      nextStats.aiRebellionWitnessed = Math.max(1, nextStats.aiRebellionWitnessed);
      const againstPlayer = sim.chronicle.some(
        (entry) =>
          entry.text.includes('REBELIÓN DE INDEPENDENCIA') &&
          (entry.text.includes(`contra ${player.seed.name}`) ||
            (player.customName ? entry.text.includes(`contra ${player.customName}`) : false))
      );
      if (againstPlayer && player.alive) {
        nextStats.aiRebellionSurvived = Math.max(1, nextStats.aiRebellionSurvived);
      }
    }
    if (
      (sim.outcome === 'victory' && !sim.isMultiplayer) ||
      (sim.isMultiplayer && sim.winnerCountryId === sim.playerId)
    ) {
      nextStats.victories = Math.max(1, nextStats.victories);
    }
  }

  const workingProfile: AchievementProfile = {
    unlocked: nextUnlocked,
    stats: nextStats,
  };

  const newlyUnlocked: AchievementDef[] = [];
  for (const ach of ACHIEVEMENTS_100) {
    if (nextUnlocked[ach.id]) continue;
    const value = ach.evaluate(workingProfile, sim);
    if (value >= ach.target) {
      nextUnlocked[ach.id] = now;
      newlyUnlocked.push(ach);
    }
  }

  // Second pass for meta achievement (#100) in case crossing 50 happened in this evaluation
  const metaAch = ACHIEVEMENTS_100[ACHIEVEMENTS_100.length - 1];
  if (metaAch && !nextUnlocked[metaAch.id]) {
    if (metaAch.evaluate(workingProfile, sim) >= metaAch.target) {
      nextUnlocked[metaAch.id] = now;
      newlyUnlocked.push(metaAch);
    }
  }

  return {
    updatedProfile: workingProfile,
    newlyUnlocked,
  };
}
