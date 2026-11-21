import { Bytes } from 'firebase/firestore';
import { COUNTRIES_195 } from '../data/countries195';
import {
  N_COUNTRIES,
  formatFullDate,
  stabilizeSimulationStats,
  type AiDoctrine,
  type ChronicleEntry,
  type CountryState,
  type DefenseCoord,
  type HumanDiplomaticOffer,
  type HumanPlayerSlot,
  type NavalInvasion,
  type NukeStrikeRecord,
  type PendingDiplomaticProposal,
  type PlayerHistoryPoint,
  type PortCoord,
  type SimulationState,
} from './gameSimulation';
import { MAP_H, MAP_W, TOTAL_PIXELS, buildWorldMapData, type WorldMapData } from './mapRasterizer';

export const SNAPSHOT_SCHEMA_VERSION = 1;

export interface SerializedCountry {
  id: number;
  alive: boolean;
  pixels: number;
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
  aggressiveExpansion: number;
  aiDoctrine: AiDoctrine;
  bboxMinX: number;
  bboxMaxX: number;
  bboxMinY: number;
  bboxMaxY: number;
  annexedById?: number | null;
  customName?: string | null;
  completedFocusIds?: string[];
  focusIncomeBonus?: number;
  focusArmyCapBonus?: number;
  focusDefenseBonus?: number;
  nukeCooldownDays?: number;
  lastNukeStrike?: NukeStrikeRecord | null;
  rebelUnrest?: number;
}

export interface SerializedCampaignData {
  ownerId: string;
  campaignId: string;
  version: number;
  playerId: number;
  day: number;
  month: number;
  year: number;
  totalDays: number;
  elapsedSeconds: number;
  globalStability: number;
  globalTension: number;
  sandboxAfterVictory: boolean;
  outcome: 'none' | 'victory' | 'defeat';
  nextEventDay: number;
  nextIdCounter: number;
  aiCursor: number;
  lastAiWarMonth: number;
  ownerGridRle: Bytes;
  relationsBytes: Bytes;
  treatiesBytes: Bytes;
  truceMonthsBytes: Bytes;
  countries: SerializedCountry[];
  wars: Array<{ a: number; b: number; startTotalDays: number }>;
  invasions: NavalInvasion[];
  chronicle: ChronicleEntry[];
  playerHistory: PlayerHistoryPoint[];
  pendingProposal?: PendingDiplomaticProposal;
}

export interface RoomWorldStatePayload {
  roomCode: string;
  hostUid: string;
  version: number;
  tick: number;
  day: number;
  month: number;
  year: number;
  totalDays: number;
  elapsedSeconds: number;
  globalStability: number;
  globalTension: number;
  outcome: 'none' | 'victory' | 'defeat';
  winnerCountryId: number | null;
  nextIdCounter: number;
  ownerGridRle: Bytes;
  relationsBytes: Bytes;
  treatiesBytes: Bytes;
  truceMonthsBytes: Bytes;
  countries: SerializedCountry[];
  wars: Array<{ a: number; b: number; startTotalDays: number }>;
  invasions: NavalInvasion[];
  chronicle: ChronicleEntry[];
  humanPlayers: Record<string, HumanPlayerSlot>;
  diplomaticOffers: HumanDiplomaticOffer[];
}

export function encodeOwnerGridRle(ownerGrid: Int16Array): Uint8Array {
  const runs: Array<[number, number]> = [];
  let cur = ownerGrid[0];
  let count = 1;

  for (let i = 1; i < ownerGrid.length; i++) {
    const val = ownerGrid[i];
    if (val === cur && count < 65535) {
      count++;
    } else {
      runs.push([cur, count]);
      cur = val;
      count = 1;
    }
  }
  runs.push([cur, count]);

  const buffer = new ArrayBuffer(runs.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < runs.length; i++) {
    view.setInt16(i * 4, runs[i][0], true);
    view.setUint16(i * 4 + 2, runs[i][1], true);
  }
  return new Uint8Array(buffer);
}

