import { COUNTRIES_195, type Continent } from './countries195';
import {
  getAllies,
  getArmyCap,
  getCountryDefensePct,
  getCountryRebellionStrength,
  getEnemies,
  getOccupiedNationsBy,
  getRelation,
  isCountryCoveredByBarracks,
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
  | 'hardmode'
  | 'nations'
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
  { id: 'hardmode', label: 'Modo Difícil' },
  { id: 'nations', label: '195 Naciones' },
  { id: 'world', label: 'Mundo y Maestría' },
];

export interface AchievementStats {
  warsDeclared: number;
  recruitsDone: number;
  portsBuilt: number;
  defensesBuilt: number;
  barracksBuilt: number;
  antiNukesBuilt: number;
  minesBuiltTotal: number;
  citiesBuiltTotal: number;
  totalAnnexed: number;
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
  hardModePlayed: number;
  hardModeVictories: number;
}

export interface AchievementProfile {
  unlocked: Record<string, number>; // achievementId -> unlocked timestamp ms
  stats: AchievementStats;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface AchievementEvalContext {
  profile: AchievementProfile;
  sim: SimulationState | null;
  player: SimulationState['countries'][number] | null;
  isHard: boolean;
  annexedCount: number;
  annexedByContinent: Record<Continent, number>;
  occupiedCount: number;
  occupiedCoveredByBarracks: number;
  maxOccupiedUnrest: number;
  alliesCount: number;
  enemiesCount: number;
  worldWarsCount: number;
  maxRelation: number;
  goodRelCount: number;
  perfectRelCount: number;
  armyRank: number; // 1 = #1 in world, 999 = dead/no sim
  armyCap: number;
  defensePct: number;
  worldTerritoryPct: number;
  playerStrength: number;
  activePlayerInvasions: number;
  unlockedTotal: number;
}

export interface AchievementDef {
  id: string;
  number: number;
  category: AchievementCategory;
  title: string;
  description: string;
  target: number;
  isMeta?: boolean;
  evaluate: (ctx: AchievementEvalContext) => number;
}

export function createEmptyAchievementProfile(): AchievementProfile {
  return {
    unlocked: {},
    stats: {
      warsDeclared: 0,
      recruitsDone: 0,
      portsBuilt: 0,
      defensesBuilt: 0,
      barracksBuilt: 0,
      antiNukesBuilt: 0,
      minesBuiltTotal: 0,
      citiesBuiltTotal: 0,
      totalAnnexed: 0,
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
      hardModePlayed: 0,
      hardModeVictories: 0,
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

export function createAchievementEvalContext(
  profile: AchievementProfile,
  sim: SimulationState | null
): AchievementEvalContext {
  const player = sim ? sim.countries[sim.playerId] ?? null : null;
  const annexedByContinent: Record<Continent, number> = {
    América: 0,
    Europa: 0,
    Asia: 0,
    África: 0,
    Oceanía: 0,
  };

  let annexedCount = 0;
  let occupiedCount = 0;
  let occupiedCoveredByBarracks = 0;
  let maxOccupiedUnrest = 0;
  let alliesCount = 0;
  let enemiesCount = 0;
  let maxRelation = 0;
  let goodRelCount = 0;
  let perfectRelCount = 0;
  let armyRank = 999;
  let armyCap = 0;
  let defensePct = 0;
  let worldTerritoryPct = 0;
  let playerStrength = 0;
  let activePlayerInvasions = 0;

  if (sim && player) {
    let totalLandPixels = 0;
    let strongerArmies = 0;
    for (let i = 0; i < sim.countries.length; i++) {
      const c = sim.countries[i];
      if (c.alive) {
        totalLandPixels += c.pixels;
        if (c.id !== player.id) {
          if (player.alive && c.army > player.army) {
            strongerArmies++;
          }
          const rel = getRelation(sim, player.id, c.id);
          if (rel > maxRelation) maxRelation = rel;
          if (rel >= 70) goodRelCount++;
          if (rel >= 100) perfectRelCount++;
        }
      } else if (c.annexedById === player.id && c.id !== player.id) {
        annexedCount++;
        annexedByContinent[c.seed.continent] = (annexedByContinent[c.seed.continent] ?? 0) + 1;
      }
    }

    if (player.alive) {
      armyRank = strongerArmies + 1;
    }

    const occupied = getOccupiedNationsBy(sim, player.id);
    occupiedCount = occupied.length;
    for (const occ of occupied) {
      const unrest = occ.rebelUnrest ?? 0;
      if (unrest > maxOccupiedUnrest) maxOccupiedUnrest = unrest;
      if (isCountryCoveredByBarracks(sim, player, occ.id)) {
        occupiedCoveredByBarracks++;
      }
    }

    alliesCount = getAllies(sim, player.id).length;
    enemiesCount = getEnemies(sim, player.id).length;
    armyCap = getArmyCap(player, sim.difficulty);
    defensePct = getCountryDefensePct(player);
    worldTerritoryPct = totalLandPixels > 0 ? Math.floor((player.pixels / totalLandPixels) * 100) : 0;
    playerStrength = getCountryRebellionStrength(player);
    activePlayerInvasions = sim.invasions.filter((inv) => inv.attackerId === player.id).length;
  }

  return {
    profile,
    sim,
    player,
    isHard: sim?.difficulty === 'hard',
    annexedCount,
    annexedByContinent,
    occupiedCount,
    occupiedCoveredByBarracks,
    maxOccupiedUnrest,
    alliesCount,
    enemiesCount,
    worldWarsCount: sim ? sim.wars.length : 0,
    maxRelation,
    goodRelCount,
    perfectRelCount,
    armyRank,
    armyCap,
    defensePct,
    worldTerritoryPct,
    playerStrength,
    activePlayerInvasions,
    unlockedTotal: Object.keys(profile.unlocked).length,
  };
}

function fmt(n: number): string {
  return n.toLocaleString('es-ES');
}

function fmtDuration(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60);
    return `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`;
  }
  const hours = seconds / 3600;
  if (Number.isInteger(hours)) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  }
  return `${hours.toFixed(1).replace('.', ',')} horas`;
}

type RawAch = Omit<AchievementDef, 'number'>;

function buildAll1000Achievements(): AchievementDef[] {
  const list: RawAch[] = [];
  const add = (item: RawAch) => {
    list.push(item);
  };

  // =========================================================================
  // ORIGINAL 100 ACHIEVEMENTS (exact legacy IDs preserved for full save compatibility)
  // =========================================================================

  // 1. CONQUISTA — Original 10 (#1 - #10)
  add({
    id: 'conq_first_gain',
    category: 'conquest',
    title: 'Primera Expansión',
    description: 'Gana al menos 1.000 km² adicionales respecto a tu territorio inicial.',
    target: 1000,
    evaluate: (c) => (c.player ? Math.max(0, (c.player.pixels - c.player.initialPixels) * 100) : 0),
  });
  add({
    id: 'conq_annex_1',
    category: 'conquest',
    title: 'Primera Anexión',
    description: 'Absorbe por completo a 1 país enemigo.',
    target: 1,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_3',
    category: 'conquest',
    title: 'Expansión Regional',
    description: 'Absorbe 3 países en una misma campaña.',
    target: 3,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_5',
    category: 'conquest',
    title: 'Conquistador',
    description: 'Absorbe 5 países en una misma campaña.',
    target: 5,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_10',
    category: 'conquest',
    title: 'Imperio Continental',
    description: 'Absorbe 10 países en una misma campaña.',
    target: 10,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_25',
    category: 'conquest',
    title: 'Gran Imperio',
    description: 'Absorbe 25 países en una misma campaña.',
    target: 25,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_50',
    category: 'conquest',
    title: 'Hegemonía Intercontinental',
    description: 'Absorbe 50 países en una misma campaña.',
    target: 50,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_annex_100',
    category: 'conquest',
    title: 'Mitad del Planeta',
    description: 'Absorbe 100 países en una misma campaña.',
    target: 100,
    evaluate: (c) => c.annexedCount,
  });
  add({
    id: 'conq_km2_5m',
    category: 'conquest',
    title: 'Gigante Territorial',
    description: 'Controla al menos 5.000.000 km² en el mapa mundial.',
    target: 5000000,
    evaluate: (c) => (c.player ? c.player.pixels * 100 : 0),
  });
  add({
    id: 'conq_victory',
    category: 'conquest',
    title: 'Hegemonía Global',
    description: 'Alcanza la victoria en una campaña o sala Online.',
    target: 1,
    evaluate: (c) => {
      const wonNow =
        c.sim &&
        ((c.sim.outcome === 'victory' && !c.sim.isMultiplayer) ||
          (c.sim.isMultiplayer && c.sim.winnerCountryId === c.sim.playerId))
          ? 1
          : 0;
      return Math.max(c.profile.stats.victories, wonNow);
    },
  });

  // 2. ECONOMÍA — Original 10 (#11 - #20)
  add({
    id: 'eco_mine_3',
    category: 'economy',
    title: 'Fiebre del Oro',
    description: 'Posee 3 Minas de Oro activas en tu país.',
    target: 3,
    evaluate: (c) => c.player?.goldMines ?? 0,
  });
  add({
    id: 'eco_mine_10',
    category: 'economy',
    title: 'Consorcio Minero',
    description: 'Posee 10 Minas de Oro activas en tu país.',
    target: 10,
    evaluate: (c) => c.player?.goldMines ?? 0,
  });
  add({
    id: 'eco_mine_25',
    category: 'economy',
    title: 'El Dorado Moderno',
    description: 'Posee 25 Minas de Oro activas en tu país.',
    target: 25,
    evaluate: (c) => c.player?.goldMines ?? 0,
  });
  add({
    id: 'eco_city_5',
    category: 'economy',
    title: 'Red Urbana',
    description: 'Posee 5 Ciudades activas en tu país.',
    target: 5,
    evaluate: (c) => c.player?.cities ?? 0,
  });
  add({
    id: 'eco_city_15',
    category: 'economy',
    title: 'Nación Metrópoli',
    description: 'Posee 15 Ciudades activas en tu país.',
    target: 15,
    evaluate: (c) => c.player?.cities ?? 0,
  });
  add({
    id: 'eco_city_30',
    category: 'economy',
    title: 'Megalópolis Mundial',
    description: 'Posee 30 Ciudades activas en tu país.',
    target: 30,
    evaluate: (c) => c.player?.cities ?? 0,
  });
  add({
    id: 'eco_money_1k',
    category: 'economy',
    title: 'Primer Mil',
    description: 'Acumula $1.000 en tu tesoro nacional.',
    target: 1000,
    evaluate: (c) => Math.round(c.player?.money ?? 0),
  });
  add({
    id: 'eco_money_5k',
    category: 'economy',
    title: 'Tesoro Soberano',
    description: 'Acumula $5.000 en tu tesoro nacional.',
    target: 5000,
    evaluate: (c) => Math.round(c.player?.money ?? 0),
  });
  add({
    id: 'eco_money_15k',
    category: 'economy',
    title: 'Reserva Imperial',
    description: 'Acumula $15.000 en tu tesoro nacional.',
    target: 15000,
    evaluate: (c) => Math.round(c.player?.money ?? 0),
  });
  add({
    id: 'eco_income_60',
    category: 'economy',
    title: 'Motor Económico',
    description: 'Alcanza un ingreso neto de +$60 por segundo.',
    target: 60,
    evaluate: (c) => Math.max(0, Math.round(c.player?.netIncome ?? 0)),
  });

  // 3. EJÉRCITO — Original 10 (#21 - #30)
  add({
    id: 'mil_first_war',
    category: 'military',
    title: 'Tambores de Guerra',
    description: 'Declara tu primera guerra contra otra nación.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.warsDeclared, c.enemiesCount),
  });
  add({
    id: 'mil_recruit_10',
    category: 'military',
    title: 'Reclutamiento Masivo',
    description: 'Recluta soldados 10 veces en total.',
    target: 10,
    evaluate: (c) => c.profile.stats.recruitsDone,
  });
  add({
    id: 'mil_recruit_50',
    category: 'military',
    title: 'Máquina de Guerra',
    description: 'Recluta soldados 50 veces en total.',
    target: 50,
    evaluate: (c) => c.profile.stats.recruitsDone,
  });
  add({
    id: 'mil_army_1000',
    category: 'military',
    title: 'Primer Batallón',
    description: 'Alcanza 1.000 soldados en tu ejército.',
    target: 1000,
    evaluate: (c) => Math.round(c.player?.army ?? 0),
  });
  add({
    id: 'mil_army_2500',
    category: 'military',
    title: 'Ejército Profesional',
    description: 'Alcanza 2.500 soldados en tu ejército.',
    target: 2500,
    evaluate: (c) => Math.round(c.player?.army ?? 0),
  });
  add({
    id: 'mil_army_5000',
    category: 'military',
    title: 'Gran Ejército',
    description: 'Alcanza 5.000 soldados en tu ejército.',
    target: 5000,
    evaluate: (c) => Math.round(c.player?.army ?? 0),
  });
  add({
    id: 'mil_army_10000',
    category: 'military',
    title: 'Superpotencia Militar',
    description: 'Alcanza 10.000 soldados en tu ejército.',
    target: 10000,
    evaluate: (c) => Math.round(c.player?.army ?? 0),
  });
  add({
    id: 'mil_two_front',
    category: 'military',
    title: 'Guerra en Dos Frentes',
    description: 'Combate en 2 guerras simultáneamente.',
    target: 2,
    evaluate: (c) => c.enemiesCount,
  });
  add({
    id: 'mil_three_front',
    category: 'military',
    title: 'Guerra Total',
    description: 'Combate en 3 o más guerras simultáneamente.',
    target: 3,
    evaluate: (c) => c.enemiesCount,
  });
  add({
    id: 'mil_world_1',
    category: 'military',
    title: 'Potencia #1',
    description: 'Posee el ejército más grande de todo el planeta.',
    target: 1,
    evaluate: (c) => (c.armyRank === 1 ? 1 : 0),
  });

  // 4. ARMADA Y DEFENSA — Original 10 (#31 - #40)
  add({
    id: 'def_port_1',
    category: 'defense',
    title: 'Salida al Mar',
    description: 'Construye tu primer Puerto Naval.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.portsBuilt, c.player?.ports.length ?? 0),
  });
  add({
    id: 'def_port_3',
    category: 'defense',
    title: 'Flota Oceánica',
    description: 'Posee 3 Puertos Navales activos.',
    target: 3,
    evaluate: (c) => c.player?.ports.length ?? 0,
  });
  add({
    id: 'def_port_6',
    category: 'defense',
    title: 'Dominio Marítimo',
    description: 'Posee 6 Puertos Navales activos.',
    target: 6,
    evaluate: (c) => c.player?.ports.length ?? 0,
  });
  add({
    id: 'def_build_1',
    category: 'defense',
    title: 'Primera Fortaleza',
    description: 'Coloca tu primera Defensa estratégica en el mapa.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.defensesBuilt, c.player?.defenses.length ?? 0),
  });
  add({
    id: 'def_build_3',
    category: 'defense',
    title: 'Línea Defensiva',
    description: 'Mantén 3 Defensas activas simultáneamente.',
    target: 3,
    evaluate: (c) => c.player?.defenses.length ?? 0,
  });
  add({
    id: 'def_build_6',
    category: 'defense',
    title: 'Muralla Nacional',
    description: 'Mantén 6 Defensas activas simultáneamente.',
    target: 6,
    evaluate: (c) => c.player?.defenses.length ?? 0,
  });
  add({
    id: 'def_build_10',
    category: 'defense',
    title: 'Fortaleza Inexpugnable',
    description: 'Mantén 10 Defensas activas simultáneamente.',
    target: 10,
    evaluate: (c) => c.player?.defenses.length ?? 0,
  });
  add({
    id: 'def_pct_30',
    category: 'defense',
    title: 'Escudo Estratégico',
    description: 'Alcanza +30% de defensa nacional.',
    target: 30,
    evaluate: (c) => c.defensePct,
  });
  add({
    id: 'def_pct_60',
    category: 'defense',
    title: 'Búnker Soberano',
    description: 'Alcanza +60% de defensa nacional.',
    target: 60,
    evaluate: (c) => c.defensePct,
  });
  add({
    id: 'def_naval_inv',
    category: 'defense',
    title: 'Desembarco Anfibio',
    description: 'Despliega una invasión naval hacia otro país.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.navalInvasionsSeen, c.activePlayerInvasions),
  });

  // 5. NUCLEAR — Original 10 (#41 - #50)
  add({
    id: 'nuke_first',
    category: 'nuclear',
    title: 'Era Atómica',
    description: 'Lanza tu primera Bomba Nuclear.',
    target: 1,
    evaluate: (c) => c.profile.stats.nukesLaunched,
  });
  add({
    id: 'nuke_3',
    category: 'nuclear',
    title: 'Disuasión Nuclear',
    description: 'Lanza 3 Bombas Nucleares en total.',
    target: 3,
    evaluate: (c) => c.profile.stats.nukesLaunched,
  });
  add({
    id: 'nuke_5',
    category: 'nuclear',
    title: 'Invierno Atómico',
    description: 'Lanza 5 Bombas Nucleares en total.',
    target: 5,
    evaluate: (c) => c.profile.stats.nukesLaunched,
  });
  add({
    id: 'nuke_10',
    category: 'nuclear',
    title: 'Arsenal Apocalíptico',
    description: 'Lanza 10 Bombas Nucleares en total.',
    target: 10,
    evaluate: (c) => c.profile.stats.nukesLaunched,
  });
  add({
    id: 'nuke_20',
    category: 'nuclear',
    title: 'Señor del Átomo',
    description: 'Lanza 20 Bombas Nucleares en total.',
    target: 20,
    evaluate: (c) => c.profile.stats.nukesLaunched,
  });
  add({
    id: 'nuke_def_break',
    category: 'nuclear',
    title: 'Rompebúnkeres',
    description: 'Destruye al menos una defensa enemiga con una Bomba Nuclear.',
    target: 1,
    evaluate: (c) => c.profile.stats.nukeDefensesBroken,
  });
  add({
    id: 'nuke_tension_80',
    category: 'nuclear',
    title: 'Al Borde del Abismo',
    description: 'Lleva la tensión global al 80% o más.',
    target: 80,
    evaluate: (c) => Math.round(c.sim?.globalTension ?? 0),
  });
  add({
    id: 'nuke_multi',
    category: 'nuclear',
    title: 'Golpe en Plena Guerra',
    description: 'Detona una Bomba Nuclear mientras combates en una guerra activa.',
    target: 1,
    evaluate: (c) => c.profile.stats.nukeInWarLaunched,
  });
  add({
    id: 'nuke_fallout_zone',
    category: 'nuclear',
    title: 'Zona Irradiada',
    description: 'Mantén una zona de radiación activa tras un impacto nuclear.',
    target: 1,
    evaluate: (c) => (c.player?.lastNukeStrike || c.profile.stats.nukesLaunched > 0 ? 1 : 0),
  });
  add({
    id: 'nuke_cooldown',
    category: 'nuclear',
    title: 'Silos Recargados',
    description: 'Lanza una segunda Bomba Nuclear tras completar una recarga.',
    target: 1,
    evaluate: (c) => c.profile.stats.nukeAfterCooldown,
  });

  // 6. DIPLOMACIA — Original 10 (#51 - #60)
  add({
    id: 'dip_gift_1',
    category: 'diplomacy',
    title: 'Gesto de Amistad',
    description: 'Envía dinero diplomático a otro país.',
    target: 1,
    evaluate: (c) => c.profile.stats.giftsSent,
  });
  add({
    id: 'dip_gift_10',
    category: 'diplomacy',
    title: 'Banquero Internacional',
    description: 'Envía ayuda económica diplomática 10 veces en total.',
    target: 10,
    evaluate: (c) => c.profile.stats.giftsSent,
  });
  add({
    id: 'dip_ally_1',
    category: 'diplomacy',
    title: 'Primer Aliado',
    description: 'Forma tu primera Alianza Estratégica.',
    target: 1,
    evaluate: (c) => c.alliesCount,
  });
  add({
    id: 'dip_ally_3',
    category: 'diplomacy',
    title: 'Coalición Regional',
    description: 'Mantén 3 alianzas activas al mismo tiempo.',
    target: 3,
    evaluate: (c) => c.alliesCount,
  });
  add({
    id: 'dip_ally_5',
    category: 'diplomacy',
    title: 'Bloque Mundial',
    description: 'Mantén 5 alianzas activas al mismo tiempo.',
    target: 5,
    evaluate: (c) => c.alliesCount,
  });
  add({
    id: 'dip_ally_8',
    category: 'diplomacy',
    title: 'Gran Confederación',
    description: 'Mantén 8 alianzas activas al mismo tiempo.',
    target: 8,
    evaluate: (c) => c.alliesCount,
  });
  add({
    id: 'dip_peace_1',
    category: 'diplomacy',
    title: 'Tratado de Paz',
    description: 'Firma tu primer tratado de paz.',
    target: 1,
    evaluate: (c) => c.profile.stats.peacesSigned,
  });
  add({
    id: 'dip_peace_5',
    category: 'diplomacy',
    title: 'Pacificador',
    description: 'Firma 5 tratados de paz en total.',
    target: 5,
    evaluate: (c) => c.profile.stats.peacesSigned,
  });
  add({
    id: 'dip_help_1',
    category: 'diplomacy',
    title: 'Llamado a los Aliados',
    description: 'Pide ayuda militar a un aliado durante una guerra.',
    target: 1,
    evaluate: (c) => c.profile.stats.allyHelpsRequested,
  });
  add({
    id: 'dip_rel_100',
    category: 'diplomacy',
    title: 'Hermandad Perfecta',
    description: 'Alcanza relación 100/100 con cualquier país.',
    target: 100,
    evaluate: (c) => c.maxRelation,
  });

  // 7. HISTORIA — Original 10 (#61 - #70)
  add({
    id: 'hist_open_tree',
    category: 'history',
    title: 'Historiador',
    description: 'Abre el Árbol Genealógico de un país.',
    target: 1,
    evaluate: (c) => c.profile.stats.treeOpened,
  });
  add({
    id: 'hist_node_1',
    category: 'history',
    title: 'Primer Hito',
    description: 'Completa tu primer hito histórico en el Árbol Genealógico.',
    target: 1,
    evaluate: (c) =>
      Math.max(c.profile.stats.focusNodesCompletedTotal, c.player?.completedFocusIds.length ?? 0),
  });
  add({
    id: 'hist_node_3',
    category: 'history',
    title: 'Legado en Marcha',
    description: 'Completa 3 hitos del árbol de un mismo país.',
    target: 3,
    evaluate: (c) => c.player?.completedFocusIds.length ?? 0,
  });
  add({
    id: 'hist_node_6',
    category: 'history',
    title: 'Árbol Completo',
    description: 'Completa los 6 hitos del Árbol Genealógico de un país.',
    target: 6,
    evaluate: (c) => c.player?.completedFocusIds.length ?? 0,
  });
  add({
    id: 'hist_restore_1',
    category: 'history',
    title: 'Renacimiento Histórico',
    description: 'Restaura el nombre histórico de cualquier país (ej. Gran Colombia).',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.restoredNames.length, c.player?.customName ? 1 : 0),
  });
  add({
    id: 'hist_gran_col',
    category: 'history',
    title: 'Sueño de Bolívar',
    description: 'Restaura oficialmente la Gran Colombia.',
    target: 1,
    evaluate: (c) =>
      c.profile.stats.granColombiaRestored || c.player?.customName === 'Gran Colombia' ? 1 : 0,
  });
  add({
    id: 'hist_restore_3',
    category: 'history',
    title: 'Cronista Imperial',
    description: 'Restaura 3 naciones históricas distintas entre tus partidas.',
    target: 3,
    evaluate: (c) => c.profile.stats.restoredNames.length,
  });
  add({
    id: 'hist_restore_5',
    category: 'history',
    title: 'Guardián de la Historia',
    description: 'Restaura 5 naciones históricas distintas entre tus partidas.',
    target: 5,
    evaluate: (c) => c.profile.stats.restoredNames.length,
  });
  add({
    id: 'hist_total_15',
    category: 'history',
    title: 'Enciclopedia Viva',
    description: 'Completa 15 hitos históricos acumulados entre partidas.',
    target: 15,
    evaluate: (c) => c.profile.stats.focusNodesCompletedTotal,
  });
  add({
    id: 'hist_total_30',
    category: 'history',
    title: 'Maestro de Linajes',
    description: 'Completa 30 hitos históricos acumulados entre partidas.',
    target: 30,
    evaluate: (c) => c.profile.stats.focusNodesCompletedTotal,
  });

