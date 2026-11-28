import { COUNTRIES_195, type CountrySeed } from '../data/countries195';
import {
  getCountryGenealogyTree,
  type FocusNode,
} from '../data/countryTrees';
import {
  BILATERAL_PRESETS,
  BLOC_AFFINITY,
  getCountryBloc,
} from '../data/diplomaticPresets';
import {
  HISTORICAL_EVENTS,
  type EventChoice,
  type HistoricalEventTemplate,
} from '../data/historicalEvents';
import {
  MAP_H,
  MAP_W,
  TOTAL_PIXELS,
  buildWorldMapData,
  type WorldMapData,
} from './mapRasterizer';
import { soundEngine } from './soundEngine';
import type {
  AppliedMeetingResult,
  DiplomaticMeetingOutcome,
} from '../types/diplomacy';

export const MIN_MEETING_RELATION = 20;

export const N_COUNTRIES = COUNTRIES_195.length; // 195

export const TREATY_WAR = 1;
export const TREATY_ALLIANCE = 2;

export type MapMode = 'political' | 'diplomatic';
export type AiDoctrine = 'expansionist' | 'diplomatic';

export interface PortCoord {
  x: number;
  y: number;
  nx: number; // outward ocean normal X
  ny: number; // outward ocean normal Y
}

export interface DefenseCoord {
  x: number;
  y: number;
  radius: number;
}

export interface NukeStrikeRecord {
  id: number;
  x: number;
  y: number;
  radius: number;
  totalDays: number;
}

export interface NukeInterceptRecord {
  id: number;
  defenderId: number;
  attackerId: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  totalDays: number;
}

export interface CountryState {
  id: number;
  seed: CountrySeed;
  alive: boolean;
  pixels: number;
  initialPixels: number;
  capitalX: number;
  capitalY: number;
  capitalLostPenaltyDone: boolean;
  money: number;
  netIncome: number;
  monthlyIncomeBonus: number;
  army: number;
  goldMines: number;
  cities: number;
  goldMinePurchases: number;
  cityPurchases: number;
  goldMinesBuiltThisMonth: number;
  citiesBuiltThisMonth: number;
  ports: PortCoord[];
  defenses: DefenseCoord[];
  antiNukes: DefenseCoord[];
  barracks: DefenseCoord[];
  aggressiveExpansion: number;
  aiDoctrine: AiDoctrine;
  color: [number, number, number];
  bboxMinX: number;
  bboxMaxX: number;
  bboxMinY: number;
  bboxMaxY: number;
  annexedById: number | null;
  customName: string | null;
  completedFocusIds: string[];
  focusIncomeBonus: number;
  focusArmyCapBonus: number;
  focusDefenseBonus: number;
  nukeCooldownDays: number;
  lastNukeStrike: NukeStrikeRecord | null;
  rebelUnrest: number; // 0..100 acumulado mientras está anexado
}

export interface BattleParticle {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
}

export interface NavalInvasion {
  id: number;
  attackerId: number;
  defenderId: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0..100
}

export interface ChronicleEntry {
  id: number;
  dateLabel: string;
  type: 'war' | 'peace' | 'alliance' | 'event' | 'annex' | 'capital';
  text: string;
  focusCountryId?: number;
}

export interface PendingDiplomaticProposal {
  id: number;
  fromId: number;
  type: 'alliance' | 'peace';
}

export interface ActiveEventModal {
  template: HistoricalEventTemplate;
  dateLabel: string;
}

export interface PlayerHistoryPoint {
  label: string;
  dateLabel: string;
  elapsedSeconds: number;
  money: number;
  netIncome: number;
  army: number;
  km2: number;
}

export interface HumanPlayerSlot {
  uid: string;
  displayName: string;
  photoUrl?: string;
  countryId: number;
  rebelMoney: number;
  rebelArmy: number;
}

export interface HumanDiplomaticOffer {
  id: number;
  fromCountryId: number;
  toCountryId: number;
  type: 'alliance' | 'peace' | 'alliance_help';
}

export type GameDifficulty = 'normal' | 'hard';

export interface SimulationState {
  playerId: number;
  difficulty: GameDifficulty;
  isMultiplayer: boolean;
  winnerCountryId: number | null;
  humanPlayers: Record<number, HumanPlayerSlot>;
  diplomaticOffers: HumanDiplomaticOffer[];
  day: number; // 1..30
  month: number; // 1..12
  year: number; // 2026+
  totalDays: number;
  elapsedSeconds: number;
  globalStability: number; // 0..100
  globalTension: number; // 0..100
  countries: CountryState[];
  ownerGrid: Int16Array;
  mapData: WorldMapData;
  relations: Uint8Array; // N*N: 1..100
  treaties: Uint8Array; // N*N bitmask (WAR, ALLIANCE)
  truceMonths: Int16Array; // N*N
  wars: Array<{ a: number; b: number; startTotalDays: number }>;
  invasions: NavalInvasion[];
  nukeIntercepts: NukeInterceptRecord[];
  particles: BattleParticle[];
  chronicle: ChronicleEntry[];
  playerHistory: PlayerHistoryPoint[];
  activeEvent: ActiveEventModal | null;
  pendingProposal: PendingDiplomaticProposal | null;
  outcome: 'none' | 'victory' | 'defeat';
  sandboxAfterVictory: boolean;
  dirtyPixels: boolean;
  nextEventDay: number;
  nextIdCounter: number;
  aiCursor: number;
  lastAiWarMonth: number;
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export const GOLD_MINE_COST = 120;
export const GOLD_MINE_PRICE_STEP = 30;
export const GOLD_MINE_INCOME = 2; // +$2 cada segundo
export const HARD_GOLD_MINE_COST = 200;
export const HARD_GOLD_MINE_PRICE_STEP = 50;
export const HARD_GOLD_MINE_INCOME = 50; // +$50 cada segundo en Modo Difícil
export const CITY_COST = 180;
export const CITY_PRICE_STEP = 45;
export const CITY_INCOME = 3; // +$3 cada segundo (+120 capacidad militar)
export const HARD_CITY_COST = 500;
export const HARD_CITY_PRICE_STEP = 100;
export const HARD_CITY_INCOME = 100; // +$100 cada segundo en Modo Difícil
export const HARD_CITY_ARMY_CAP_BONUS = 450;
export const PORT_COST = 150;
export const ARMY_RECRUIT_COST = 100;
export const ARMY_RECRUIT_AMOUNT = 25;
export const HARD_ARMY_RECRUIT_COST = 100;
export const HARD_ARMY_RECRUIT_AMOUNT = 50;
export const HARD_AI_ARMY_PER_SECOND = 50;
export const HARD_PLAYER_ARMY_PER_SECOND = 25;
export const GIFT_MONEY_PER_REL = 100;
export const HARD_GIFT_MONEY_PER_REL = 200;
export const ALLIANCE_REL_THRESHOLD = 70; // escala 1..100
export const HARD_ALLIANCE_REL_THRESHOLD = 82;
export const MAX_WAR_DAYS = 3 * 12 * 30; // 3 años máximos por guerra (1080 días)
export const MIN_INITIAL_ARMY = 350;
export const MAX_INITIAL_ARMY = 1400;
export const HARD_MIN_INITIAL_ARMY = 5000;
export const HARD_MAX_INITIAL_ARMY = 20000;
export const MONTHLY_INCOME_GROWTH = 1; // +$1/seg acumulado cada año (máx. +10)
export const MAX_MONTHLY_INCOME_BONUS = 10;
export const MAX_GOLD_MINES_PER_MONTH = 1;
export const MAX_CITIES_PER_MONTH = 2;
export const MAX_GOLD_MINES_TOTAL = 40;
export const MAX_CITIES_TOTAL = 50;
export const DEFENSE_COST = 120;
export const DEFENSE_RADIUS = 24; // radio de alcance en el mapa
export const DEFENSE_BONUS_PCT = 10; // +10% defensa del país por cada defensa
export const ANTI_NUKE_COST = 10000;
export const HARD_ANTI_NUKE_COST = 20000;
export const ANTI_NUKE_RADIUS = 36; // radar más grande que la defensa (360 km vs 240 km)
export const BARRACKS_COST = 1000;
export const HARD_BARRACKS_COST = 5000;
export const BARRACKS_ARMY_CAP_BONUS = 500; // +500 capacidad militar por cada Cuartel Militar
export const BARRACKS_RADIUS = Math.round(ANTI_NUKE_RADIUS * 1.5); // 54 (540 km: 50% más grande que el Antibombas)
export const BARRACKS_REBELLION_REDUCTION = 0.5; // -50% rebeldía solo en la zona cubierta por el cuartel
export const NUKE_COST = 30000;
export const AI_NUKE_COST = 10000;
export const NUKE_RADIUS = 19; // un poco menos radio que la defensa (24 -> 19)
export const NUKE_COOLDOWN_DAYS = 90; // 3 meses de recarga entre lanzamientos
export const NUKE_FALLOUT_DAYS = 60; // 2 meses de zona irradiada visible
export const REBEL_RECRUIT_COST = 100;
export const REBEL_RECRUIT_AMOUNT = 35;
export const REBEL_INCOME_PER_SECOND = 60;
export const SUPPRESS_REBELLION_COST = 150;
export const SUPPRESS_REBELLION_REDUCTION = 45;

export function isHumanCountry(sim: SimulationState, countryId: number): boolean {
  return Boolean(sim.humanPlayers[countryId]);
}

export function getNukeCost(sim: SimulationState, countryId: number): number {
  const isPlayer = countryId === sim.playerId || isHumanCountry(sim, countryId);
  return isPlayer ? NUKE_COST : AI_NUKE_COST;
}

export function getAntiNukeCost(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_ANTI_NUKE_COST : ANTI_NUKE_COST;
}

export function getBarracksCost(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_BARRACKS_COST : BARRACKS_COST;
}

export function getGoldMineIncome(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_GOLD_MINE_INCOME : GOLD_MINE_INCOME;
}

export function getCityIncome(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_CITY_INCOME : CITY_INCOME;
}

export function getCityArmyCapBonus(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_CITY_ARMY_CAP_BONUS : 120;
}

export function getArmyRecruitCost(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_ARMY_RECRUIT_COST : ARMY_RECRUIT_COST;
}

export function getArmyRecruitAmount(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_ARMY_RECRUIT_AMOUNT : ARMY_RECRUIT_AMOUNT;
}

export function getAllianceRelThreshold(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_ALLIANCE_REL_THRESHOLD : ALLIANCE_REL_THRESHOLD;
}

export function getGiftMoneyPerRel(difficulty: GameDifficulty = 'normal'): number {
  return difficulty === 'hard' ? HARD_GIFT_MONEY_PER_REL : GIFT_MONEY_PER_REL;
}

export function computeInitialMoney(
  seedGdp: number,
  seedMilitary: number,
  difficulty: GameDifficulty = 'normal'
): number {
  if (difficulty === 'hard') {
    return Math.round(900 + Math.sqrt(Math.max(0, seedGdp)) * 22 + seedMilitary * 7);
  }
  return Math.round(100 + Math.sqrt(Math.max(0, seedGdp)) * 3.0 + seedMilitary * 0.65);
}

export function computeInitialArmy(
  seedMilitary: number,
  difficulty: GameDifficulty = 'normal'
): number {
  const t = Math.max(0, Math.min(1, (seedMilitary - 1) / (240 - 1)));
  if (difficulty === 'hard') {
    return Math.round(HARD_MIN_INITIAL_ARMY + t * (HARD_MAX_INITIAL_ARMY - HARD_MIN_INITIAL_ARMY));
  }
  return Math.round(MIN_INITIAL_ARMY + t * (MAX_INITIAL_ARMY - MIN_INITIAL_ARMY));
}

export function getCountryName(c: CountryState | undefined | null): string {
  if (!c) return 'País';
  return c.customName && c.customName.trim().length > 0 ? c.customName : c.seed.name;
}

export function getArmyCap(c: CountryState, difficulty: GameDifficulty = 'normal'): number {
  if (difficulty === 'hard') {
    return Math.round(
      18000 +
        c.cities * HARD_CITY_ARMY_CAP_BONUS +
        (c.barracks?.length ?? 0) * BARRACKS_ARMY_CAP_BONUS +
        Math.sqrt(Math.max(1, c.pixels)) * 480 +
        (c.focusArmyCapBonus ?? 0) * 3
    );
  }
  return Math.round(
    900 +
      c.cities * 120 +
      (c.barracks?.length ?? 0) * BARRACKS_ARMY_CAP_BONUS +
      Math.sqrt(Math.max(1, c.pixels)) * 135 +
      (c.focusArmyCapBonus ?? 0)
  );
}

export function getMoneyCap(c: CountryState, difficulty: GameDifficulty = 'normal'): number {
  if (difficulty === 'hard') {
    return Math.round(160000 + c.cities * 8000 + Math.sqrt(Math.max(1, c.pixels)) * 3500);
  }
  return Math.round(35000 + c.cities * 2200 + Math.sqrt(Math.max(1, c.pixels)) * 1200);
}

export function getGoldMineCost(c: CountryState, difficulty: GameDifficulty = 'normal'): number {
  if (difficulty === 'hard') {
    return HARD_GOLD_MINE_COST + c.goldMinePurchases * HARD_GOLD_MINE_PRICE_STEP;
  }
  return GOLD_MINE_COST + c.goldMinePurchases * GOLD_MINE_PRICE_STEP;
}

export function getCityCost(c: CountryState, difficulty: GameDifficulty = 'normal'): number {
  if (difficulty === 'hard') {
    return HARD_CITY_COST + c.cityPurchases * HARD_CITY_PRICE_STEP;
  }
  return CITY_COST + c.cityPurchases * CITY_PRICE_STEP;
}

export function getCountryDefensePct(c: CountryState): number {
  return Math.min(140, c.defenses.length * DEFENSE_BONUS_PCT + (c.focusDefenseBonus ?? 0));
}

export function isPixelProtectedByDefense(c: CountryState, px: number, py: number): boolean {
  for (const d of c.defenses) {
    const dx = px - d.x;
    const dy = py - d.y;
    if (dx * dx + dy * dy <= d.radius * d.radius) {
      return true;
    }
  }
  return false;
}

export function formatDate(month: number, year: number): string {
  return `${MONTH_NAMES[(month - 1) % 12]} ${year}`;
}

export function formatFullDate(day: number, month: number, year: number): string {
  return `${String(day).padStart(2, '0')} ${MONTH_NAMES[(month - 1) % 12]} ${year}`;
}

function idxPair(a: number, b: number): number {
  return a * N_COUNTRIES + b;
}

export function getRelation(sim: SimulationState, a: number, b: number): number {
  return sim.relations[idxPair(a, b)];
}

export function setRelation(sim: SimulationState, a: number, b: number, val: number) {
  const clamped = Math.max(1, Math.min(100, Math.round(val)));
  sim.relations[idxPair(a, b)] = clamped;
  sim.relations[idxPair(b, a)] = clamped;
}

export function addRelation(sim: SimulationState, a: number, b: number, delta: number) {
  setRelation(sim, a, b, getRelation(sim, a, b) + delta);
}

export function hasTreaty(sim: SimulationState, a: number, b: number, flag: number): boolean {
  return (sim.treaties[idxPair(a, b)] & flag) !== 0;
}

export function setTreatyFlag(sim: SimulationState, a: number, b: number, flag: number, active: boolean) {
  const p1 = idxPair(a, b);
  const p2 = idxPair(b, a);
  if (active) {
    sim.treaties[p1] |= flag;
    sim.treaties[p2] |= flag;
  } else {
    sim.treaties[p1] &= ~flag;
    sim.treaties[p2] &= ~flag;
  }
}

export function getAllies(sim: SimulationState, id: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < N_COUNTRIES; i++) {
    if (i !== id && sim.countries[i].alive && hasTreaty(sim, id, i, TREATY_ALLIANCE)) {
      res.push(i);
    }
  }
  return res;
}

export function getEnemies(sim: SimulationState, id: number): number[] {
  const res: number[] = [];
  for (let i = 0; i < N_COUNTRIES; i++) {
    if (i !== id && sim.countries[i].alive && hasTreaty(sim, id, i, TREATY_WAR)) {
      res.push(i);
    }
  }
  return res;
}

export function getTopRelations(
  sim: SimulationState,
  id: number,
  kind: 'good' | 'bad',
  limit = 6
): Array<{ id: number; rel: number }> {
  const list: Array<{ id: number; rel: number }> = [];
  for (let i = 0; i < N_COUNTRIES; i++) {
    if (i === id || !sim.countries[i].alive) continue;
    const rel = getRelation(sim, id, i);
    if (kind === 'good' ? rel >= 65 : rel <= 35) {
      list.push({ id: i, rel });
    }
  }
  list.sort((a, b) => (kind === 'good' ? b.rel - a.rel : a.rel - b.rel));
  return list.slice(0, limit);
}

export function pushChronicle(
  sim: SimulationState,
  type: ChronicleEntry['type'],
  text: string,
  focusCountryId?: number
) {
  const entry: ChronicleEntry = {
    id: sim.nextIdCounter++,
    dateLabel: formatDate(sim.month, sim.year),
    type,
    text,
  };
  if (typeof focusCountryId === 'number' && Number.isFinite(focusCountryId)) {
    entry.focusCountryId = focusCountryId;
  }
  sim.chronicle = [entry, ...sim.chronicle.slice(0, 69)];
}

export function getCoastalCandidates(sim: SimulationState, countryId: number): PortCoord[] {
  const { ownerGrid } = sim;
  const c = sim.countries[countryId];
  const minX = Math.max(1, c.bboxMinX);
  const maxX = Math.min(MAP_W - 2, c.bboxMaxX);
  const minY = Math.max(1, c.bboxMinY);
  const maxY = Math.min(MAP_H - 2, c.bboxMaxY);
  const coords: PortCoord[] = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * MAP_W + x;
      if (ownerGrid[idx] !== countryId) continue;
      let nx = 0;
      let ny = 0;
      if (ownerGrid[idx - 1] === -1) nx -= 1;
      if (ownerGrid[idx + 1] === -1) nx += 1;
      if (ownerGrid[idx - MAP_W] === -1) ny -= 1;
      if (ownerGrid[idx + MAP_W] === -1) ny += 1;
      if (nx !== 0 || ny !== 0) {
        const len = Math.hypot(nx, ny) || 1;
        coords.push({ x, y, nx: nx / len, ny: ny / len });
      }
    }
  }
  return coords;
}

export function hasCoast(sim: SimulationState, countryId: number): boolean {
  const { ownerGrid } = sim;
  const c = sim.countries[countryId];
  const minX = Math.max(1, c.bboxMinX);
  const maxX = Math.min(MAP_W - 2, c.bboxMaxX);
  const minY = Math.max(1, c.bboxMinY);
  const maxY = Math.min(MAP_H - 2, c.bboxMaxY);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * MAP_W + x;
      if (ownerGrid[idx] !== countryId) continue;
      if (
        ownerGrid[idx - 1] === -1 ||
        ownerGrid[idx + 1] === -1 ||
        ownerGrid[idx - MAP_W] === -1 ||
        ownerGrid[idx + MAP_W] === -1
      ) {
        return true;
      }
    }
  }
  return false;
}

function getDirectionalPort(
  sim: SimulationState,
  attackerId: number,
  targetId: number
): PortCoord | null {
  const att = sim.countries[attackerId];
  const def = sim.countries[targetId];
  if (att.ports.length === 0) return null;

  const dx = def.capitalX - att.capitalX;
  const dy = def.capitalY - att.capitalY;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  let bestPort: PortCoord | null = null;
  let bestDot = -2;
  for (const p of att.ports) {
    const dot = p.nx * dirX + p.ny * dirY;
    if (dot > bestDot) {
      bestDot = dot;
      bestPort = p;
    }
  }

  // If the nation is small/single-coast (few coastal candidates), any port works;
  // for multi-coast continental nations, require a port pointing generally toward the target direction
  if (bestDot >= -0.35 || att.pixels <= 560) {
    return bestPort;
  }
  return null;
}

export function canReachToAttack(
  sim: SimulationState,
  attackerId: number,
  defenderId: number
): { ok: boolean; viaSea: boolean; reason?: string } {
  if (sim.mapData.landNeighbors[attackerId].has(defenderId)) {
    return { ok: true, viaSea: false };
  }
  const att = sim.countries[attackerId];
  if (att.ports.length === 0) {
    return {
      ok: false,
      viaSea: true,
      reason: 'Necesitas construir un Puerto en tu costa para atacar por mar en esa dirección.',
    };
  }
  const dirPort = getDirectionalPort(sim, attackerId, defenderId);
  if (!dirPort) {
    return {
      ok: false,
      viaSea: true,
      reason: `Necesitas un Puerto orientado hacia la dirección de ${getCountryName(sim.countries[defenderId])}.`,
    };
  }
  return { ok: true, viaSea: true };
}

export interface CreateSimulationOptions {
  difficulty?: GameDifficulty;
  isMultiplayer?: boolean;
  humanSlots?: Array<{
    uid: string;
    displayName: string;
    photoUrl?: string;
    countryId: number;
  }>;
}

