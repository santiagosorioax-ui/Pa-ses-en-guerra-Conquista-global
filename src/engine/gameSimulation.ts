import { COUNTRIES_195, type CountrySeed } from '../data/countries195';
import {
  ISO2_TO_COUNTRY_ID,
  getCountryGenealogyTree,
  type CountryTreeNode,
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
  recruitsThisMonth: number;
  ports: PortCoord[];
  defenses: DefenseCoord[];
  aggressiveExpansion: number;
  aiDoctrine: AiDoctrine;
  color: [number, number, number];
  bboxMinX: number;
  bboxMaxX: number;
  bboxMinY: number;
  bboxMaxY: number;
  annexedById: number | null;
  customName: string | null;
  completedTreeNodes: string[];
  treeIncomeBonus: number;
  treeArmyCapBonus: number;
  annexedCount: number;
  lastNukeDay: number;
}

export interface NukeBlastEffect {
  id: number;
  x: number;
  y: number;
  radius: number;
  startMs: number;
  durationMs: number;
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

export interface SimulationState {
  playerId: number;
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
  particles: BattleParticle[];
  nukeBlasts: NukeBlastEffect[];
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

export const GOLD_MINE_COST = 160;
export const GOLD_MINE_PRICE_STEP = 50;
export const GOLD_MINE_INCOME = 2; // +$2 cada segundo
export const CITY_COST = 220;
export const CITY_PRICE_STEP = 65;
export const CITY_INCOME = 2; // +$2 cada segundo (+75 capacidad militar)
export const CITY_ARMY_CAP_BONUS = 75;
export const PORT_COST = 180;
export const ARMY_RECRUIT_COST = 120;
export const ARMY_RECRUIT_AMOUNT = 20;
export const GIFT_MONEY_PER_REL = 100;
export const ALLIANCE_REL_THRESHOLD = 70; // escala 1..100
export const MAX_WAR_DAYS = 3 * 12 * 30; // 3 años máximos por guerra (1080 días)
export const MIN_INITIAL_ARMY = 250;
export const MAX_INITIAL_ARMY = 850;
export const MONTHLY_INCOME_GROWTH = 1; // +$1/seg acumulado cada año (máx. +6)
export const MAX_MONTHLY_INCOME_BONUS = 6;
export const MAX_GOLD_MINES_PER_MONTH = 1;
export const MAX_CITIES_PER_MONTH = 1;
export const MAX_GOLD_MINES_TOTAL = 20;
export const MAX_CITIES_TOTAL = 30;
export const DEFENSE_COST = 150;
export const DEFENSE_RADIUS = 24; // radio de alcance en el mapa
export const DEFENSE_BONUS_PCT = 10; // +10% defensa del país por cada defensa
export const NUKE_COST = 900;
export const NUKE_RADIUS = 19; // un poco menos de radio que la defensa (190 km vs 240 km)
export const NUKE_COOLDOWN_DAYS = 90; // 3 meses de recarga entre lanzamientos
export const REBEL_RECRUIT_COST = 100;
export const REBEL_RECRUIT_AMOUNT = 25;
export const REBEL_INCOME_PER_SECOND = 40;
export const CAPITAL_CAPTURE_PENALTY_PCT = 0.3;
export const MAX_TREE_INCOME_BONUS = 6;
export const MAX_TREE_ARMY_CAP_BONUS = 450;

export function getCountryDisplayName(c: CountryState): string {
  return c.customName && c.customName.trim().length > 0 ? c.customName : c.seed.name;
}

export function isHumanCountry(sim: SimulationState, countryId: number): boolean {
  return Boolean(sim.humanPlayers[countryId]);
}

export function computeInitialMoney(seedGdp: number, seedMilitary: number): number {
  return Math.round(120 + Math.sqrt(Math.max(0, seedGdp)) * 2.0 + seedMilitary * 0.45);
}

export function computeInitialArmy(seedMilitary: number): number {
  const t = Math.max(0, Math.min(1, (seedMilitary - 1) / (240 - 1)));
  return Math.round(MIN_INITIAL_ARMY + t * (MAX_INITIAL_ARMY - MIN_INITIAL_ARMY));
}

export function getArmyCap(c: CountryState): number {
  const treeBonus = Math.min(MAX_TREE_ARMY_CAP_BONUS, Math.max(0, c.treeArmyCapBonus ?? 0));
  return Math.round(
    500 + c.cities * CITY_ARMY_CAP_BONUS + Math.sqrt(Math.max(1, c.pixels)) * 60 + treeBonus
  );
}

export function getMoneyCap(c: CountryState): number {
  return Math.round(3500 + c.cities * 600 + Math.sqrt(Math.max(1, c.pixels)) * 300);
}

export function getMaxRecruitsPerMonth(c: CountryState): number {
  return Math.min(10, 4 + Math.floor(c.cities / 4));
}

export function getGoldMineCost(c: CountryState): number {
  return GOLD_MINE_COST + c.goldMinePurchases * GOLD_MINE_PRICE_STEP;
}

export function getCityCost(c: CountryState): number {
  return CITY_COST + c.cityPurchases * CITY_PRICE_STEP;
}

export function getCountryDefensePct(c: CountryState): number {
  return Math.min(120, c.defenses.length * DEFENSE_BONUS_PCT);
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
    focusCountryId,
  };
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
      reason: `Necesitas un Puerto orientado hacia la dirección de ${getCountryDisplayName(sim.countries[defenderId])}.`,
    };
  }
  return { ok: true, viaSea: true };
}

export interface CreateSimulationOptions {
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
  const mapData = buildWorldMapData();
  const ownerGrid = new Int16Array(mapData.ownerGrid);