  // 8. REBELIONES — Original 10 (#71 - #80)
  add({
    id: 'reb_suppress_1',
    category: 'rebellion',
    title: 'Mano Firme',
    description: 'Reprime un foco rebelde en un territorio anexado.',
    target: 1,
    evaluate: (c) => c.profile.stats.rebellionsSuppressed,
  });
  add({
    id: 'reb_suppress_5',
    category: 'rebellion',
    title: 'Pacificación Imperial',
    description: 'Reprime rebeliones 5 veces en total.',
    target: 5,
    evaluate: (c) => c.profile.stats.rebellionsSuppressed,
  });
  add({
    id: 'reb_suppress_15',
    category: 'rebellion',
    title: 'Control Absoluto',
    description: 'Reprime rebeliones 15 veces en total.',
    target: 15,
    evaluate: (c) => c.profile.stats.rebellionsSuppressed,
  });
  add({
    id: 'reb_occupy_5',
    category: 'rebellion',
    title: 'Virreinato',
    description: 'Mantén 5 países anexados bajo tu control simultáneamente.',
    target: 5,
    evaluate: (c) => c.occupiedCount,
  });
  add({
    id: 'reb_occupy_15',
    category: 'rebellion',
    title: 'Imperio Multinacional',
    description: 'Mantén 15 países anexados bajo tu control simultáneamente.',
    target: 15,
    evaluate: (c) => c.occupiedCount,
  });
  add({
    id: 'reb_calm_strong',
    category: 'rebellion',
    title: 'Gobernador de Hierro',
    description: 'Reprime la rebeldía de un país absorbido con fuerza ≥ 60.',
    target: 1,
    evaluate: (c) => c.profile.stats.strongRebellionSuppressed,
  });
  add({
    id: 'reb_witness',
    category: 'rebellion',
    title: 'Chispa Separatista',
    description: 'Presencia una rebelión de independencia en el mapa.',
    target: 1,
    evaluate: (c) => c.profile.stats.aiRebellionWitnessed,
  });
  add({
    id: 'reb_crush',
    category: 'rebellion',
    title: 'Rebelión Enfrentada',
    description: 'Sobrevive a una rebelión de independencia contra tu país.',
    target: 1,
    evaluate: (c) => c.profile.stats.aiRebellionSurvived,
  });
  add({
    id: 'reb_online_recruit',
    category: 'rebellion',
    title: 'Resistencia Clandestina',
    description: 'Recauda ejército rebelde en modo Online tras ser anexado.',
    target: 1,
    evaluate: (c) => c.profile.stats.onlineRebelRecruits,
  });
  add({
    id: 'reb_online_free',
    category: 'rebellion',
    title: '¡Libertad!',
    description: 'Inicia una rebelión y recupera tu independencia en modo Online.',
    target: 1,
    evaluate: (c) => c.profile.stats.onlineRebellionsStarted,
  });