export function createSimulation(
  playerId: number,
  options?: CreateSimulationOptions
): SimulationState {
  const difficulty: GameDifficulty = options?.isMultiplayer ? 'normal' : (options?.difficulty ?? 'normal');
  const isHard = difficulty === 'hard';
  const mapData = buildWorldMapData();
  const ownerGrid = new Int16Array(mapData.ownerGrid);

  const countries: CountryState[] = COUNTRIES_195.map((seed) => {
    const px = mapData.initialPixelCounts[seed.id];
    const baseMoney = computeInitialMoney(seed.gdp, seed.military, difficulty);
    const startMoney = isHard && seed.id !== playerId ? Math.round(baseMoney * 1.25) : baseMoney;
    const startArmy = computeInitialArmy(seed.military, difficulty);

    return {
      id: seed.id,
      seed,
      alive: px > 0,
      pixels: px,
      initialPixels: Math.max(1, px),
      capitalX: mapData.capitalX[seed.id],
      capitalY: mapData.capitalY[seed.id],
      capitalLostPenaltyDone: false,
      money: startMoney,
      netIncome: 0,
      monthlyIncomeBonus: 0,
      army: startArmy,
      goldMines: Math.max(1, Math.min(5, Math.round(Math.sqrt(seed.gdp) / 28) + 1)),
      cities: Math.max(1, Math.min(6, Math.round(Math.sqrt(seed.popM) / 3.0) + 1)),
      goldMinePurchases: 0,
      cityPurchases: 0,
      goldMinesBuiltThisMonth: 0,
      citiesBuiltThisMonth: 0,
      ports: [],
      defenses: [],
      antiNukes: [],
      barracks: [],
      aggressiveExpansion: 0,
      aiDoctrine: isHard
        ? seed.id % 5 === 0
          ? 'diplomatic'
          : 'expansionist'
        : seed.military >= 65 && seed.id % 3 !== 0
          ? 'expansionist'
          : 'diplomatic',
      color: mapData.countryColors[seed.id],
      bboxMinX: MAP_W - 1,
      bboxMaxX: 0,
      bboxMinY: MAP_H - 1,
      bboxMaxY: 0,
      annexedById: null,
      customName: null,
      completedFocusIds: [],
      focusIncomeBonus: 0,
      focusArmyCapBonus: 0,
      focusDefenseBonus: 0,
      nukeCooldownDays: 0,
      lastNukeStrike: null,
      rebelUnrest: 0,
    };
  });

  for (let y = 0; y < MAP_H; y++) {
    const row = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      const id = ownerGrid[row + x];
      if (id >= 0) {
        const c = countries[id];
        if (x < c.bboxMinX) c.bboxMinX = x;
        if (x > c.bboxMaxX) c.bboxMaxX = x;
        if (y < c.bboxMinY) c.bboxMinY = y;
        if (y > c.bboxMaxY) c.bboxMaxY = y;
      }
    }
  }

  const relations = new Uint8Array(N_COUNTRIES * N_COUNTRIES);
  const treaties = new Uint8Array(N_COUNTRIES * N_COUNTRIES);
  const truceMonths = new Int16Array(N_COUNTRIES * N_COUNTRIES);
  const iso2ToId = new Map<string, number>(COUNTRIES_195.map((c) => [c.iso2, c.id]));

  if (isHard) {
    // Modo Difícil: todos los países comienzan con relaciones completamente neutrales (50/100)
    relations.fill(50);
  } else {
    const toRel100 = (rawScore: number) =>
      Math.max(1, Math.min(100, Math.round(50 + rawScore * 0.48)));

    const blocs = COUNTRIES_195.map((c) => getCountryBloc(c.iso2));
    for (let i = 0; i < N_COUNTRIES; i++) {
      for (let j = i + 1; j < N_COUNTRIES; j++) {
        const ci = COUNTRIES_195[i];
        const cj = COUNTRIES_195[j];
        let baseRel = BLOC_AFFINITY[blocs[i]][blocs[j]];
        if (ci.continent === cj.continent) baseRel += 8;
        if (mapData.landNeighbors[i].has(j) && baseRel < 22) baseRel -= 10;
        const noise = (((i * 31 + j * 17) % 25) - 12);
        const val = toRel100(Math.max(-75, Math.min(75, baseRel + noise)));
        relations[idxPair(i, j)] = val;
        relations[idxPair(j, i)] = val;
      }
    }

    for (const [isoA, isoB, score] of BILATERAL_PRESETS) {
      const a = iso2ToId.get(isoA);
      const b = iso2ToId.get(isoB);
      if (a !== undefined && b !== undefined) {
        const val = toRel100(score);
        relations[idxPair(a, b)] = val;
        relations[idxPair(b, a)] = val;
      }
    }

    // Ensure every country starts with both friendly partners and rivals (1..100 scale)
    for (let i = 0; i < N_COUNTRIES; i++) {
      let goodCount = 0;
      let badCount = 0;
      for (let j = 0; j < N_COUNTRIES; j++) {
        if (i === j) continue;
        const r = relations[idxPair(i, j)];
        if (r >= 68) goodCount++;
        if (r <= 32) badCount++;
      }
      if (goodCount < 3) {
        for (let k = 1; k <= 3 - goodCount; k++) {
          const partner = (i + k * 11) % N_COUNTRIES;
          if (partner !== i) {
            const val = Math.max(relations[idxPair(i, partner)], 70 + k * 4);
            relations[idxPair(i, partner)] = val;
            relations[idxPair(partner, i)] = val;
          }
        }
      }
      if (badCount < 2) {
        const neighbors = Array.from(mapData.landNeighbors[i]).filter(
          (nid) => relations[idxPair(i, nid)] < 60
        );
        const rivalPool = [...neighbors];
        for (let step = 1; rivalPool.length < 2 && step < N_COUNTRIES; step++) {
          const cand = (i + step * 29) % N_COUNTRIES;
          if (cand !== i && !rivalPool.includes(cand) && relations[idxPair(i, cand)] < 58) {
            rivalPool.push(cand);
          }
        }
        for (let k = 0; k < Math.min(2 - badCount, rivalPool.length); k++) {
          const rival = rivalPool[k];
          const val = Math.min(relations[idxPair(i, rival)], 30 - k * 5);
          relations[idxPair(i, rival)] = val;
          relations[idxPair(rival, i)] = val;
        }
      }
    }
  }

  const humanPlayers: Record<number, HumanPlayerSlot> = {};
  if (options?.humanSlots) {
    for (const s of options.humanSlots) {
      if (s.countryId >= 0 && s.countryId < N_COUNTRIES) {
        humanPlayers[s.countryId] = {
          uid: s.uid,
          displayName: s.displayName,
          ...(s.photoUrl ? { photoUrl: s.photoUrl } : {}),
          countryId: s.countryId,
          rebelMoney: 0,
          rebelArmy: 0,
        };
      }
    }
  }

  const sim: SimulationState = {
    playerId,
    difficulty,
    isMultiplayer: Boolean(options?.isMultiplayer),
    winnerCountryId: null,
    humanPlayers,
    diplomaticOffers: [],
    day: 1,
    month: 1,
    year: 2026,
    totalDays: 0,
    elapsedSeconds: 0,
    globalStability: isHard ? 66 : 76,
    globalTension: isHard ? 38 : 24,
    countries,
    ownerGrid,
    mapData,
    relations,
    treaties,
    truceMonths,
    wars: [],
    invasions: [],
    nukeIntercepts: [],
    particles: [],
    chronicle: [],
    playerHistory: [],
    activeEvent: null,
    pendingProposal: null,
    outcome: 'none',
    sandboxAfterVictory: false,
    dirtyPixels: true,
    nextEventDay: 110,
    nextIdCounter: 1,
    aiCursor: 0,
    lastAiWarMonth: -1,
  };

  // Seed a few initial realistic alliances only in Normal Mode
  if (!isHard) {
    const seedAlliance = (isoA: string, isoB: string, relBoost: number) => {
      const a = iso2ToId.get(isoA);
      const b = iso2ToId.get(isoB);
      if (a !== undefined && b !== undefined) {
        setTreatyFlag(sim, a, b, TREATY_ALLIANCE, true);
        addRelation(sim, a, b, relBoost);
      }
    };
    seedAlliance('US', 'GB', 15);
    seedAlliance('US', 'CA', 15);
    seedAlliance('FR', 'DE', 15);
    seedAlliance('ES', 'PT', 15);
    seedAlliance('AU', 'NZ', 15);
    seedAlliance('SA', 'AE', 15);
  }

  // Give major maritime powers 1 starting port so naval warfare can happen organically
  for (const iso of ['US', 'GB', 'FR', 'ES', 'JP', 'CN', 'BR', 'AU']) {
    const cid = iso2ToId.get(iso);
    if (cid !== undefined) {
      const cands = getCoastalCandidates(sim, cid);
      if (cands.length > 0) {
        countries[cid].ports.push(cands[Math.floor(cands.length / 2)]);
      }
    }
  }

  updateAllEconomies(sim, false);
  const p = countries[playerId];
  sim.playerHistory.push({
    label: '0s',
    dateLabel: formatFullDate(sim.day, sim.month, sim.year),
    elapsedSeconds: 0,
    money: Math.round(p.money),
    netIncome: Math.round(p.netIncome),
    army: Math.round(p.army),
    km2: p.pixels * 100,
  });
  pushChronicle(
    sim,
    'event',
    sim.isMultiplayer
      ? `¡Partida Online iniciada! Conquista los 195 países para ganar.`
      : isHard
        ? `¡MODO DIFÍCIL iniciado al mando de ${getCountryName(countries[playerId])}! Relaciones neutrales y potencias letales.`
        : `Campaña iniciada al mando de ${getCountryName(countries[playerId])}.`,
    playerId
  );

  return sim;
}

export function declareWar(
  sim: SimulationState,
  attackerId: number,
  defenderId: number
): { ok: boolean; error?: string } {
  if (attackerId === defenderId) return { ok: false, error: 'No puedes atacarte a ti mismo.' };
  const att = sim.countries[attackerId];
  const def = sim.countries[defenderId];
  if (!att.alive || !def.alive) return { ok: false, error: 'País no activo.' };
  if (hasTreaty(sim, attackerId, defenderId, TREATY_WAR)) {
    return { ok: false, error: 'Ya están en guerra.' };
  }
  if (sim.truceMonths[idxPair(attackerId, defenderId)] > 0) {
    return { ok: false, error: `Tregua activa (${sim.truceMonths[idxPair(attackerId, defenderId)]} meses).` };
  }

  const reach = canReachToAttack(sim, attackerId, defenderId);
  if (!reach.ok) {
    return { ok: false, error: reach.reason };
  }

  // Attacking costs $0 money!
  setTreatyFlag(sim, attackerId, defenderId, TREATY_ALLIANCE, false);
  setTreatyFlag(sim, attackerId, defenderId, TREATY_WAR, true);
  setRelation(sim, attackerId, defenderId, Math.min(15, getRelation(sim, attackerId, defenderId) - 40));

  if (sim.diplomaticOffers.length > 0) {
    sim.diplomaticOffers = sim.diplomaticOffers.filter(
      (o) =>
        !(
          (o.fromCountryId === attackerId && o.toCountryId === defenderId) ||
          (o.fromCountryId === defenderId && o.toCountryId === attackerId)
        )
    );
  }

  att.capitalLostPenaltyDone = false;
  def.capitalLostPenaltyDone = false;

  sim.wars.push({ a: attackerId, b: defenderId, startTotalDays: sim.totalDays });
  att.aggressiveExpansion += 14;
  sim.globalTension = Math.min(100, sim.globalTension + 5);
  sim.globalStability = Math.max(10, sim.globalStability - 2);

  pushChronicle(
    sim,
    'war',
    `${getCountryName(att)} declara la guerra a ${getCountryName(def)}.`,
    attackerId
  );

  if (reach.viaSea) {
    launchNavalLandingFromPort(sim, attackerId, defenderId);
  }

  if (attackerId === sim.playerId || defenderId === sim.playerId) {
    soundEngine.playWarDeclared();
  }

  // Call defender's allies into war
  for (const allyId of getAllies(sim, defenderId)) {
    if (allyId === attackerId) continue;
    if (!hasTreaty(sim, allyId, attackerId, TREATY_WAR) && !hasTreaty(sim, allyId, attackerId, TREATY_ALLIANCE)) {
      setTreatyFlag(sim, allyId, attackerId, TREATY_WAR, true);
      sim.truceMonths[idxPair(allyId, attackerId)] = 0;
      sim.truceMonths[idxPair(attackerId, allyId)] = 0;
      setRelation(sim, allyId, attackerId, 10);
      if (sim.diplomaticOffers.length > 0) {
        sim.diplomaticOffers = sim.diplomaticOffers.filter(
          (o) =>
            !(
              (o.fromCountryId === allyId && o.toCountryId === attackerId) ||
              (o.fromCountryId === attackerId && o.toCountryId === allyId)
            )
        );
      }
      sim.wars.push({ a: allyId, b: attackerId, startTotalDays: sim.totalDays });
      pushChronicle(
        sim,
        'alliance',
        `${getCountryName(sim.countries[allyId])} entra en guerra en defensa de su aliado ${getCountryName(def)}.`,
        allyId
      );
    }
  }

  return { ok: true };
}

export function makePeace(
  sim: SimulationState,
  aId: number,
  bId: number,
  customReason?: string
): boolean {
  if (!hasTreaty(sim, aId, bId, TREATY_WAR)) return false;
  setTreatyFlag(sim, aId, bId, TREATY_WAR, false);
  sim.truceMonths[idxPair(aId, bId)] = 8;
  sim.truceMonths[idxPair(bId, aId)] = 8;
  sim.wars = sim.wars.filter(
    (w) => !((w.a === aId && w.b === bId) || (w.a === bId && w.b === aId))
  );
  sim.invasions = sim.invasions.filter(
    (inv) =>
      !(
        (inv.attackerId === aId && inv.defenderId === bId) ||
        (inv.attackerId === bId && inv.defenderId === aId)
      )
  );
  if (sim.diplomaticOffers.length > 0) {
    sim.diplomaticOffers = sim.diplomaticOffers.filter(
      (o) =>
        !(
          o.type === 'peace' &&
          ((o.fromCountryId === aId && o.toCountryId === bId) ||
            (o.fromCountryId === bId && o.toCountryId === aId))
        )
    );
  }
  sim.countries[aId].capitalLostPenaltyDone = false;
  sim.countries[bId].capitalLostPenaltyDone = false;
  addRelation(sim, aId, bId, 15);
  sim.globalTension = Math.max(5, sim.globalTension - 3);
  pushChronicle(
    sim,
    'peace',
    customReason ?? `${getCountryName(sim.countries[aId])} y ${getCountryName(sim.countries[bId])} firman la paz.`,
    aId
  );
  if (aId === sim.playerId || bId === sim.playerId) {
    soundEngine.playPeaceTreaty();
  }
  return true;
}

export function proposeAlliance(
  sim: SimulationState,
  fromId: number,
  toId: number
): { accepted: boolean; pendingHuman?: boolean; reason: string } {
  if (fromId === toId) return { accepted: false, reason: 'Mismo país.' };
  const from = sim.countries[fromId];
  const to = sim.countries[toId];
  if (!from.alive || !to.alive) return { accepted: false, reason: 'País inactivo.' };
  if (hasTreaty(sim, fromId, toId, TREATY_WAR)) {
    return { accepted: false, reason: 'Están en guerra actualmente.' };
  }
  if (hasTreaty(sim, fromId, toId, TREATY_ALLIANCE)) {
    return { accepted: false, reason: 'Ya existe una alianza activa.' };
  }

  // En modo multijugador, las propuestas entre humanos esperan confirmación del otro jugador
  if (sim.isMultiplayer && isHumanCountry(sim, toId) && isHumanCountry(sim, fromId)) {
    const alreadyPending = sim.diplomaticOffers.some(
      (o) => o.fromCountryId === fromId && o.toCountryId === toId && o.type === 'alliance'
    );
    if (alreadyPending) {
      return {
        accepted: false,
        pendingHuman: true,
        reason: `Ya hay una solicitud de alianza pendiente con ${getCountryName(to)}.`,
      };
    }
    sim.diplomaticOffers = [
      ...sim.diplomaticOffers.slice(-31),
      {
        id: sim.nextIdCounter++,
        fromCountryId: fromId,
        toCountryId: toId,
        type: 'alliance',
      },
    ];
    if (fromId === sim.playerId) soundEngine.playClick();
    return {
      accepted: false,
      pendingHuman: true,
      reason: `Propuesta de alianza enviada al jugador de ${getCountryName(to)}.`,
    };
  }

  const rel = getRelation(sim, fromId, toId);
  const threshold = getAllianceRelThreshold(sim.difficulty);

  // En Modo Difícil, la IA evalúa estratégicamente si le conviene la alianza
  if (sim.difficulty === 'hard' && fromId === sim.playerId) {
    const toAllies = getAllies(sim, toId);
    const fromEnemies = getEnemies(sim, fromId);
    if (rel < threshold) {
      soundEngine.playClick();
      return {
        accepted: false,
        reason: `${getCountryName(to)} rechaza la alianza (relación ${rel}/100, requiere ${threshold}/100 en Modo Difícil).`,
      };
    }
    if (from.aggressiveExpansion >= 32 && rel < 94) {
      soundEngine.playClick();
      return {
        accepted: false,
        reason: `${getCountryName(to)} desconfía de tu alta agresividad (${Math.round(from.aggressiveExpansion)}) y rechaza aliarse contigo.`,
      };
    }
    if (from.army < to.army * 0.42 && rel < 92) {
      soundEngine.playClick();
      return {
        accepted: false,
        reason: `${getCountryName(to)} considera insuficiente tu ejército para una alianza estratégica.`,
      };
    }
    if (fromEnemies.length >= 2 && rel < 95) {
      soundEngine.playClick();
      return {
        accepted: false,
        reason: `${getCountryName(to)} evita aliarse mientras luchas en ${fromEnemies.length} frentes.`,
      };
    }
    if (toAllies.length >= 4 && rel < 92) {
      soundEngine.playClick();
      return {
        accepted: false,
        reason: `${getCountryName(to)} ya cuenta con suficientes aliados estratégicos.`,
      };
    }
  }

  if (rel >= threshold) {
    setTreatyFlag(sim, fromId, toId, TREATY_ALLIANCE, true);
    addRelation(sim, fromId, toId, 10);
    pushChronicle(
      sim,
      'alliance',
      `${getCountryName(from)} y ${getCountryName(to)} firman una Alianza Estratégica.`,
      fromId
    );
    if (fromId === sim.playerId || toId === sim.playerId) soundEngine.playAllianceFormed();
    return {
      accepted: true,
      reason: `¡${getCountryName(to)} acepta formar una Alianza contigo!`,
    };
  }

  if (fromId === sim.playerId) soundEngine.playClick();
  return {
    accepted: false,
    reason: `${getCountryName(to)} rechaza la alianza (relación ${rel}/100, requiere ${threshold}/100).`,
  };
}

export function sendDiplomaticGift(
  sim: SimulationState,
  fromId: number,
  toId: number,
  relPoints = 1
): { ok: boolean; error?: string; gained?: number } {
  if (fromId === toId) return { ok: false, error: 'No puedes enviarte dinero a ti mismo.' };
  const from = sim.countries[fromId];
  const to = sim.countries[toId];
  if (!from.alive || !to.alive) return { ok: false, error: 'País inactivo.' };
  if (hasTreaty(sim, fromId, toId, TREATY_WAR)) {
    return { ok: false, error: 'No puedes enviar dinero mientras están en guerra.' };
  }

  const currentRel = getRelation(sim, fromId, toId);
  if (currentRel >= 100) {
    return { ok: false, error: `Tu relación con ${getCountryName(to)} ya está al máximo (100/100).` };
  }

  const actualPoints = Math.max(1, Math.min(relPoints, 100 - currentRel));
  const unitCost = getGiftMoneyPerRel(sim.difficulty);
  const cost = actualPoints * unitCost;
  if (from.money < cost) {
    return {
      ok: false,
      error: `Necesitas $${cost.toLocaleString('es-ES')} de dinero para subir +${actualPoints} de relación.`,
    };
  }

  from.money -= cost;
  to.money = Math.min(getMoneyCap(to, sim.difficulty), to.money + cost);
  addRelation(sim, fromId, toId, actualPoints);
  if (fromId === sim.playerId) soundEngine.playClick();
  return { ok: true, gained: actualPoints };
}

export function requestAllyHelp(
  sim: SimulationState,
  playerId: number,
  allyId: number
): { accepted: boolean; pendingHuman?: boolean; reason: string } {
  const ally = sim.countries[allyId];
  const player = sim.countries[playerId];
  if (!ally || !ally.alive || !player.alive) {
    return { accepted: false, reason: 'País no disponible.' };
  }
  if (!hasTreaty(sim, playerId, allyId, TREATY_ALLIANCE)) {
    return { accepted: false, reason: `${getCountryName(ally)} no es tu aliado.` };
  }

  const playerEnemies = getEnemies(sim, playerId);
  if (playerEnemies.length === 0) {
    return { accepted: false, reason: 'Actualmente no estás en guerra.' };
  }

  const unjoinedEnemies = playerEnemies.filter(
    (eid) => !hasTreaty(sim, allyId, eid, TREATY_WAR)
  );
  if (unjoinedEnemies.length === 0) {
    return {
      accepted: true,
      reason: `${getCountryName(ally)} ya está combatiendo junto a ti en todas tus guerras.`,
    };
  }

  if (sim.isMultiplayer && isHumanCountry(sim, allyId)) {
    const alreadyPending = sim.diplomaticOffers.some(
      (o) => o.fromCountryId === playerId && o.toCountryId === allyId && o.type === 'alliance_help'
    );
    if (!alreadyPending) {
      sim.diplomaticOffers = [
        ...sim.diplomaticOffers.slice(-31),
        {
          id: sim.nextIdCounter++,
          fromCountryId: playerId,
          toCountryId: allyId,
          type: 'alliance_help',
        },
      ];
    }
    return {
      accepted: false,
      pendingHuman: true,
      reason: `Solicitud de ayuda militar enviada a ${getCountryName(ally)}.`,
    };
  }

  const relWithPlayer = getRelation(sim, playerId, allyId);
  let maxEnemyRel = 1;
  let alliedToEnemy = false;
  let avgEnemyArmy = 0;

  for (const eid of unjoinedEnemies) {
    const r = getRelation(sim, allyId, eid);
    if (r > maxEnemyRel) maxEnemyRel = r;
    if (hasTreaty(sim, allyId, eid, TREATY_ALLIANCE)) alliedToEnemy = true;
    avgEnemyArmy += sim.countries[eid].army;
  }
  avgEnemyArmy /= unjoinedEnemies.length;

  const allyCurrentWars = getEnemies(sim, allyId).length;

  if (alliedToEnemy && relWithPlayer < 92) {
    addRelation(sim, playerId, allyId, -3);
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${getCountryName(ally)} rechaza ayudarte porque también es aliado de tu enemigo.`,
    };
  }

  if (maxEnemyRel >= 70 && relWithPlayer < 90) {
    addRelation(sim, playerId, allyId, -3);
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${getCountryName(ally)} decide no intervenir debido a su buena relación con tu enemigo.`,
    };
  }

  if (allyCurrentWars >= 2 && relWithPlayer < 82) {
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${getCountryName(ally)} rechaza ayudarte porque ya combate en ${allyCurrentWars} guerras.`,
    };
  }

  const armyRatio = ally.army / Math.max(1, avgEnemyArmy);
  const decisionScore =
    relWithPlayer -
    Math.max(0, maxEnemyRel - 45) * 0.9 -
    allyCurrentWars * (sim.difficulty === 'hard' ? 18 : 14) +
    (armyRatio >= (sim.difficulty === 'hard' ? 0.65 : 0.45) ? 10 : -18) +
    (ally.aiDoctrine === 'diplomatic' ? 5 : 0);

  if (decisionScore < (sim.difficulty === 'hard' ? 72 : 62)) {
    addRelation(sim, playerId, allyId, -2);
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${getCountryName(ally)} decide mantenerse al margen y no ayudarte en esta guerra.`,
    };
  }

  // El aliado acepta y entra a ayudar en la guerra
  for (const eid of unjoinedEnemies) {
    setTreatyFlag(sim, allyId, eid, TREATY_ALLIANCE, false);
    setTreatyFlag(sim, allyId, eid, TREATY_WAR, true);
    sim.truceMonths[idxPair(allyId, eid)] = 0;
    sim.truceMonths[idxPair(eid, allyId)] = 0;
    setRelation(sim, allyId, eid, Math.min(15, getRelation(sim, allyId, eid) - 35));
    ally.capitalLostPenaltyDone = false;
    sim.wars.push({ a: allyId, b: eid, startTotalDays: sim.totalDays });

    if (!sim.mapData.landNeighbors[allyId].has(eid) && ally.ports.length > 0) {
      launchNavalLandingFromPort(sim, allyId, eid);
    }
  }

  addRelation(sim, playerId, allyId, 6);
  pushChronicle(
    sim,
    'alliance',
    `¡${getCountryName(ally)} responde al llamado de ${getCountryName(player)} y entra en la guerra para ayudar!`,
    allyId
  );
  soundEngine.playAllyJoinedWar();

  return {
    accepted: true,
    reason: `¡${getCountryName(ally)} acepta ayudarte y declara la guerra a tus enemigos!`,
  };
}