  const countries: CountryState[] = COUNTRIES_195.map((seed) => {
    const px = mapData.initialPixelCounts[seed.id];
    const startMoney = computeInitialMoney(seed.gdp, seed.military);
    const startArmy = computeInitialArmy(seed.military);

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
      goldMines: Math.max(1, Math.min(3, Math.round(Math.sqrt(seed.gdp) / 55) + 1)),
      cities: Math.max(1, Math.min(4, Math.round(Math.sqrt(seed.popM) / 5.0) + 1)),
      goldMinePurchases: 0,
      cityPurchases: 0,
      goldMinesBuiltThisMonth: 0,
      citiesBuiltThisMonth: 0,
      recruitsThisMonth: 0,
      ports: [],
      defenses: [],
      aggressiveExpansion: 0,
      aiDoctrine: seed.military >= 65 && seed.id % 3 !== 0 ? 'expansionist' : 'diplomatic',
      color: mapData.countryColors[seed.id],
      bboxMinX: MAP_W - 1,
      bboxMaxX: 0,
      bboxMinY: MAP_H - 1,
      bboxMaxY: 0,
      annexedById: null,
      customName: null,
      completedTreeNodes: [],
      treeIncomeBonus: 0,
      treeArmyCapBonus: 0,
      annexedCount: 0,
      lastNukeDay: -999,
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

  const iso2ToId = new Map<string, number>(COUNTRIES_195.map((c) => [c.iso2, c.id]));
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
    isMultiplayer: Boolean(options?.isMultiplayer),
    winnerCountryId: null,
    humanPlayers,
    diplomaticOffers: [],
    day: 1,
    month: 1,
    year: 2026,
    totalDays: 0,
    elapsedSeconds: 0,
    globalStability: 76,
    globalTension: 24,
    countries,
    ownerGrid,
    mapData,
    relations,
    treaties,
    truceMonths,
    wars: [],
    invasions: [],
    particles: [],
    nukeBlasts: [],
    chronicle: [],
    playerHistory: [],
    activeEvent: null,
    pendingProposal: null,
    outcome: 'none',
    sandboxAfterVictory: false,
    dirtyPixels: true,
    nextEventDay: 135,
    nextIdCounter: 1,
    aiCursor: 0,
    lastAiWarMonth: -1,
  };

  // Seed a few initial realistic alliances
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
      : `Campaña iniciada al mando de ${getCountryDisplayName(countries[playerId])}.`,
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

  att.capitalLostPenaltyDone = false;
  def.capitalLostPenaltyDone = false;

  sim.wars.push({ a: attackerId, b: defenderId, startTotalDays: sim.totalDays });
  att.aggressiveExpansion += 14;
  sim.globalTension = Math.min(100, sim.globalTension + 5);
  sim.globalStability = Math.max(10, sim.globalStability - 2);

  pushChronicle(
    sim,
    'war',
    `${getCountryDisplayName(att)} declara la guerra a ${getCountryDisplayName(def)}.`,
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
      setRelation(sim, allyId, attackerId, 10);
      sim.wars.push({ a: allyId, b: attackerId, startTotalDays: sim.totalDays });
      pushChronicle(
        sim,
        'alliance',
        `${getCountryDisplayName(sim.countries[allyId])} entra en guerra en defensa de su aliado ${getCountryDisplayName(def)}.`,
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
  sim.countries[aId].capitalLostPenaltyDone = false;
  sim.countries[bId].capitalLostPenaltyDone = false;
  addRelation(sim, aId, bId, 15);
  sim.globalTension = Math.max(5, sim.globalTension - 3);
  pushChronicle(
    sim,
    'peace',
    customReason ??
      `${getCountryDisplayName(sim.countries[aId])} y ${getCountryDisplayName(sim.countries[bId])} firman la paz.`,
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
        reason: `Ya hay una solicitud de alianza pendiente con ${getCountryDisplayName(to)}.`,
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
    soundEngine.playClick();
    return {
      accepted: false,
      pendingHuman: true,
      reason: `Propuesta de alianza enviada al jugador de ${getCountryDisplayName(to)}.`,
    };
  }

  const rel = getRelation(sim, fromId, toId);
  if (rel >= ALLIANCE_REL_THRESHOLD) {
    setTreatyFlag(sim, fromId, toId, TREATY_ALLIANCE, true);
    addRelation(sim, fromId, toId, 10);
    pushChronicle(
      sim,
      'alliance',
      `${getCountryDisplayName(from)} y ${getCountryDisplayName(to)} firman una Alianza Estratégica.`,
      fromId
    );
    if (fromId === sim.playerId || toId === sim.playerId) soundEngine.playAllianceFormed();
    return {
      accepted: true,
      reason: `¡${getCountryDisplayName(to)} acepta formar una Alianza contigo!`,
    };
  }

  soundEngine.playClick();
  return {
    accepted: false,
    reason: `${getCountryDisplayName(to)} rechaza la alianza (relación ${rel}/100, requiere ${ALLIANCE_REL_THRESHOLD}/100).`,
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
    return {
      ok: false,
      error: `Tu relación con ${getCountryDisplayName(to)} ya está al máximo (100/100).`,
    };
  }

  const actualPoints = Math.max(1, Math.min(relPoints, 100 - currentRel));
  const cost = actualPoints * GIFT_MONEY_PER_REL;
  if (from.money < cost) {
    return {
      ok: false,
      error: `Necesitas $${cost} de dinero para subir +${actualPoints} de relación.`,
    };
  }

  from.money -= cost;
  to.money = Math.min(getMoneyCap(to), to.money + cost);
  addRelation(sim, fromId, toId, actualPoints);
  soundEngine.playClick();
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
  const allyName = getCountryDisplayName(ally);
  const playerName = getCountryDisplayName(player);
  if (!hasTreaty(sim, playerId, allyId, TREATY_ALLIANCE)) {
    return { accepted: false, reason: `${allyName} no es tu aliado.` };
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
      reason: `${allyName} ya está combatiendo junto a ti en todas tus guerras.`,
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
      reason: `Solicitud de ayuda militar enviada a ${allyName}.`,
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
      reason: `${allyName} rechaza ayudarte porque también es aliado de tu enemigo.`,
    };
  }

  if (maxEnemyRel >= 70 && relWithPlayer < 90) {
    addRelation(sim, playerId, allyId, -3);
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${allyName} decide no intervenir debido a su buena relación con tu enemigo.`,
    };
  }

  if (allyCurrentWars >= 2 && relWithPlayer < 82) {
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${allyName} rechaza ayudarte porque ya combate en ${allyCurrentWars} guerras.`,
    };
  }

  const armyRatio = ally.army / Math.max(1, avgEnemyArmy);
  const decisionScore =
    relWithPlayer -
    Math.max(0, maxEnemyRel - 45) * 0.9 -
    allyCurrentWars * 14 +
    (armyRatio >= 0.45 ? 10 : -15) +
    (ally.aiDoctrine === 'diplomatic' ? 5 : 0);

  if (decisionScore < 62) {
    addRelation(sim, playerId, allyId, -2);
    soundEngine.playClick();
    return {
      accepted: false,
      reason: `${allyName} decide mantenerse al margen y no ayudarte en esta guerra.`,
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
    `¡${allyName} responde al llamado de ${playerName} y entra en la guerra para ayudar!`,
    allyId
  );
  soundEngine.playAllyJoinedWar();

  return {
    accepted: true,
    reason: `¡${allyName} acepta ayudarte y declara la guerra a tus enemigos!`,
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
  const toName = getCountryDisplayName(sim.countries[toId]);
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
      reason: `Propuesta de paz enviada a ${toName}.`,
    };
  }
  makePeace(sim, fromId, toId);
  return { ok: true, reason: `Paz firmada con ${toName}.` };
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
    soundEngine.playClick();
    return;
  }