export function decodeOwnerGridRle(bytes: Uint8Array): Int16Array {
  const grid = new Int16Array(TOTAL_PIXELS);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let cursor = 0;

  for (let off = 0; off + 3 < bytes.byteLength; off += 4) {
    const owner = view.getInt16(off, true);
    const count = view.getUint16(off + 2, true);
    const end = Math.min(TOTAL_PIXELS, cursor + count);
    grid.fill(owner, cursor, end);
    cursor = end;
    if (cursor >= TOTAL_PIXELS) break;
  }

  return grid;
}

function int16ArrayToUint8(arr: Int16Array): Uint8Array {
  const buf = new ArrayBuffer(arr.length * 2);
  const view = new DataView(buf);
  for (let i = 0; i < arr.length; i++) {
    view.setInt16(i * 2, arr[i], true);
  }
  return new Uint8Array(buf);
}

function uint8ToInt16Array(bytes: Uint8Array, length: number): Int16Array {
  const out = new Int16Array(length);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < length && i * 2 + 1 < bytes.byteLength; i++) {
    out[i] = view.getInt16(i * 2, true);
  }
  return out;
}

export function buildCampaignMetaPayload(
  uid: string,
  campaignId: string,
  sim: SimulationState
) {
  const p = sim.countries[sim.playerId];
  return {
    ownerId: uid,
    campaignId,
    countryId: sim.playerId,
    countryName: p.seed.name.slice(0, 80),
    countryIso2: p.seed.iso2,
    dateLabel: formatFullDate(sim.day, sim.month, sim.year),
    day: sim.day,
    month: sim.month,
    year: sim.year,
    elapsedSeconds: Math.max(0, Math.round(sim.elapsedSeconds)),
    money: Math.max(0, Math.round(p.money)),
    netIncome: Math.round(p.netIncome),
    army: Math.max(0, Math.round(p.army)),
    pixels: Math.max(0, Math.round(p.pixels)),
    outcome: sim.outcome,
  };
}

function serializeCountries(sim: SimulationState): SerializedCountry[] {
  return sim.countries.map((c) => ({
    id: c.id,
    alive: c.alive,
    pixels: Math.max(0, Math.round(c.pixels)),
    capitalX: c.capitalX,
    capitalY: c.capitalY,
    capitalLostPenaltyDone: c.capitalLostPenaltyDone,
    money: Math.max(0, Math.round(c.money)),
    netIncome: Math.round(c.netIncome),
    monthlyIncomeBonus: c.monthlyIncomeBonus,
    army: Math.max(0, Math.round(c.army)),
    goldMines: c.goldMines,
    cities: c.cities,
    goldMinePurchases: c.goldMinePurchases,
    cityPurchases: c.cityPurchases,
    goldMinesBuiltThisMonth: c.goldMinesBuiltThisMonth,
    citiesBuiltThisMonth: c.citiesBuiltThisMonth,
    ports: c.ports.slice(0, 32).map((p) => ({ x: p.x, y: p.y, nx: p.nx, ny: p.ny })),
    defenses: c.defenses.slice(0, 32).map((d) => ({ x: d.x, y: d.y, radius: d.radius })),
    aggressiveExpansion: c.aggressiveExpansion,
    aiDoctrine: c.aiDoctrine,
    bboxMinX: c.bboxMinX,
    bboxMaxX: c.bboxMaxX,
    bboxMinY: c.bboxMinY,
    bboxMaxY: c.bboxMaxY,
    annexedById: c.annexedById ?? null,
    ...(c.customName ? { customName: c.customName.slice(0, 80) } : {}),
    ...(c.completedFocusIds && c.completedFocusIds.length > 0
      ? { completedFocusIds: c.completedFocusIds.slice(0, 12) }
      : {}),
    ...(c.focusIncomeBonus ? { focusIncomeBonus: Math.min(20, Math.round(c.focusIncomeBonus)) } : {}),
    ...(c.focusArmyCapBonus ? { focusArmyCapBonus: Math.min(1200, Math.round(c.focusArmyCapBonus)) } : {}),
    ...(c.focusDefenseBonus ? { focusDefenseBonus: Math.min(30, Math.round(c.focusDefenseBonus)) } : {}),
    ...(c.nukeCooldownDays ? { nukeCooldownDays: Math.max(0, Math.round(c.nukeCooldownDays)) } : {}),
    ...(c.lastNukeStrike
      ? {
          lastNukeStrike: {
            id: c.lastNukeStrike.id,
            x: c.lastNukeStrike.x,
            y: c.lastNukeStrike.y,
            radius: c.lastNukeStrike.radius,
            totalDays: c.lastNukeStrike.totalDays,
          },
        }
      : {}),
    ...(c.rebelUnrest ? { rebelUnrest: Math.max(0, Math.min(100, Math.round(c.rebelUnrest))) } : {}),
  }));
}