  // 9. SUPERVIVENCIA — Original 10 (#81 - #90)
  add({
    id: 'time_year_2027',
    category: 'timeline',
    title: 'Primer Año',
    description: 'Sobrevive con tu país hasta el año 2027.',
    target: 2027,
    evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
  });
  add({
    id: 'time_year_2030',
    category: 'timeline',
    title: 'Década de Estrategia',
    description: 'Llega vivo hasta el año 2030.',
    target: 2030,
    evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
  });
  add({
    id: 'time_year_2035',
    category: 'timeline',
    title: 'Largo Plazo',
    description: 'Llega vivo hasta el año 2035.',
    target: 2035,
    evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
  });
  add({
    id: 'time_year_2045',
    category: 'timeline',
    title: 'Visión de Estado',
    description: 'Llega vivo hasta el año 2045.',
    target: 2045,
    evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
  });
  add({
    id: 'time_year_2060',
    category: 'timeline',
    title: 'Siglo XXI Dominado',
    description: 'Llega vivo hasta el año 2060.',
    target: 2060,
    evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
  });
  add({
    id: 'time_event_1',
    category: 'timeline',
    title: 'Crisis Resuelta',
    description: 'Resuelve tu primer Evento Histórico.',
    target: 1,
    evaluate: (c) => c.profile.stats.eventsResolved,
  });
  add({
    id: 'time_event_5',
    category: 'timeline',
    title: 'Estadista Veterano',
    description: 'Resuelve 5 Eventos Históricos en total.',
    target: 5,
    evaluate: (c) => c.profile.stats.eventsResolved,
  });
  add({
    id: 'time_event_15',
    category: 'timeline',
    title: 'Líder Inquebrantable',
    description: 'Resuelve 15 Eventos Históricos en total.',
    target: 15,
    evaluate: (c) => c.profile.stats.eventsResolved,
  });
  add({
    id: 'time_5min',
    category: 'timeline',
    title: 'Estratega Activo',
    description: 'Acumula 5 minutos (300 seg) jugando partidas.',
    target: 300,
    evaluate: (c) => Math.floor(c.profile.stats.totalPlaySeconds),
  });
  add({
    id: 'time_30min',
    category: 'timeline',
    title: 'Comandante Dedicado',
    description: 'Acumula 30 minutos (1.800 seg) jugando partidas.',
    target: 1800,
    evaluate: (c) => Math.floor(c.profile.stats.totalPlaySeconds),
  });

  // 10. MUNDO Y ONLINE — Original 10 (#91 - #100)
  add({
    id: 'world_america',
    category: 'world',
    title: 'Líder de América',
    description: 'Juega una partida dirigiendo un país de América.',
    target: 1,
    evaluate: (c) => (c.profile.stats.playedContinents.includes('América') ? 1 : 0),
  });
  add({
    id: 'world_europe',
    category: 'world',
    title: 'Líder de Europa',
    description: 'Juega una partida dirigiendo un país de Europa.',
    target: 1,
    evaluate: (c) => (c.profile.stats.playedContinents.includes('Europa') ? 1 : 0),
  });
  add({
    id: 'world_asia',
    category: 'world',
    title: 'Líder de Asia',
    description: 'Juega una partida dirigiendo un país de Asia.',
    target: 1,
    evaluate: (c) => (c.profile.stats.playedContinents.includes('Asia') ? 1 : 0),
  });
  add({
    id: 'world_africa',
    category: 'world',
    title: 'Líder de África',
    description: 'Juega una partida dirigiendo un país de África.',
    target: 1,
    evaluate: (c) => (c.profile.stats.playedContinents.includes('África') ? 1 : 0),
  });
  add({
    id: 'world_oceania',
    category: 'world',
    title: 'Líder de Oceanía',
    description: 'Juega una partida dirigiendo un país de Oceanía.',
    target: 1,
    evaluate: (c) => (c.profile.stats.playedContinents.includes('Oceanía') ? 1 : 0),
  });
  add({
    id: 'world_5_nations',
    category: 'world',
    title: 'Trotamundos',
    description: 'Juega con 5 países diferentes en total.',
    target: 5,
    evaluate: (c) => c.profile.stats.playedCountries.length,
  });
  add({
    id: 'world_15_nations',
    category: 'world',
    title: 'Diplomático Global',
    description: 'Juega con 15 países diferentes en total.',
    target: 15,
    evaluate: (c) => c.profile.stats.playedCountries.length,
  });
  add({
    id: 'world_small_rise',
    category: 'world',
    title: 'David contra Goliat',
    description: 'Alcanza 1.500 soldados dirigiendo un país pequeño (fuerza ≤ 30).',
    target: 1500,
    evaluate: (c) => (!c.player || c.playerStrength > 30 ? 0 : Math.round(c.player.army)),
  });
  add({
    id: 'world_online_join',
    category: 'world',
    title: 'Comandante Online',
    description: 'Participa en una partida del modo Multijugador Online.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.onlineMatchesPlayed, c.sim?.isMultiplayer ? 1 : 0),
  });
  add({
    id: 'world_master_50',
    category: 'world',
    title: 'Leyenda de Países en Guerra',
    description: 'Desbloquea al menos 50 logros distintos en el juego.',
    target: 50,
    isMeta: true,
    evaluate: (c) => Object.keys(c.profile.unlocked).filter((id) => id !== 'world_master_50').length,
  });