  if (offer.type === 'peace') {
    makePeace(sim, offer.fromCountryId, offer.toCountryId);
  } else if (offer.type === 'alliance') {
    setTreatyFlag(sim, offer.fromCountryId, offer.toCountryId, TREATY_ALLIANCE, true);
    addRelation(sim, offer.fromCountryId, offer.toCountryId, 12);
    pushChronicle(
      sim,
      'alliance',
      `${getCountryDisplayName(from)} y ${getCountryDisplayName(to)} firman una Alianza Estratégica.`,
      offer.fromCountryId
    );
    if (offer.fromCountryId === sim.playerId || offer.toCountryId === sim.playerId) {
      soundEngine.playAllianceFormed();
    }
  } else if (offer.type === 'alliance_help') {
    const enemies = getEnemies(sim, offer.fromCountryId);
    let joined = false;
    for (const eid of enemies) {
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
        `¡${getCountryDisplayName(to)} entra en la guerra en apoyo de su aliado ${getCountryDisplayName(from)}!`,
        offer.toCountryId
      );
      soundEngine.playAllyJoinedWar();
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
    occupierName: occupier ? getCountryDisplayName(occupier) : 'Ocupante',
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

  const occId = status.occupierId;
  const occ = sim.countries[occId];
  const grid = sim.ownerGrid;
  const orig = sim.mapData.originalGrid;

  // Collect homeland pixels currently held by the occupier
  const homelandPixels: number[] = [];
  for (let idx = 0; idx < TOTAL_PIXELS; idx++) {
    if (orig[idx] === countryId && grid[idx] === occId) {
      homelandPixels.push(idx);
    }
  }

  // Fallback: closest pixels of occupier around original capital
  if (homelandPixels.length === 0) {
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

  // Keep at least 2 pixels for occupier if possible so both fight cleanly
  const maxTake = Math.max(1, occ.pixels - 2);
  const finalTake = homelandPixels.slice(0, Math.min(homelandPixels.length, maxTake));
  if (finalTake.length === 0) {
    return { ok: false, error: 'No hay suficiente territorio ocupable para rebelarse.' };
  }

  for (const idx of finalTake) {
    grid[idx] = countryId;
  }

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
  c.capitalX = bestCapIdx % MAP_W;
  c.capitalY = Math.floor(bestCapIdx / MAP_W);
  c.capitalLostPenaltyDone = false;
  c.army = Math.max(10, Math.round(slot.rebelArmy));
  c.money = Math.max(300, Math.round(slot.rebelMoney));
  slot.rebelArmy = 0;
  slot.rebelMoney = 0;
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

  pushChronicle(
    sim,
    'war',
    `¡REBELIÓN! ${getCountryDisplayName(c)} se independiza de ${getCountryDisplayName(occ)} con ${c.army} soldados.`,
    countryId
  );
  soundEngine.playWarDeclared();
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
      `${getCountryDisplayName(from)} y ${getCountryDisplayName(player)} firman una Alianza Estratégica.`,
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
  const cost = getGoldMineCost(c);
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
  const cost = getCityCost(c);
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
  const armyCap = getArmyCap(c);
  if (c.army >= armyCap) {
    return `Capacidad militar máxima alcanzada (${armyCap.toLocaleString('es-ES')}). Construye Ciudades o conquista territorio para ampliarla.`;
  }
  const maxRecruits = getMaxRecruitsPerMonth(c);
  if (c.recruitsThisMonth >= maxRecruits) {
    return `Límite de reclutamiento mensual alcanzado (${maxRecruits}/${maxRecruits} este mes). Espera al próximo mes o construye más Ciudades.`;
  }
  if (c.money < ARMY_RECRUIT_COST) {
    return `Necesitas $${ARMY_RECRUIT_COST} para reclutar ${ARMY_RECRUIT_AMOUNT} soldados.`;
  }
  c.money -= ARMY_RECRUIT_COST;
  c.army = Math.min(armyCap, c.army + ARMY_RECRUIT_AMOUNT);
  c.recruitsThisMonth++;
  updateAllEconomies(sim, false);
  if (countryId === sim.playerId) soundEngine.playRecruit();
  return null;
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

export function getNukeCooldownRemainingDays(sim: SimulationState, countryId: number): number {
  const c = sim.countries[countryId];
  if (!c) return 0;
  const elapsed = sim.totalDays - (c.lastNukeDay ?? -999);
  return Math.max(0, NUKE_COOLDOWN_DAYS - elapsed);
}

export function launchNuclearBombAt(
  sim: SimulationState,
  attackerId: number,
  x: number,
  y: number
): {
  ok: boolean;
  error?: string;
  targetName?: string;
  armyDestroyed?: number;
  defensesDestroyed?: number;
} {
  const att = sim.countries[attackerId];
  if (!att || !att.alive) return { ok: false, error: 'Tu país no está activo.' };
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) {
    return { ok: false, error: 'Posición fuera del mapa.' };
  }

  const cooldown = getNukeCooldownRemainingDays(sim, attackerId);
  if (cooldown > 0) {
    return {
      ok: false,
      error: `Arsenal nuclear recargando: espera ${cooldown} días para lanzar otra bomba.`,
    };
  }
  if (att.money < NUKE_COST) {
    return {
      ok: false,
      error: `Necesitas $${NUKE_COST.toLocaleString('es-ES')} para lanzar una Bomba Nuclear.`,
    };
  }

  // Resolver país objetivo en el punto elegido (con asistencia de 2 px para microestados)
  let targetId = sim.ownerGrid[y * MAP_W + x];
  if (targetId < 0 || targetId === attackerId) {
    let bestDist = Infinity;
    let bestId = -1;
    for (let dy = -2; dy <= 2; dy++) {
      const py = y + dy;
      if (py < 0 || py >= MAP_H) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const px = x + dx;
        if (px < 0 || px >= MAP_W) continue;
        const id = sim.ownerGrid[py * MAP_W + px];
        if (id >= 0 && id !== attackerId) {
          const d2 = dx * dx + dy * dy;
          if (d2 < bestDist) {
            bestDist = d2;
            bestId = id;
          }
        }
      }
    }
    targetId = bestId;
  }

  if (targetId < 0 || targetId === attackerId) {
    return {
      ok: false,
      error: 'Debes apuntar sobre territorio extranjero para lanzar la Bomba Nuclear.',
    };
  }

  const target = sim.countries[targetId];
  if (!target || !target.alive) {
    return { ok: false, error: 'El país objetivo no está activo.' };
  }
  const targetName = getCountryDisplayName(target);
  const attName = getCountryDisplayName(att);

  if (hasTreaty(sim, attackerId, targetId, TREATY_ALLIANCE)) {
    return {
      ok: false,
      error: `No puedes lanzar una Bomba Nuclear contra tu aliado ${targetName}.`,
    };
  }
  const truce = sim.truceMonths[idxPair(attackerId, targetId)];
  if (truce > 0) {
    return {
      ok: false,
      error: `Tregua activa con ${targetName} (${truce} meses restantes).`,
    };
  }

  // Cobrar coste y registrar recarga
  att.money = Math.max(0, Math.round(att.money - NUKE_COST));
  att.lastNukeDay = sim.totalDays;

  // Un misil nuclear declara la guerra automáticamente (sin requerir puerto)
  if (!hasTreaty(sim, attackerId, targetId, TREATY_WAR)) {
    setTreatyFlag(sim, attackerId, targetId, TREATY_ALLIANCE, false);
    setTreatyFlag(sim, attackerId, targetId, TREATY_WAR, true);
    setRelation(sim, attackerId, targetId, 1);
    att.capitalLostPenaltyDone = false;
    target.capitalLostPenaltyDone = false;
    sim.wars.push({ a: attackerId, b: targetId, startTotalDays: sim.totalDays });

    for (const allyId of getAllies(sim, targetId)) {
      if (allyId === attackerId) continue;
      if (
        !hasTreaty(sim, allyId, attackerId, TREATY_WAR) &&
        !hasTreaty(sim, allyId, attackerId, TREATY_ALLIANCE)
      ) {
        setTreatyFlag(sim, allyId, attackerId, TREATY_WAR, true);
        setRelation(sim, allyId, attackerId, 5);
        sim.wars.push({ a: allyId, b: attackerId, startTotalDays: sim.totalDays });
        pushChronicle(
          sim,
          'alliance',
          `${getCountryDisplayName(sim.countries[allyId])} entra en guerra en defensa de ${targetName} tras el ataque nuclear.`,
          allyId
        );
      }
    }
  } else {
    setRelation(sim, attackerId, targetId, 1);
  }

  // Evaluar píxeles afectados dentro del radio nuclear (NUKE_RADIUS)
  const r2 = NUKE_RADIUS * NUKE_RADIUS;
  const hitPixelsByCountry = new Map<number, number>();
  const minY = Math.max(0, y - NUKE_RADIUS);
  const maxY = Math.min(MAP_H - 1, y + NUKE_RADIUS);
  const minX = Math.max(0, x - NUKE_RADIUS);
  const maxX = Math.min(MAP_W - 1, x + NUKE_RADIUS);

  for (let py = minY; py <= maxY; py++) {
    const dy = py - y;
    const row = py * MAP_W;
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x;
      if (dx * dx + dy * dy > r2) continue;
      const cid = sim.ownerGrid[row + px];
      if (cid < 0 || cid === attackerId) continue;
      if (hasTreaty(sim, attackerId, cid, TREATY_ALLIANCE)) continue;
      hitPixelsByCountry.set(cid, (hitPixelsByCountry.get(cid) ?? 0) + 1);
    }
  }