function recomputeLandNeighborsFromGrid(mapData: WorldMapData, ownerGrid: Int16Array) {
  for (let i = 0; i < N_COUNTRIES; i++) {
    mapData.landNeighbors[i].clear();
  }
  for (let y = 0; y < MAP_H; y++) {
    const row = y * MAP_W;
    for (let x = 0; x < MAP_W; x++) {
      const id = ownerGrid[row + x];
      if (id < 0) continue;
      if (x + 1 < MAP_W) {
        const r = ownerGrid[row + x + 1];
        if (r >= 0 && r !== id) {
          mapData.landNeighbors[id].add(r);
          mapData.landNeighbors[r].add(id);
        }
      }
      if (y + 1 < MAP_H) {
        const d = ownerGrid[row + x + MAP_W];
        if (d >= 0 && d !== id) {
          mapData.landNeighbors[id].add(d);
          mapData.landNeighbors[d].add(id);
        }
      }
    }
  }
}

function hydrateCountries(
  rawCountries: SerializedCountry[],
  mapData: WorldMapData
): CountryState[] {
  return rawCountries.map((sc, idx) => {
    const seed = COUNTRIES_195[idx];
    return {
      id: idx,
      seed,
      alive: sc.alive,
      pixels: sc.pixels,
      initialPixels: mapData.initialPixelCounts[idx] || sc.pixels,
      capitalX: sc.capitalX,
      capitalY: sc.capitalY,
      capitalLostPenaltyDone: sc.capitalLostPenaltyDone,
      money: sc.money,
      netIncome: sc.netIncome,
      monthlyIncomeBonus: sc.monthlyIncomeBonus,
      army: sc.army,
      goldMines: sc.goldMines,
      cities: sc.cities,
      goldMinePurchases: sc.goldMinePurchases,
      cityPurchases: sc.cityPurchases,
      goldMinesBuiltThisMonth: sc.goldMinesBuiltThisMonth,
      citiesBuiltThisMonth: sc.citiesBuiltThisMonth,
      ports: (sc.ports ?? []).map((p) => ({ ...p })),
      defenses: (sc.defenses ?? []).map((d) => ({ ...d })),
      aggressiveExpansion: sc.aggressiveExpansion,
      aiDoctrine: sc.aiDoctrine,
      color: seed.color,
      bboxMinX: sc.bboxMinX,
      bboxMaxX: sc.bboxMaxX,
      bboxMinY: sc.bboxMinY,
      bboxMaxY: sc.bboxMaxY,
      annexedById: sc.annexedById ?? null,
      customName: typeof sc.customName === 'string' && sc.customName.trim().length > 0 ? sc.customName : null,
      completedFocusIds: Array.isArray(sc.completedFocusIds)
        ? sc.completedFocusIds.filter((id): id is string => typeof id === 'string')
        : [],
      focusIncomeBonus: typeof sc.focusIncomeBonus === 'number' ? sc.focusIncomeBonus : 0,
      focusArmyCapBonus: typeof sc.focusArmyCapBonus === 'number' ? sc.focusArmyCapBonus : 0,
      focusDefenseBonus: typeof sc.focusDefenseBonus === 'number' ? sc.focusDefenseBonus : 0,
      nukeCooldownDays: typeof sc.nukeCooldownDays === 'number' ? Math.max(0, sc.nukeCooldownDays) : 0,
      lastNukeStrike:
        sc.lastNukeStrike &&
        typeof sc.lastNukeStrike.x === 'number' &&
        typeof sc.lastNukeStrike.y === 'number'
          ? { ...sc.lastNukeStrike }
          : null,
      rebelUnrest: typeof sc.rebelUnrest === 'number' ? Math.max(0, Math.min(100, sc.rebelUnrest)) : 0,
    };
  });
}