export function requestHumanPeace(
  sim: SimulationState,
  fromId: number,
  toId: number
): { ok: boolean; pendingHuman?: boolean; reason: string } {
  if (!hasTreaty(sim, fromId, toId, TREATY_WAR)) {
    return { ok: false, reason: 'No están en guerra.' };
  }
  if (sim.isMultiplayer && isHumanCountry(sim, toId) && isHumanCountry(sim, fromId)) {
    const exists = sim.diplomaticOffers.some(
      (o) => o.fromCountryId === fromId && o.toCountryId === toId && o.type === 'peace'
    );
    if (!exists) {
      sim.diplomaticOffers = [
        ...sim.diplomaticOffers.slice(-31),
        {
          id: sim.nextIdCounter++,
          fromCountryId: fromId,
          toCountryId: toId,
          type: 'peace',
        },
      ];
    }
    return {
      ok: true,
      pendingHuman: true,
      reason: `Propuesta de paz enviada a ${getCountryName(sim.countries[toId])}.`,
    };
  }
  // En Modo Difícil, la IA negocia la paz de forma inteligente y la rechaza si lleva ventaja
  if (sim.difficulty === 'hard' && !sim.isMultiplayer && fromId === sim.playerId) {
    const player = sim.countries[fromId];
    const ai = sim.countries[toId];
    const war = sim.wars.find(
      (w) => (w.a === fromId && w.b === toId) || (w.a === toId && w.b === fromId)
    );
    const warDays = war ? sim.totalDays - war.startTotalDays : 0;
    const aiEnemies = getEnemies(sim, toId).length;
    const aiLosingTerritory = ai.pixels < ai.initialPixels * 0.78 || ai.capitalLostPenaltyDone;
    const playerMuchStronger = player.army >= ai.army * 1.18;
    const aiOverstretched = aiEnemies >= 2 && ai.army < player.army * 1.3;
    const warExhausted = warDays >= 210 && ai.army <= player.army * 1.25;

    if (!aiLosingTerritory && !playerMuchStronger && !aiOverstretched && !warExhausted) {
      soundEngine.playClick();
      return {
        ok: false,
        reason: `${getCountryName(ai)} rechaza tu oferta de paz: tiene ventaja militar y decide continuar la ofensiva.`,
      };
    }
  }

  makePeace(sim, fromId, toId);
  return { ok: true, reason: `Paz firmada con ${getCountryName(sim.countries[toId])}.` };
}

export function respondToHumanDiplomaticOffer(
  sim: SimulationState,
  offerId: number,
  responderCountryId: number,
  accept: boolean
) {
  const offer = sim.diplomaticOffers.find(
    (o) => o.id === offerId && o.toCountryId === responderCountryId
  );
  if (!offer) return;
  sim.diplomaticOffers = sim.diplomaticOffers.filter((o) => o.id !== offerId);

  const from = sim.countries[offer.fromCountryId];
  const to = sim.countries[offer.toCountryId];
  if (!from?.alive || !to?.alive) return;

  if (!accept) {
    addRelation(sim, offer.fromCountryId, offer.toCountryId, -4);
    if (responderCountryId === sim.playerId) soundEngine.playClick();
    return;
  }

  if (offer.type === 'peace') {
    if (!hasTreaty(sim, offer.fromCountryId, offer.toCountryId, TREATY_WAR)) return;
    makePeace(sim, offer.fromCountryId, offer.toCountryId);
  } else if (offer.type === 'alliance') {
    if (
      hasTreaty(sim, offer.fromCountryId, offer.toCountryId, TREATY_WAR) ||
      hasTreaty(sim, offer.fromCountryId, offer.toCountryId, TREATY_ALLIANCE)
    ) {
      return;
    }
    setTreatyFlag(sim, offer.fromCountryId, offer.toCountryId, TREATY_ALLIANCE, true);
    addRelation(sim, offer.fromCountryId, offer.toCountryId, 12);
    pushChronicle(
      sim,
      'alliance',
      `${getCountryName(from)} y ${getCountryName(to)} firman una Alianza Estratégica.`,
      offer.fromCountryId
    );
    if (offer.fromCountryId === sim.playerId || offer.toCountryId === sim.playerId) {
      soundEngine.playAllianceFormed();
    }
  } else if (offer.type === 'alliance_help') {
    if (
      !hasTreaty(sim, offer.fromCountryId, offer.toCountryId, TREATY_ALLIANCE) ||
      hasTreaty(sim, offer.fromCountryId, offer.toCountryId, TREATY_WAR)
    ) {
      return;
    }
    const enemies = getEnemies(sim, offer.fromCountryId);
    let joined = false;
    for (const eid of enemies) {
      if (eid === offer.toCountryId) continue;
      if (!hasTreaty(sim, offer.toCountryId, eid, TREATY_WAR)) {
        setTreatyFlag(sim, offer.toCountryId, eid, TREATY_ALLIANCE, false);
        setTreatyFlag(sim, offer.toCountryId, eid, TREATY_WAR, true);
        sim.truceMonths[idxPair(offer.toCountryId, eid)] = 0;
        sim.truceMonths[idxPair(eid, offer.toCountryId)] = 0;
        to.capitalLostPenaltyDone = false;
        sim.wars.push({ a: offer.toCountryId, b: eid, startTotalDays: sim.totalDays });
        if (!sim.mapData.landNeighbors[offer.toCountryId].has(eid) && to.ports.length > 0) {
          launchNavalLandingFromPort(sim, offer.toCountryId, eid);
        }
        joined = true;
      }
    }
    if (joined) {
      pushChronicle(
        sim,
        'alliance',
        `¡${getCountryName(to)} entra en la guerra en apoyo de su aliado ${getCountryName(from)}!`,
        offer.toCountryId
      );
      if (offer.fromCountryId === sim.playerId || offer.toCountryId === sim.playerId) {
        soundEngine.playAllyJoinedWar();
      }
    }
  }
}

export function getRebellionOccupierId(sim: SimulationState, countryId: number): number | null {
  const c = sim.countries[countryId];
  if (!c || c.alive) return null;
  if (c.annexedById !== null && sim.countries[c.annexedById]?.alive) {
    return c.annexedById;
  }

  // Scan original homeland to identify who currently occupies it
  const counts = new Map<number, number>();
  const orig = sim.mapData.originalGrid;
  const grid = sim.ownerGrid;
  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    if (orig[idx] === countryId) {
      const owner = grid[idx];
      if (owner >= 0 && owner !== countryId && sim.countries[owner]?.alive) {
        counts.set(owner, (counts.get(owner) ?? 0) + 1);
      }
    }
  }
  let bestId: number | null = null;
  let bestCnt = -1;
  for (const [oid, cnt] of counts.entries()) {
    if (cnt > bestCnt) {
      bestCnt = cnt;
      bestId = oid;
    }
  }
  if (bestId === null) {
    const fallback = sim.countries.find((other) => other.alive && other.id !== countryId);
    bestId = fallback ? fallback.id : null;
  }
  c.annexedById = bestId;
  return bestId;
}

export function getRebellionStatus(sim: SimulationState, countryId: number) {
  const slot = sim.humanPlayers[countryId];
  const occupierId = getRebellionOccupierId(sim, countryId);
  const occupier = occupierId !== null ? sim.countries[occupierId] : null;
  const occupierArmy = occupier ? Math.max(10, Math.round(occupier.army)) : 0;
  const requiredArmy = occupier ? Math.max(10, Math.ceil(occupierArmy * 0.5)) : 0;
  const rebelArmy = slot ? Math.round(slot.rebelArmy) : 0;
  const rebelMoney = slot ? Math.round(slot.rebelMoney) : 0;
  return {
    occupierId,
    occupierName: occupier ? getCountryName(occupier) : 'Ocupante',
    occupierArmy,
    requiredArmy,
    rebelArmy,
    rebelMoney,
    canRebel: occupier !== null && sim.outcome === 'none' && rebelArmy >= requiredArmy,
  };
}

export function recruitRebelArmy(sim: SimulationState, countryId: number): string | null {
  const c = sim.countries[countryId];
  const slot = sim.humanPlayers[countryId];
  if (!c || c.alive || !slot || sim.outcome !== 'none') {
    return 'Solo puedes recaudar ejército rebelde mientras tu país esté anexado.';
  }
  if (slot.rebelMoney < REBEL_RECRUIT_COST) {
    return `Necesitas $${REBEL_RECRUIT_COST} clandestinos para reclutar ${REBEL_RECRUIT_AMOUNT} rebeldes.`;
  }
  slot.rebelMoney -= REBEL_RECRUIT_COST;
  slot.rebelArmy += REBEL_RECRUIT_AMOUNT;
  if (countryId === sim.playerId) soundEngine.playRecruit();
  return null;
}

export function getCountryRebellionStrength(c: CountryState): number {
  const milScore = Math.min(1, c.seed.military / 150) * 45;
  const popScore = Math.min(1, Math.sqrt(Math.max(0.1, c.seed.popM)) / 14) * 30;
  const landScore = Math.min(1, Math.sqrt(Math.max(1, c.initialPixels)) / 24) * 25;
  return Math.max(5, Math.min(100, Math.round(milScore + popScore + landScore)));
}

export function getOccupiedNationsBy(sim: SimulationState, occupierId: number): CountryState[] {
  return sim.countries
    .filter(
      (c) =>
        !c.alive &&
        c.annexedById === occupierId &&
        c.id !== sim.playerId &&
        !isHumanCountry(sim, c.id)
    )
    .sort((a, b) => (b.rebelUnrest ?? 0) - (a.rebelUnrest ?? 0) || getCountryRebellionStrength(b) - getCountryRebellionStrength(a));
}

export function suppressRebellion(
  sim: SimulationState,
  occupierId: number,
  targetId: number
): { ok: boolean; message: string } {
  const occ = sim.countries[occupierId];
  const target = sim.countries[targetId];
  if (!occ || !occ.alive) {
    return { ok: false, message: 'Tu país debe estar activo.' };
  }
  if (!target || target.alive || target.annexedById !== occupierId) {
    return { ok: false, message: 'Ese territorio no está actualmente bajo tu ocupación.' };
  }
  if ((target.rebelUnrest ?? 0) <= 0) {
    return { ok: false, message: `${getCountryName(target)} ya se encuentra calmado (0% rebeldía).` };
  }
  if (occ.money < SUPPRESS_REBELLION_COST) {
    return {
      ok: false,
      message: `Necesitas $${SUPPRESS_REBELLION_COST} para reprimir la rebelión en ${getCountryName(target)}.`,
    };
  }

  occ.money -= SUPPRESS_REBELLION_COST;
  target.rebelUnrest = Math.max(0, Math.round((target.rebelUnrest ?? 0) - SUPPRESS_REBELLION_REDUCTION));
  if (occupierId === sim.playerId) {
    soundEngine.playBuildStructure('defense');
  }
  return {
    ok: true,
    message: `Guarnición enviada a ${getCountryName(target)}. Rebeldía reducida al ${Math.round(target.rebelUnrest)}%.`,
  };
}

function executeCountryIndependenceRebellion(
  sim: SimulationState,
  countryId: number,
  occId: number,
  rebelArmy: number,
  rebelMoney: number,
  isAiUprising: boolean
): boolean {
  const c = sim.countries[countryId];
  const occ = sim.countries[occId];
  if (!c || c.alive || !occ || !occ.alive || occ.pixels <= 3) return false;

  const grid = sim.ownerGrid;
  const orig = sim.mapData.originalGrid;

  // Collect homeland pixels currently held by the occupier
  const homelandPixels: number[] = [];
  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    if (orig[idx] === countryId && grid[idx] === occId) {
      homelandPixels.push(idx);
    }
  }

  // Fallback for human rebellion if original homeland was taken by a third party
  if (homelandPixels.length === 0) {
    if (isAiUprising) return false;
    const capX = sim.mapData.capitalX[countryId];
    const capY = sim.mapData.capitalY[countryId];
    const occPixels: Array<{ idx: number; dist: number }> = [];
    for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
      if (grid[idx] === occId) {
        const px = idx % MAP_W;
        const py = Math.floor(idx / MAP_W);
        occPixels.push({ idx, dist: (px - capX) ** 2 + (py - capY) ** 2 });
      }
    }
    occPixels.sort((a, b) => a.dist - b.dist);
    const takeCount = Math.max(
      1,
      Math.min(Math.max(4, c.initialPixels), Math.max(1, occPixels.length - 2))
    );
    for (let i = 0; i < takeCount; i++) {
      homelandPixels.push(occPixels[i].idx);
    }
  }

  // Keep at least 2 pixels for occupier so both fight cleanly
  const maxTake = Math.max(1, occ.pixels - 2);
  const finalTake = homelandPixels.slice(0, Math.min(homelandPixels.length, maxTake));
  if (finalTake.length === 0) return false;

  const reclaimedSet = new Set<number>(finalTake);
  for (const idx of finalTake) {
    grid[idx] = countryId;
  }

  // Remove occupier ports, defenses, anti-nukes and barracks sitting on reclaimed rebel territory
  occ.ports = occ.ports.filter((p) => !reclaimedSet.has(p.y * MAP_W + p.x));
  occ.defenses = occ.defenses.filter((d) => !reclaimedSet.has(d.y * MAP_W + d.x));
  occ.antiNukes = occ.antiNukes.filter((a) => !reclaimedSet.has(a.y * MAP_W + a.x));
  occ.barracks = occ.barracks.filter((b) => !reclaimedSet.has(b.y * MAP_W + b.x));

  // Recompute pixel counts & bounding boxes for both countries accurately
  c.pixels = 0;
  c.bboxMinX = MAP_W - 1;
  c.bboxMaxX = 0;
  c.bboxMinY = MAP_H - 1;
  c.bboxMaxY = 0;
  occ.pixels = 0;
  occ.bboxMinX = MAP_W - 1;
  occ.bboxMaxX = 0;
  occ.bboxMinY = MAP_H - 1;
  occ.bboxMaxY = 0;

  let bestCapIdx = finalTake[0];
  let bestCapDist = Infinity;
  const origCapX = sim.mapData.capitalX[countryId];
  const origCapY = sim.mapData.capitalY[countryId];

  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    const id = grid[idx];
    if (id !== countryId && id !== occId) continue;
    const px = idx % MAP_W;
    const py = Math.floor(idx / MAP_W);
    const targetCountry = id === countryId ? c : occ;
    targetCountry.pixels++;
    if (px < targetCountry.bboxMinX) targetCountry.bboxMinX = px;
    if (px > targetCountry.bboxMaxX) targetCountry.bboxMaxX = px;
    if (py < targetCountry.bboxMinY) targetCountry.bboxMinY = py;
    if (py > targetCountry.bboxMaxY) targetCountry.bboxMaxY = py;
    if (id === countryId) {
      const d = (px - origCapX) ** 2 + (py - origCapY) ** 2;
      if (d < bestCapDist) {
        bestCapDist = d;
        bestCapIdx = idx;
      }
    }
  }

  c.alive = c.pixels > 0;
  c.annexedById = null;
  c.rebelUnrest = 0;
  c.capitalX = bestCapIdx % MAP_W;
  c.capitalY = Math.floor(bestCapIdx / MAP_W);
  c.capitalLostPenaltyDone = false;
  c.army = Math.max(10, Math.round(rebelArmy));
  c.money = Math.max(250, Math.round(rebelMoney));
  c.goldMines = Math.max(1, Math.min(c.goldMines, 4));
  c.cities = Math.max(1, Math.min(c.cities, 4));
  sim.dirtyPixels = true;

  // Relocate occupier's capital if rebel took it
  relocateCapitalIfNeeded(sim, occ);

  // Establish immediate War of Independence
  sim.mapData.landNeighbors[countryId].add(occId);
  sim.mapData.landNeighbors[occId].add(countryId);
  setTreatyFlag(sim, countryId, occId, TREATY_ALLIANCE, false);
  setTreatyFlag(sim, countryId, occId, TREATY_WAR, true);
  sim.truceMonths[idxPair(countryId, occId)] = 0;
  sim.truceMonths[idxPair(occId, countryId)] = 0;
  setRelation(sim, countryId, occId, 10);
  sim.wars.push({ a: countryId, b: occId, startTotalDays: sim.totalDays });

  // Visual uprising flare particles over liberated territory
  const step = Math.max(1, Math.floor(finalTake.length / 22));
  for (let i = 0; i < finalTake.length && sim.particles.length < 220; i += step) {
    const idx = finalTake[i];
    sim.particles.push({
      x: idx % MAP_W,
      y: Math.floor(idx / MAP_W),
      r: 251,
      g: 146,
      b: 60,
      life: 10,
      maxLife: 10,
    });
  }

  updateAllEconomies(sim, false);

  const strength = getCountryRebellionStrength(c);
  pushChronicle(
    sim,
    'war',
    isAiUprising
      ? `¡REBELIÓN DE INDEPENDENCIA! ${getCountryName(c)} (fuerza ${strength}/100) se independiza y se rebela contra ${getCountryName(occ)} con ${c.army.toLocaleString('es-ES')} soldados.`
      : `¡REBELIÓN! ${getCountryName(c)} se independiza de ${getCountryName(occ)} con ${c.army.toLocaleString('es-ES')} soldados.`,
    countryId
  );

  if (!isAiUprising || occId === sim.playerId || countryId === sim.playerId) {
    soundEngine.playWarDeclared();
  }
  return true;
}

function processAbsorbedCountryRebellions(sim: SimulationState) {
  if (sim.outcome !== 'none') return;

  // Never interrupt a finished world conquest
  let aliveCount = 0;
  for (const c of sim.countries) {
    if (c.alive) aliveCount++;
  }
  if (aliveCount <= 1) return;

  let rebelTriggeredThisPulse = false;

  for (const c of sim.countries) {
    if (c.alive) {
      if (c.rebelUnrest !== 0) c.rebelUnrest = 0;
      continue;
    }
    // Human-controlled countries use their manual RebellionPanel in multiplayer
    if (c.id === sim.playerId || isHumanCountry(sim, c.id)) continue;

    const occId = c.annexedById;
    if (occId === null) continue;
    const occ = sim.countries[occId];
    if (!occ || !occ.alive || occ.pixels <= 4) continue;

    const strength = getCountryRebellionStrength(c);
    const occWars = getEnemies(sim, occId).length;
    const origCapX = sim.mapData.capitalX[c.id];
    const origCapY = sim.mapData.capitalY[c.id];
    const hasDefenseGarrison = occ.defenses.some(
      (d) => Math.hypot(d.x - origCapX, d.y - origCapY) <= d.radius + 8
    );
    const hasBarracksZone = isCountryCoveredByBarracks(sim, occ, c.id);

    // Very weak absorbed countries rarely accumulate unrest unless the occupier is severely strained
    if (strength < 16 && occ.army > 320 && occWars < 2) {
      c.rebelUnrest = Math.max(0, (c.rebelUnrest ?? 0) - 0.5);
      continue;
    }

    const isHard = sim.difficulty === 'hard';
    const strengthFactor = Math.max(0.04, (strength - 10) / 90);
    const expectedGarrison = Math.max(
      isHard ? 2500 : 300,
      computeInitialArmy(c.seed.military, sim.difficulty) * (isHard ? 0.85 : 1.15)
    );
    const gripRatio = occ.army / expectedGarrison;
    const warStrain = occWars >= 2 ? 1.55 : occWars === 1 ? 1.2 : 0.88;
    const garrisonMod = hasDefenseGarrison ? 0.42 : 1.0;
    const barracksMod = hasBarracksZone ? 1 - BARRACKS_REBELLION_REDUCTION : 1.0;
    const hardPlayerUnrestMod = isHard && occId === sim.playerId ? 1.35 : 1.0;

    let delta =
      (strengthFactor * 4.4 + (gripRatio < 1.0 ? (1.0 - gripRatio) * 3.8 : 0)) *
      warStrain *
      garrisonMod *
      barracksMod *
      hardPlayerUnrestMod;

    // A massive, well-garrisoned empire keeps weaker conquered nations calmer
    if (gripRatio >= 2.2 && (hasDefenseGarrison || hasBarracksZone) && strength < 55) {
      delta *= 0.25;
    }

    c.rebelUnrest = Math.min(100, (c.rebelUnrest ?? 0) + delta);

    if (c.rebelUnrest >= 100 && !rebelTriggeredThisPulse) {
      // Chance scaled by national strength so powerful absorbed countries erupt decisively
      const eruptionChance = Math.min(0.92, (isHard ? 0.36 : 0.28) + (strength / 100) * 0.65);
      if (Math.random() < eruptionChance) {
        const baseRebelArmy = Math.round(
          computeInitialArmy(c.seed.military, sim.difficulty) * (0.42 + (strength / 100) * 0.48)
        );
        const rebelArmy = Math.max(
          isHard ? 1200 : 110,
          Math.min(Math.round(occ.army * 0.62), baseRebelArmy)
        );
        const rebelMoney = Math.round(
          computeInitialMoney(c.seed.gdp, c.seed.military, sim.difficulty) * 0.75
        );
        const ok = executeCountryIndependenceRebellion(
          sim,
          c.id,
          occId,
          rebelArmy,
          rebelMoney,
          true
        );
        if (ok) {
          rebelTriggeredThisPulse = true;
        }
      }
    }
  }
}

export function startRebellion(
  sim: SimulationState,
  countryId: number
): { ok: boolean; error?: string } {
  const c = sim.countries[countryId];
  const slot = sim.humanPlayers[countryId];
  if (!c || c.alive || !slot) {
    return { ok: false, error: 'Tu país ya es independiente.' };
  }
  if (sim.outcome !== 'none') {
    return { ok: false, error: 'La partida ya ha terminado.' };
  }

  const status = getRebellionStatus(sim, countryId);
  if (status.occupierId === null) {
    return { ok: false, error: 'No hay país ocupante activo.' };
  }
  if (status.rebelArmy < status.requiredArmy) {
    return {
      ok: false,
      error: `Necesitas al menos la mitad del ejército de ${status.occupierName} (${status.requiredArmy} soldados).`,
    };
  }

  const ok = executeCountryIndependenceRebellion(
    sim,
    countryId,
    status.occupierId,
    Math.max(10, Math.round(slot.rebelArmy)),
    Math.max(300, Math.round(slot.rebelMoney)),
    false
  );
  if (!ok) {
    return { ok: false, error: 'No hay suficiente territorio ocupable para rebelarse.' };
  }

  slot.rebelArmy = 0;
  slot.rebelMoney = 0;
  return { ok: true };
}