  // =========================================================================
  // EXPANSION TO 1,000 ACHIEVEMENTS (+900 NEW ACHIEVEMENTS)
  // =========================================================================

  // ==================== 1. CONQUISTA (+80 -> 90 total) ====================
  const annexMilestones: Array<[number, string]> = [
    [2, 'Doble Anexión'],
    [4, 'Cuatro Fronteras'],
    [6, 'Sexteto Imperial'],
    [7, 'Siete Reinos'],
    [8, 'Ocho Estrellas'],
    [9, 'Nueve Provincias'],
    [12, 'Docena Conquistada'],
    [15, 'Quince Banderas'],
    [18, 'Gran Expansión'],
    [20, 'Veinte Coronas'],
    [30, 'Treinta Dominios'],
    [35, 'Archipiélago de Naciones'],
    [40, 'Cuarenta Soberanías'],
    [45, 'Umbral del Imperio'],
    [60, 'Sesenta Fronteras'],
    [70, 'Setenta Territorios'],
    [75, 'Tres Cuartos de Centena'],
    [80, 'Ochenta Naciones'],
    [90, 'Antesala Mundial'],
    [110, 'Dominio Hemisférico'],
    [125, 'Dos Tercios del Mundo'],
    [150, 'Ciento Cincuenta Países'],
    [175, 'Soberano casi Absoluto'],
    [194, 'Conquista Total del Planeta'],
  ];
  for (const [n, title] of annexMilestones) {
    add({
      id: `conq_annex_${n}`,
      category: 'conquest',
      title,
      description: `Absorbe ${fmt(n)} países enemigos en una misma campaña.`,
      target: n,
      evaluate: (c) => c.annexedCount,
    });
  }

  const km2Milestones: Array<[number, string]> = [
    [50_000, 'Provincia Consolidada'],
    [100_000, 'Cien Mil Kilómetros'],
    [250_000, 'Cuarto de Millón'],
    [500_000, 'Medio Millón km²'],
    [750_000, 'Territorio Extenso'],
    [1_000_000, 'Un Millón km²'],
    [1_500_000, 'Millón y Medio'],
    [2_000_000, 'Dos Millones km²'],
    [3_000_000, 'Tres Millones km²'],
    [4_000_000, 'Cuatro Millones km²'],
    [7_500_000, 'Siete Millones y Medio'],
    [10_000_000, 'Diez Millones km²'],
    [12_500_000, 'Coloso Geográfico'],
    [15_000_000, 'Quince Millones km²'],
    [20_000_000, 'Veinte Millones km²'],
    [25_000_000, 'Cuarto de Planeta'],
    [35_000_000, 'Supercontinente Propio'],
    [50_000_000, 'Dueño de los Continentes'],
  ];
  for (const [km2, title] of km2Milestones) {
    add({
      id: `conq_km2_${km2}`,
      category: 'conquest',
      title,
      description: `Controla al menos ${fmt(km2)} km² en el mapa mundial.`,
      target: km2,
      evaluate: (c) => (c.player ? c.player.pixels * 100 : 0),
    });
  }

  const gainKm2Milestones: Array<[number, string]> = [
    [5_000, 'Avance Fronterizo'],
    [10_000, 'Diez Mil Conquistados'],
    [25_000, 'Ofensiva Exitosa'],
    [50_000, 'Campaña Expansiva'],
    [100_000, 'Gran Anexión Territorial'],
    [250_000, 'Fronteras Redibujadas'],
    [500_000, 'Expansión Medio Millón'],
    [1_000_000, 'Un Millón Ganado'],
    [2_000_000, 'Imperio en Crecimiento'],
    [5_000_000, 'Marea Imparable'],
    [10_000_000, 'Diez Millones Ganados'],
    [20_000_000, 'Mapa Reescrito'],
  ];
  for (const [gain, title] of gainKm2Milestones) {
    add({
      id: `conq_gain_${gain}`,
      category: 'conquest',
      title,
      description: `Gana ${fmt(gain)} km² adicionales sobre tu territorio inicial.`,
      target: gain,
      evaluate: (c) => (c.player ? Math.max(0, (c.player.pixels - c.player.initialPixels) * 100) : 0),
    });
  }

  const pctMilestones: Array<[number, string]> = [
    [1, '1% del Planeta'],
    [2, '2% del Planeta'],
    [5, '5% del Planeta'],
    [10, 'Décima Parte del Mundo'],
    [15, '15% de la Tierra'],
    [20, 'Quinta Parte del Mundo'],
    [30, '30% del Planeta'],
    [40, '40% del Planeta'],
    [50, 'Mitad del Territorio Mundial'],
    [75, 'Tres Cuartos del Mundo'],
  ];
  for (const [pct, title] of pctMilestones) {
    add({
      id: `conq_pct_${pct}`,
      category: 'conquest',
      title,
      description: `Controla al menos el ${pct}% de la superficie terrestre mundial.`,
      target: pct,
      evaluate: (c) => c.worldTerritoryPct,
    });
  }

  const totalAnnexMilestones: Array<[number, string]> = [
    [5, 'Historial de 5 Anexiones'],
    [15, 'Veterano de 15 Anexiones'],
    [30, '30 Banderas Caídas'],
    [50, 'Medio Centenar Acumulado'],
    [80, '80 Naciones Sometidas'],
    [120, '120 Conquistas Históricas'],
    [200, 'Doscientas Anexiones'],
    [300, 'Trescientas Anexiones'],
    [500, 'Quinientas Anexiones'],
    [1000, 'Mil Naciones Conquistadas'],
  ];
  for (const [n, title] of totalAnnexMilestones) {
    add({
      id: `conq_total_annex_${n}`,
      category: 'conquest',
      title,
      description: `Absorbe ${fmt(n)} países acumulados entre todas tus partidas.`,
      target: n,
      evaluate: (c) => Math.max(c.profile.stats.totalAnnexed, c.annexedCount),
    });
  }

  const victoryMilestones: Array<[number, string]> = [
    [2, 'Doble Campeón Mundial'],
    [3, 'Tricampeón Estratégico'],
    [5, 'Cinco Victorias Globales'],
    [10, 'Diez Coronas Mundiales'],
    [15, 'Quince Triunfos Supremos'],
    [25, 'Dinastía Invicta'],
  ];
  for (const [v, title] of victoryMilestones) {
    add({
      id: `conq_victories_${v}`,
      category: 'conquest',
      title,
      description: `Gana ${v} campañas o partidas Online en total.`,
      target: v,
      evaluate: (c) => c.profile.stats.victories,
    });
  }

  // ==================== 2. ECONOMÍA (+80 -> 90 total) ====================
  const mineCounts = [1, 2, 4, 5, 6, 8, 12, 15, 18, 20, 28, 30, 35, 38, 40];
  for (const m of mineCounts) {
    add({
      id: `eco_mine_${m}`,
      category: 'economy',
      title: m === 40 ? 'Imperio Aurífero Máximo' : `Yacimiento de Oro (${m})`,
      description: `Posee ${m} ${m === 1 ? 'Mina de Oro activa' : 'Minas de Oro activas'} en tu país.`,
      target: m,
      evaluate: (c) => c.player?.goldMines ?? 0,
    });
  }

  const cityCounts = [1, 2, 3, 4, 6, 8, 10, 12, 18, 20, 25, 35, 40, 45, 50];
  for (const ct of cityCounts) {
    add({
      id: `eco_city_${ct}`,
      category: 'economy',
      title: ct === 50 ? 'Cincuenta Metrópolis' : `Desarrollo Urbano (${ct})`,
      description: `Posee ${ct} ${ct === 1 ? 'Ciudad activa' : 'Ciudades activas'} en tu país.`,
      target: ct,
      evaluate: (c) => c.player?.cities ?? 0,
    });
  }

  const moneyMilestones: Array<[number, string]> = [
    [250, 'Caja Inicial'],
    [500, 'Quinientos en Reserva'],
    [750, 'Fondo de Emergencia'],
    [2_000, 'Dos Mil Dólares'],
    [3_000, 'Tres Mil en Tesoro'],
    [7_500, 'Arcas Saludables'],
    [10_000, 'Diez Mil en Oro'],
    [20_000, 'Bóveda Blindada'],
    [25_000, 'Veinticinco Mil'],
    [30_000, 'Presupuesto Atómico'],
    [40_000, 'Cuarenta Mil'],
    [50_000, 'Cincuenta Mil'],
    [75_000, 'Potencia Financiera'],
    [100_000, 'Cien Mil en Tesoro'],
    [150_000, 'Banco Central Global'],
    [200_000, 'Doscientos Mil'],
    [300_000, 'Trescientos Mil'],
    [500_000, 'Medio Millón'],
    [750_000, 'Superávit Colosal'],
    [1_000_000, 'Tesoro Millonario'],
  ];
  for (const [amt, title] of moneyMilestones) {
    add({
      id: `eco_money_${amt}`,
      category: 'economy',
      title,
      description: `Acumula $${fmt(amt)} en tu tesoro nacional.`,
      target: amt,
      evaluate: (c) => Math.round(c.player?.money ?? 0),
    });
  }