export function buildCampaignSnapshotPayload(
  uid: string,
  campaignId: string,
  sim: SimulationState
): SerializedCampaignData {
  const payload: SerializedCampaignData = {
    ownerId: uid,
    campaignId,
    version: SNAPSHOT_SCHEMA_VERSION,
    playerId: sim.playerId,
    day: sim.day,
    month: sim.month,
    year: sim.year,
    totalDays: sim.totalDays,
    elapsedSeconds: Math.max(0, Math.round(sim.elapsedSeconds)),
    globalStability: Math.max(0, Math.min(100, sim.globalStability)),
    globalTension: Math.max(0, Math.min(100, sim.globalTension)),
    sandboxAfterVictory: sim.sandboxAfterVictory,
    outcome: sim.outcome,
    nextEventDay: sim.nextEventDay,
    nextIdCounter: Math.max(1, sim.nextIdCounter),
    aiCursor: sim.aiCursor % N_COUNTRIES,
    lastAiWarMonth: sim.lastAiWarMonth,
    ownerGridRle: Bytes.fromUint8Array(encodeOwnerGridRle(sim.ownerGrid)),
    relationsBytes: Bytes.fromUint8Array(sim.relations),
    treatiesBytes: Bytes.fromUint8Array(sim.treaties),
    truceMonthsBytes: Bytes.fromUint8Array(int16ArrayToUint8(sim.truceMonths)),
    countries: serializeCountries(sim),
    wars: sim.wars.slice(0, 500).map((w) => ({
      a: w.a,
      b: w.b,
      startTotalDays: w.startTotalDays,
    })),
    invasions: sim.invasions.slice(0, 200).map((inv) => ({ ...inv })),
    chronicle: sim.chronicle.slice(0, 25).map((entry) => ({ ...entry })),
    playerHistory: sim.playerHistory.slice(-60).map((pt) => ({ ...pt })),
  };

  if (sim.pendingProposal) {
    payload.pendingProposal = {
      id: sim.pendingProposal.id,
      fromId: sim.pendingProposal.fromId,
      type: sim.pendingProposal.type,
    };
  }

  return payload;
}