  // Mitigación del 25% si el punto impactado estaba cubierto por defensas activas antes de destruirlas
  const targetProtected = isPixelProtectedByDefense(target, x, y);
  const primaryMitigation = targetProtected ? 0.75 : 1.0;

  let totalDefensesDestroyed = 0;
  let primaryArmyDestroyed = 0;
  let hitPlayer = attackerId === sim.playerId;

  for (const [cid, hitCount] of hitPixelsByCountry.entries()) {
    const victim = sim.countries[cid];
    if (!victim || !victim.alive) continue;
    if (cid === sim.playerId) hitPlayer = true;

    const isPrimary = cid === targetId;
    const isAtWarWithAtt = hasTreaty(sim, attackerId, cid, TREATY_WAR);
    if (!isPrimary && !isAtWarWithAtt && hitCount < 4) continue;

    // Destruir defensas y puertos dentro del radio nuclear
    const prevDefCount = victim.defenses.length;
    victim.defenses = victim.defenses.filter((d) => {
      const dx = d.x - x;
      const dy = d.y - y;
      return dx * dx + dy * dy > r2;
    });
    totalDefensesDestroyed += prevDefCount - victim.defenses.length;

    victim.ports = victim.ports.filter((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return dx * dx + dy * dy > r2;
    });

    const hitFraction = Math.min(1, hitCount / Math.max(12, victim.pixels));
    if (isPrimary) {
      const pct = (0.24 + hitFraction * 0.2) * primaryMitigation;
      const armyLoss = Math.min(
        Math.max(0, Math.round(victim.army - 8)),
        Math.max(18, Math.round(victim.army * pct))
      );
      victim.army = Math.max(8, Math.round(victim.army - armyLoss));
      primaryArmyDestroyed = armyLoss;

      const moneyLoss = Math.min(1200, Math.round(victim.money * 0.18 * primaryMitigation));
      victim.money = Math.max(0, Math.round(victim.money - moneyLoss));

      if (victim.cities > 1) victim.cities -= 1;
      if (victim.goldMines > 1) victim.goldMines -= 1;

      const capDx = victim.capitalX - x;
      const capDy = victim.capitalY - y;
      if (capDx * capDx + capDy * capDy <= r2 && !victim.capitalLostPenaltyDone) {
        applyCapitalCapturedPenalty(sim, att, victim, victim.capitalX, victim.capitalY);
      }
    } else {
      const pct = 0.1 + hitFraction * 0.15;
      const secLoss = Math.min(
        Math.max(0, Math.round(victim.army - 10)),
        Math.max(10, Math.round(victim.army * pct))
      );
      victim.army = Math.max(10, Math.round(victim.army - secLoss));
      addRelation(sim, attackerId, cid, -35);
    }
  }