  const incomeMilestones = [
    5, 10, 15, 25, 35, 45, 80, 100, 125, 150, 200, 250, 350, 500, 750, 1000, 1500, 2000, 3000, 5000,
  ];
  for (const inc of incomeMilestones) {
    add({
      id: `eco_income_${inc}`,
      category: 'economy',
      title: `Flujo de +$${fmt(inc)}/seg`,
      description: `Alcanza un ingreso neto de +$${fmt(inc)} por segundo.`,
      target: inc,
      evaluate: (c) => Math.max(0, Math.round(c.player?.netIncome ?? 0)),
    });
  }

  for (const n of [5, 15, 30, 60, 100]) {
    add({
      id: `eco_mines_built_${n}`,
      category: 'economy',
      title: `Minero Acumulado (${n})`,
      description: `Construye ${n} Minas de Oro en total entre tus partidas.`,
      target: n,
      evaluate: (c) => Math.max(c.profile.stats.minesBuiltTotal, c.player?.goldMines ?? 0),
    });
  }
  for (const n of [5, 15, 35, 75, 150]) {
    add({
      id: `eco_cities_built_${n}`,
      category: 'economy',
      title: `Arquitecto Acumulado (${n})`,
      description: `Construye ${n} Ciudades en total entre tus partidas.`,
      target: n,
      evaluate: (c) => Math.max(c.profile.stats.citiesBuiltTotal, c.player?.cities ?? 0),
    });
  }

  // ==================== 3. EJÉRCITO (+75 -> 85 total) ====================
  const armyMilestones = [
    200, 400, 600, 800, 1500, 2000, 3000, 4000, 6000, 7500, 12500, 15000, 20000, 25000, 35000,
    50000, 75000, 100000, 150000, 250000,
  ];
  for (const a of armyMilestones) {
    add({
      id: `mil_army_${a}`,
      category: 'military',
      title: `Fuerza de ${fmt(a)} Soldados`,
      description: `Alcanza ${fmt(a)} soldados activos en tu ejército.`,
      target: a,
      evaluate: (c) => Math.round(c.player?.army ?? 0),
    });
  }

  const recruitMilestones = [1, 3, 5, 20, 30, 75, 100, 150, 200, 300, 400, 500, 750, 1000, 2000];
  for (const r of recruitMilestones) {
    add({
      id: `mil_recruit_${r}`,
      category: 'military',
      title: `Leva Militar (${fmt(r)})`,
      description: `Recluta soldados ${fmt(r)} ${r === 1 ? 'vez' : 'veces'} en total.`,
      target: r,
      evaluate: (c) => c.profile.stats.recruitsDone,
    });
  }

  const warDeclMilestones = [2, 3, 5, 8, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300];
  for (const w of warDeclMilestones) {
    add({
      id: `mil_wars_decl_${w}`,
      category: 'military',
      title: `Belicista (${fmt(w)} Guerras)`,
      description: `Declara ${fmt(w)} guerras acumuladas en total.`,
      target: w,
      evaluate: (c) => c.profile.stats.warsDeclared,
    });
  }

  const multiFrontMilestones = [4, 5, 6, 7, 8, 10, 12, 15, 20, 25];
  for (const f of multiFrontMilestones) {
    add({
      id: `mil_front_${f}`,
      category: 'military',
      title: `Frente Múltiple (${f})`,
      description: `Combate en ${f} guerras simultáneamente.`,
      target: f,
      evaluate: (c) => c.enemiesCount,
    });
  }

  const capMilestones = [1000, 2000, 3500, 5000, 7500, 10000, 15000, 25000, 50000, 100000];
  for (const cap of capMilestones) {
    add({
      id: `mil_cap_${cap}`,
      category: 'military',
      title: `Capacidad de ${fmt(cap)}`,
      description: `Alcanza una capacidad militar máxima de ${fmt(cap)} soldados.`,
      target: cap,
      evaluate: (c) => c.armyCap,
    });
  }

  const rankMilestones: Array<[number, string]> = [
    [50, 'Top 50 Militar Mundial'],
    [25, 'Top 25 Militar Mundial'],
    [10, 'Top 10 Potencia Militar'],
    [5, 'Top 5 Superpotencia'],
    [3, 'Podio Militar Mundial'],
  ];
  for (const [rank, title] of rankMilestones) {
    add({
      id: `mil_rank_${rank}`,
      category: 'military',
      title,
      description: `Sitúa tu ejército entre las ${rank} mayores potencias del mundo.`,
      target: 1,
      evaluate: (c) => (c.player?.alive && c.armyRank <= rank ? 1 : 0),
    });
  }

  // ==================== 4. ARMADA, DEFENSAS Y CUARTELES (+70 -> 80 total) ====================
  for (const p of [2, 4, 5, 8, 10, 12, 15, 20, 25, 30]) {
    add({
      id: `def_port_active_${p}`,
      category: 'defense',
      title: `Armada de ${p} Puertos`,
      description: `Mantén ${p} Puertos Navales activos simultáneamente.`,
      target: p,
      evaluate: (c) => c.player?.ports.length ?? 0,
    });
  }

  for (const p of [3, 5, 10, 15, 25, 40, 60, 80, 100, 150]) {
    add({
      id: `def_port_built_${p}`,
      category: 'defense',
      title: `Almirantazgo (${p} Puertos)`,
      description: `Construye ${p} Puertos Navales en total entre tus partidas.`,
      target: p,
      evaluate: (c) => Math.max(c.profile.stats.portsBuilt, c.player?.ports.length ?? 0),
    });
  }

  for (const d of [2, 4, 5, 8, 12, 15, 20, 25, 30, 40]) {
    add({
      id: `def_active_${d}`,
      category: 'defense',
      title: `Red de ${d} Defensas`,
      description: `Mantén ${d} Defensas estratégicas activas al mismo tiempo.`,
      target: d,
      evaluate: (c) => c.player?.defenses.length ?? 0,
    });
  }

  for (const d of [5, 10, 20, 35, 50, 75, 100, 150, 200, 300]) {
    add({
      id: `def_built_total_${d}`,
      category: 'defense',
      title: `Ingeniero Fortificador (${d})`,
      description: `Construye ${d} Defensas acumuladas entre tus partidas.`,
      target: d,
      evaluate: (c) => Math.max(c.profile.stats.defensesBuilt, c.player?.defenses.length ?? 0),
    });
  }

  for (const pct of [10, 15, 20, 25, 40, 45, 50, 70, 75, 80]) {
    add({
      id: `def_pct_${pct}`,
      category: 'defense',
      title: `Blindaje Nacional +${pct}%`,
      description: `Alcanza +${pct}% de bonificación de defensa nacional.`,
      target: pct,
      evaluate: (c) => c.defensePct,
    });
  }

  for (const b of [1, 2, 3, 5, 8, 12, 16, 20]) {
    add({
      id: `def_barracks_active_${b}`,
      category: 'defense',
      title: b === 1 ? 'Primer Cuartel Militar' : `Guarnición de ${b} Cuarteles`,
      description: `Mantén ${b} ${b === 1 ? 'Cuartel Militar activo' : 'Cuarteles Militares activos'} en tu territorio.`,
      target: b,
      evaluate: (c) => c.player?.barracks.length ?? 0,
    });
  }
  for (const b of [10, 25]) {
    add({
      id: `def_barracks_total_${b}`,
      category: 'defense',
      title: `Comandante de Cuarteles (${b})`,
      description: `Construye ${b} Cuarteles Militares acumulados entre tus partidas.`,
      target: b,
      evaluate: (c) => Math.max(c.profile.stats.barracksBuilt, c.player?.barracks.length ?? 0),
    });
  }

  for (const an of [1, 2, 3, 4, 5, 8, 10, 15]) {
    add({
      id: `def_antinuke_active_${an}`,
      category: 'defense',
      title: an === 1 ? 'Primer Escudo Antibombas' : `Cúpula de ${an} Antibombas`,
      description: `Mantén ${an} ${an === 1 ? 'sistema Antibombas activo' : 'sistemas Antibombas activos'} en tu territorio.`,
      target: an,
      evaluate: (c) => c.player?.antiNukes.length ?? 0,
    });
  }
  for (const an of [10, 25]) {
    add({
      id: `def_antinuke_total_${an}`,
      category: 'defense',
      title: `Defensa Antimisiles (${an})`,
      description: `Despliega ${an} sistemas Antibombas acumulados entre tus partidas.`,
      target: an,
      evaluate: (c) => Math.max(c.profile.stats.antiNukesBuilt, c.player?.antiNukes.length ?? 0),
    });
  }

  // ==================== 5. NUCLEAR (+45 -> 55 total) ====================
  for (const n of [2, 4, 6, 8, 12, 15, 25, 30, 40, 50, 65, 80, 100, 150, 200]) {
    add({
      id: `nuke_total_${n}`,
      category: 'nuclear',
      title: `Arsenales Detonados (${n})`,
      description: `Lanza ${n} Bombas Nucleares en total.`,
      target: n,
      evaluate: (c) => c.profile.stats.nukesLaunched,
    });
  }

  for (const n of [2, 3, 5, 8, 10, 15, 20, 30, 50, 75]) {
    add({
      id: `nuke_break_${n}`,
      category: 'nuclear',
      title: `Demoledor Atómico (${n})`,
      description: `Destruye defensas enemigas con Bombas Nucleares ${n} veces.`,
      target: n,
      evaluate: (c) => c.profile.stats.nukeDefensesBroken,
    });
  }

  for (const t of [20, 30, 40, 50, 60, 70, 85, 90, 95, 100]) {
    add({
      id: `nuke_tension_${t}`,
      category: 'nuclear',
      title: `Tensión Global al ${t}%`,
      description: `Lleva el nivel de tensión global hasta el ${t}% o superior.`,
      target: t,
      evaluate: (c) => Math.round(c.sim?.globalTension ?? 0),
    });
  }

  for (const n of [2, 3, 5, 10, 20]) {
    add({
      id: `nuke_in_war_${n}`,
      category: 'nuclear',
      title: `Disuasión en Combate (${n})`,
      description: `Detona ${n} Bombas Nucleares durante guerras activas.`,
      target: n,
      evaluate: (c) => c.profile.stats.nukeInWarLaunched,
    });
  }

  for (const n of [2, 3, 5, 10, 20]) {
    add({
      id: `nuke_reload_${n}`,
      category: 'nuclear',
      title: `Ciclo Nuclear (${n})`,
      description: `Completa ${n} lanzamientos tras recarga de silos nucleares.`,
      target: n,
      evaluate: (c) => c.profile.stats.nukeAfterCooldown,
    });
  }