export function restoreSimulationFromSnapshot(
  raw: Record<string, unknown>
): SimulationState {
  const mapData = buildWorldMapData();

  const rleField = raw.ownerGridRle as Bytes;
  const relField = raw.relationsBytes as Bytes;
  const trField = raw.treatiesBytes as Bytes;
  const truceField = raw.truceMonthsBytes as Bytes;

  const ownerGrid = decodeOwnerGridRle(rleField.toUint8Array());
  const relations = new Uint8Array(relField.toUint8Array());
  const treaties = new Uint8Array(trField.toUint8Array());
  const truceMonths = uint8ToInt16Array(
    truceField.toUint8Array(),
    N_COUNTRIES * N_COUNTRIES
  );

  recomputeLandNeighborsFromGrid(mapData, ownerGrid);

  const countries = hydrateCountries(raw.countries as SerializedCountry[], mapData);

  const restored: SimulationState = {
    playerId: Number(raw.playerId),
    isMultiplayer: false,
    winnerCountryId: null,
    humanPlayers: {},
    diplomaticOffers: [],
    day: Number(raw.day),
    month: Number(raw.month),
    year: Number(raw.year),
    totalDays: Number(raw.totalDays),
    elapsedSeconds: Number(raw.elapsedSeconds),
    globalStability: Number(raw.globalStability),
    globalTension: Number(raw.globalTension),
    countries,
    ownerGrid,
    mapData,
    relations,
    treaties,
    truceMonths,
    wars: ((raw.wars as Array<{ a: number; b: number; startTotalDays: number }>) ?? []).map((w) => ({
      ...w,
    })),
    invasions: ((raw.invasions as NavalInvasion[]) ?? []).map((inv) => ({ ...inv })),
    particles: [],
    chronicle: ((raw.chronicle as ChronicleEntry[]) ?? []).map((entry) => ({ ...entry })),
    playerHistory: ((raw.playerHistory as PlayerHistoryPoint[]) ?? []).map((pt) => ({ ...pt })),
    activeEvent: null,
    pendingProposal: (raw.pendingProposal as PendingDiplomaticProposal | undefined) ?? null,
    outcome: (raw.outcome as 'none' | 'victory' | 'defeat') ?? 'none',
    sandboxAfterVictory: Boolean(raw.sandboxAfterVictory),
    dirtyPixels: true,
    nextEventDay: Number(raw.nextEventDay),
    nextIdCounter: Number(raw.nextIdCounter),
    aiCursor: Number(raw.aiCursor),
    lastAiWarMonth: Number(raw.lastAiWarMonth),
  };

  stabilizeSimulationStats(restored);
  return restored;
}

export function buildRoomWorldStatePayload(
  roomCode: string,
  hostUid: string,
  sim: SimulationState,
  tick: number
): RoomWorldStatePayload {
  const humanPlayers: Record<string, HumanPlayerSlot> = {};
  for (const [k, slot] of Object.entries(sim.humanPlayers)) {
    humanPlayers[String(k)] = {
      uid: slot.uid,
      displayName: slot.displayName,
      ...(slot.photoUrl ? { photoUrl: slot.photoUrl } : {}),
      countryId: slot.countryId,
      rebelMoney: Math.max(0, Math.round(slot.rebelMoney)),
      rebelArmy: Math.max(0, Math.round(slot.rebelArmy)),
    };
  }

  return {
    roomCode,
    hostUid,
    version: SNAPSHOT_SCHEMA_VERSION,
    tick: Math.max(0, Math.round(tick)),
    day: sim.day,
    month: sim.month,
    year: sim.year,
    totalDays: sim.totalDays,
    elapsedSeconds: Math.max(0, Math.round(sim.elapsedSeconds)),
    globalStability: Math.max(0, Math.min(100, sim.globalStability)),
    globalTension: Math.max(0, Math.min(100, sim.globalTension)),
    outcome: sim.outcome,
    winnerCountryId: sim.winnerCountryId ?? null,
    nextIdCounter: Math.max(1, sim.nextIdCounter),
    ownerGridRle: Bytes.fromUint8Array(encodeOwnerGridRle(sim.ownerGrid)),
    relationsBytes: Bytes.fromUint8Array(sim.relations),
    treatiesBytes: Bytes.fromUint8Array(sim.treaties),
    truceMonthsBytes: Bytes.fromUint8Array(int16ArrayToUint8(sim.truceMonths)),
    countries: serializeCountries(sim),
    wars: sim.wars.slice(0, 500).map((w) => ({
      a: w.a,
      b: w.b,
      startTotalDays: w.startTotalDays,
    })),
    invasions: sim.invasions.slice(0, 200).map((inv) => ({ ...inv })),
    chronicle: sim.chronicle.slice(0, 25).map((entry) => ({ ...entry })),
    humanPlayers,
    diplomaticOffers: sim.diplomaticOffers.slice(-32).map((o) => ({ ...o })),
  };
}