  // Efecto visual de detonación nuclear + partículas ardientes dentro del radio
  if (!Array.isArray(sim.nukeBlasts)) sim.nukeBlasts = [];
  sim.nukeBlasts.push({
    id: sim.nextIdCounter++,
    x,
    y,
    radius: NUKE_RADIUS,
    startMs: Date.now(),
    durationMs: 2800,
  });
  if (sim.nukeBlasts.length > 12) {
    sim.nukeBlasts.splice(0, sim.nukeBlasts.length - 12);
  }

  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.25;
    const dist = Math.sqrt(Math.random()) * NUKE_RADIUS;
    const px = Math.max(0, Math.min(MAP_W - 1, Math.round(x + Math.cos(angle) * dist)));
    const py = Math.max(0, Math.min(MAP_H - 1, Math.round(y + Math.sin(angle) * dist)));
    const hot = i % 3 === 0;
    sim.particles.push({
      x: px,
      y: py,
      r: 255,
      g: hot ? 238 : 115,
      b: hot ? 140 : 28,
      life: 16 + Math.floor(Math.random() * 14),
      maxLife: 30,
    });
  }

  // Repercusiones geopolíticas globales
  att.aggressiveExpansion += 28;
  sim.globalTension = Math.min(100, sim.globalTension + 12);
  sim.globalStability = Math.max(10, sim.globalStability - 8);
  for (const other of sim.countries) {
    if (!other.alive || other.id === attackerId || other.id === targetId) continue;
    if (hasTreaty(sim, attackerId, other.id, TREATY_ALLIANCE)) continue;
    const isClose =
      sim.mapData.landNeighbors[targetId].has(other.id) ||
      other.seed.continent === target.seed.continent;
    addRelation(sim, attackerId, other.id, isClose ? -12 : -5);
  }

  const defNote =
    totalDefensesDestroyed > 0
      ? `, ${totalDefensesDestroyed} defensa${totalDefensesDestroyed > 1 ? 's' : ''} destruida${totalDefensesDestroyed > 1 ? 's' : ''}`
      : '';
  pushChronicle(
    sim,
    'war',
    `¡${attName} lanza una Bomba Nuclear sobre ${targetName}! (-${primaryArmyDestroyed.toLocaleString('es-ES')} soldados${defNote})`,
    targetId
  );

  updateAllEconomies(sim, false);

  if (hitPlayer || !sim.isMultiplayer) {
    soundEngine.playNuclearExplosion();
  }

  return {
    ok: true,
    targetName,
    armyDestroyed: primaryArmyDestroyed,
    defensesDestroyed: totalDefensesDestroyed,
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

export interface TreeRequirementCheck {
  label: string;
  met: boolean;
  targetCountryId?: number;
}

export interface TreeNodeEvaluation {
  completed: boolean;
  parentMet: boolean;
  requirements: TreeRequirementCheck[];
  canUnlock: boolean;
  reason?: string;
}

export function doesCountryControlTarget(
  sim: SimulationState,
  actorId: number,
  targetId: number
): boolean {
  if (actorId === targetId) return sim.countries[actorId]?.alive ?? false;
  const target = sim.countries[targetId];
  if (!target) return false;
  if (!target.alive && target.annexedById === actorId) return true;
  const capX = sim.mapData.capitalX[targetId];
  const capY = sim.mapData.capitalY[targetId];
  if (capX >= 0 && capX < MAP_W && capY >= 0 && capY < MAP_H) {
    if (sim.ownerGrid[capY * MAP_W + capX] === actorId) return true;
  }
  return false;
}

export function evaluateTreeNode(
  sim: SimulationState,
  countryId: number,
  node: CountryTreeNode
): TreeNodeEvaluation {
  const c = sim.countries[countryId];
  if (!c) {
    return { completed: false, parentMet: false, requirements: [], canUnlock: false, reason: 'País inválido.' };
  }

  const completedList = c.completedTreeNodes ?? [];
  const completed = completedList.includes(node.id);

  let parentMet = true;
  if (node.parentId) {
    parentMet = completedList.includes(node.parentId);
  } else if (node.requiresAnyParent && node.requiresAnyParent.length > 0) {
    parentMet = node.requiresAnyParent.some((pid) => completedList.includes(pid));
  }

  const req = node.requirements;
  const checks: TreeRequirementCheck[] = [];

  if (req.minCities !== undefined) {
    checks.push({
      label: `Ciudades: ${c.cities}/${req.minCities}`,
      met: c.cities >= req.minCities,
    });
  }
  if (req.minGoldMines !== undefined) {
    checks.push({
      label: `Minas de Oro: ${c.goldMines}/${req.minGoldMines}`,
      met: c.goldMines >= req.minGoldMines,
    });
  }
  if (req.minPorts !== undefined && hasCoast(sim, countryId)) {
    checks.push({
      label: `Puertos: ${c.ports.length}/${req.minPorts}`,
      met: c.ports.length >= req.minPorts,
    });
  }
  if (req.minDefenses !== undefined) {
    checks.push({
      label: `Defensas: ${c.defenses.length}/${req.minDefenses}`,
      met: c.defenses.length >= req.minDefenses,
    });
  }
  if (req.minArmy !== undefined) {
    checks.push({
      label: `Ejército: ${Math.round(c.army).toLocaleString('es-ES')}/${req.minArmy.toLocaleString('es-ES')}`,
      met: c.army >= req.minArmy,
    });
  }
  if (req.minMoney !== undefined) {
    checks.push({
      label: `Tesoro: $${Math.round(c.money).toLocaleString('es-ES')}/$${req.minMoney.toLocaleString('es-ES')}`,
      met: c.money >= req.minMoney,
    });
  }
  if (req.minAllies !== undefined) {
    const alliesCount = getAllies(sim, countryId).length;
    checks.push({
      label: `Alianzas activas: ${alliesCount}/${req.minAllies}`,
      met: alliesCount >= req.minAllies,
    });
  }
  if (req.minAnnexations !== undefined) {
    const annexed = c.annexedCount ?? 0;
    checks.push({
      label: `Países conquistados: ${annexed}/${req.minAnnexations}`,
      met: annexed >= req.minAnnexations,
    });
  }
  if (req.minTerritoryPctIncrease !== undefined) {
    const pct = Math.max(0, Math.round(((c.pixels - c.initialPixels) / Math.max(1, c.initialPixels)) * 100));
    checks.push({
      label: `Expansión territorial: +${pct}%/+${req.minTerritoryPctIncrease}%`,
      met: pct >= req.minTerritoryPctIncrease,
    });
  }
  if (req.controlCountriesIso2 && req.controlCountriesIso2.length > 0) {
    for (const iso of req.controlCountriesIso2) {
      const targetId = ISO2_TO_COUNTRY_ID[iso];
      if (targetId === undefined || targetId === countryId) continue;
      const target = sim.countries[targetId];
      if (!target) continue;
      const met = doesCountryControlTarget(sim, countryId, targetId);
      checks.push({
        label: `Controlar ${getCountryDisplayName(target)}`,
        met,
        targetCountryId: targetId,
      });
    }
  }

  if (node.costMoney > 0) {
    checks.push({
      label: `Costo: $${node.costMoney.toLocaleString('es-ES')}`,
      met: c.money >= node.costMoney,
    });
  }

  const allReqsMet = checks.every((ch) => ch.met);

  let reason: string | undefined;
  if (completed) {
    reason = 'Hito histórico completado.';
  } else if (!c.alive) {
    reason = 'Tu país debe estar independiente.';
  } else if (!parentMet) {
    reason = 'Completa primero un hito anterior en la rama.';
  } else if (!allReqsMet) {
    const firstMissing = checks.find((ch) => !ch.met);
    reason = firstMissing ? `Falta: ${firstMissing.label}.` : 'Faltan requisitos.';
  }

  return {
    completed,
    parentMet,
    requirements: checks,
    canUnlock: !completed && c.alive && parentMet && allReqsMet,
    reason,
  };
}

export function unlockCountryTreeNode(
  sim: SimulationState,
  countryId: number,
  nodeId: string
): { ok: boolean; error?: string; renamedTo?: string; title?: string } {
  const c = sim.countries[countryId];
  if (!c || !c.alive) return { ok: false, error: 'País inactivo.' };

  const tree = getCountryGenealogyTree(c.seed.iso2);
  const node = tree.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, error: 'Hito histórico no encontrado.' };

  const evalRes = evaluateTreeNode(sim, countryId, node);
  if (evalRes.completed) {
    return { ok: false, error: 'Este hito histórico ya fue completado.' };
  }
  if (!evalRes.canUnlock) {
    return { ok: false, error: evalRes.reason ?? 'No cumples los requisitos para este hito.' };
  }

  if (node.costMoney > 0) {
    c.money = Math.max(0, Math.round(c.money - node.costMoney));
  }

  if (!c.completedTreeNodes) c.completedTreeNodes = [];
  c.completedTreeNodes.push(node.id);

  const reward = node.reward;
  if (reward.permanentIncomeBonus) {
    c.treeIncomeBonus = Math.min(
      MAX_TREE_INCOME_BONUS,
      (c.treeIncomeBonus ?? 0) + reward.permanentIncomeBonus
    );
  }
  if (reward.permanentArmyCapBonus) {
    c.treeArmyCapBonus = Math.min(
      MAX_TREE_ARMY_CAP_BONUS,
      (c.treeArmyCapBonus ?? 0) + reward.permanentArmyCapBonus
    );
  }

  const armyCap = getArmyCap(c);
  const moneyCap = getMoneyCap(c);

  if (reward.moneyDelta) {
    c.money = Math.min(moneyCap, Math.round(c.money + reward.moneyDelta));
  }
  if (reward.armyDelta) {
    c.army = Math.min(armyCap, Math.round(c.army + reward.armyDelta));
  }

  const prevName = getCountryDisplayName(c);
  let renamedTo: string | undefined;
  if (reward.renameTo) {
    c.customName = reward.renameTo;
    renamedTo = reward.renameTo;
  }

  const chronicleMsg =
    reward.proclamationText ??
    (renamedTo
      ? `¡${prevName} restaura su legado histórico y se proclama ${renamedTo}!`
      : `${getCountryDisplayName(c)} completa el hito histórico «${node.title}».`);

  pushChronicle(sim, 'event', chronicleMsg, countryId);
  updateAllEconomies(sim, false);

  if (countryId === sim.playerId) {
    if (renamedTo) {
      soundEngine.playAllianceFormed();
    } else {
      soundEngine.playBuildStructure('city');
    }
  }

  return { ok: true, renamedTo, title: node.title };
}