  // ==================== 6. DIPLOMACIA (+60 -> 70 total) ====================
  for (const g of [2, 3, 5, 15, 20, 30, 50, 75, 100, 150, 200, 300, 500, 750, 1000]) {
    add({
      id: `dip_gift_${g}`,
      category: 'diplomacy',
      title: `Mecena Diplomático (${fmt(g)})`,
      description: `Envía ayuda económica diplomática ${fmt(g)} veces en total.`,
      target: g,
      evaluate: (c) => c.profile.stats.giftsSent,
    });
  }

  for (const a of [2, 4, 6, 7, 10, 12, 15, 18, 20, 25, 30, 40]) {
    add({
      id: `dip_ally_${a}`,
      category: 'diplomacy',
      title: `Alianza de ${a} Naciones`,
      description: `Mantén ${a} alianzas estratégicas activas al mismo tiempo.`,
      target: a,
      evaluate: (c) => c.alliesCount,
    });
  }

  for (const p of [2, 3, 8, 10, 15, 20, 30, 50, 75, 100]) {
    add({
      id: `dip_peace_${p}`,
      category: 'diplomacy',
      title: `Embajador de Paz (${p})`,
      description: `Firma ${p} tratados de paz acumulados en total.`,
      target: p,
      evaluate: (c) => c.profile.stats.peacesSigned,
    });
  }

  for (const h of [2, 3, 5, 8, 10, 15, 25, 40]) {
    add({
      id: `dip_help_${h}`,
      category: 'diplomacy',
      title: `Refuerzos Aliados (${h})`,
      description: `Solicita ayuda militar a tus aliados ${h} veces en total.`,
      target: h,
      evaluate: (c) => c.profile.stats.allyHelpsRequested,
    });
  }

  for (const r of [3, 5, 10, 15, 20, 30, 40, 50, 75, 100]) {
    add({
      id: `dip_good_rel_${r}`,
      category: 'diplomacy',
      title: `${r} Naciones Amigas`,
      description: `Mantén relación ≥ 70/100 con ${r} países simultáneamente.`,
      target: r,
      evaluate: (c) => c.goodRelCount,
    });
  }

  for (const r of [2, 3, 5, 10, 20]) {
    add({
      id: `dip_perf_rel_${r}`,
      category: 'diplomacy',
      title: `${r} Relaciones Perfectas`,
      description: `Alcanza relación 100/100 con ${r} países simultáneamente.`,
      target: r,
      evaluate: (c) => c.perfectRelCount,
    });
  }

  // ==================== 7. HISTORIA (+45 -> 55 total) ====================
  for (const t of [3, 5, 10, 15, 25, 40, 60, 80, 100, 150]) {
    add({
      id: `hist_tree_open_${t}`,
      category: 'history',
      title: `Archivista Real (${t})`,
      description: `Consulta el Árbol Genealógico ${t} veces en total.`,
      target: t,
      evaluate: (c) => c.profile.stats.treeOpened,
    });
  }

  for (const f of [2, 4, 5, 6, 8, 10, 12, 20, 25, 40, 50, 75, 100, 150, 250]) {
    add({
      id: `hist_focus_total_${f}`,
      category: 'history',
      title: `Cronología (${f} Hitos)`,
      description: `Completa ${f} hitos históricos acumulados entre tus partidas.`,
      target: f,
      evaluate: (c) => c.profile.stats.focusNodesCompletedTotal,
    });
  }

  for (const r of [2, 4, 6, 8, 10, 15, 20, 30, 50, 75]) {
    add({
      id: `hist_restore_distinct_${r}`,
      category: 'history',
      title: `Restaurador de ${r} Imperios`,
      description: `Restaura ${r} nombres históricos distintos entre tus partidas.`,
      target: r,
      evaluate: (c) => c.profile.stats.restoredNames.length,
    });
  }

  for (const n of [2, 4, 5]) {
    add({
      id: `hist_match_nodes_${n}`,
      category: 'history',
      title: `${n} Hitos en Campaña`,
      description: `Completa ${n} hitos del Árbol Genealógico en una misma partida.`,
      target: n,
      evaluate: (c) => c.player?.completedFocusIds.length ?? 0,
    });
  }

  for (const b of [2, 4, 6, 10]) {
    add({
      id: `hist_focus_inc_${b}`,
      category: 'history',
      title: `Reforma Económica (+$${b}/s)`,
      description: `Consigue +$${b}/seg de bonificación desde el Árbol Genealógico.`,
      target: b,
      evaluate: (c) => Math.round(c.player?.focusIncomeBonus ?? 0),
    });
  }

  for (const d of [5, 10, 15]) {
    add({
      id: `hist_focus_def_${d}`,
      category: 'history',
      title: `Doctrina Defensiva (+${d}%)`,
      description: `Consigue +${d}% de defensa desde el Árbol Genealógico.`,
      target: d,
      evaluate: (c) => Math.round(c.player?.focusDefenseBonus ?? 0),
    });
  }

  // ==================== 8. REBELIONES (+35 -> 45 total) ====================
  for (const s of [2, 3, 8, 10, 20, 30, 40, 50, 75, 100, 150, 250]) {
    add({
      id: `reb_suppress_${s}`,
      category: 'rebellion',
      title: `Orden Interno (${s})`,
      description: `Reprime focos rebeldes ${s} veces en total.`,
      target: s,
      evaluate: (c) => c.profile.stats.rebellionsSuppressed,
    });
  }

  for (const s of [2, 3, 5, 8, 10, 15, 25, 40]) {
    add({
      id: `reb_strong_${s}`,
      category: 'rebellion',
      title: `Puño de Acero (${s})`,
      description: `Reprime ${s} rebeliones de naciones fuertes (fuerza ≥ 60).`,
      target: s,
      evaluate: (c) => c.profile.stats.strongRebellionSuppressed,
    });
  }

  for (const o of [1, 2, 3, 4, 8, 10, 20, 30, 50, 75]) {
    add({
      id: `reb_occ_${o}`,
      category: 'rebellion',
      title: `Administración de ${o} ${o === 1 ? 'Provincia' : 'Provincias'}`,
      description: `Mantén ${o} ${o === 1 ? 'país anexado' : 'países anexados'} bajo tu administración simultánea.`,
      target: o,
      evaluate: (c) => c.occupiedCount,
    });
  }

  for (const b of [1, 3, 5, 10, 20]) {
    add({
      id: `reb_barracks_cover_${b}`,
      category: 'rebellion',
      title: `Guarnición Pacificadora (${b})`,
      description: `Cubre ${b} ${b === 1 ? 'territorio anexado' : 'territorios anexados'} con el radio de tus Cuarteles Militares.`,
      target: b,
      evaluate: (c) => c.occupiedCoveredByBarracks,
    });
  }

  // ==================== 9. SUPERVIVENCIA Y TIEMPO (+55 -> 65 total) ====================
  const years = [
    2028, 2029, 2031, 2032, 2033, 2034, 2036, 2038, 2040, 2042, 2050, 2055, 2065, 2070, 2075, 2080,
    2090, 2100, 2125, 2150,
  ];
  for (const yr of years) {
    add({
      id: `time_year_${yr}`,
      category: 'timeline',
      title: `Horizonte ${yr}`,
      description: `Sobrevive con tu nación hasta el año ${yr}.`,
      target: yr,
      evaluate: (c) => (c.player?.alive && c.sim ? c.sim.year : 0),
    });
  }

  for (const ev of [2, 3, 4, 8, 10, 20, 25, 35, 50, 75, 100, 150, 200, 300, 500]) {
    add({
      id: `time_event_${ev}`,
      category: 'timeline',
      title: `Decisiones de Estado (${ev})`,
      description: `Resuelve ${ev} Eventos Históricos en total.`,
      target: ev,
      evaluate: (c) => c.profile.stats.eventsResolved,
    });
  }

  const playSecondsList = [
    60, 120, 600, 900, 1200, 2700, 3600, 5400, 7200, 10800, 18000, 28800, 36000, 72000, 180000,
  ];
  for (const sec of playSecondsList) {
    const durLabel = fmtDuration(sec);
    add({
      id: `time_play_${sec}`,
      category: 'timeline',
      title: `Campaña de ${durLabel}`,
      description: `Acumula ${durLabel} (${fmt(sec)} seg) jugando partidas.`,
      target: sec,
      evaluate: (c) => Math.floor(c.profile.stats.totalPlaySeconds),
    });
  }

  for (const sec of [300, 600, 1200, 1800, 3600]) {
    const durLabel = fmtDuration(sec);
    add({
      id: `time_match_${sec}`,
      category: 'timeline',
      title: `Sesión Maratónica (${durLabel})`,
      description: `Juega una misma partida durante ${durLabel} continuos.`,
      target: sec,
      evaluate: (c) => Math.floor(c.sim?.elapsedSeconds ?? 0),
    });
  }

  // ==================== 10. MODO DIFÍCIL (50 logros) ====================
  add({
    id: 'hard_enter',
    category: 'hardmode',
    title: 'Bautismo en Modo Difícil',
    description: 'Inicia una partida en el Modo Difícil.',
    target: 1,
    evaluate: (c) => Math.max(c.profile.stats.hardModePlayed, c.isHard ? 1 : 0),
  });

  for (const yr of [2027, 2028, 2030, 2035, 2045]) {
    add({
      id: `hard_year_${yr}`,
      category: 'hardmode',
      title: `Superviviente Difícil ${yr}`,
      description: `Sobrevive hasta el año ${yr} jugando en Modo Difícil.`,
      target: yr,
      evaluate: (c) => (c.isHard && c.player?.alive && c.sim ? c.sim.year : 0),
    });
  }

  for (const n of [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 75, 100]) {
    add({
      id: `hard_annex_${n}`,
      category: 'hardmode',
      title: `Conquista Difícil (${n})`,
      description: `Absorbe ${n} ${n === 1 ? 'país' : 'países'} en una misma partida de Modo Difícil.`,
      target: n,
      evaluate: (c) => (c.isHard ? c.annexedCount : 0),
    });
  }

  for (const a of [10000, 15000, 20000, 30000, 50000, 75000, 100000, 150000]) {
    add({
      id: `hard_army_${a}`,
      category: 'hardmode',
      title: `Legión Difícil (${fmt(a)})`,
      description: `Alcanza ${fmt(a)} soldados en el Modo Difícil.`,
      target: a,
      evaluate: (c) => (c.isHard ? Math.round(c.player?.army ?? 0) : 0),
    });
  }

  for (const m of [5000, 10000, 25000, 50000, 100000, 250000]) {
    add({
      id: `hard_money_${m}`,
      category: 'hardmode',
      title: `Tesoro Difícil ($${fmt(m)})`,
      description: `Acumula $${fmt(m)} en tu tesoro jugando en Modo Difícil.`,
      target: m,
      evaluate: (c) => (c.isHard ? Math.round(c.player?.money ?? 0) : 0),
    });
  }