export function respondToPendingProposal(sim: SimulationState, accept: boolean) {
  const prop = sim.pendingProposal;
  if (!prop) return;
  sim.pendingProposal = null;
  const from = sim.countries[prop.fromId];
  const player = sim.countries[sim.playerId];
  if (!from.alive || !player.alive) return;

  if (!accept) {
    addRelation(sim, prop.fromId, sim.playerId, -5);
    soundEngine.playClick();
    return;
  }

  if (prop.type === 'peace') {
    makePeace(sim, prop.fromId, sim.playerId);
  } else {
    setTreatyFlag(sim, prop.fromId, sim.playerId, TREATY_ALLIANCE, true);
    addRelation(sim, prop.fromId, sim.playerId, 10);
    pushChronicle(
      sim,
      'alliance',
      `${getCountryName(from)} y ${getCountryName(player)} firman una Alianza Estratégica.`,
      prop.fromId
    );
    soundEngine.playAllianceFormed();
  }
}

export function buildGoldMine(sim: SimulationState, countryId: number): string | null {
  const c = sim.countries[countryId];
  if (c.goldMines >= MAX_GOLD_MINES_TOTAL) {
    return `Ya alcanzaste el límite máximo de ${MAX_GOLD_MINES_TOTAL} Minas de Oro.`;
  }
  if (c.goldMinesBuiltThisMonth >= MAX_GOLD_MINES_PER_MONTH) {
    return `Solo puedes construir ${MAX_GOLD_MINES_PER_MONTH} Mina de Oro por mes.`;
  }
  const cost = getGoldMineCost(c, sim.difficulty);
  if (c.money < cost) return `Necesitas $${cost.toLocaleString('es-ES')} de dinero.`;
  c.money -= cost;
  c.goldMines++;
  c.goldMinePurchases++;
  c.goldMinesBuiltThisMonth++;
  updateAllEconomies(sim, false);
  if (countryId === sim.playerId) soundEngine.playBuildStructure('mine');
  return null;
}

export function buildCity(sim: SimulationState, countryId: number): string | null {
  const c = sim.countries[countryId];
  if (c.cities >= MAX_CITIES_TOTAL) {
    return `Ya alcanzaste el límite máximo de ${MAX_CITIES_TOTAL} Ciudades.`;
  }
  if (c.citiesBuiltThisMonth >= MAX_CITIES_PER_MONTH) {
    return `Solo puedes construir ${MAX_CITIES_PER_MONTH} Ciudades por mes.`;
  }
  const cost = getCityCost(c, sim.difficulty);
  if (c.money < cost) return `Necesitas $${cost.toLocaleString('es-ES')} de dinero.`;
  c.money -= cost;
  c.cities++;
  c.cityPurchases++;
  c.citiesBuiltThisMonth++;
  updateAllEconomies(sim, false);
  if (countryId === sim.playerId) soundEngine.playBuildStructure('city');
  return null;
}

export function buildPort(
  sim: SimulationState,
  countryId: number,
  towardCountryId?: number
): string | null {
  const c = sim.countries[countryId];
  if (c.money < PORT_COST) return `Necesitas $${PORT_COST} de dinero.`;

  const candidates = getCoastalCandidates(sim, countryId);
  if (candidates.length === 0) {
    return 'Tu país no tiene costa al mar para construir un Puerto.';
  }

  // Filter out pixels too close to existing ports if possible
  let pool = candidates.filter((cand) =>
    c.ports.every((p) => Math.hypot(p.x - cand.x, p.y - cand.y) >= 16)
  );
  if (pool.length === 0) pool = candidates;

  let chosen = pool[Math.floor(Math.random() * pool.length)];

  if (towardCountryId !== undefined && towardCountryId !== countryId) {
    const target = sim.countries[towardCountryId];
    const dx = target.capitalX - c.capitalX;
    const dy = target.capitalY - c.capitalY;
    const len = Math.hypot(dx, dy) || 1;
    const dirX = dx / len;
    const dirY = dy / len;
    let bestScore = -999;
    for (const cand of pool) {
      const score = cand.nx * dirX + cand.ny * dirY;
      if (score > bestScore) {
        bestScore = score;
        chosen = cand;
      }
    }
  } else if (c.ports.length === 0) {
    // Pick midpoint coastal pixel facing outward
    chosen = pool[Math.floor(pool.length / 2)];
  }

  c.money -= PORT_COST;
  c.ports.push(chosen);
  if (countryId === sim.playerId) soundEngine.playBuildStructure('port');
  return null;
}

export function recruitSoldiers(sim: SimulationState, countryId: number): string | null {
  const c = sim.countries[countryId];
  const armyCap = getArmyCap(c, sim.difficulty);
  const recruitCost = getArmyRecruitCost(sim.difficulty);
  const recruitAmount = getArmyRecruitAmount(sim.difficulty);
  if (c.army >= armyCap) {
    return `Capacidad militar máxima alcanzada (${armyCap.toLocaleString('es-ES')}). Construye Ciudades, Cuarteles o conquista territorio para ampliarla.`;
  }
  if (c.money < recruitCost) {
    return `Necesitas $${recruitCost} para reclutar ${recruitAmount} soldados.`;
  }
  c.money -= recruitCost;
  c.army = Math.min(armyCap, c.army + recruitAmount);
  updateAllEconomies(sim, false);
  if (countryId === sim.playerId) soundEngine.playRecruit();
  return null;
}

export function getMaxRecruitableSoldiers(
  c: CountryState,
  difficulty: GameDifficulty = 'normal'
): number {
  if (!c.alive) return 0;
  const armyCap = getArmyCap(c, difficulty);
  const remainingCap = Math.max(0, armyCap - c.army);
  if (remainingCap <= 0) return 0;
  const recruitCost = getArmyRecruitCost(difficulty);
  const recruitAmount = getArmyRecruitAmount(difficulty);
  const affordable = Math.floor((c.money * recruitAmount) / recruitCost);
  return Math.max(0, Math.min(Math.floor(remainingCap), affordable));
}

export function recruitSoldiersMax(
  sim: SimulationState,
  countryId: number
): { ok: boolean; message: string; soldiersAdded: number; moneySpent: number } {
  const c = sim.countries[countryId];
  if (!c || !c.alive) {
    return { ok: false, message: 'País inactivo.', soldiersAdded: 0, moneySpent: 0 };
  }
  const armyCap = getArmyCap(c, sim.difficulty);
  const remainingCap = Math.max(0, armyCap - c.army);
  if (remainingCap < 1) {
    return {
      ok: false,
      message: `Capacidad militar máxima alcanzada (${armyCap.toLocaleString('es-ES')}). Construye Ciudades, Cuarteles o conquista territorio para ampliarla.`,
      soldiersAdded: 0,
      moneySpent: 0,
    };
  }
  const recruitCost = getArmyRecruitCost(sim.difficulty);
  const recruitAmount = getArmyRecruitAmount(sim.difficulty);
  const minCostPerSoldier = Math.ceil(recruitCost / recruitAmount);
  const affordableSoldiers = Math.floor((c.money * recruitAmount) / recruitCost);
  if (affordableSoldiers < 1) {
    return {
      ok: false,
      message: `Necesitas al menos $${minCostPerSoldier} para reclutar soldados.`,
      soldiersAdded: 0,
      moneySpent: 0,
    };
  }

  const soldiersAdded = Math.min(Math.floor(remainingCap), affordableSoldiers);
  const exactCost = (soldiersAdded * recruitCost) / recruitAmount;
  const hitsCap = soldiersAdded < affordableSoldiers;
  // Spend all available money if not capped by military capacity, otherwise spend exact cost for reaching cap
  const moneySpent = hitsCap ? Math.min(c.money, exactCost) : c.money;

  c.money = Math.max(0, c.money - moneySpent);
  c.army = Math.min(armyCap, c.army + soldiersAdded);
  updateAllEconomies(sim, false);
  if (countryId === sim.playerId) soundEngine.playRecruit();

  return {
    ok: true,
    soldiersAdded,
    moneySpent: Math.round(moneySpent),
    message: hitsCap
      ? `¡+${soldiersAdded.toLocaleString('es-ES')} soldados reclutados por $${Math.round(moneySpent).toLocaleString('es-ES')} (capacidad militar llena)!`
      : `¡+${soldiersAdded.toLocaleString('es-ES')} soldados reclutados gastando todo tu dinero ($${Math.round(moneySpent).toLocaleString('es-ES')})!`,
  };
}

export function buildDefenseAt(
  sim: SimulationState,
  countryId: number,
  x: number,
  y: number
): string | null {
  const c = sim.countries[countryId];
  if (!c.alive) return 'País inactivo.';
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) {
    return 'Posición fuera del mapa.';
  }
  if (sim.ownerGrid[y * MAP_W + x] !== countryId) {
    return 'Debes colocar la defensa dentro de tu propio territorio.';
  }
  if (c.defenses.some((d) => Math.hypot(d.x - x, d.y - y) < 6)) {
    return 'Ya existe una defensa muy cerca de ese punto.';
  }
  if (c.money < DEFENSE_COST) {
    return `Necesitas $${DEFENSE_COST} para construir una Defensa.`;
  }

  c.money -= DEFENSE_COST;
  c.defenses.push({ x, y, radius: DEFENSE_RADIUS });
  if (countryId === sim.playerId) soundEngine.playBuildStructure('defense');
  return null;
}

export function buildAntiNukeAt(
  sim: SimulationState,
  countryId: number,
  x: number,
  y: number
): string | null {
  const c = sim.countries[countryId];
  if (!c || !c.alive) return 'País inactivo.';
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) {
    return 'Posición fuera del mapa.';
  }
  if (sim.ownerGrid[y * MAP_W + x] !== countryId) {
    return 'Debes colocar el Antibombas dentro de tu propio territorio.';
  }
  if (c.antiNukes.some((a) => Math.hypot(a.x - x, a.y - y) < 8)) {
    return 'Ya existe un Antibombas muy cerca de ese punto.';
  }
  const antiNukeCost = getAntiNukeCost(sim.difficulty);
  if (c.money < antiNukeCost) {
    return `Necesitas $${antiNukeCost.toLocaleString('es-ES')} para construir un Antibombas.`;
  }

  c.money -= antiNukeCost;
  c.antiNukes.push({ x, y, radius: ANTI_NUKE_RADIUS });
  if (countryId === sim.playerId) soundEngine.playBuildStructure('defense');
  return null;
}

export function isCountryCoveredByBarracks(
  sim: SimulationState,
  occupier: CountryState,
  annexedCountryId: number
): boolean {
  if (!occupier.alive || !occupier.barracks || occupier.barracks.length === 0) return false;
  const origCapX = sim.mapData.capitalX[annexedCountryId];
  const origCapY = sim.mapData.capitalY[annexedCountryId];
  return occupier.barracks.some(
    (b) =>
      sim.ownerGrid[b.y * MAP_W + b.x] === occupier.id &&
      Math.hypot(b.x - origCapX, b.y - origCapY) <= b.radius
  );
}

export function buildBarracksAt(
  sim: SimulationState,
  countryId: number,
  x: number,
  y: number
): { ok: boolean; message: string } {
  const c = sim.countries[countryId];
  if (!c || !c.alive) return { ok: false, message: 'País inactivo.' };
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) {
    return { ok: false, message: 'Posición fuera del mapa.' };
  }
  if (sim.ownerGrid[y * MAP_W + x] !== countryId) {
    return { ok: false, message: 'Debes colocar el Cuartel Militar dentro de tu propio territorio.' };
  }
  if (c.barracks.some((b) => Math.hypot(b.x - x, b.y - y) < 8)) {
    return { ok: false, message: 'Ya existe un Cuartel Militar muy cerca de ese punto.' };
  }
  const barracksCost = getBarracksCost(sim.difficulty);
  if (c.money < barracksCost) {
    return {
      ok: false,
      message: `Necesitas $${barracksCost.toLocaleString('es-ES')} para construir un Cuartel Militar.`,
    };
  }

  // Track which annexed territories were NOT yet covered by an existing barracks
  const newlyCoveredRebels: CountryState[] = [];
  for (const other of sim.countries) {
    if (other.alive || other.annexedById !== countryId) continue;
    const origCapX = sim.mapData.capitalX[other.id];
    const origCapY = sim.mapData.capitalY[other.id];
    const inNewRadius = Math.hypot(x - origCapX, y - origCapY) <= BARRACKS_RADIUS;
    if (inNewRadius && !isCountryCoveredByBarracks(sim, c, other.id)) {
      newlyCoveredRebels.push(other);
    }
  }

  c.money -= barracksCost;
  c.barracks.push({ x, y, radius: BARRACKS_RADIUS });

  const pacifiedNames: string[] = [];
  for (const reb of newlyCoveredRebels) {
    if ((reb.rebelUnrest ?? 0) > 0) {
      reb.rebelUnrest = Math.max(
        0,
        Math.round((reb.rebelUnrest ?? 0) * (1 - BARRACKS_REBELLION_REDUCTION))
      );
      pacifiedNames.push(getCountryName(reb));
    }
  }

  if (countryId === sim.playerId) soundEngine.playBuildStructure('defense');

  const zoneNote =
    pacifiedNames.length > 0
      ? ` Rebeldía -50% en ${pacifiedNames.slice(0, 3).join(', ')}${pacifiedNames.length > 3 ? ` y ${pacifiedNames.length - 3} más` : ''}.`
      : ` Radio ${BARRACKS_RADIUS * 10} km (-50% rebeldía en su zona).`;

  return {
    ok: true,
    message: `¡Cuartel Militar construido! +${BARRACKS_ARMY_CAP_BONUS} capacidad militar.${zoneNote}`,
  };
}

export function isPixelIrradiated(sim: SimulationState, px: number, py: number): boolean {
  for (const c of sim.countries) {
    const s = c.lastNukeStrike;
    if (!s) continue;
    if (sim.totalDays - s.totalDays > NUKE_FALLOUT_DAYS) continue;
    const dx = px - s.x;
    const dy = py - s.y;
    if (dx * dx + dy * dy <= s.radius * s.radius) {
      return true;
    }
  }
  return false;
}

export function launchNukeAt(
  sim: SimulationState,
  attackerId: number,
  x: number,
  y: number
): { ok: boolean; message: string } {
  const att = sim.countries[attackerId];
  if (!att || !att.alive) {
    return { ok: false, message: 'Tu país debe estar activo para lanzar bombas nucleares.' };
  }
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) {
    return { ok: false, message: 'Objetivo fuera del mapa.' };
  }
  if ((att.nukeCooldownDays ?? 0) > 0) {
    return {
      ok: false,
      message: `Misil nuclear en recarga (${att.nukeCooldownDays} días restantes).`,
    };
  }
  const nukeCost = getNukeCost(sim, attackerId);
  if (att.money < nukeCost) {
    return {
      ok: false,
      message: `Necesitas $${nukeCost.toLocaleString('es-ES')} para lanzar una Bomba Nuclear.`,
    };
  }

  const centerOwner = sim.ownerGrid[y * MAP_W + x];
  if (centerOwner === attackerId) {
    return { ok: false, message: 'No puedes lanzar una bomba nuclear sobre tu propio territorio.' };
  }
  if (centerOwner >= 0 && hasTreaty(sim, attackerId, centerOwner, TREATY_ALLIANCE)) {
    return {
      ok: false,
      message: `No puedes lanzar una bomba nuclear sobre tu aliado ${getCountryName(sim.countries[centerOwner])}.`,
    };
  }

  // Scan blast circle of NUKE_RADIUS (19 px, slightly smaller than DEFENSE_RADIUS = 24 px)
  const r2 = NUKE_RADIUS * NUKE_RADIUS;
  const minX = Math.max(0, x - NUKE_RADIUS);
  const maxX = Math.min(MAP_W - 1, x + NUKE_RADIUS);
  const minY = Math.max(0, y - NUKE_RADIUS);
  const maxY = Math.min(MAP_H - 1, y + NUKE_RADIUS);

  const hitCounts = new Map<number, number>();
  for (let py = minY; py <= maxY; py++) {
    const dy = py - y;
    const row = py * MAP_W;
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x;
      if (dx * dx + dy * dy > r2) continue;
      const oid = sim.ownerGrid[row + px];
      if (oid < 0 || oid === attackerId) continue;
      if (hasTreaty(sim, attackerId, oid, TREATY_ALLIANCE)) continue;
      const target = sim.countries[oid];
      if (!target || !target.alive) continue;
      hitCounts.set(oid, (hitCounts.get(oid) ?? 0) + 1);
    }
  }

  if (hitCounts.size === 0) {
    return {
      ok: false,
      message: 'Debes apuntar a territorio extranjero enemigo o neutral (no al océano).',
    };
  }

  // Check if any hostile/defending nation's Antibombas radar intercepts the incoming nuclear warhead
  let interceptor: { defenderId: number; station: DefenseCoord; distSq: number } | null = null;
  for (const other of sim.countries) {
    if (!other.alive || other.id === attackerId || other.antiNukes.length === 0) continue;
    if (hasTreaty(sim, attackerId, other.id, TREATY_ALLIANCE)) continue;
    for (const an of other.antiNukes) {
      // Only operational if the defender still controls the station tile
      if (sim.ownerGrid[an.y * MAP_W + an.x] !== other.id) continue;
      const dx = an.x - x;
      const dy = an.y - y;
      const dSq = dx * dx + dy * dy;
      if (dSq <= an.radius * an.radius) {
        if (!interceptor || dSq < interceptor.distSq) {
          interceptor = { defenderId: other.id, station: an, distSq: dSq };
        }
      }
    }
  }

  if (interceptor) {
    const def = sim.countries[interceptor.defenderId];
    att.money = Math.max(0, att.money - nukeCost);
    att.nukeCooldownDays = NUKE_COOLDOWN_DAYS;
    att.aggressiveExpansion = Math.min(100, att.aggressiveExpansion + 8);
    sim.globalTension = Math.min(100, sim.globalTension + 5);

    sim.nukeIntercepts = [
      ...sim.nukeIntercepts.filter((r) => sim.totalDays - r.totalDays <= 12).slice(-11),
      {
        id: sim.nextIdCounter++,
        defenderId: def.id,
        attackerId,
        fromX: interceptor.station.x,
        fromY: interceptor.station.y,
        targetX: x,
        targetY: y,
        totalDays: sim.totalDays,
      },
    ];

    // Attempting a nuclear launch still triggers war & diplomatic fallout with the targeted nation
    const affectedIds = new Set<number>([def.id]);
    if (centerOwner >= 0 && centerOwner !== attackerId && !hasTreaty(sim, attackerId, centerOwner, TREATY_ALLIANCE)) {
      affectedIds.add(centerOwner);
    }
    for (const tid of affectedIds) {
      addRelation(sim, attackerId, tid, -25);
      if (!hasTreaty(sim, attackerId, tid, TREATY_WAR)) {
        sim.truceMonths[idxPair(attackerId, tid)] = 0;
        sim.truceMonths[idxPair(tid, attackerId)] = 0;
        setTreatyFlag(sim, attackerId, tid, TREATY_WAR, true);
        sim.wars.push({ a: attackerId, b: tid, startTotalDays: sim.totalDays });
      }
    }

    // Cyan defensive interception particles at target point
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.15;
      const dist = Math.random() * 8;
      const px = Math.max(0, Math.min(MAP_W - 1, Math.round(x + Math.cos(angle) * dist)));
      const py = Math.max(0, Math.min(MAP_H - 1, Math.round(y + Math.sin(angle) * dist)));
      sim.particles.push({
        x: px,
        y: py,
        r: i % 3 === 0 ? 224 : 34,
        g: i % 3 === 0 ? 242 : 211,
        b: i % 3 === 0 ? 254 : 238,
        life: 12,
        maxLife: 12,
      });
    }

    pushChronicle(
      sim,
      'event',
      `¡ANTIBOMBAS! El radar de ${getCountryName(def)} interceptó y destruyó en el aire la bomba nuclear de ${getCountryName(att)}.`,
      def.id
    );

    if (attackerId === sim.playerId || def.id === sim.playerId || hitCounts.has(sim.playerId)) {
      soundEngine.playAntiNukeIntercept();
    }

    return {
      ok: true,
      message: `¡Bomba nuclear interceptada! El radar Antibombas de ${getCountryName(def)} derribó el misil sin daños.`,
    };
  }

  att.money = Math.max(0, att.money - nukeCost);
  att.nukeCooldownDays = NUKE_COOLDOWN_DAYS;
  att.lastNukeStrike = {
    id: sim.nextIdCounter++,
    x,
    y,
    radius: NUKE_RADIUS,
    totalDays: sim.totalDays,
  };
  att.aggressiveExpansion = Math.min(100, att.aggressiveExpansion + 18);
  sim.globalTension = Math.min(100, sim.globalTension + 12);
  sim.globalStability = Math.max(10, sim.globalStability - 6);

  let totalArmyDestroyed = 0;
  let totalDefensesDestroyed = 0;
  let totalInfraDestroyed = 0;
  const struckNames: string[] = [];
  const struckCapitals: string[] = [];

  for (const [tid, hitPixels] of hitCounts.entries()) {
    const target = sim.countries[tid];
    const hitRatio = Math.min(1, hitPixels / Math.max(1, target.pixels));
    const capDx = target.capitalX - x;
    const capDy = target.capitalY - y;
    const capitalHit = capDx * capDx + capDy * capDy <= r2;

    // Destroy defenses and ports inside blast radius
    const prevDefCount = target.defenses.length;
    target.defenses = target.defenses.filter(
      (d) => (d.x - x) ** 2 + (d.y - y) ** 2 > r2
    );
    totalDefensesDestroyed += prevDefCount - target.defenses.length;

    target.ports = target.ports.filter(
      (p) => (p.x - x) ** 2 + (p.y - y) ** 2 > r2
    );
    target.antiNukes = target.antiNukes.filter(
      (a) => (a.x - x) ** 2 + (a.y - y) ** 2 > r2
    );
    target.barracks = target.barracks.filter(
      (b) => (b.x - x) ** 2 + (b.y - y) ** 2 > r2
    );

    // Severe army devastation scaled by coverage + capital strike
    const pctLoss = Math.min(0.62, 0.24 + hitRatio * 0.34 + (capitalHit ? 0.16 : 0));
    const rawLoss = Math.max(
      Math.round(80 + hitRatio * 140),
      Math.round(target.army * pctLoss)
    );
    const actualArmyLoss = Math.max(0, Math.min(Math.round(target.army - 10), rawLoss));
    target.army = Math.max(10, Math.round(target.army - actualArmyLoss));
    totalArmyDestroyed += actualArmyLoss;

    // Infrastructure & treasury damage
    const citiesLost = Math.min(
      target.cities,
      Math.max(hitRatio >= 0.14 || capitalHit ? 1 : 0, Math.min(3, Math.round(hitRatio * 3.5)))
    );
    const minesLost = Math.min(
      target.goldMines,
      Math.max(hitRatio >= 0.14 || capitalHit ? 1 : 0, Math.min(3, Math.round(hitRatio * 3.5)))
    );
    target.cities = Math.max(0, target.cities - citiesLost);
    target.goldMines = Math.max(0, target.goldMines - minesLost);
    totalInfraDestroyed += citiesLost + minesLost;

    const moneyBurnPct = Math.min(0.32, 0.1 + hitRatio * 0.15 + (capitalHit ? 0.08 : 0));
    target.money = Math.max(0, Math.round(target.money * (1 - moneyBurnPct)));

    if (capitalHit) {
      struckCapitals.push(target.seed.capital);
    }
    struckNames.push(getCountryName(target));

    // Automatically enters war with struck nations (missile strike is an act of war)
    addRelation(sim, attackerId, tid, -35);
    if (!hasTreaty(sim, attackerId, tid, TREATY_WAR)) {
      sim.truceMonths[idxPair(attackerId, tid)] = 0;
      sim.truceMonths[idxPair(tid, attackerId)] = 0;
      setTreatyFlag(sim, attackerId, tid, TREATY_WAR, true);
      sim.wars.push({ a: attackerId, b: tid, startTotalDays: sim.totalDays });
      if (!sim.mapData.landNeighbors[attackerId].has(tid) && att.ports.length > 0) {
        launchNavalLandingFromPort(sim, attackerId, tid);
      }
    }
  }

  // Slight global diplomatic fallout for using nuclear weapons
  for (const other of sim.countries) {
    if (!other.alive || other.id === attackerId || hitCounts.has(other.id)) continue;
    addRelation(sim, attackerId, other.id, -4);
  }

  // Dramatic blast particles inside NUKE_RADIUS
  const particleCount = 42;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.2;
    const dist = Math.random() * NUKE_RADIUS;
    const px = Math.max(0, Math.min(MAP_W - 1, Math.round(x + Math.cos(angle) * dist)));
    const py = Math.max(0, Math.min(MAP_H - 1, Math.round(y + Math.sin(angle) * dist)));
    const isCore = dist < NUKE_RADIUS * 0.45;
    sim.particles.push({
      x: px,
      y: py,
      r: isCore ? 255 : 249,
      g: isCore ? 245 : 115,
      b: isCore ? 175 : 22,
      life: 14,
      maxLife: 14,
    });
  }

  updateAllEconomies(sim, false);

  const primaryNames = struckNames.slice(0, 3).join(', ');
  const capSuffix =
    struckCapitals.length > 0 ? ` (impacto directo en ${struckCapitals[0]})` : '';
  pushChronicle(
    sim,
    'war',
    `¡ATAQUE NUCLEAR! ${getCountryName(att)} detonó una bomba nuclear sobre ${primaryNames}${capSuffix}: -${totalArmyDestroyed.toLocaleString('es-ES')} soldados y ${totalDefensesDestroyed} defensas destruidas.`,
    attackerId
  );

  if (attackerId === sim.playerId || hitCounts.has(sim.playerId)) {
    soundEngine.playNuclearExplosion();
  }

  return {
    ok: true,
    message: `¡Impacto nuclear sobre ${primaryNames}! -${totalArmyDestroyed.toLocaleString('es-ES')} soldados enemigos${totalDefensesDestroyed > 0 ? `, ${totalDefensesDestroyed} defensas` : ''}${totalInfraDestroyed > 0 ? ` y ${totalInfraDestroyed} estructuras` : ''} destruidas.`,
  };
}