export function stabilizeSimulationStats(sim: SimulationState) {
  for (const c of sim.countries) {
    c.goldMines = Math.max(0, Math.min(MAX_GOLD_MINES_TOTAL, Math.round(c.goldMines)));
    c.cities = Math.max(0, Math.min(MAX_CITIES_TOTAL, Math.round(c.cities)));
    c.monthlyIncomeBonus = Math.max(
      0,
      Math.min(MAX_MONTHLY_INCOME_BONUS, Math.round(c.monthlyIncomeBonus))
    );
    c.treeIncomeBonus = Math.max(
      0,
      Math.min(MAX_TREE_INCOME_BONUS, Math.round(c.treeIncomeBonus ?? 0))
    );
    c.treeArmyCapBonus = Math.max(
      0,
      Math.min(MAX_TREE_ARMY_CAP_BONUS, Math.round(c.treeArmyCapBonus ?? 0))
    );
    c.annexedCount = Math.max(0, Math.round(c.annexedCount ?? 0));
    if (!Array.isArray(c.completedTreeNodes)) c.completedTreeNodes = [];
    if (c.customName === undefined) c.customName = null;
    if (typeof c.lastNukeDay !== 'number' || Number.isNaN(c.lastNukeDay)) {
      c.lastNukeDay = -999;
    }
    c.recruitsThisMonth = Math.max(
      0,
      Math.min(getMaxRecruitsPerMonth(c), Math.round(c.recruitsThisMonth ?? 0))
    );
    if (!c.alive) {
      c.netIncome = 0;
      continue;
    }
    const armyCap = getArmyCap(c);
    const moneyCap = getMoneyCap(c);
    if (c.army > armyCap) c.army = armyCap;
    if (c.money > moneyCap) c.money = moneyCap;
  }
  updateAllEconomies(sim, false);
}