export function restoreRoomWorldState(
  raw: Record<string, unknown>,
  myCountryId: number,
  cachedMapData?: WorldMapData,
  prevHistory: PlayerHistoryPoint[] = []
): SimulationState {
  const mapData = cachedMapData ?? buildWorldMapData();

  const rleField = raw.ownerGridRle as Bytes;
  const relField = raw.relationsBytes as Bytes;
  const trField = raw.treatiesBytes as Bytes;
  const truceField = raw.truceMonthsBytes as Bytes;

  const ownerGrid = decodeOwnerGridRle(rleField.toUint8Array());
  const relations = new Uint8Array(relField.toUint8Array());
  const treaties = new Uint8Array(trField.toUint8Array());
  const truceMonths = uint8ToInt16Array(
    truceField.toUint8Array(),
    N_COUNTRIES * N_COUNTRIES
  );

  recomputeLandNeighborsFromGrid(mapData, ownerGrid);

  const countries = hydrateCountries(raw.countries as SerializedCountry[], mapData);

  const humanPlayers: Record<number, HumanPlayerSlot> = {};
  const rawHumans = (raw.humanPlayers as Record<string, HumanPlayerSlot> | undefined) ?? {};
  for (const [k, slot] of Object.entries(rawHumans)) {
    const cid = Number(k);
    if (!Number.isNaN(cid) && slot) {
      humanPlayers[cid] = {
        uid: slot.uid,
        displayName: slot.displayName,
        ...(slot.photoUrl ? { photoUrl: slot.photoUrl } : {}),
        countryId: slot.countryId,
        rebelMoney: slot.rebelMoney ?? 0,
        rebelArmy: slot.rebelArmy ?? 0,
      };
    }
  }

  const day = Number(raw.day);
  const month = Number(raw.month);
  const year = Number(raw.year);
  const elapsedSeconds = Number(raw.elapsedSeconds);
  const myCountry = countries[myCountryId];
  let nextHistory = prevHistory.map((pt) => ({ ...pt }));
  const lastSec = nextHistory.length > 0 ? nextHistory[nextHistory.length - 1].elapsedSeconds : -1;
  if (myCountry && (nextHistory.length === 0 || (elapsedSeconds > lastSec && (elapsedSeconds <= 4 || elapsedSeconds % 3 === 0)))) {
    nextHistory = [
      ...nextHistory.slice(-59),
      {
        label: `${elapsedSeconds}s`,
        dateLabel: formatFullDate(day, month, year),
        elapsedSeconds,
        money: Math.round(myCountry.money),
        netIncome: Math.round(myCountry.netIncome),
        army: Math.round(myCountry.army),
        km2: myCountry.pixels * 100,
      },
    ];
  }

  return {
    playerId: myCountryId,
    isMultiplayer: true,
    winnerCountryId:
      raw.winnerCountryId === null || raw.winnerCountryId === undefined
        ? null
        : Number(raw.winnerCountryId),
    humanPlayers,
    diplomaticOffers: ((raw.diplomaticOffers as HumanDiplomaticOffer[]) ?? []).map((o) => ({ ...o })),
    day,
    month,
    year,
    totalDays: Number(raw.totalDays),
    elapsedSeconds,
    globalStability: Number(raw.globalStability),
    globalTension: Number(raw.globalTension),
    countries,
    ownerGrid,
    mapData,
    relations,
    treaties,
    truceMonths,
    wars: ((raw.wars as Array<{ a: number; b: number; startTotalDays: number }>) ?? []).map((w) => ({
      ...w,
    })),
    invasions: ((raw.invasions as NavalInvasion[]) ?? []).map((inv) => ({ ...inv })),
    particles: [],
    chronicle: ((raw.chronicle as ChronicleEntry[]) ?? []).map((entry) => ({ ...entry })),
    playerHistory: nextHistory,
    activeEvent: null,
    pendingProposal: null,
    outcome: (raw.outcome as 'none' | 'victory' | 'defeat') ?? 'none',
    sandboxAfterVictory: false,
    dirtyPixels: true,
    nextEventDay: 999999,
    nextIdCounter: Number(raw.nextIdCounter ?? 1),
    aiCursor: 0,
    lastAiWarMonth: 0,
  };
}