function launchNavalLandingFromPort(sim: SimulationState, attackerId: number, defenderId: number) {
  const att = sim.countries[attackerId];
  const def = sim.countries[defenderId];
  if (!att.alive || !def.alive) return;

  let fromX = att.capitalX;
  let fromY = att.capitalY;
  const port = getDirectionalPort(sim, attackerId, defenderId) ?? att.ports[0];
  if (port) {
    fromX = port.x;
    fromY = port.y;
  } else {
    const attCoast = getCoastalCandidates(sim, attackerId);
    if (attCoast.length === 0) return;
    fromX = attCoast[0].x;
    fromY = attCoast[0].y;
  }

  const defCoast = getCoastalCandidates(sim, defenderId);
  let targetX = def.capitalX;
  let targetY = def.capitalY;

  if (defCoast.length > 0) {
    // Pick enemy coast closest to the attacker's staging point
    let bestD = Infinity;
    for (const dc of defCoast) {
      const d = (dc.x - fromX) ** 2 + (dc.y - fromY) ** 2;
      if (d < bestD) {
        bestD = d;
        targetX = dc.x;
        targetY = dc.y;
      }
    }
  } else if (sim.ownerGrid[targetY * MAP_W + targetX] !== defenderId) {
    for (let y = def.bboxMinY; y <= def.bboxMaxY; y++) {
      const row = y * MAP_W;
      let found = false;
      for (let x = def.bboxMinX; x <= def.bboxMaxX; x++) {
        if (sim.ownerGrid[row + x] === defenderId) {
          targetX = x;
          targetY = y;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  sim.invasions.push({
    id: sim.nextIdCounter++,
    attackerId,
    defenderId,
    fromX,
    fromY,
    targetX,
    targetY,
    progress: 0,
  });
}

export function stabilizeSimulationStats(sim: SimulationState) {
  for (const c of sim.countries) {
    c.goldMines = Math.max(0, Math.min(MAX_GOLD_MINES_TOTAL, Math.round(c.goldMines)));
    c.cities = Math.max(0, Math.min(MAX_CITIES_TOTAL, Math.round(c.cities)));
    c.monthlyIncomeBonus = Math.max(
      0,
      Math.min(MAX_MONTHLY_INCOME_BONUS, Math.round(c.monthlyIncomeBonus))
    );
    if (!c.alive) {
      c.netIncome = 0;
      continue;
    }
    const armyCap = getArmyCap(c, sim.difficulty);
    const moneyCap = getMoneyCap(c, sim.difficulty);
    if (c.army > armyCap) c.army = armyCap;
    if (c.money > moneyCap) c.money = moneyCap;
  }
  updateAllEconomies(sim, false);
}

export interface FocusRequirementCheck {
  label: string;
  met: boolean;
}

export interface FocusNodeStatus {
  completed: boolean;
  parentsMet: boolean;
  canComplete: boolean;
  checks: FocusRequirementCheck[];
}

export interface EmpireTargetStatus {
  countryId: number;
  iso2: string;
  name: string;
  conquered: boolean;
  ownedPct: number;
}

export function getEmpireTargetProgress(
  sim: SimulationState,
  countryId: number,
  targetIso2s: string[]
): EmpireTargetStatus[] {
  const targets = targetIso2s
    .map((iso) => sim.countries.find((other) => other.seed.iso2 === iso))
    .filter((other): other is CountryState => Boolean(other && other.id !== countryId));

  if (targets.length === 0) return [];

  const targetIndexById = new Int16Array(sim.countries.length).fill(-1);
  targets.forEach((t, idx) => {
    targetIndexById[t.id] = idx;
  });

  const origCounts = new Int32Array(targets.length);
  const ownedCounts = new Int32Array(targets.length);
  const origGrid = sim.mapData.ownerGrid;
  const curGrid = sim.ownerGrid;

  for (let i = 0; i < origGrid.length; i++) {
    const orig = origGrid[i];
    if (orig < 0) continue;
    const tIdx = targetIndexById[orig];
    if (tIdx < 0) continue;
    origCounts[tIdx]++;
    if (curGrid[i] === countryId) {
      ownedCounts[tIdx]++;
    }
  }

  return targets.map((t, idx) => {
    const origPx = origCounts[idx];
    const ownedPx = ownedCounts[idx];
    const annexedDirectly = !t.alive && t.annexedById === countryId;
    const ownedPct =
      origPx > 0
        ? Math.min(100, Math.round((ownedPx / origPx) * 100))
        : annexedDirectly
          ? 100
          : 0;
    const conquered =
      annexedDirectly ||
      (origPx > 0 && ownedPx >= Math.max(1, Math.ceil(origPx * 0.75)));
    return {
      countryId: t.id,
      iso2: t.seed.iso2,
      name: getCountryName(t),
      conquered,
      ownedPct: conquered ? 100 : ownedPct,
    };
  });
}

export function getEmpirePreviewBounds(
  sim: SimulationState,
  ownerCountryId: number,
  targetCountryIds: number[]
): { x: number; y: number; zoom: number } {
  const included = new Set<number>([ownerCountryId, ...targetCountryIds]);
  const origGrid = sim.mapData.ownerGrid;
  let minX = MAP_W;
  let maxX = 0;
  let minY = MAP_H;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < MAP_H; y++) {
    const row = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      const orig = origGrid[row + x];
      if (orig >= 0 && included.has(orig)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) {
    const owner = sim.countries[ownerCountryId];
    return {
      x: owner ? owner.capitalX : MAP_W / 2,
      y: owner ? owner.capitalY : MAP_H / 2,
      zoom: 2.2,
    };
  }

  const spanX = Math.max(24, maxX - minX + 16);
  const spanY = Math.max(18, maxY - minY + 14);
  // Fit bounding box comfortably with padding on both desktop & mobile
  const zoomX = (MAP_W / spanX) * 0.62;
  const zoomY = (MAP_H / spanY) * 0.56;
  const zoom = Math.max(1.05, Math.min(4.8, Math.min(zoomX, zoomY)));

  return {
    x: (minX + maxX) * 0.5,
    y: (minY + maxY) * 0.5,
    zoom,
  };
}

export function evaluateFocusNodeStatus(
  sim: SimulationState,
  countryId: number,
  node: FocusNode
): FocusNodeStatus {
  const c = sim.countries[countryId];
  if (!c) {
    return { completed: false, parentsMet: false, canComplete: false, checks: [] };
  }
  const doneSet = new Set(c.completedFocusIds ?? []);
  const completed = doneSet.has(node.id);
  const parentsMet =
    node.parents.length === 0
      ? true
      : node.requireAnyParent
        ? node.parents.some((pid) => doneSet.has(pid))
        : node.parents.every((pid) => doneSet.has(pid));

  const checks: FocusRequirementCheck[] = [];
  const req = node.requirements;

  if (req.moneyCost > 0) {
    checks.push({
      label: `Tesoro: $${req.moneyCost.toLocaleString('es-ES')} (tienes $${Math.round(c.money).toLocaleString('es-ES')})`,
      met: completed || c.money >= req.moneyCost,
    });
  }

  if (req.minGoldMines) {
    checks.push({
      label: `Minas de Oro: ${c.goldMines}/${req.minGoldMines}`,
      met: completed || c.goldMines >= req.minGoldMines,
    });
  }

  if (req.minCities) {
    checks.push({
      label: `Ciudades: ${c.cities}/${req.minCities}`,
      met: completed || c.cities >= req.minCities,
    });
  }

  if (req.minArmy) {
    checks.push({
      label: `Ejército: ${Math.round(c.army).toLocaleString('es-ES')}/${req.minArmy.toLocaleString('es-ES')}`,
      met: completed || c.army >= req.minArmy,
    });
  }

  if (req.minAllies) {
    const allyCount = getAllies(sim, countryId).length;
    checks.push({
      label: `Alianzas activas: ${allyCount}/${req.minAllies}`,
      met: completed || allyCount >= req.minAllies,
    });
  }

  if (req.historicalTargetIso2 && req.historicalTargetIso2.length > 0) {
    const targetProgress = getEmpireTargetProgress(sim, countryId, req.historicalTargetIso2);
    for (const tp of targetProgress) {
      checks.push({
        label: tp.conquered
          ? `Invadir ${tp.name} (Conquistado)`
          : tp.ownedPct > 0
            ? `Invadir ${tp.name} (${tp.ownedPct}% controlado)`
            : `Invadir ${tp.name}`,
        met: completed || tp.conquered,
      });
    }
  } else if (req.minExpansionPct) {
    const expandedEnough =
      c.pixels >= Math.round(c.initialPixels * (1 + req.minExpansionPct / 100)) ||
      c.pixels - c.initialPixels >= 15;
    checks.push({
      label: `Expandir territorio +${req.minExpansionPct}%`,
      met: completed || expandedEnough,
    });
  }

  const canComplete = c.alive && !completed && parentsMet && checks.every((ch) => ch.met);
  return { completed, parentsMet, canComplete, checks };
}

export function completeFocusNode(
  sim: SimulationState,
  countryId: number,
  nodeId: string
): { ok: boolean; message: string } {
  const c = sim.countries[countryId];
  if (!c || !c.alive) {
    return { ok: false, message: 'Tu país debe estar activo para completar hitos históricos.' };
  }
  const tree = getCountryGenealogyTree(c.seed);
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) {
    return { ok: false, message: 'Hito histórico no encontrado.' };
  }

  const status = evaluateFocusNodeStatus(sim, countryId, node);
  if (status.completed) {
    return { ok: false, message: 'Este hito histórico ya fue completado.' };
  }
  if (!status.parentsMet) {
    return { ok: false, message: 'Primero debes completar el hito anterior del árbol.' };
  }
  const failed = status.checks.find((ch) => !ch.met);
  if (failed) {
    return { ok: false, message: `Requisito pendiente: ${failed.label}.` };
  }

  const prevName = getCountryName(c);
  c.money = Math.max(0, c.money - node.requirements.moneyCost);
  c.completedFocusIds = [...(c.completedFocusIds ?? []), node.id];

  const eff = node.effects;
  if (eff.incomeBonus) {
    c.focusIncomeBonus = Math.min(20, (c.focusIncomeBonus ?? 0) + eff.incomeBonus);
  }
  if (eff.armyCapBonus) {
    c.focusArmyCapBonus = Math.min(1200, (c.focusArmyCapBonus ?? 0) + eff.armyCapBonus);
  }
  if (eff.defenseBonusPct) {
    c.focusDefenseBonus = Math.min(30, (c.focusDefenseBonus ?? 0) + eff.defenseBonusPct);
  }
  if (eff.moneyBonus) {
    c.money = Math.min(getMoneyCap(c), c.money + eff.moneyBonus);
  }
  if (eff.armyBonus) {
    c.army = Math.min(getArmyCap(c), c.army + eff.armyBonus);
  }
  if (eff.relationsContinentDelta) {
    for (const other of sim.countries) {
      if (other.alive && other.id !== countryId && other.seed.continent === c.seed.continent) {
        if (!hasTreaty(sim, countryId, other.id, TREATY_WAR)) {
          addRelation(sim, countryId, other.id, eff.relationsContinentDelta);
        }
      }
    }
  }

  let renamedTo: string | null = null;
  if (eff.newName) {
    c.customName = eff.newName;
    renamedTo = eff.newName;
  }

  updateAllEconomies(sim, false);

  if (renamedTo) {
    pushChronicle(
      sim,
      'event',
      `¡${prevName} completa «${node.title}» y renace oficialmente como ${renamedTo}!`,
      countryId
    );
    if (countryId === sim.playerId) {
      soundEngine.playAnnexation(true);
    }
    return {
      ok: true,
      message: `¡Histórico! ${prevName} ahora se llama ${renamedTo}.`,
    };
  }

  pushChronicle(
    sim,
    'event',
    `${getCountryName(c)} completa el hito «${node.title}» (${node.era}).`,
    countryId
  );
  if (countryId === sim.playerId) {
    soundEngine.playEvent();
  }
  return {
    ok: true,
    message: `Hito «${node.title}» completado con éxito.`,
  };
}

function updateAllEconomies(sim: SimulationState, applyMonthlyGrowth: boolean) {
  const mineIncome = getGoldMineIncome(sim.difficulty);
  const cityIncome = getCityIncome(sim.difficulty);
  for (const c of sim.countries) {
    if (!c.alive) {
      c.netIncome = 0;
      continue;
    }

    const armyCap = getArmyCap(c, sim.difficulty);

    if (applyMonthlyGrowth) {
      // Crecimiento logístico del ejército: frena suavemente al acercarse a la capacidad militar
      if (c.army < armyCap) {
        const headroom = Math.max(0, 1 - c.army / armyCap);
        const baseGrowth =
          5 + Math.min(30, Math.floor(c.cities * 1.1 + Math.sqrt(Math.max(1, c.pixels)) * 0.4));
        const monthlyArmyGrowth = Math.max(1, Math.round(baseGrowth * headroom));
        c.army = Math.min(armyCap, c.army + monthlyArmyGrowth);
      } else if (c.army > armyCap) {
        const excess = c.army - armyCap;
        c.army = Math.max(armyCap, Math.round(c.army - Math.max(5, excess * 0.15)));
      }

      // Crecimiento económico moderado: +$1/seg cada enero (hasta +10 máximo)
      if (sim.month === 1 && c.monthlyIncomeBonus < MAX_MONTHLY_INCOME_BONUS) {
        c.monthlyIncomeBonus = Math.min(
          MAX_MONTHLY_INCOME_BONUS,
          c.monthlyIncomeBonus + MONTHLY_INCOME_GROWTH
        );
      }

      if (c.aggressiveExpansion > 0) {
        c.aggressiveExpansion = Math.max(0, c.aggressiveExpansion - 1);
      }
    }

    const baseTerritoryIncome = Math.max(
      sim.difficulty === 'hard' ? 12 : 3,
      Math.round(Math.sqrt(Math.max(1, c.pixels)) * (sim.difficulty === 'hard' ? 1.5 : 0.45))
    );
    const minesIncome = c.goldMines * mineIncome;
    const citiesIncome = c.cities * cityIncome;
    const cappedBonus = Math.min(MAX_MONTHLY_INCOME_BONUS, Math.max(0, c.monthlyIncomeBonus));
    const focusBonus = Math.min(20, Math.max(0, c.focusIncomeBonus ?? 0));

    const normalArmy = Math.min(c.army, armyCap);
    const excessArmy = Math.max(0, c.army - armyCap);
    const armyUpkeep = Math.round(normalArmy * 0.004 + excessArmy * 0.015);
    const rawNet = baseTerritoryIncome + minesIncome + citiesIncome + cappedBonus + focusBonus - armyUpkeep;

    c.netIncome = excessArmy > 0 ? Math.max(-25, rawNet) : Math.max(2, rawNet);
  }
}

export function stepSimulationSecond(sim: SimulationState) {
  if (sim.activeEvent || sim.outcome !== 'none') return;
  sim.elapsedSeconds++;
  for (let i = sim.particles.length - 1; i >= 0; i--) {
    sim.particles[i].life--;
    if (sim.particles[i].life <= 0) {
      sim.particles.splice(i, 1);
    }
  }
  updateAllEconomies(sim, false);
  const isHard = sim.difficulty === 'hard';
  for (const c of sim.countries) {
    if (!c.alive) continue;
    const moneyCap = getMoneyCap(c, sim.difficulty);
    c.money = Math.max(0, Math.min(moneyCap, Math.round(c.money + c.netIncome)));
    if (isHard) {
      const armyCap = getArmyCap(c, 'hard');
      const isPlayer = c.id === sim.playerId || isHumanCountry(sim, c.id);
      const gain = isPlayer ? HARD_PLAYER_ARMY_PER_SECOND : HARD_AI_ARMY_PER_SECOND;
      if (c.army < armyCap) {
        c.army = Math.min(armyCap, c.army + gain);
      }
    }
  }
  if (sim.countries[sim.playerId]?.alive && sim.countries[sim.playerId].netIncome > 0) {
    soundEngine.playMoneyEarned(true);
  }

  // Underground rebellion income for annexed human players in multiplayer
  if (sim.isMultiplayer && sim.outcome === 'none') {
    for (const key of Object.keys(sim.humanPlayers)) {
      const cid = Number(key);
      const slot = sim.humanPlayers[cid];
      const country = sim.countries[cid];
      if (slot && country && !country.alive) {
        slot.rebelMoney = Math.min(25000, slot.rebelMoney + REBEL_INCOME_PER_SECOND);
      }
    }
  }

  if (sim.elapsedSeconds <= 4 || sim.elapsedSeconds % 3 === 0) {
    const p = sim.countries[sim.playerId];
    const nextPoint: PlayerHistoryPoint = {
      label: `${sim.elapsedSeconds}s`,
      dateLabel: formatFullDate(sim.day, sim.month, sim.year),
      elapsedSeconds: sim.elapsedSeconds,
      money: Math.round(p.money),
      netIncome: Math.round(p.netIncome),
      army: Math.round(p.army),
      km2: p.pixels * 100,
    };
    sim.playerHistory = [...sim.playerHistory.slice(-59), nextPoint];
  }
}

function relocateCapitalIfNeeded(sim: SimulationState, country: CountryState) {
  const { ownerGrid } = sim;
  if (ownerGrid[country.capitalY * MAP_W + country.capitalX] === country.id) return;
  for (let y = country.bboxMinY; y <= country.bboxMaxY; y++) {
    const row = y * MAP_W;
    for (let x = country.bboxMinX; x <= country.bboxMaxX; x++) {
      if (ownerGrid[row + x] === country.id) {
        country.capitalX = x;
        country.capitalY = y;
        return;
      }
    }
  }
}

function applyCapitalCapturedPenalty(
  sim: SimulationState,
  winner: CountryState,
  loser: CountryState,
  capX: number,
  capY: number
) {
  if (loser.capitalLostPenaltyDone || !loser.alive) return;
  loser.capitalLostPenaltyDone = true;
  const lostArmy = Math.max(1, Math.floor(loser.army * 0.5));
  loser.army = Math.max(1, loser.army - lostArmy);

  for (let k = 0; k < 8; k++) {
    sim.particles.push({
      x: capX + ((k % 3) - 1),
      y: capY + (Math.floor(k / 3) - 1),
      r: 251,
      g: 191,
      b: 36,
      life: 5,
      maxLife: 5,
    });
  }

  pushChronicle(
    sim,
    'capital',
    `¡${getCountryName(winner)} alcanza la capital de ${getCountryName(loser)}! Pierde el 50% de su ejército (-${lostArmy} soldados).`,
    winner.id
  );

  if (winner.id === sim.playerId || loser.id === sim.playerId) {
    soundEngine.playCapitalCaptured(loser.id === sim.playerId);
  }

  relocateCapitalIfNeeded(sim, loser);
}

function processFrontlineBattles(sim: SimulationState) {
  if (sim.wars.length === 0 && sim.invasions.length === 0) return;

  // Enforce 3-year maximum duration per war
  const expiredWars = sim.wars.filter((w) => sim.totalDays - w.startTotalDays >= MAX_WAR_DAYS);
  for (const w of expiredWars) {
    if (hasTreaty(sim, w.a, w.b, TREATY_WAR)) {
      const nA = getCountryName(sim.countries[w.a]);
      const nB = getCountryName(sim.countries[w.b]);
      makePeace(
        sim,
        w.a,
        w.b,
        `Fin de guerra tras alcanzar el límite máximo de 3 años entre ${nA} y ${nB}.`
      );
    }
  }

  if (sim.wars.length === 0 && sim.invasions.length === 0) return;

  const { ownerGrid } = sim;

  // 1. Advance Naval Landings (faster pace)
  for (let i = sim.invasions.length - 1; i >= 0; i--) {
    const inv = sim.invasions[i];
    inv.progress += 45;
    if (inv.progress >= 100) {
      const att = sim.countries[inv.attackerId];
      const def = sim.countries[inv.defenderId];
      if (att.alive && def.alive && hasTreaty(sim, inv.attackerId, inv.defenderId, TREATY_WAR)) {
        let captured = 0;
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            if (dx * dx + dy * dy > 26) continue;
            const px = Math.max(0, Math.min(MAP_W - 1, inv.targetX + dx));
            const py = Math.max(0, Math.min(MAP_H - 1, inv.targetY + dy));
            const idx = py * MAP_W + px;
            if (ownerGrid[idx] === inv.defenderId) {
              // Defensas dentro del radio repelen parte del desembarco
              if (isPixelProtectedByDefense(def, px, py) && Math.random() < 0.6) {
                continue;
              }
              const hitCapital = px === def.capitalX && py === def.capitalY;
              ownerGrid[idx] = inv.attackerId;
              att.pixels++;
              def.pixels--;
              if (px < att.bboxMinX) att.bboxMinX = px;
              if (px > att.bboxMaxX) att.bboxMaxX = px;
              if (py < att.bboxMinY) att.bboxMinY = py;
              if (py > att.bboxMaxY) att.bboxMaxY = py;
              def.ports = def.ports.filter((p) => p.x !== px || p.y !== py);
              def.defenses = def.defenses.filter((d) => d.x !== px || d.y !== py);
              def.antiNukes = def.antiNukes.filter((a) => a.x !== px || a.y !== py);
              def.barracks = def.barracks.filter((b) => b.x !== px || b.y !== py);
              captured++;
              sim.dirtyPixels = true;
              if (hitCapital) {
                applyCapitalCapturedPenalty(sim, att, def, px, py);
              }
            }
          }
        }
        if (captured > 0) {
          sim.mapData.landNeighbors[inv.attackerId].add(inv.defenderId);
          sim.mapData.landNeighbors[inv.defenderId].add(inv.attackerId);
          if (inv.attackerId === sim.playerId) soundEngine.playCapture();
        }
      }
      sim.invasions.splice(i, 1);
    }
  }

  if (sim.wars.length === 0) return;

  // 2. Collect border pixel candidates for active wars (bbox-accelerated)
  const warEdgeMap = new Map<number, number[]>();
  for (const w of sim.wars) {
    const lo = Math.min(w.a, w.b);
    const hi = Math.max(w.a, w.b);
    const key = lo * 256 + hi;
    if (warEdgeMap.has(key)) continue;
    const arr: number[] = [];
    warEdgeMap.set(key, arr);

    const ca = sim.countries[lo];
    const cb = sim.countries[hi];
    if (!ca.alive || !cb.alive) continue;

    const minX = Math.max(0, Math.max(ca.bboxMinX, cb.bboxMinX) - 1);
    const maxX = Math.min(MAP_W - 1, Math.min(ca.bboxMaxX, cb.bboxMaxX) + 1);
    const minY = Math.max(0, Math.max(ca.bboxMinY, cb.bboxMinY) - 1);
    const maxY = Math.min(MAP_H - 1, Math.min(ca.bboxMaxY, cb.bboxMaxY) + 1);

    if (minX > maxX || minY > maxY) continue;

    for (let y = minY; y <= maxY && arr.length < 1600; y++) {
      const row = y * MAP_W;
      for (let x = minX; x <= maxX && arr.length < 1600; x++) {
        const idx = row + x;
        const id = ownerGrid[idx];
        if (id !== lo && id !== hi) continue;

        if (x + 1 < MAP_W) {
          const right = ownerGrid[idx + 1];
          if ((id === lo && right === hi) || (id === hi && right === lo)) {
            arr.push(idx, idx + 1);
          }
        }
        if (y + 1 < MAP_H) {
          const down = ownerGrid[idx + MAP_W];
          if ((id === lo && down === hi) || (id === hi && down === lo)) {
            arr.push(idx, idx + MAP_W);
          }
          if (x + 1 < MAP_W) {
            const diagR = ownerGrid[idx + MAP_W + 1];
            if ((id === lo && diagR === hi) || (id === hi && diagR === lo)) {
              arr.push(idx, idx + MAP_W + 1);
            }
          }
          if (x - 1 >= 0) {
            const diagL = ownerGrid[idx + MAP_W - 1];
            if ((id === lo && diagL === hi) || (id === hi && diagL === lo)) {
              arr.push(idx, idx + MAP_W - 1);
            }
          }
        }
      }
    }
  }

  const annexedThisTick: Array<{ loser: number; winner: number }> = [];

  // 3. Resolve frontline captures purely by Ejército (army numbers)
  for (const [key, pairs] of warEdgeMap.entries()) {
    const aId = Math.floor(key / 256);
    const bId = key % 256;
    const a = sim.countries[aId];
    const b = sim.countries[bId];
    if (!a.alive || !b.alive) continue;

    if (pairs.length === 0) {
      if (a.pixels <= 0) {
        annexedThisTick.push({ loser: aId, winner: bId });
        continue;
      }
      if (b.pixels <= 0) {
        annexedThisTick.push({ loser: bId, winner: aId });
        continue;
      }
      // Si ya solo quedan pocos píxeles aislados tras perder la mayor parte del país, capitula por completo
      if (a.pixels <= 4 && (a.capitalLostPenaltyDone || a.pixels < a.initialPixels) && b.army >= a.army * 0.65) {
        annexedThisTick.push({ loser: aId, winner: bId });
        continue;
      }
      if (b.pixels <= 4 && (b.capitalLostPenaltyDone || b.pixels < b.initialPixels) && a.army >= b.army * 0.65) {
        annexedThisTick.push({ loser: bId, winner: aId });
        continue;
      }

      // No shared land front yet: launch amphibious landing if attacker has port (or defender is down to island remnants)
      const aCanLand = a.ports.length > 0 || b.capitalLostPenaltyDone || b.pixels <= Math.max(8, b.initialPixels * 0.25);
      const bCanLand = b.ports.length > 0 || a.capitalLostPenaltyDone || a.pixels <= Math.max(8, a.initialPixels * 0.25);
      if (sim.invasions.filter((inv) => inv.attackerId === aId && inv.defenderId === bId).length === 0 && aCanLand && Math.random() < 0.45) {
        launchNavalLandingFromPort(sim, aId, bId);
      } else if (sim.invasions.filter((inv) => inv.attackerId === bId && inv.defenderId === aId).length === 0 && bCanLand && Math.random() < 0.45) {
        launchNavalLandingFromPort(sim, bId, aId);
      }
      continue;
    }

    const isHard = sim.difficulty === 'hard';
    const hardBonusA = isHard && aId !== sim.playerId && bId === sim.playerId ? 1.18 : 1.0;
    const hardBonusB = isHard && bId !== sim.playerId && aId === sim.playerId ? 1.18 : 1.0;
    const effA = a.army * (1 + getCountryDefensePct(a) * 0.004) * hardBonusA;
    const effB = b.army * (1 + getCountryDefensePct(b) * 0.004) * hardBonusB;
    const powA = Math.pow(Math.max(1, effA), 1.25);
    const powB = Math.pow(Math.max(1, effB), 1.25);
    const probA = powA / Math.max(1, powA + powB);
    const skirmishes = Math.max(8, Math.min(72, Math.ceil(pairs.length / 6)));

    for (let s = 0; s < skirmishes; s++) {
      const pairIdx = Math.floor(Math.random() * (pairs.length / 2)) * 2;
      const idx1 = pairs[pairIdx];
      const idx2 = pairs[pairIdx + 1];
      const owner1 = ownerGrid[idx1];
      const owner2 = ownerGrid[idx2];
      if (owner1 === owner2) continue;

      const aWins = Math.random() < probA;
      const winnerId = aWins ? aId : bId;
      const loserId = aWins ? bId : aId;

      const targetPixel = owner1 === loserId ? idx1 : owner2 === loserId ? idx2 : -1;
      if (targetPixel >= 0) {
        const px = targetPixel % MAP_W;
        const py = Math.floor(targetPixel / MAP_W);
        const loser = sim.countries[loserId];
        const winner = sim.countries[winnerId];

        // Zona protegida por una defensa dentro de su radio (desactivada si fue irradiada por una bomba nuclear)
        if (!isPixelIrradiated(sim, px, py) && isPixelProtectedByDefense(loser, px, py)) {
          const blockChance = Math.min(0.82, 0.58 + getCountryDefensePct(loser) * 0.002);
          if (Math.random() < blockChance) {
            if (sim.particles.length < 180) {
              sim.particles.push({
                x: px,
                y: py,
                r: 52,
                g: 211,
                b: 153,
                life: 3,
                maxLife: 3,
              });
            }
            continue;
          }
        }

        const hitCapital = px === loser.capitalX && py === loser.capitalY;

        ownerGrid[targetPixel] = winnerId;
        winner.pixels++;
        loser.pixels--;
        if (px < winner.bboxMinX) winner.bboxMinX = px;
        if (px > winner.bboxMaxX) winner.bboxMaxX = px;
        if (py < winner.bboxMinY) winner.bboxMinY = py;
        if (py > winner.bboxMaxY) winner.bboxMaxY = py;
        sim.dirtyPixels = true;

        // Clean any destroyed port, defense, anti-nuke, or barracks on captured pixel
        loser.ports = loser.ports.filter((p) => p.x !== px || p.y !== py);
        loser.defenses = loser.defenses.filter((d) => d.x !== px || d.y !== py);
        loser.antiNukes = loser.antiNukes.filter((a) => a.x !== px || a.y !== py);
        loser.barracks = loser.barracks.filter((b) => b.x !== px || b.y !== py);

        if (hitCapital) {
          applyCapitalCapturedPenalty(sim, winner, loser, px, py);
        }

        const wCol = winner.color;
        if (sim.particles.length < 180) {
          sim.particles.push({
            x: px,
            y: py,
            r: Math.min(255, wCol[0] + 60),
            g: Math.min(255, wCol[1] + 50),
            b: Math.min(255, wCol[2] + 40),
            life: 4,
            maxLife: 4,
          });
        }

        if (winnerId === sim.playerId && Math.random() < 0.35) {
          soundEngine.playCapture();
        }
      }
    }

    // Proportional combat casualties so wars genuinely consume armies and prevent runaway snowballs
    const frontForce = Math.min(a.army, b.army);
    const intensity = Math.min(1, skirmishes / 48);
    const baseCasualties = Math.max(4, Math.round(frontForce * (0.004 + intensity * 0.01)));
    const lossA = Math.min(
      Math.round(a.army * 0.035),
      Math.max(3, Math.round(baseCasualties * (1.25 - probA)))
    );
    const lossB = Math.min(
      Math.round(b.army * 0.035),
      Math.max(3, Math.round(baseCasualties * (0.25 + probA)))
    );
    a.army = Math.max(10, Math.round(a.army - lossA));
    b.army = Math.max(10, Math.round(b.army - lossB));

    // Evitar guerras eternas por los últimos 1-4 píxeles sueltos de un país derrotado
    const capThreshA = a.initialPixels >= 8 ? Math.min(4, Math.floor(a.initialPixels * 0.2)) : 0;
    const capThreshB = b.initialPixels >= 8 ? Math.min(4, Math.floor(b.initialPixels * 0.2)) : 0;

    if (a.pixels <= capThreshA) annexedThisTick.push({ loser: aId, winner: bId });
    else if (b.pixels <= capThreshB) annexedThisTick.push({ loser: bId, winner: aId });
  }

  // 4. Process Annexations (incluyendo absolutamente TODOS los píxeles restantes del país vencido)
  for (const { loser, winner } of annexedThisTick) {
    const l = sim.countries[loser];
    const w = sim.countries[winner];
    if (!l.alive) continue;

    for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
      if (ownerGrid[idx] === loser) {
        ownerGrid[idx] = winner;
        w.pixels++;
        const px = idx % MAP_W;
        const py = Math.floor(idx / MAP_W);
        if (px < w.bboxMinX) w.bboxMinX = px;
        if (px > w.bboxMaxX) w.bboxMaxX = px;
        if (py < w.bboxMinY) w.bboxMinY = py;
        if (py > w.bboxMaxY) w.bboxMaxY = py;
        sim.dirtyPixels = true;
      }
    }

    l.alive = false;
    l.pixels = 0;
    l.ports = [];
    l.defenses = [];
    l.antiNukes = [];
    l.barracks = [];
    l.annexedById = winner;
    l.rebelUnrest = 0;

    // Re-point any previously annexed nations whose occupier was `loser`
    for (const other of sim.countries) {
      if (!other.alive && other.annexedById === loser) {
        other.annexedById = winner;
      }
    }

    // Seed starter rebellion funds for annexed human players in multiplayer
    if (sim.isMultiplayer && sim.humanPlayers[loser]) {
      const slot = sim.humanPlayers[loser];
      slot.rebelMoney = Math.max(slot.rebelMoney, 300);
      slot.rebelArmy = Math.max(slot.rebelArmy, 35);
    }

    const warLoot = Math.min(2500, Math.round(l.money * 0.25));
    w.money = Math.min(getMoneyCap(w), w.money + warLoot);
    w.goldMines = Math.min(
      MAX_GOLD_MINES_TOTAL,
      w.goldMines + Math.min(3, Math.floor(l.goldMines * 0.25))
    );
    w.cities = Math.min(
      MAX_CITIES_TOTAL,
      w.cities + Math.min(4, Math.floor(l.cities * 0.25))
    );
    w.aggressiveExpansion += 18;

    for (let j = 0; j < N_COUNTRIES; j++) {
      sim.treaties[idxPair(loser, j)] = 0;
      sim.treaties[idxPair(j, loser)] = 0;
    }
    sim.wars = sim.wars.filter((war) => war.a !== loser && war.b !== loser);
    sim.invasions = sim.invasions.filter((inv) => inv.attackerId !== loser && inv.defenderId !== loser);
    if (sim.diplomaticOffers.length > 0) {
      sim.diplomaticOffers = sim.diplomaticOffers.filter(
        (o) => o.fromCountryId !== loser && o.toCountryId !== loser
      );
    }

    pushChronicle(
      sim,
      'annex',
      `${getCountryName(w)} conquista por completo a ${getCountryName(l)}.`,
      winner
    );

    if (winner === sim.playerId) {
      soundEngine.playAnnexation(true);
      if (l.money > 0) soundEngine.playMoneyEarned(false);
    } else if (loser === sim.playerId) {
      soundEngine.playAnnexation(false);
    }

    if (!sim.isMultiplayer && loser === sim.playerId && !sim.sandboxAfterVictory) {
      sim.outcome = 'defeat';
    }
  }

  if (sim.outcome === 'none' && !sim.sandboxAfterVictory) {
    if (sim.isMultiplayer) {
      let aliveCount = 0;
      let lastAliveId = -1;
      for (const c of sim.countries) {
        if (c.alive) {
          aliveCount++;
          lastAliveId = c.id;
        }
      }
      if (aliveCount === 1 && lastAliveId >= 0) {
        sim.outcome = 'victory';
        sim.winnerCountryId = lastAliveId;
      }
    } else {
      const player = sim.countries[sim.playerId];
      let totalLand = 0;
      for (const c of sim.countries) totalLand += c.pixels;
      if (totalLand > 0 && player.pixels / totalLand >= 0.35) {
        sim.outcome = 'victory';
        sim.winnerCountryId = sim.playerId;
      }
    }
  }
}