function updateAllEconomies(sim: SimulationState, applyMonthlyGrowth: boolean) {
  for (const c of sim.countries) {
    if (!c.alive) {
      c.netIncome = 0;
      continue;
    }

    const armyCap = getArmyCap(c);
    const activeWars = getEnemies(sim, c.id).length;

    if (applyMonthlyGrowth) {
      // Crecimiento logístico suave del ejército hacia la capacidad militar
      if (c.army < armyCap) {
        const headroom = Math.max(0, 1 - c.army / armyCap);
        const baseGrowth =
          3 + Math.min(16, Math.floor(c.cities * 0.7 + Math.sqrt(Math.max(1, c.pixels)) * 0.22));
        const monthlyArmyGrowth = Math.max(1, Math.round(baseGrowth * headroom));
        c.army = Math.min(armyCap, c.army + monthlyArmyGrowth);
      } else if (c.army > armyCap) {
        const excess = c.army - armyCap;
        c.army = Math.max(armyCap, Math.round(c.army - Math.max(5, excess * 0.22)));
      }

      // Deserción moderada si el país entra en bancarrota con déficit activo
      if (c.money <= 0 && c.netIncome < 0 && c.army > 60) {
        const desertion = Math.max(4, Math.round(c.army * 0.03));
        c.army = Math.max(60, c.army - desertion);
      }

      // Crecimiento económico anual muy moderado: +$1/seg cada enero (máx. +6)
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
      2,
      Math.min(24, Math.round(Math.sqrt(Math.max(1, c.pixels)) * 0.3))
    );
    const minesIncome = c.goldMines * GOLD_MINE_INCOME;
    const citiesIncome = c.cities * CITY_INCOME;
    const cappedBonus = Math.min(MAX_MONTHLY_INCOME_BONUS, Math.max(0, c.monthlyIncomeBonus));
    const treeIncome = Math.min(MAX_TREE_INCOME_BONUS, Math.max(0, c.treeIncomeBonus ?? 0));

    const normalArmy = Math.min(c.army, armyCap);
    const excessArmy = Math.max(0, c.army - armyCap);
    const warLogisticsMult = 1 + Math.min(1.5, activeWars * 0.45);
    const armyUpkeep = Math.round(
      normalArmy * 0.008 * warLogisticsMult + excessArmy * 0.025
    );
    const empireAdminCost = Math.floor(Math.max(0, c.pixels - 1200) / 350);
    const rawNet =
      baseTerritoryIncome +
      minesIncome +
      citiesIncome +
      cappedBonus +
      treeIncome -
      armyUpkeep -
      empireAdminCost;

    c.netIncome =
      excessArmy > 0 || activeWars > 0 ? Math.max(-20, rawNet) : Math.max(1, rawNet);
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
  for (const c of sim.countries) {
    if (!c.alive) continue;
    const moneyCap = getMoneyCap(c);
    c.money = Math.max(0, Math.min(moneyCap, Math.round(c.money + c.netIncome)));
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
        slot.rebelMoney = Math.min(15000, slot.rebelMoney + REBEL_INCOME_PER_SECOND);
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
  const lostArmy = Math.max(1, Math.floor(loser.army * CAPITAL_CAPTURE_PENALTY_PCT));
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
    `¡${getCountryDisplayName(winner)} alcanza la capital de ${getCountryDisplayName(loser)}! Pierde el ${Math.round(CAPITAL_CAPTURE_PENALTY_PCT * 100)}% de su ejército (-${lostArmy.toLocaleString('es-ES')} soldados).`,
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
      const nA = getCountryDisplayName(sim.countries[w.a]);
      const nB = getCountryDisplayName(sim.countries[w.b]);
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

    const aFronts = Math.max(1, getEnemies(sim, aId).length);
    const bFronts = Math.max(1, getEnemies(sim, bId).length);
    const effA = (a.army / Math.pow(aFronts, 0.55)) * (1 + getCountryDefensePct(a) * 0.004);
    const effB = (b.army / Math.pow(bFronts, 0.55)) * (1 + getCountryDefensePct(b) * 0.004);
    const powA = Math.pow(Math.max(1, effA), 1.12);
    const powB = Math.pow(Math.max(1, effB), 1.12);
    const probA = powA / Math.max(1, powA + powB);
    const skirmishes = Math.max(4, Math.min(36, Math.ceil(pairs.length / 10)));

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

        // Zona protegida por una defensa dentro de su radio: frena el avance enemigo
        if (isPixelProtectedByDefense(loser, px, py)) {
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

        // Clean any destroyed port or defense on captured pixel
        loser.ports = loser.ports.filter((p) => p.x !== px || p.y !== py);
        loser.defenses = loser.defenses.filter((d) => d.x !== px || d.y !== py);

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
    const intensity = Math.min(1, skirmishes / 28);
    const baseCasualties = Math.max(2, Math.round(frontForce * (0.006 + intensity * 0.012)));
    const lossA = Math.min(
      Math.round(a.army * 0.04),
      Math.max(2, Math.round(baseCasualties * (1.25 - probA)))
    );
    const lossB = Math.min(
      Math.round(b.army * 0.04),
      Math.max(2, Math.round(baseCasualties * (0.25 + probA)))
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
    l.annexedById = winner;

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

    const warLoot = Math.min(1200, Math.round(l.money * 0.2));
    w.money = Math.min(getMoneyCap(w), w.money + warLoot);
    w.goldMines = Math.min(
      MAX_GOLD_MINES_TOTAL,
      w.goldMines + Math.min(2, Math.floor(l.goldMines * 0.2))
    );
    w.cities = Math.min(
      MAX_CITIES_TOTAL,
      w.cities + Math.min(2, Math.floor(l.cities * 0.2))
    );
    w.annexedCount = (w.annexedCount ?? 0) + 1;
    w.aggressiveExpansion += 18;

    // Reacción diplomática regional ante anexiones para evitar expansiones sin consecuencias
    for (const other of sim.countries) {
      if (!other.alive || other.id === winner || other.id === loser) continue;
      if (hasTreaty(sim, winner, other.id, TREATY_ALLIANCE)) continue;
      if (sim.mapData.landNeighbors[winner].has(other.id)) {
        addRelation(sim, winner, other.id, -12);
      } else if (other.seed.continent === l.seed.continent) {
        addRelation(sim, winner, other.id, -5);
      }
    }

    for (let j = 0; j < N_COUNTRIES; j++) {
      sim.treaties[idxPair(loser, j)] = 0;
      sim.treaties[idxPair(j, loser)] = 0;
    }
    sim.wars = sim.wars.filter((war) => war.a !== loser && war.b !== loser);
    sim.invasions = sim.invasions.filter((inv) => inv.attackerId !== loser && inv.defenderId !== loser);

    pushChronicle(
      sim,
      'annex',
      `${getCountryDisplayName(w)} conquista por completo a ${getCountryDisplayName(l)}.`,
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

function runAiAgentDecision(sim: SimulationState, c: CountryState) {
  if (!c.alive || c.id === sim.playerId) return;

  const enemies = getEnemies(sim, c.id);
  const atWar = enemies.length > 0;

  // 1. Improve army and build economy over time (respecting supply & monthly limits)
  const armyCap = getArmyCap(c);
  const maxRecruits = getMaxRecruitsPerMonth(c);
  if (atWar) {
    let recruits = 0;
    while (
      recruits < 3 &&
      c.recruitsThisMonth < maxRecruits &&
      c.army < armyCap &&
      c.money >= ARMY_RECRUIT_COST
    ) {
      c.money -= ARMY_RECRUIT_COST;
      c.army = Math.min(armyCap, c.army + ARMY_RECRUIT_AMOUNT);
      c.recruitsThisMonth++;
      recruits++;
    }
  } else {
    const cityCost = getCityCost(c);
    const mineCost = getGoldMineCost(c);
    if (
      c.cities < MAX_CITIES_TOTAL &&
      c.citiesBuiltThisMonth < MAX_CITIES_PER_MONTH &&
      c.money >= cityCost &&
      Math.random() < 0.42
    ) {
      c.money -= cityCost;
      c.cities++;
      c.cityPurchases++;
      c.citiesBuiltThisMonth++;
    } else if (
      c.goldMines < MAX_GOLD_MINES_TOTAL &&
      c.goldMinesBuiltThisMonth < MAX_GOLD_MINES_PER_MONTH &&
      c.money >= mineCost &&
      Math.random() < 0.48
    ) {
      c.money -= mineCost;
      c.goldMines++;
      c.goldMinePurchases++;
      c.goldMinesBuiltThisMonth++;
    }
    const targetPeaceArmy = Math.round(armyCap * 0.75);
    if (
      c.army < targetPeaceArmy &&
      c.recruitsThisMonth < maxRecruits &&
      c.money >= ARMY_RECRUIT_COST &&
      Math.random() < 0.65
    ) {
      c.money -= ARMY_RECRUIT_COST;
      c.army = Math.min(armyCap, c.army + ARMY_RECRUIT_AMOUNT);
      c.recruitsThisMonth++;
    }
    if (c.defenses.length < 4 && c.money >= DEFENSE_COST && Math.random() < 0.18) {
      buildDefenseAt(sim, c.id, c.capitalX, c.capitalY);
    }

    // Progreso orgánico del árbol genealógico de países controlados por la IA
    if (Math.random() < 0.22) {
      const tree = getCountryGenealogyTree(c.seed.iso2);
      for (const node of tree.nodes) {
        if (c.completedTreeNodes.includes(node.id)) continue;
        const evalNode = evaluateTreeNode(sim, c.id, node);
        if (evalNode.canUnlock) {
          unlockCountryTreeNode(sim, c.id, node.id);
          break;
        }
      }
    }
  }

  // 2. Peace evaluation when losing badly
  if (atWar) {
    for (const eid of enemies) {
      const war = sim.wars.find(
        (w) => (w.a === c.id && w.b === eid) || (w.a === eid && w.b === c.id)
      );
      if (!war) continue;
      const duration = sim.totalDays - war.startTotalDays;
      const enemy = sim.countries[eid];
      const losingBadly = c.pixels < c.initialPixels * 0.6 || c.army < enemy.army * 0.45;
      if (duration > 130 && losingBadly && Math.random() < 0.35) {
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

  // 3. Autonomous Alliances & Wars (max 1 AI war per month)
  const candidates = getAiCandidates(sim, c);
  if (candidates.length === 0) return;

  const targetId = candidates[Math.floor(Math.random() * candidates.length)];
  const target = sim.countries[targetId];
  if (!target.alive || hasTreaty(sim, c.id, targetId, TREATY_WAR)) return;

  const rel = getRelation(sim, c.id, targetId);
  const isLandNeighbor = sim.mapData.landNeighbors[c.id].has(targetId);

  if (rel >= 50 && !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE)) {
    if (Math.random() < 0.6) addRelation(sim, c.id, targetId, c.aiDoctrine === 'diplomatic' ? 5 : 3);
  } else if (isLandNeighbor && c.aiDoctrine === 'expansionist' && c.army > target.army * 1.1) {
    if (Math.random() < 0.55) addRelation(sim, c.id, targetId, -6);
  }

  const newRel = getRelation(sim, c.id, targetId);

  // Form Strategic Alliances
  if (newRel >= ALLIANCE_REL_THRESHOLD && !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE) && getAllies(sim, c.id).length < 4 && Math.random() < 0.4) {
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
      if (!sim.pendingProposal && Math.random() < 0.25) {
        sim.pendingProposal = { id: sim.nextIdCounter++, fromId: c.id, type: 'alliance' };
      }
      return;
    }
    proposeAlliance(sim, c.id, targetId);
    return;
  }

  // Declare at most 1 AI war per month (or coalition defense against runaway aggressors)
  const currentMonthKey = sim.year * 12 + sim.month;
  const ratio = c.army / Math.max(1, target.army);
  const coalitionThreat = target.aggressiveExpansion >= 36 && newRel <= 30 && ratio >= 0.75;
  const canAttack =
    (sim.lastAiWarMonth < currentMonthKey || coalitionThreat) &&
    sim.wars.length < 10 &&
    !atWar &&
    isLandNeighbor &&
    sim.truceMonths[idxPair(c.id, targetId)] <= 0 &&
    !hasTreaty(sim, c.id, targetId, TREATY_ALLIANCE);

  if (
    canAttack &&
    ((newRel <= 40 && ratio >= 1.15) || coalitionThreat) &&
    Math.random() < (coalitionThreat ? 0.65 : 0.45)
  ) {
    const res = declareWar(sim, c.id, targetId);
    if (res.ok) {
      sim.lastAiWarMonth = currentMonthKey;
    }
  }
}

function runAiPulse(sim: SimulationState) {
  const batchSize = 65;
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
  const armyCap = getArmyCap(p);
  const moneyCap = getMoneyCap(p);
  if (e.moneyDelta) {
    p.money = Math.max(0, Math.min(moneyCap, Math.round(p.money + e.moneyDelta)));
  }
  if (e.armyDeltaPct) {
    const rawDelta = Math.round(p.army * e.armyDeltaPct);
    const boundedDelta = e.armyDeltaPct > 0 ? Math.min(150, rawDelta) : rawDelta;
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

  processFrontlineBattles(sim);

  if (sim.totalDays % 2 === 0) {
    runAiPulse(sim);
  }

  if (sim.totalDays >= sim.nextEventDay) {
    triggerHistoricalEvent(sim);
    sim.nextEventDay = sim.totalDays + 180 + Math.floor(Math.random() * 90);
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
      c.recruitsThisMonth = 0;
    }

    sim.globalStability += (72 - sim.globalStability) * 0.03;
    updateAllEconomies(sim, true);
  }
}