  for (const inc of [100, 250, 500, 1000, 2000]) {
    add({
      id: `hard_inc_${inc}`,
      category: 'hardmode',
      title: `Economía Difícil (+$${fmt(inc)}/s)`,
      description: `Consigue +$${fmt(inc)}/seg de ingreso neto en Modo Difícil.`,
      target: inc,
      evaluate: (c) => (c.isHard ? Math.max(0, Math.round(c.player?.netIncome ?? 0)) : 0),
    });
  }

  add({
    id: 'hard_def_3',
    category: 'hardmode',
    title: 'Trincheras en Difícil (3)',
    description: 'Mantén 3 Defensas activas en Modo Difícil.',
    target: 3,
    evaluate: (c) => (c.isHard ? c.player?.defenses.length ?? 0 : 0),
  });
  add({
    id: 'hard_def_8',
    category: 'hardmode',
    title: 'Bastión en Difícil (8)',
    description: 'Mantén 8 Defensas activas en Modo Difícil.',
    target: 8,
    evaluate: (c) => (c.isHard ? c.player?.defenses.length ?? 0 : 0),
  });
  add({
    id: 'hard_antinuke_1',
    category: 'hardmode',
    title: 'Escudo Nuclear Difícil',
    description: 'Construye 1 Antibombas ($20.000) en Modo Difícil.',
    target: 1,
    evaluate: (c) => (c.isHard ? c.player?.antiNukes.length ?? 0 : 0),
  });
  add({
    id: 'hard_antinuke_3',
    category: 'hardmode',
    title: 'Cúpula de Hierro Difícil',
    description: 'Mantén 3 Antibombas activos en Modo Difícil.',
    target: 3,
    evaluate: (c) => (c.isHard ? c.player?.antiNukes.length ?? 0 : 0),
  });
  add({
    id: 'hard_barracks_2',
    category: 'hardmode',
    title: 'Cuarteles de Élite (2)',
    description: 'Mantén 2 Cuarteles Militares ($5.000) en Modo Difícil.',
    target: 2,
    evaluate: (c) => (c.isHard ? c.player?.barracks.length ?? 0 : 0),
  });
  add({
    id: 'hard_barracks_5',
    category: 'hardmode',
    title: 'Fortaleza de Cuarteles (5)',
    description: 'Mantén 5 Cuarteles Militares activos en Modo Difícil.',
    target: 5,
    evaluate: (c) => (c.isHard ? c.player?.barracks.length ?? 0 : 0),
  });
  add({
    id: 'hard_mines_10',
    category: 'hardmode',
    title: 'Minería de Guerra (10)',
    description: 'Construye 10 Minas de Oro en Modo Difícil.',
    target: 10,
    evaluate: (c) => (c.isHard ? c.player?.goldMines ?? 0 : 0),
  });
  add({
    id: 'hard_cities_15',
    category: 'hardmode',
    title: 'Metrópolis de Guerra (15)',
    description: 'Construye 15 Ciudades en Modo Difícil.',
    target: 15,
    evaluate: (c) => (c.isHard ? c.player?.cities ?? 0 : 0),
  });

  add({
    id: 'hard_ally_1',
    category: 'hardmode',
    title: 'Pacto en la Tormenta',
    description: 'Consigue 1 alianza diplomática en Modo Difícil.',
    target: 1,
    evaluate: (c) => (c.isHard ? c.alliesCount : 0),
  });
  add({
    id: 'hard_ally_3',
    category: 'hardmode',
    title: 'Eje de Hierro',
    description: 'Mantén 3 alianzas simultáneas en Modo Difícil.',
    target: 3,
    evaluate: (c) => (c.isHard ? c.alliesCount : 0),
  });
  add({
    id: 'hard_wars_3',
    category: 'hardmode',
    title: 'Infierno en 3 Frentes',
    description: 'Combate en 3 guerras simultáneas en Modo Difícil.',
    target: 3,
    evaluate: (c) => (c.isHard ? c.enemiesCount : 0),
  });
  add({
    id: 'hard_rank_1',
    category: 'hardmode',
    title: 'Potencia #1 en Difícil',
    description: 'Alcanza el ejército más grande del planeta en Modo Difícil.',
    target: 1,
    evaluate: (c) => (c.isHard && c.armyRank === 1 ? 1 : 0),
  });
  add({
    id: 'hard_victory',
    category: 'hardmode',
    title: 'Conquistador Imposible',
    description: 'Gana una campaña completa en Modo Difícil.',
    target: 1,
    evaluate: (c) => {
      const wonHardNow = c.isHard && c.sim?.outcome === 'victory' ? 1 : 0;
      return Math.max(c.profile.stats.hardModeVictories, wonHardNow);
    },
  });

  // ==================== 11. 195 NACIONES DEL MUNDO (245 logros) ====================
  // 195 individual sovereign nation achievements (one per country in COUNTRIES_195)
  for (const country of COUNTRIES_195) {
    add({
      id: `nation_play_${country.iso2.toLowerCase()}`,
      category: 'nations',
      title: `Bandera de ${country.name}`,
      description: `Comanda una campaña dirigiendo a ${country.name} (${country.capital}, ${country.continent}).`,
      target: 1,
      evaluate: (c) =>
        c.profile.stats.playedCountries.includes(country.iso2) ||
        c.player?.seed.iso2 === country.iso2
          ? 1
          : 0,
    });
  }

  // +18 Played countries collection milestones
  for (const n of [2, 3, 8, 10, 12, 20, 25, 30, 40, 50, 60, 75, 90, 100, 125, 150, 175, 195]) {
    add({
      id: `nations_played_${n}`,
      category: 'nations',
      title: n === 195 ? 'Gobernante de las 195 Naciones' : `Coleccionista de ${n} Países`,
      description: `Juega campañas dirigiendo ${n} países diferentes del mundo.`,
      target: n,
      evaluate: (c) => c.profile.stats.playedCountries.length,
    });
  }

  // +4 Continents played milestones
  for (const cnt of [2, 3, 4, 5]) {
    add({
      id: `nations_continents_${cnt}`,
      category: 'nations',
      title: cnt === 5 ? 'Cinco Continentes' : `Presencia en ${cnt} Continentes`,
      description: `Dirige países pertenecientes a ${cnt} continentes distintos.`,
      target: cnt,
      evaluate: (c) => c.profile.stats.playedContinents.length,
    });
  }

  // +24 Continental annexation achievements
  const continentPlan: Array<{ cont: Continent; key: string; targets: number[] }> = [
    { cont: 'América', key: 'am', targets: [1, 3, 5, 10, 20] },
    { cont: 'Europa', key: 'eu', targets: [1, 3, 5, 10, 20] },
    { cont: 'Asia', key: 'as', targets: [1, 3, 5, 10, 20] },
    { cont: 'África', key: 'af', targets: [1, 3, 5, 10, 20] },
    { cont: 'Oceanía', key: 'oc', targets: [1, 3, 5, 10] },
  ];
  for (const plan of continentPlan) {
    for (const t of plan.targets) {
      add({
        id: `nations_annex_${plan.key}_${t}`,
        category: 'nations',
        title: `Campaña en ${plan.cont} (${t})`,
        description: `Absorbe ${t} ${t === 1 ? 'país' : 'países'} de ${plan.cont} en una misma partida.`,
        target: t,
        evaluate: (c) => c.annexedByContinent[plan.cont] ?? 0,
      });
    }
  }

  // +4 Small nation rise milestones
  for (const a of [500, 2500, 5000, 10000]) {
    add({
      id: `nations_small_army_${a}`,
      category: 'nations',
      title: `Pequeño Gigante (${fmt(a)})`,
      description: `Alcanza ${fmt(a)} soldados dirigiendo un país pequeño (fuerza ≤ 30).`,
      target: a,
      evaluate: (c) => (!c.player || c.playerStrength > 30 ? 0 : Math.round(c.player.army)),
    });
  }

  // ==================== 12. MUNDO, ONLINE Y MAESTRÍA (+60 -> 70 total) ====================
  // +15 Online milestones
  for (const m of [2, 3, 5, 10, 15, 25, 50]) {
    add({
      id: `world_online_matches_${m}`,
      category: 'world',
      title: `Veterano Online (${m})`,
      description: `Participa en ${m} partidas del modo Multijugador Online.`,
      target: m,
      evaluate: (c) => c.profile.stats.onlineMatchesPlayed,
    });
  }
  for (const r of [3, 5, 10, 25]) {
    add({
      id: `world_online_rebel_rec_${r}`,
      category: 'world',
      title: `Guerrilla Online (${r})`,
      description: `Recauda ejército rebelde ${r} veces en partidas Online.`,
      target: r,
      evaluate: (c) => c.profile.stats.onlineRebelRecruits,
    });
  }
  for (const r of [2, 3, 5, 10]) {
    add({
      id: `world_online_rebel_start_${r}`,
      category: 'world',
      title: `Libertador Online (${r})`,
      description: `Inicia ${r} rebeliones de independencia en partidas Online.`,
      target: r,
      evaluate: (c) => c.profile.stats.onlineRebellionsStarted,
    });
  }