function getAiCandidates(sim: SimulationState, c: CountryState): number[] {
  const set = new Set<number>();
  for (const nb of sim.mapData.landNeighbors[c.id]) {
    if (sim.countries[nb].alive && nb !== c.id) set.add(nb);
  }
  for (const nv of sim.mapData.navalNeighbors[c.id]) {
    if (sim.countries[nv].alive && nv !== c.id) set.add(nv);
  }
  for (let k = 0; k < 2; k++) {
    const pick = Math.floor(Math.random() * N_COUNTRIES);
    const other = sim.countries[pick];
    if (other.alive && other.id !== c.id && other.seed.continent === c.seed.continent) {
      set.add(other.id);
    }
  }
  return Array.from(set);
}

function pickAiNukeTarget(sim: SimulationState, enemy: CountryState): { x: number; y: number } | null {
  if (!enemy.alive || enemy.pixels <= 0) return null;

  const isCoveredByEnemyAntiNuke = (tx: number, ty: number) =>
    enemy.antiNukes.some(
      (an) =>
        sim.ownerGrid[an.y * MAP_W + an.x] === enemy.id &&
        (an.x - tx) ** 2 + (an.y - ty) ** 2 <= an.radius * an.radius
    );

  // Prefer enemy capital if still held by enemy (with slight evasion against anti-nuke,
  // while still hitting the capital most of the time so defensive radars intercept visibly)
  if (sim.ownerGrid[enemy.capitalY * MAP_W + enemy.capitalX] === enemy.id) {
    if (!isCoveredByEnemyAntiNuke(enemy.capitalX, enemy.capitalY) || Math.random() < 0.65) {
      return { x: enemy.capitalX, y: enemy.capitalY };
    }
  }

  // Otherwise try enemy defense cluster or random owned territory tile
  for (const def of enemy.defenses) {
    if (sim.ownerGrid[def.y * MAP_W + def.x] === enemy.id && !isCoveredByEnemyAntiNuke(def.x, def.y)) {
      return { x: def.x, y: def.y };
    }
  }

  const w = Math.max(1, enemy.bboxMaxX - enemy.bboxMinX + 1);
  const h = Math.max(1, enemy.bboxMaxY - enemy.bboxMinY + 1);
  let fallback: { x: number; y: number } | null = null;
  for (let tries = 0; tries < 28; tries++) {
    const rx = Math.max(0, Math.min(MAP_W - 1, enemy.bboxMinX + Math.floor(Math.random() * w)));
    const ry = Math.max(0, Math.min(MAP_H - 1, enemy.bboxMinY + Math.floor(Math.random() * h)));
    if (sim.ownerGrid[ry * MAP_W + rx] === enemy.id) {
      if (!isCoveredByEnemyAntiNuke(rx, ry)) {
        return { x: rx, y: ry };
      }
      fallback = { x: rx, y: ry };
    }
  }
  return fallback;
}

function pickStrategicBuildSpot(
  sim: SimulationState,
  c: CountryState,
  existing: DefenseCoord[],
  minSpacing: number,
  preferBorder: boolean
): { x: number; y: number } | null {
  const { ownerGrid } = sim;
  const isClear = (x: number, y: number) =>
    ownerGrid[y * MAP_W + x] === c.id &&
    existing.every((e) => Math.hypot(e.x - x, e.y - y) >= minSpacing);

  // First structure always anchors near capital if valid
  if (existing.length === 0 && isClear(c.capitalX, c.capitalY)) {
    return { x: c.capitalX, y: c.capitalY };
  }

  const w = Math.max(1, c.bboxMaxX - c.bboxMinX + 1);
  const h = Math.max(1, c.bboxMaxY - c.bboxMinY + 1);
  let fallback: { x: number; y: number } | null = null;

  for (let tries = 0; tries < 28; tries++) {
    const rx = Math.max(1, Math.min(MAP_W - 2, c.bboxMinX + Math.floor(Math.random() * w)));
    const ry = Math.max(1, Math.min(MAP_H - 2, c.bboxMinY + Math.floor(Math.random() * h)));
    if (!isClear(rx, ry)) continue;
    if (!preferBorder) return { x: rx, y: ry };

    const idx = ry * MAP_W + rx;
    const l = ownerGrid[idx - 1];
    const r = ownerGrid[idx + 1];
    const u = ownerGrid[idx - MAP_W];
    const d = ownerGrid[idx + MAP_W];
    const touchesForeign =
      (l >= 0 && l !== c.id) ||
      (r >= 0 && r !== c.id) ||
      (u >= 0 && u !== c.id) ||
      (d >= 0 && d !== c.id);
    if (touchesForeign) return { x: rx, y: ry };
    if (!fallback) fallback = { x: rx, y: ry };
  }

  return fallback;
}

function runAiAgentDecision(sim: SimulationState, c: CountryState) {
  if (!c.alive || c.id === sim.playerId) return;

  const isHard = sim.difficulty === 'hard';
  const enemies = getEnemies(sim, c.id);
  const atWar = enemies.length > 0;
  const armyCap = getArmyCap(c, sim.difficulty);
  const recruitCost = getArmyRecruitCost(sim.difficulty);
  const recruitAmount = getArmyRecruitAmount(sim.difficulty);
  const antiNukeCost = getAntiNukeCost(sim.difficulty);
  const barracksCost = getBarracksCost(sim.difficulty);

  // 1. Nuclear strike & military / economic infrastructure
  if (atWar) {
    // 1a. Autonomous AI Nuclear Strike decision when at war and nuclear-capable
    const minNukeDay = isHard ? 35 : 150;
    if (
      (c.nukeCooldownDays ?? 0) <= 0 &&
      c.money >= getNukeCost(sim, c.id) &&
      sim.totalDays >= minNukeDay
    ) {
      // Hard Mode AI prioritizes strongest or capital-holding enemy
      let targetEnemyId = enemies[Math.floor(Math.random() * enemies.length)];
      if (isHard && enemies.length > 1) {
        targetEnemyId = [...enemies].sort(
          (a, b) => sim.countries[b].army - sim.countries[a].army
        )[0];
      }
      const enemy = sim.countries[targetEnemyId];
      const war = sim.wars.find(
        (w) =>
          (w.a === c.id && w.b === targetEnemyId) ||
          (w.a === targetEnemyId && w.b === c.id)
      );
      const warDuration = war ? sim.totalDays - war.startTotalDays : 0;
      const underPressure =
        enemy && (enemy.army >= c.army * 0.85 || c.pixels < c.initialPixels * 0.8);
      const strikeChance = isHard
        ? underPressure
          ? 0.36
          : 0.24
        : underPressure
          ? 0.13
          : c.aiDoctrine === 'expansionist'
            ? 0.075
            : 0.04;

      if (
        enemy &&
        enemy.alive &&
        !hasTreaty(sim, c.id, enemy.id, TREATY_ALLIANCE) &&
        (warDuration >= (isHard ? 8 : 25) || underPressure) &&
        Math.random() < strikeChance
      ) {
        const coords = pickAiNukeTarget(sim, enemy);
        if (coords) {
          const strikeRes = launchNukeAt(sim, c.id, coords.x, coords.y);
          if (strikeRes.ok) {
            return;
          }
        }
      }
    }

    const maxRecruits = isHard ? 10 : 3;
    let recruits = 0;
    while (recruits < maxRecruits && c.army < armyCap && c.money >= recruitCost) {
      c.money -= recruitCost;
      c.army = Math.min(armyCap, c.army + recruitAmount);
      recruits++;
    }
  }

  // Economy & Fortifications (Hard Mode AI also develops & fortifies during war!)
  if (!atWar || isHard) {
    const cityCost = getCityCost(c, sim.difficulty);
    const mineCost = getGoldMineCost(c, sim.difficulty);

    if (
      c.cities < MAX_CITIES_TOTAL &&
      c.citiesBuiltThisMonth < MAX_CITIES_PER_MONTH &&
      c.money >= cityCost &&
      Math.random() < (isHard ? 0.62 : 0.32)
    ) {
      c.money -= cityCost;
      c.cities++;
      c.cityPurchases++;
      c.citiesBuiltThisMonth++;
    } else if (
      c.goldMines < MAX_GOLD_MINES_TOTAL &&
      c.goldMinesBuiltThisMonth < MAX_GOLD_MINES_PER_MONTH &&
      c.money >= mineCost &&
      Math.random() < (isHard ? 0.68 : 0.42)
    ) {
      c.money -= mineCost;
      c.goldMines++;
      c.goldMinePurchases++;
      c.goldMinesBuiltThisMonth++;
    }

    if (!atWar) {
      const targetPeaceArmy = Math.round(armyCap * (isHard ? 0.92 : 0.78));
      const peaceClicks = isHard ? 4 : 1;
      for (let k = 0; k < peaceClicks; k++) {
        if (
          c.army < targetPeaceArmy &&
          c.money >= recruitCost &&
          Math.random() < (isHard ? 0.8 : 0.6)
        ) {
          c.money -= recruitCost;
          c.army = Math.min(armyCap, c.army + recruitAmount);
        }
      }
    }

    // Defenses (spread strategically across borders & capital)
    const maxDefenses = isHard ? Math.min(16, Math.max(5, Math.ceil(Math.sqrt(c.pixels) * 0.45))) : 3;
    if (
      c.defenses.length < maxDefenses &&
      c.money >= DEFENSE_COST &&
      Math.random() < (isHard ? 0.42 : 0.14)
    ) {
      const spot = pickStrategicBuildSpot(sim, c, c.defenses, 10, true);
      if (spot) {
        buildDefenseAt(sim, c.id, spot.x, spot.y);
      }
    }

    // Anti-Nukes (multiple spread radars in Hard Mode)
    const maxAntiNukes = isHard ? 5 : 2;
    if (
      c.antiNukes.length < maxAntiNukes &&
      c.money >= antiNukeCost + (isHard ? 1000 : 400) &&
      Math.random() < (isHard ? 0.38 : 0.15)
    ) {
      const spot = pickStrategicBuildSpot(sim, c, c.antiNukes, 18, false);
      if (spot) {
        buildAntiNukeAt(sim, c.id, spot.x, spot.y);
      }
    }

    // Cuarteles Militares (Barracks) for army cap & rebellion control in Hard Mode
    const maxBarracks = isHard ? 10 : 2;
    if (
      c.barracks.length < maxBarracks &&
      c.money >= barracksCost + (isHard ? 800 : 600) &&
      Math.random() < (isHard ? 0.34 : 0.08)
    ) {
      const spot = pickStrategicBuildSpot(sim, c, c.barracks, 16, false);
      if (spot) {
        buildBarracksAt(sim, c.id, spot.x, spot.y);
      }
    }

    // Ports in Hard Mode for naval power projection
    if (
      isHard &&
      c.ports.length < 3 &&
      c.money >= PORT_COST + 600 &&
      hasCoast(sim, c.id) &&
      Math.random() < 0.22
    ) {
      buildPort(sim, c.id);
    }

    // AI nations gradually advance their own historical genealogical tree
    if (Math.random() < (isHard ? 0.18 : 0.08)) {
      const aiTree = getCountryGenealogyTree(c.seed);
      const nextAvailable = aiTree.nodes.find(
        (n) => evaluateFocusNodeStatus(sim, c.id, n).canComplete
      );
      if (nextAvailable) {
        completeFocusNode(sim, c.id, nextAvailable.id);
      }
    }
  }

  // 2. Smart Peace evaluation when losing badly or fighting multiple fronts
  if (atWar) {
    for (const eid of enemies) {
      const war = sim.wars.find(
        (w) => (w.a === c.id && w.b === eid) || (w.a === eid && w.b === c.id)
      );
      if (!war) continue;
      const duration = sim.totalDays - war.startTotalDays;
      const enemy = sim.countries[eid];
      const losingBadly = c.pixels < c.initialPixels * 0.62 || c.army < enemy.army * 0.48;
      const multiFrontStrain = isHard && enemies.length >= 2 && c.army < enemy.army * 0.95;
      const minPeaceDays = isHard ? 75 : 130;

      if (duration > minPeaceDays && (losingBadly || multiFrontStrain) && Math.random() < (isHard ? 0.45 : 0.35)) {
        if (sim.isMultiplayer && isHumanCountry(sim, eid)) {
          const exists = sim.diplomaticOffers.some(
            (o) => o.fromCountryId === c.id && o.toCountryId === eid && o.type === 'peace'
          );
          if (!exists) {
            sim.diplomaticOffers = [
              ...sim.diplomaticOffers.slice(-31),
              { id: sim.nextIdCounter++, fromCountryId: c.id, toCountryId: eid, type: 'peace' },
            ];
          }
        } else if (eid === sim.playerId) {
          if (!sim.pendingProposal) {
            sim.pendingProposal = { id: sim.nextIdCounter++, fromId: c.id, type: 'peace' };
          }
        } else {
          makePeace(sim, c.id, eid);
        }
        return;
      }
    }
  }

  // 3. Autonomous Alliances & Wars (never attacking allies)
  const candidates = getAiCandidates(sim, c);
  if (candidates.length === 0) return;

  // Hard Mode AI intelligently selects the best tactical target (vulnerable neighbor, player hegemon, or strong ally candidate)
  let targetId = candidates[Math.floor(Math.random() * candidates.length)];
  if (isHard && candidates.length > 1) {
    const player = sim.countries[sim.playerId];
    const playerThreatening =
      player?.alive &&
      (player.aggressiveExpansion >= 18 || player.pixels > player.initialPixels * 1.6);

    const scored = candidates
      .filter((cid) => sim.countries[cid]?.alive && !hasTreaty(sim, c.id, cid, TREATY_WAR))
      .map((cid) => {
        const t = sim.countries[cid];
        const isNb = sim.mapData.landNeighbors[c.id].has(cid);
        const targetWars = getEnemies(sim, cid).length;
        let score = Math.random() * 15;
        if (isNb) score += 25;
        if (c.army > t.army * 1.05) score += 20;
        if (targetWars > 0) score += 18; // opportunistic strike on busy nation
        if (cid === sim.playerId && playerThreatening && !hasTreaty(sim, c.id, cid, TREATY_ALLIANCE)) {
          score += 24;
        }
        return { cid, score };
      })
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0) {
      targetId = scored[0].cid;
    }
  }

  const target = sim.countries[targetId];
  if (!target.alive || hasTreaty(sim, c.id, targetId, TREATY_WAR)) return;

  const rel = getRelation(sim, c.id, targetId);
  const isLandNeighbor = sim.mapData.landNeighbors[c.id].has(targetId);
  const isAllied = hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE);

  if (isHard) {
    // Hard Mode: diplomatic nations build strategic blocs, while expansionist powers actively create friction with non-allied neighbors
    if (!isAllied) {
      if (targetId === sim.playerId && (target.aggressiveExpansion >= 15 || target.pixels > target.initialPixels * 1.5)) {
        addRelation(sim, c.id, targetId, -7);
      } else if (isLandNeighbor && c.army >= target.army * 0.92 && Math.random() < 0.72) {
        addRelation(sim, c.id, targetId, -8);
      } else if (rel >= 52 && c.aiDoctrine === 'diplomatic' && Math.random() < 0.55) {
        addRelation(sim, c.id, targetId, 6);
      } else if (!isLandNeighbor && Math.random() < 0.45) {
        addRelation(sim, c.id, targetId, c.army > target.army ? -5 : 5);
      }
    }
  } else {
    if (rel >= 50 && !isAllied) {
      if (Math.random() < 0.6) addRelation(sim, c.id, targetId, c.aiDoctrine === 'diplomatic' ? 5 : 3);
    } else if (isLandNeighbor && c.aiDoctrine === 'expansionist' && c.army > target.army * 1.1) {
      if (Math.random() < 0.55) addRelation(sim, c.id, targetId, -6);
    }
  }

  const newRel = getRelation(sim, c.id, targetId);
  const allianceThreshold = getAllianceRelThreshold(sim.difficulty);

  // Form Strategic Alliances
  if (
    newRel >= allianceThreshold &&
    !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE) &&
    getAllies(sim, c.id).length < 4 &&
    Math.random() < (isHard ? 0.35 : 0.4)
  ) {
    if (sim.isMultiplayer && isHumanCountry(sim, targetId)) {
      if (Math.random() < 0.25) {
        const exists = sim.diplomaticOffers.some(
          (o) => o.fromCountryId === c.id && o.toCountryId === targetId && o.type === 'alliance'
        );
        if (!exists) {
          sim.diplomaticOffers = [
            ...sim.diplomaticOffers.slice(-31),
            { id: sim.nextIdCounter++, fromCountryId: c.id, toCountryId: targetId, type: 'alliance' },
          ];
        }
      }
      return;
    }
    if (targetId === sim.playerId) {
      if (!sim.pendingProposal && Math.random() < (isHard ? 0.16 : 0.25)) {
        sim.pendingProposal = { id: sim.nextIdCounter++, fromId: c.id, type: 'alliance' };
      }
      return;
    }
    proposeAlliance(sim, c.id, targetId);
    return;
  }

  // Declare War (strictly excluding allies!)
  const currentMonthKey = sim.year * 12 + sim.month;
  const ratio = c.army / Math.max(1, target.army);
  const canReachNaval =
    isHard && !isLandNeighbor && c.ports.length > 0 && canReachToAttack(sim, c.id, targetId).ok;

  if (isHard) {
    const canAttackHard =
      sim.wars.length < 26 &&
      enemies.length < 2 &&
      (isLandNeighbor || canReachNaval) &&
      sim.truceMonths[idxPair(c.id, targetId)] <= 0 &&
      !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE);

    const targetIsBusy = getEnemies(sim, targetId).length > 0;
    const hardWantsWar =
      newRel <= 52 ||
      target.aggressiveExpansion >= 14 ||
      targetIsBusy ||
      (targetId === sim.playerId && target.pixels > target.initialPixels * 1.4);

    if (
      canAttackHard &&
      hardWantsWar &&
      ratio >= (targetIsBusy ? 0.85 : 0.96) &&
      Math.random() < 0.52
    ) {
      const res = declareWar(sim, c.id, targetId);
      if (res.ok) {
        sim.lastAiWarMonth = currentMonthKey;
      }
    }
    return;
  }

  // Normal Mode: Declare at most 1 AI war per month
  const canAttack =
    sim.lastAiWarMonth < currentMonthKey &&
    sim.wars.length < 10 &&
    !atWar &&
    isLandNeighbor &&
    sim.truceMonths[idxPair(c.id, targetId)] <= 0 &&
    !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE);

  if (canAttack && (newRel <= 42 || target.aggressiveExpansion >= 20) && ratio >= 1.12 && Math.random() < 0.5) {
    const res = declareWar(sim, c.id, targetId);
    if (res.ok) {
      sim.lastAiWarMonth = currentMonthKey;
    }
  }
}

function runAiPulse(sim: SimulationState) {
  const batchSize = sim.difficulty === 'hard' ? 75 : 48;
  let processed = 0;
  let scanned = 0;
  while (processed < batchSize && scanned < N_COUNTRIES) {
    const id = sim.aiCursor % N_COUNTRIES;
    sim.aiCursor = (sim.aiCursor + 1) % N_COUNTRIES;
    scanned++;
    const c = sim.countries[id];
    if (!c.alive || id === sim.playerId || isHumanCountry(sim, id)) continue;
    runAiAgentDecision(sim, c);
    processed++;
  }
}

function triggerHistoricalEvent(sim: SimulationState) {
  const template = HISTORICAL_EVENTS[Math.floor(Math.random() * HISTORICAL_EVENTS.length)];
  if (template.isGlobal && template.globalEffects) {
    sim.globalStability = Math.max(
      10,
      Math.min(100, sim.globalStability + template.globalEffects.globalStabilityDelta)
    );
    sim.globalTension = Math.max(
      0,
      Math.min(100, sim.globalTension + template.globalEffects.globalTensionDelta)
    );
  }
  pushChronicle(sim, 'event', `Evento Histórico: ${template.title}.`);
  if (!sim.isMultiplayer) {
    sim.activeEvent = {
      template,
      dateLabel: formatDate(sim.month, sim.year),
    };
    soundEngine.playEvent();
  }
}

export function resolveEventChoice(sim: SimulationState, choice: EventChoice) {
  const p = sim.countries[sim.playerId];
  const e = choice.effects;
  const armyCap = getArmyCap(p, sim.difficulty);
  const moneyCap = getMoneyCap(p, sim.difficulty);
  if (e.moneyDelta) {
    const scaledMoneyDelta = sim.difficulty === 'hard' ? Math.round(e.moneyDelta * 5) : e.moneyDelta;
    p.money = Math.max(0, Math.min(moneyCap, Math.round(p.money + scaledMoneyDelta)));
  }
  if (e.armyDeltaPct) {
    const rawDelta = Math.round(p.army * e.armyDeltaPct);
    const maxGain = sim.difficulty === 'hard' ? 2500 : 350;
    const boundedDelta = e.armyDeltaPct > 0 ? Math.min(maxGain, rawDelta) : rawDelta;
    p.army = Math.max(10, Math.min(armyCap, Math.round(p.army + boundedDelta)));
  }
  if (e.globalTensionDelta) {
    sim.globalTension = Math.max(0, Math.min(100, sim.globalTension + e.globalTensionDelta));
  }
  if (e.globalStabilityDelta) {
    sim.globalStability = Math.max(10, Math.min(100, sim.globalStability + e.globalStabilityDelta));
  }
  updateAllEconomies(sim, false);
  sim.activeEvent = null;
  if (e.moneyDelta && e.moneyDelta > 0) {
    soundEngine.playMoneyEarned(false);
  } else {
    soundEngine.playClick();
  }
}

export function stepSimulationDay(sim: SimulationState) {
  if (sim.activeEvent || sim.outcome !== 'none') return;

  sim.totalDays++;
  sim.day++;

  for (const c of sim.countries) {
    if (c.nukeCooldownDays > 0) c.nukeCooldownDays--;
    if (c.lastNukeStrike && sim.totalDays - c.lastNukeStrike.totalDays > NUKE_FALLOUT_DAYS) {
      c.lastNukeStrike = null;
    }
  }

  processFrontlineBattles(sim);

  if (sim.difficulty === 'hard' || sim.totalDays % 2 === 0) {
    runAiPulse(sim);
  }

  if (sim.totalDays % 10 === 0) {
    processAbsorbedCountryRebellions(sim);
  }

  if (sim.totalDays >= sim.nextEventDay) {
    triggerHistoricalEvent(sim);
    sim.nextEventDay = sim.totalDays + 150 + Math.floor(Math.random() * 90);
  }

  if (sim.day > 30) {
    sim.day = 1;
    sim.month++;
    if (sim.month > 12) {
      sim.month = 1;
      sim.year++;
    }

    for (let i = 0; i < sim.truceMonths.length; i++) {
      if (sim.truceMonths[i] > 0) sim.truceMonths[i]--;
    }

    for (const c of sim.countries) {
      c.goldMinesBuiltThisMonth = 0;
      c.citiesBuiltThisMonth = 0;
    }

    sim.globalStability += (72 - sim.globalStability) * 0.03;
    updateAllEconomies(sim, true);
  }
}

function normalizeCountryLookup(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function findDiplomaticCountryByName(
  sim: SimulationState,
  rawQuery: string | undefined,
  excludeIds: number[]
): CountryState | null {
  const q = normalizeCountryLookup(rawQuery || '');
  if (q.length < 3) return null;
  const exact = sim.countries.find((c) => {
    if (!c.alive || excludeIds.includes(c.id)) return false;
    return (
      normalizeCountryLookup(c.seed.name) === q ||
      normalizeCountryLookup(getCountryName(c)) === q
    );
  });
  if (exact) return exact;
  return (
    sim.countries.find((c) => {
      if (!c.alive || excludeIds.includes(c.id)) return false;
      const n1 = normalizeCountryLookup(c.seed.name);
      const n2 = normalizeCountryLookup(getCountryName(c));
      return n1.includes(q) || q.includes(n1) || n2.includes(q) || q.includes(n2);
    }) ?? null
  );
}

function transferDiplomaticTerritory(
  sim: SimulationState,
  fromId: number,
  toId: number,
  pct: number,
  allowFullAnnexation: boolean
): { transferredPixels: number; annexed: boolean } {
  const from = sim.countries[fromId];
  const to = sim.countries[toId];
  if (!from || !to || !from.alive || !to.alive || fromId === toId || pct <= 0) {
    return { transferredPixels: 0, annexed: false };
  }

  const { ownerGrid } = sim;

  // Full peaceful annexation / total unification / total surrender
  if (allowFullAnnexation && pct >= 100) {
    let transferred = 0;
    for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
      if (ownerGrid[idx] === fromId) {
        ownerGrid[idx] = toId;
        to.pixels++;
        transferred++;
        const px = idx % MAP_W;
        const py = Math.floor(idx / MAP_W);
        if (px < to.bboxMinX) to.bboxMinX = px;
        if (px > to.bboxMaxX) to.bboxMaxX = px;
        if (py < to.bboxMinY) to.bboxMinY = py;
        if (py > to.bboxMaxY) to.bboxMaxY = py;
      }
    }

    if (transferred === 0) return { transferredPixels: 0, annexed: false };

    // Transfer intact structures to the new sovereign
    to.defenses.push(...from.defenses);
    to.barracks.push(...from.barracks);
    to.antiNukes.push(...from.antiNukes);
    to.ports.push(...from.ports);

    from.alive = false;
    from.pixels = 0;
    from.ports = [];
    from.defenses = [];
    from.antiNukes = [];
    from.barracks = [];
    from.annexedById = toId;
    from.rebelUnrest = 0;

    for (const other of sim.countries) {
      if (!other.alive && other.annexedById === fromId) {
        other.annexedById = toId;
      }
    }

    to.goldMines = Math.min(
      MAX_GOLD_MINES_TOTAL,
      to.goldMines + Math.min(4, Math.max(1, Math.floor(from.goldMines * 0.5)))
    );
    to.cities = Math.min(
      MAX_CITIES_TOTAL,
      to.cities + Math.min(5, Math.max(1, Math.floor(from.cities * 0.5)))
    );

    for (let j = 0; j < N_COUNTRIES; j++) {
      sim.treaties[idxPair(fromId, j)] = 0;
      sim.treaties[idxPair(j, fromId)] = 0;
    }
    sim.wars = sim.wars.filter((war) => war.a !== fromId && war.b !== fromId);
    sim.invasions = sim.invasions.filter(
      (inv) => inv.attackerId !== fromId && inv.defenderId !== fromId
    );
    if (sim.diplomaticOffers.length > 0) {
      sim.diplomaticOffers = sim.diplomaticOffers.filter(
        (o) => o.fromCountryId !== fromId && o.toCountryId !== fromId
      );
    }

    sim.dirtyPixels = true;
    soundEngine.playAnnexation(toId === sim.playerId);
    return { transferredPixels: transferred, annexed: true };
  }

  // Partial border-nearest cession (keeps capital & at least 1 pixel alive)
  const capIdx = from.capitalY * MAP_W + from.capitalX;
  const candidates: Array<{ idx: number; px: number; py: number; score: number }> = [];

  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    if (ownerGrid[idx] !== fromId) continue;
    if (idx === capIdx) continue;
    const px = idx % MAP_W;
    const py = Math.floor(idx / MAP_W);
    const dx = px - to.capitalX;
    const dy = py - to.capitalY;
    let score = dx * dx + dy * dy;

    // Strongly prefer pixels directly touching the receiving nation's borders
    const touchesRecipient =
      (px > 0 && ownerGrid[idx - 1] === toId) ||
      (px + 1 < MAP_W && ownerGrid[idx + 1] === toId) ||
      (py > 0 && ownerGrid[idx - MAP_W] === toId) ||
      (py + 1 < MAP_H && ownerGrid[idx + MAP_W] === toId);
    if (touchesRecipient) {
      score *= 0.25;
    }

    candidates.push({ idx, px, py, score });
  }

  if (candidates.length === 0) return { transferredPixels: 0, annexed: false };

  const clampedPct = Math.max(1, Math.min(85, pct));
  const targetCount = Math.max(
    1,
    Math.min(candidates.length, Math.round((from.pixels * clampedPct) / 100))
  );

  candidates.sort((a, b) => a.score - b.score);

  let transferred = 0;
  for (let i = 0; i < targetCount; i++) {
    const { idx, px, py } = candidates[i];
    ownerGrid[idx] = toId;
    from.pixels = Math.max(1, from.pixels - 1);
    to.pixels++;
    transferred++;
    if (px < to.bboxMinX) to.bboxMinX = px;
    if (px > to.bboxMaxX) to.bboxMaxX = px;
    if (py < to.bboxMinY) to.bboxMinY = py;
    if (py > to.bboxMaxY) to.bboxMaxY = py;
  }

  if (transferred === 0) return { transferredPixels: 0, annexed: false };

  // Recompute giver's bounding box cleanly
  let minX = MAP_W;
  let maxX = 0;
  let minY = MAP_H;
  let maxY = 0;
  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    if (ownerGrid[idx] !== fromId) continue;
    const px = idx % MAP_W;
    const py = Math.floor(idx / MAP_W);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  if (minX <= maxX && minY <= maxY) {
    from.bboxMinX = minX;
    from.bboxMaxX = maxX;
    from.bboxMinY = minY;
    from.bboxMaxY = maxY;
  }

  // Move any defenses, barracks, antiNukes, or ports standing on transferred pixels
  const keepDef: typeof from.defenses = [];
  for (const d of from.defenses) {
    if (ownerGrid[d.y * MAP_W + d.x] === toId) to.defenses.push(d);
    else keepDef.push(d);
  }
  from.defenses = keepDef;

  const keepBar: typeof from.barracks = [];
  for (const b of from.barracks) {
    if (ownerGrid[b.y * MAP_W + b.x] === toId) to.barracks.push(b);
    else keepBar.push(b);
  }
  from.barracks = keepBar;

  const keepAnti: typeof from.antiNukes = [];
  for (const a of from.antiNukes) {
    if (ownerGrid[a.y * MAP_W + a.x] === toId) to.antiNukes.push(a);
    else keepAnti.push(a);
  }
  from.antiNukes = keepAnti;

  const keepPorts: typeof from.ports = [];
  for (const p of from.ports) {
    if (ownerGrid[p.y * MAP_W + p.x] === toId) to.ports.push(p);
    else keepPorts.push(p);
  }
  from.ports = keepPorts;

  sim.dirtyPixels = true;
  return { transferredPixels: transferred, annexed: false };
}