  // +20 Special strategic combo challenges
  add({
    id: 'combo_peaceful_rich',
    category: 'world',
    title: 'Paraíso Próspero',
    description: 'Acumula $10.000 sin estar en ninguna guerra activa.',
    target: 10000,
    evaluate: (c) => (c.player && c.enemiesCount === 0 ? Math.round(c.player.money) : 0),
  });
  add({
    id: 'combo_peaceful_army',
    category: 'world',
    title: 'Disuasión Pacífica',
    description: 'Mantén 5.000 soldados sin estar en guerra.',
    target: 5000,
    evaluate: (c) => (c.player && c.enemiesCount === 0 ? Math.round(c.player.army) : 0),
  });
  add({
    id: 'combo_peaceful_empire',
    category: 'world',
    title: 'Pax Imperial',
    description: 'Controla 5 países anexados mientras te encuentras en paz total.',
    target: 5,
    evaluate: (c) => (c.enemiesCount === 0 ? c.annexedCount : 0),
  });
  add({
    id: 'combo_infra_10',
    category: 'world',
    title: 'Fortaleza Económica',
    description: 'Posee al menos 10 Minas de Oro y 10 Ciudades a la vez.',
    target: 1,
    evaluate: (c) => (c.player && c.player.goldMines >= 10 && c.player.cities >= 10 ? 1 : 0),
  });
  add({
    id: 'combo_infra_20',
    category: 'world',
    title: 'Metrópoli Dorada',
    description: 'Posee al menos 20 Minas de Oro y 20 Ciudades a la vez.',
    target: 1,
    evaluate: (c) => (c.player && c.player.goldMines >= 20 && c.player.cities >= 20 ? 1 : 0),
  });
  add({
    id: 'combo_infra_max',
    category: 'world',
    title: 'Infraestructura al Máximo',
    description: 'Alcanza el límite de 40 Minas de Oro y 50 Ciudades simultáneamente.',
    target: 1,
    evaluate: (c) => (c.player && c.player.goldMines >= 40 && c.player.cities >= 50 ? 1 : 0),
  });
  add({
    id: 'combo_combined_arms',
    category: 'world',
    title: 'Fuerzas Combinadas',
    description: 'Mantén 5 Puertos, 5 Defensas y 1 Antibombas al mismo tiempo.',
    target: 1,
    evaluate: (c) =>
      c.player &&
      c.player.ports.length >= 5 &&
      c.player.defenses.length >= 5 &&
      c.player.antiNukes.length >= 1
        ? 1
        : 0,
  });
  add({
    id: 'combo_total_shield',
    category: 'world',
    title: 'Escudo Total',
    description: 'Mantén 5 Defensas, 3 Antibombas y 5 Cuarteles Militares a la vez.',
    target: 1,
    evaluate: (c) =>
      c.player &&
      c.player.defenses.length >= 5 &&
      c.player.antiNukes.length >= 3 &&
      c.player.barracks.length >= 5
        ? 1
        : 0,
  });
  add({
    id: 'combo_trident',
    category: 'world',
    title: 'Tridente Militar',
    description: 'Reúne 10.000 soldados, 5 Defensas y 3 Cuarteles simultáneamente.',
    target: 1,
    evaluate: (c) =>
      c.player &&
      c.player.army >= 10000 &&
      c.player.defenses.length >= 5 &&
      c.player.barracks.length >= 3
        ? 1
        : 0,
  });
  add({
    id: 'combo_armed_diplomat',
    category: 'world',
    title: 'Diplomático Armado',
    description: 'Mantén 5 Alianzas activas junto a un ejército de 5.000 soldados.',
    target: 1,
    evaluate: (c) => (c.player && c.alliesCount >= 5 && c.player.army >= 5000 ? 1 : 0),
  });
  add({
    id: 'combo_coalition_war',
    category: 'world',
    title: 'Coalición en Combate',
    description: 'Lucha en una guerra mientras cuentas con al menos 3 alianzas activas.',
    target: 1,
    evaluate: (c) => (c.enemiesCount >= 1 && c.alliesCount >= 3 ? 1 : 0),
  });
  add({
    id: 'combo_stable_empire',
    category: 'world',
    title: 'Soberano Estable',
    description: 'Controla 10 países anexados con la rebeldía máxima por debajo del 30%.',
    target: 1,
    evaluate: (c) => (c.occupiedCount >= 10 && c.maxOccupiedUnrest < 30 ? 1 : 0),
  });
  add({
    id: 'combo_blitz_2026',
    category: 'world',
    title: 'Ofensiva Relámpago 2026',
    description: 'Absorbe 3 países antes de llegar al año 2027.',
    target: 3,
    evaluate: (c) => (c.sim && c.sim.year < 2027 ? c.annexedCount : 0),
  });
  add({
    id: 'combo_blitz_2030',
    category: 'world',
    title: 'Conquista Relámpago',
    description: 'Absorbe 10 países antes del año 2030.',
    target: 10,
    evaluate: (c) => (c.sim && c.sim.year < 2030 ? c.annexedCount : 0),
  });
  add({
    id: 'combo_early_superpower',
    category: 'world',
    title: 'Superpotencia Temprana',
    description: 'Alcanza 5.000 soldados antes del año 2028.',
    target: 5000,
    evaluate: (c) => (c.sim && c.sim.year < 2028 && c.player ? Math.round(c.player.army) : 0),
  });
  add({
    id: 'combo_early_tycoon',
    category: 'world',
    title: 'Magnate Temprano',
    description: 'Alcanza +$150/seg de ingreso neto antes del año 2029.',
    target: 150,
    evaluate: (c) =>
      c.sim && c.sim.year < 2029 && c.player ? Math.max(0, Math.round(c.player.netIncome)) : 0,
  });
  add({
    id: 'combo_balance',
    category: 'world',
    title: 'Equilibrio Imperial',
    description: 'Mantén al menos $20.000 de tesoro y 10.000 soldados simultáneamente.',
    target: 1,
    evaluate: (c) => (c.player && c.player.money >= 20000 && c.player.army >= 10000 ? 1 : 0),
  });
  add({
    id: 'combo_world_flames',
    category: 'world',
    title: 'Mundo en Llamas',
    description: 'Presencia al menos 10 guerras simultáneas activas en el planeta.',
    target: 10,
    evaluate: (c) => c.worldWarsCount,
  });
  add({
    id: 'combo_world_war',
    category: 'world',
    title: 'Guerra Mundial',
    description: 'Presencia al menos 25 guerras simultáneas activas en el planeta.',
    target: 25,
    evaluate: (c) => c.worldWarsCount,
  });
  add({
    id: 'combo_world_peace',
    category: 'world',
    title: 'Paz Planetaria',
    description: 'Llega a un día sin ninguna guerra activa en todo el planeta (tras el día 30).',
    target: 1,
    evaluate: (c) => (c.sim && c.sim.totalDays >= 30 && c.worldWarsCount === 0 ? 1 : 0),
  });

  // +25 Meta-progression achievements (culminating in #1000!)
  const metaMilestones: Array<[number, string]> = [
    [1, 'Primer Logro Desbloqueado'],
    [5, 'Iniciado Estratégico'],
    [10, 'Decena de Logros'],
    [15, 'Quince Medallas'],
    [20, 'Veinte Hazañas'],
    [25, 'Cuarto de Centena'],
    [35, 'Treinta y Cinco Logros'],
    [75, 'Setenta y Cinco Logros'],
    [100, 'Centurión de Logros (100)'],
    [125, 'Colección de 125 Logros'],
    [150, 'Ciento Cincuenta Logros'],
    [175, 'Ciento Setenta y Cinco'],
    [200, 'Doscientos Logros'],
    [250, 'Cuarto de Millar (250)'],
    [300, 'Trescientos Logros'],
    [350, 'Trescientos Cincuenta'],
    [400, 'Cuatrocientos Logros'],
    [450, 'Cuatrocientos Cincuenta'],
    [500, 'Medio Millar (500 Logros)'],
    [600, 'Seiscientos Logros'],
    [700, 'Setecientos Logros'],
    [750, 'Tres Cuartos de Millar'],
    [800, 'Ochocientos Logros'],
    [900, 'Novecientos Logros'],
    [999, 'Dios de Países en Guerra'],
  ];
  for (const [n, title] of metaMilestones) {
    const id = `meta_unlock_${n}`;
    add({
      id,
      category: 'world',
      title,
      description:
        n === 999
          ? 'Desbloquea los 999 logros restantes para completar los 1.000 logros del juego.'
          : `Desbloquea al menos ${fmt(n)} logros distintos en Países en Guerra.`,
      target: n,
      isMeta: true,
      evaluate: (c) => Object.keys(c.profile.unlocked).filter((k) => k !== id).length,
    });
  }

  return list.map((item, idx) => ({
    ...item,
    number: idx + 1,
  }));
}

export const ACHIEVEMENTS_1000: AchievementDef[] = buildAll1000Achievements();
export const ACHIEVEMENTS_100: AchievementDef[] = ACHIEVEMENTS_1000;
export const TOTAL_ACHIEVEMENTS = ACHIEVEMENTS_1000.length;

const NON_META_ACHIEVEMENTS = ACHIEVEMENTS_1000.filter((a) => !a.isMeta);
const META_ACHIEVEMENTS = ACHIEVEMENTS_1000.filter((a) => a.isMeta);

export function getAchievementProgress(
  ach: AchievementDef,
  profile: AchievementProfile,
  sim: SimulationState | null,
  precomputedCtx?: AchievementEvalContext
): AchievementProgress {
  if (profile.unlocked[ach.id]) {
    return { current: ach.target, target: ach.target };
  }
  const ctx = precomputedCtx ?? createAchievementEvalContext(profile, sim);
  const val = Math.max(0, Math.floor(ach.evaluate(ctx)));
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
  const player = sim ? sim.countries[sim.playerId] ?? null : null;
  if (sim && player) {
    if (!nextStats.playedContinents.includes(player.seed.continent)) {
      nextStats.playedContinents.push(player.seed.continent);
    }
    if (!nextStats.playedCountries.includes(player.seed.iso2)) {
      nextStats.playedCountries.push(player.seed.iso2);
    }
    if (sim.difficulty === 'hard') {
      nextStats.hardModePlayed = Math.max(1, nextStats.hardModePlayed);
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
    if (sim.chronicle.some((entry) => entry.text.includes('REBELIÓN DE INDEPENDENCIA'))) {
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
      if (sim.difficulty === 'hard') {
        nextStats.hardModeVictories = Math.max(1, nextStats.hardModeVictories);
      }
    }
  }

  const workingProfile: AchievementProfile = {
    unlocked: nextUnlocked,
    stats: nextStats,
  };

  const ctx = createAchievementEvalContext(workingProfile, sim);
  if (ctx.annexedCount > nextStats.totalAnnexed) {
    nextStats.totalAnnexed = ctx.annexedCount;
  }

  const newlyUnlocked: AchievementDef[] = [];
  for (const ach of NON_META_ACHIEVEMENTS) {
    if (nextUnlocked[ach.id]) continue;
    if (ach.evaluate(ctx) >= ach.target) {
      nextUnlocked[ach.id] = now;
      newlyUnlocked.push(ach);
    }
  }

  // Cascade meta achievements (up to 3 passes so thresholds unlock cleanly in one evaluation)
  for (let pass = 0; pass < 3; pass++) {
    let unlockedInPass = false;
    ctx.unlockedTotal = Object.keys(nextUnlocked).length;
    for (const ach of META_ACHIEVEMENTS) {
      if (nextUnlocked[ach.id]) continue;
      if (ach.evaluate(ctx) >= ach.target) {
        nextUnlocked[ach.id] = now;
        newlyUnlocked.push(ach);
        unlockedInPass = true;
      }
    }
    if (!unlockedInPass) break;
  }

  return {
    updatedProfile: workingProfile,
    newlyUnlocked,
  };
}