function placeDiplomaticStructures(
  sim: SimulationState,
  countryId: number,
  kind: 'defense' | 'barracks' | 'antiNuke' | 'port',
  requestedCount: number
): number {
  const c = sim.countries[countryId];
  if (!c || !c.alive || requestedCount <= 0) return 0;

  if (kind === 'port') {
    const coastal = getCoastalCandidates(sim, countryId);
    if (coastal.length === 0) return 0;
    let placed = 0;
    for (const pt of coastal) {
      if (placed >= requestedCount) break;
      if (c.ports.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 10)) continue;
      c.ports.push(pt);
      placed++;
    }
    return placed;
  }

  const { ownerGrid } = sim;
  const ownPixels: Array<{ x: number; y: number; dist: number }> = [];
  const step = c.pixels > 800 ? 3 : c.pixels > 250 ? 2 : 1;
  for (let py = c.bboxMinY; py <= c.bboxMaxY; py += step) {
    for (let px = c.bboxMinX; px <= c.bboxMaxX; px += step) {
      if (ownerGrid[py * MAP_W + px] === countryId) {
        const dist = Math.hypot(px - c.capitalX, py - c.capitalY);
        ownPixels.push({ x: px, y: py, dist });
      }
    }
  }
  if (ownPixels.length === 0 && ownerGrid[c.capitalY * MAP_W + c.capitalX] === countryId) {
    ownPixels.push({ x: c.capitalX, y: c.capitalY, dist: 0 });
  }
  if (ownPixels.length === 0) return 0;

  // Spread points around the capital and key territory
  ownPixels.sort((a, b) => a.dist - b.dist);

  const existingList =
    kind === 'defense' ? c.defenses : kind === 'barracks' ? c.barracks : c.antiNukes;
  const minSpacing = kind === 'defense' ? 12 : 18;
  const radius =
    kind === 'defense'
      ? DEFENSE_RADIUS
      : kind === 'barracks'
        ? BARRACKS_RADIUS
        : ANTI_NUKE_RADIUS;

  let placed = 0;
  for (const pt of ownPixels) {
    if (placed >= requestedCount) break;
    if (existingList.some((e) => Math.hypot(e.x - pt.x, e.y - pt.y) < minSpacing)) continue;
    existingList.push({ x: pt.x, y: pt.y, radius });
    if (kind === 'barracks') {
      for (const other of sim.countries) {
        if (other.alive || other.annexedById !== countryId) continue;
        const origCapX = sim.mapData.capitalX[other.id];
        const origCapY = sim.mapData.capitalY[other.id];
        if (
          Math.hypot(pt.x - origCapX, pt.y - origCapY) <= BARRACKS_RADIUS &&
          (other.rebelUnrest ?? 0) > 0
        ) {
          other.rebelUnrest = Math.max(
            0,
            Math.round((other.rebelUnrest ?? 0) * (1 - BARRACKS_REBELLION_REDUCTION))
          );
        }
      }
    }
    placed++;
  }
  return placed;
}

export function applyDiplomaticMeetingOutcome(
  sim: SimulationState,
  actorId: number,
  targetId: number,
  outcome: DiplomaticMeetingOutcome
): AppliedMeetingResult {
  const actor = sim.countries[actorId];
  const target = sim.countries[targetId];
  const prevRel = getRelation(sim, actorId, targetId);

  if (!actor || !target || !actor.alive || !target.alive || actorId === targetId) {
    return {
      previousRelation: prevRel,
      newRelation: prevRel,
      actualRelationDelta: 0,
      appliedEffects: ['No se pudieron aplicar cambios porque uno de los países ya no está activo.'],
      outcome,
    };
  }

  const actorName = getCountryName(actor);
  const targetName = getCountryName(target);
  const appliedEffects: string[] = [];

  // 1. Relation delta
  const clampedDelta = Math.max(-40, Math.min(35, Math.round(outcome.relationDelta || 0)));
  if (clampedDelta !== 0) {
    addRelation(sim, actorId, targetId, clampedDelta);
  }

  // 2. Financial transfers (clamped to realistic live balances + sovereign credit backing for AI aid)
  const rawPayToTarget = Math.max(0, Math.round(outcome.moneyTransferToTarget || 0));
  if (rawPayToTarget > 0) {
    const actualPay = Math.min(rawPayToTarget, Math.max(0, Math.floor(actor.money)));
    if (actualPay > 0) {
      actor.money -= actualPay;
      target.money += actualPay;
      appliedEffects.push(
        `${actorName} transfirió $${actualPay.toLocaleString('es-ES')} a ${targetName}.`
      );
    }
  }

  const rawPayToPlayer = Math.max(0, Math.round(outcome.moneyTransferToPlayer || 0));
  if (rawPayToPlayer > 0) {
    const maxAidCapacity = Math.max(
      600,
      Math.floor(Math.max(0, target.money) * 0.65),
      Math.round(Math.max(0, target.netIncome) * 3)
    );
    const actualGrant = Math.min(rawPayToPlayer, maxAidCapacity);
    if (actualGrant > 0) {
      const deductedFromCash = Math.min(Math.max(0, target.money), actualGrant);
      target.money = Math.max(0, target.money - deductedFromCash);
      actor.money += actualGrant;
      appliedEffects.push(
        `${targetName} envió $${actualGrant.toLocaleString('es-ES')} en ayuda financiera a ${actorName}.`
      );
      if (actorId === sim.playerId) soundEngine.playMoneyEarned(false);
    }
  }

  // 3. Military troop transfers
  const rawTroopsToPlayer = Math.max(0, Math.round(outcome.soldiersTransferToPlayer || 0));
  if (rawTroopsToPlayer > 0) {
    const maxTargetTroops = Math.max(
      0,
      Math.min(Math.floor(target.army * 0.45), Math.floor(target.army - 50))
    );
    const actualTroops = Math.min(rawTroopsToPlayer, maxTargetTroops);
    if (actualTroops > 0) {
      target.army -= actualTroops;
      actor.army += actualTroops;
      appliedEffects.push(
        `${targetName} envió ${actualTroops.toLocaleString('es-ES')} soldados de refuerzo a ${actorName}.`
      );
    }
  }

  const rawTroopsToTarget = Math.max(0, Math.round(outcome.soldiersTransferToTarget || 0));
  if (rawTroopsToTarget > 0) {
    const maxActorTroops = Math.max(
      0,
      Math.min(Math.floor(actor.army * 0.45), Math.floor(actor.army - 50))
    );
    const actualTroops = Math.min(rawTroopsToTarget, maxActorTroops);
    if (actualTroops > 0) {
      actor.army -= actualTroops;
      target.army += actualTroops;
      appliedEffects.push(
        `${actorName} envió ${actualTroops.toLocaleString('es-ES')} soldados de apoyo a ${targetName}.`
      );
    }
  }

  // 4. Economic infrastructure & military structures built/transferred for the player
  const minesToAdd = Math.max(0, Math.min(5, Math.round(outcome.goldMinesToPlayer || 0)));
  if (minesToAdd > 0) {
    const before = actor.goldMines;
    actor.goldMines = Math.min(MAX_GOLD_MINES_TOTAL, actor.goldMines + minesToAdd);
    const added = actor.goldMines - before;
    if (added > 0) {
      appliedEffects.push(
        `${targetName} financió +${added} ${added === 1 ? 'Mina de Oro' : 'Minas de Oro'} para ${actorName}.`
      );
    }
  }

  const citiesToAdd = Math.max(0, Math.min(5, Math.round(outcome.citiesToPlayer || 0)));
  if (citiesToAdd > 0) {
    const before = actor.cities;
    actor.cities = Math.min(MAX_CITIES_TOTAL, actor.cities + citiesToAdd);
    const added = actor.cities - before;
    if (added > 0) {
      appliedEffects.push(
        `${targetName} desarrolló +${added} ${added === 1 ? 'Ciudad' : 'Ciudades'} en ${actorName}.`
      );
    }
  }

  const portsToAdd = Math.max(0, Math.min(2, Math.round(outcome.portsToPlayer || 0)));
  if (portsToAdd > 0) {
    const placed = placeDiplomaticStructures(sim, actorId, 'port', portsToAdd);
    if (placed > 0) {
      appliedEffects.push(
        `${targetName} construyó +${placed} ${placed === 1 ? 'Puerto naval' : 'Puertos navales'} en la costa de ${actorName}.`
      );
    }
  }

  const defensesToAdd = Math.max(0, Math.min(4, Math.round(outcome.defensesToPlayer || 0)));
  if (defensesToAdd > 0) {
    const placed = placeDiplomaticStructures(sim, actorId, 'defense', defensesToAdd);
    if (placed > 0) {
      appliedEffects.push(
        `${targetName} desplegó +${placed} ${placed === 1 ? 'Defensa militar' : 'Defensas militares'} en tu territorio.`
      );
      if (actorId === sim.playerId) soundEngine.playBuildStructure('defense');
    }
  }

  const barracksToAdd = Math.max(0, Math.min(3, Math.round(outcome.barracksToPlayer || 0)));
  if (barracksToAdd > 0) {
    const placed = placeDiplomaticStructures(sim, actorId, 'barracks', barracksToAdd);
    if (placed > 0) {
      appliedEffects.push(
        `${targetName} construyó +${placed} ${placed === 1 ? 'Cuartel Militar (+500 cap.)' : 'Cuarteles Militares'} en tu territorio.`
      );
      if (actorId === sim.playerId) soundEngine.playBuildStructure('defense');
    }
  }

  const antiNukesToAdd = Math.max(0, Math.min(2, Math.round(outcome.antiNukesToPlayer || 0)));
  if (antiNukesToAdd > 0) {
    const placed = placeDiplomaticStructures(sim, actorId, 'antiNuke', antiNukesToAdd);
    if (placed > 0) {
      appliedEffects.push(
        `${targetName} instaló +${placed} ${placed === 1 ? 'Sistema Antibombas' : 'Sistemas Antibombas'} en tu territorio.`
      );
      if (actorId === sim.playerId) soundEngine.playBuildStructure('defense');
    }
  }

  // 5. Territory cessions & peaceful annexation (mutates ownerGrid on the world map!)
  const rawTerrToPlayer = Math.max(0, Math.min(100, Math.round(outcome.territoryPctToPlayer || 0)));
  let targetWasAnnexed = false;
  if (rawTerrToPlayer > 0 && target.alive) {
    const res = transferDiplomaticTerritory(sim, targetId, actorId, rawTerrToPlayer, true);
    if (res.transferredPixels > 0) {
      const km2 = (res.transferredPixels * 100).toLocaleString('es-ES');
      if (res.annexed) {
        targetWasAnnexed = true;
        appliedEffects.push(
          `¡Unificación total! ${targetName} cedió el 100% de su territorio (${km2} km²) y pasó a formar parte de ${actorName}.`
        );
      } else {
        appliedEffects.push(
          `${targetName} cedió ${km2} km² de territorio fronterizo a ${actorName} en el mapa.`
        );
      }
    }
  }

  const rawTerrToTarget = Math.max(0, Math.min(60, Math.round(outcome.territoryPctToTarget || 0)));
  if (rawTerrToTarget > 0 && target.alive && !targetWasAnnexed) {
    const res = transferDiplomaticTerritory(sim, actorId, targetId, rawTerrToTarget, false);
    if (res.transferredPixels > 0) {
      const km2 = (res.transferredPixels * 100).toLocaleString('es-ES');
      appliedEffects.push(
        `${actorName} cedió ${km2} km² de territorio fronterizo a ${targetName}.`
      );
    }
  }

  // 6. Bilateral Treaty action & Non-aggression Truce (only if target is still alive)
  if (target.alive && !targetWasAnnexed) {
    const currentlyAtWar = hasTreaty(sim, actorId, targetId, TREATY_WAR);
    const currentlyAllied = hasTreaty(sim, actorId, targetId, TREATY_ALLIANCE);

    if (outcome.treatyAction === 'form_alliance' && !currentlyAtWar && !currentlyAllied) {
      setTreatyFlag(sim, actorId, targetId, TREATY_ALLIANCE, true);
      if (getRelation(sim, actorId, targetId) < 60) {
        setRelation(sim, actorId, targetId, 60);
      }
      sim.globalStability = Math.min(100, sim.globalStability + 1);
      appliedEffects.push(`Alianza estratégica firmada entre ${actorName} y ${targetName}.`);
      if (actorId === sim.playerId || targetId === sim.playerId) {
        soundEngine.playAllianceFormed();
      }
    } else if (outcome.treatyAction === 'break_alliance' && currentlyAllied) {
      setTreatyFlag(sim, actorId, targetId, TREATY_ALLIANCE, false);
      if (clampedDelta >= 0) {
        addRelation(sim, actorId, targetId, -12);
      }
      appliedEffects.push(`La alianza entre ${actorName} y ${targetName} quedó disuelta.`);
    } else if (outcome.treatyAction === 'make_peace' && currentlyAtWar) {
      const ok = makePeace(
        sim,
        actorId,
        targetId,
        `Tratado de paz acordado en cumbre diplomática entre ${actorName} y ${targetName}.`
      );
      if (ok) {
        appliedEffects.push(`Paz oficial firmada entre ${actorName} y ${targetName}.`);
      }
    } else if (outcome.treatyAction === 'declare_war' && !currentlyAtWar) {
      if (currentlyAllied) {
        setTreatyFlag(sim, actorId, targetId, TREATY_ALLIANCE, false);
      }
      const warRes = declareWar(sim, targetId, actorId);
      if (warRes.ok) {
        appliedEffects.push(`¡${targetName} declaró la guerra a ${actorName} tras la ruptura de la cumbre!`);
      } else {
        addRelation(sim, actorId, targetId, -15);
        appliedEffects.push(
          `Ruptura diplomática total con ${targetName} (sin frente directo inmediato para iniciar invasión).`
        );
      }
    }

    // Non-aggression pact / Truce
    const truceMonths = Math.max(0, Math.min(24, Math.round(outcome.truceMonthsToSet || 0)));
    if (truceMonths > 0 && !hasTreaty(sim, actorId, targetId, TREATY_WAR)) {
      sim.truceMonths[idxPair(actorId, targetId)] = Math.max(
        sim.truceMonths[idxPair(actorId, targetId)],
        truceMonths
      );
      sim.truceMonths[idxPair(targetId, actorId)] = Math.max(
        sim.truceMonths[idxPair(targetId, actorId)],
        truceMonths
      );
      appliedEffects.push(
        `Pacto de no agresión y tregua activo durante ${truceMonths} meses con ${targetName}.`
      );
    }

    // 7. Multilateral Diplomacy: 3rd-party war, peace, alliance break & ally backing
    const warThird = findDiplomaticCountryByName(sim, outcome.targetDeclaresWarOnCountryName, [
      actorId,
      targetId,
    ]);
    if (warThird && !hasTreaty(sim, targetId, warThird.id, TREATY_WAR)) {
      if (hasTreaty(sim, targetId, warThird.id, TREATY_ALLIANCE)) {
        setTreatyFlag(sim, targetId, warThird.id, TREATY_ALLIANCE, false);
      }
      sim.truceMonths[idxPair(targetId, warThird.id)] = 0;
      sim.truceMonths[idxPair(warThird.id, targetId)] = 0;
      const thirdWar = declareWar(sim, targetId, warThird.id);
      if (thirdWar.ok) {
        appliedEffects.push(
          `${targetName} cumplió el acuerdo y declaró la guerra a ${getCountryName(warThird)}.`
        );
      }
    }

    const peaceThird = findDiplomaticCountryByName(sim, outcome.targetMakesPeaceWithCountryName, [
      actorId,
      targetId,
    ]);
    if (peaceThird && hasTreaty(sim, targetId, peaceThird.id, TREATY_WAR)) {
      const ok = makePeace(
        sim,
        targetId,
        peaceThird.id,
        `Paz mediada por ${actorName} entre ${targetName} y ${getCountryName(peaceThird)}.`
      );
      if (ok) {
        appliedEffects.push(
          `Mediación exitosa: ${targetName} firmó la paz con ${getCountryName(peaceThird)}.`
        );
      }
    }

    const breakAllyThird = findDiplomaticCountryByName(
      sim,
      outcome.targetBreaksAllianceWithCountryName,
      [actorId, targetId]
    );
    if (breakAllyThird && hasTreaty(sim, targetId, breakAllyThird.id, TREATY_ALLIANCE)) {
      setTreatyFlag(sim, targetId, breakAllyThird.id, TREATY_ALLIANCE, false);
      addRelation(sim, targetId, breakAllyThird.id, -20);
      appliedEffects.push(
        `${targetName} rompió su alianza con ${getCountryName(breakAllyThird)}.`
      );
    }

    const alliesRelDelta = Math.max(
      -15,
      Math.min(15, Math.round(outcome.improveRelationsWithAlliesDelta || 0))
    );
    if (alliesRelDelta !== 0) {
      const targetAllies = getAllies(sim, targetId).filter((id) => id !== actorId);
      if (targetAllies.length > 0) {
        for (const allyId of targetAllies) {
          addRelation(sim, actorId, allyId, alliesRelDelta);
        }
        const sign = alliesRelDelta > 0 ? '+' : '';
        appliedEffects.push(
          `${targetName} influyó en sus ${targetAllies.length} aliados (${sign}${alliesRelDelta} relación con cada uno).`
        );
      }
    }

    // 8. Nuclear cooperation & allied nuclear strike
    const nukeThird = findDiplomaticCountryByName(sim, outcome.targetLaunchesNukeOnCountryName, [
      actorId,
      targetId,
    ]);
    if (nukeThird && !hasTreaty(sim, targetId, nukeThird.id, TREATY_ALLIANCE)) {
      const nukeCost = getNukeCost(sim, targetId);
      const prevCooldown = target.nukeCooldownDays ?? 0;
      const hadFunds = target.money >= nukeCost;
      if (!hadFunds) target.money = nukeCost;
      target.nukeCooldownDays = 0;
      const strikeRes = launchNukeAt(sim, targetId, nukeThird.capitalX, nukeThird.capitalY);
      if (strikeRes.ok) {
        appliedEffects.push(
          `¡Ataque nuclear aliado! ${targetName} lanzó una bomba nuclear sobre ${getCountryName(nukeThird)}.`
        );
      } else {
        target.nukeCooldownDays = prevCooldown;
      }
    }
  }

  if (outcome.resetPlayerNukeCooldown) {
    const hadCd = (actor.nukeCooldownDays ?? 0) > 0;
    actor.nukeCooldownDays = 0;
    appliedEffects.push(
      hadCd
        ? `Cooperación nuclear: la recarga de tu bomba nuclear quedó lista al 100% de inmediato.`
        : `Cooperación nuclear: tus sistemas de lanzamiento quedaron listos para operar sin demora.`
    );
  }

  // 9. Rebellion suppression & covert rebellion incitement
  if (outcome.suppressPlayerRebellions) {
    let calmedCount = 0;
    for (const c of sim.countries) {
      if (!c.alive && c.annexedById === actorId && (c.rebelUnrest ?? 0) > 0) {
        c.rebelUnrest = Math.max(0, Math.round((c.rebelUnrest ?? 0) * 0.5));
        calmedCount++;
      }
    }
    appliedEffects.push(
      calmedCount > 0
        ? `Fuerzas de paz de ${targetName} redujeron un 50% la rebeldía en ${calmedCount} territorios anexados.`
        : `${targetName} envió asesores de seguridad interna para reforzar la estabilidad de ${actorName}.`
    );
  }

  const rebelThird = findDiplomaticCountryByName(sim, outcome.inciteRebellionInCountryName, [
    actorId,
    targetId,
  ]);
  if (rebelThird) {
    let incited = 0;
    for (const c of sim.countries) {
      if (!c.alive && c.annexedById === rebelThird.id) {
        c.rebelUnrest = Math.min(100, (c.rebelUnrest ?? 0) + 45);
        incited++;
      }
    }
    if (incited > 0) {
      appliedEffects.push(
        `Operación encubierta: ${targetName} financió rebeldes en ${incited} regiones ocupadas por ${getCountryName(rebelThird)} (+45% rebeldía).`
      );
    } else {
      const armyLoss = Math.min(Math.floor(rebelThird.army * 0.15), 400);
      rebelThird.army = Math.max(50, rebelThird.army - armyLoss);
      appliedEffects.push(
        `Sabotaje interno: ${targetName} desestabilizó a ${getCountryName(rebelThird)} (-${armyLoss.toLocaleString('es-ES')} soldados por disturbios).`
      );
    }
  }

  // Refresh live economies immediately so new mines, cities, territory & armies reflect on HUD right away
  updateAllEconomies(sim, false);

  const newRel = getRelation(sim, actorId, targetId);
  const actualRelationDelta = newRel - prevRel;

  if (actualRelationDelta !== 0) {
    const sign = actualRelationDelta > 0 ? '+' : '';
    appliedEffects.unshift(
      `Relación con ${targetName}: ${prevRel}/100 → ${newRel}/100 (${sign}${actualRelationDelta}).`
    );
  } else if (appliedEffects.length === 0) {
    appliedEffects.push(`La relación con ${targetName} se mantuvo en ${newRel}/100 sin cambios territoriales ni tratados.`);
  }

  const chronicleType = targetWasAnnexed
    ? 'annex'
    : outcome.treatyAction === 'form_alliance'
      ? 'alliance'
      : outcome.treatyAction === 'make_peace'
        ? 'peace'
        : outcome.treatyAction === 'declare_war'
          ? 'war'
          : 'event';

  pushChronicle(
    sim,
    chronicleType,
    `${outcome.diplomaticHeadline} (${actorName} ↔ ${targetName}, relación ${actualRelationDelta >= 0 ? '+' : ''}${actualRelationDelta}).`,
    targetId
  );

  if (actorId === sim.playerId && outcome.treatyAction === 'none' && !targetWasAnnexed) {
    if (actualRelationDelta > 0) {
      soundEngine.playTreaty();
    } else if (actualRelationDelta < 0) {
      soundEngine.playClick();
    }
  }

  return {
    previousRelation: prevRel,
    newRelation: newRel,
    actualRelationDelta,
    appliedEffects,
    outcome,
  };
}

