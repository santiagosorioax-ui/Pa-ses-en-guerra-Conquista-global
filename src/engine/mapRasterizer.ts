import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world50m from 'world-atlas/countries-50m.json';
import {
  COUNTRIES_195,
  DEPENDENT_ISO_MAP,
  ISO_TO_COUNTRY_ID,
  UNIQUE_COUNTRY_PALETTE_195,
  colorDist,
} from '../data/countries195';

export const MAP_W = 980;
export const MAP_H = 380;
export const TOTAL_PIXELS = MAP_W * MAP_H;

const MIN_LAT = -58;
const MAX_LAT = 84;

export function lonToX(lon: number): number {
  const x = Math.floor(((lon + 180) / 360) * MAP_W);
  return Math.max(0, Math.min(MAP_W - 1, x));
}

export function latToY(lat: number): number {
  const clamped = Math.max(MIN_LAT, Math.min(MAX_LAT, lat));
  const y = Math.floor(((MAX_LAT - clamped) / (MAX_LAT - MIN_LAT)) * MAP_H);
  return Math.max(0, Math.min(MAP_H - 1, y));
}

export interface WorldMapData {
  ownerGrid: Int16Array; // -1 = ocean, 0..194 = country id
  originalGrid: Int16Array;
  oceanBand: Uint8Array; // 0 = land, 1 = coastal shallow, 2 = shelf, 3 = deep ocean
  terrainShade: Int8Array; // subtle pixel texture offset (-8..+8)
  capitalX: Int16Array;
  capitalY: Int16Array;
  initialPixelCounts: Int32Array;
  landNeighbors: Set<number>[];
  navalNeighbors: Set<number>[];
  countryColors: [number, number, number][];
}

// Palette of 195 unique cartographic colors is provided by UNIQUE_COUNTRY_PALETTE_195

function ringArea(ring: number[][]): number {
  let sum = 0;
  for (let i = 0, len = ring.length; i < len; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % len];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) * 0.5;
}

function rasterizePolygonRings(
  rings: number[][][],
  countryId: number,
  grid: Int16Array
) {
  // Project all rings into pixel space and compute vertical bounds
  let minY = MAP_H - 1;
  let maxY = 0;

  const projectedRings: { x: number; y: number }[][] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const pts: { x: number; y: number }[] = new Array(ring.length);
    let prevLon = ring[0][0];
    for (let i = 0; i < ring.length; i++) {
      let lon = ring[i][0];
      if (i > 0) {
        while (lon - prevLon > 180) lon -= 360;
        while (lon - prevLon < -180) lon += 360;
      }
      prevLon = lon;
      const lat = ring[i][1];
      const px = ((lon + 180) / 360) * MAP_W;
      const py = ((MAX_LAT - Math.max(MIN_LAT, Math.min(MAX_LAT, lat))) / (MAX_LAT - MIN_LAT)) * MAP_H;
      pts[i] = { x: px, y: py };
      if (py < minY) minY = Math.floor(py);
      if (py > maxY) maxY = Math.ceil(py);
    }
    projectedRings.push(pts);
  }

  minY = Math.max(0, minY);
  maxY = Math.min(MAP_H - 1, maxY);

  const intersections: number[] = [];

  for (let y = minY; y <= maxY; y++) {
    const scanY = y + 0.5;
    intersections.length = 0;

    for (const pts of projectedRings) {
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];

        if ((a.y <= scanY && b.y > scanY) || (b.y <= scanY && a.y > scanY)) {
          const t = (scanY - a.y) / (b.y - a.y);
          intersections.push(a.x + t * (b.x - a.x));
        }
      }
    }

    if (intersections.length < 2) continue;
    intersections.sort((a, b) => a - b);

    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const xStart = Math.floor(intersections[i] + 0.5);
      const xEnd = Math.floor(intersections[i + 1] - 0.5);
      const rowOffset = y * MAP_W;
      for (let x = xStart; x <= xEnd; x++) {
        const wx = ((x % MAP_W) + MAP_W) % MAP_W;
        grid[rowOffset + wx] = countryId;
      }
    }
  }
}

function resolveCountryId(geoId: string | undefined, geoName: string | undefined): number | null {
  if (geoId) {
    if (geoId in ISO_TO_COUNTRY_ID) return ISO_TO_COUNTRY_ID[geoId];
    if (geoId in DEPENDENT_ISO_MAP) {
      const parentIso = DEPENDENT_ISO_MAP[geoId];
      if (parentIso in ISO_TO_COUNTRY_ID) return ISO_TO_COUNTRY_ID[parentIso];
    }
  }
  // Handle uncoded disputed/special regions in world-atlas 50m cleanly
  if (geoName === 'Somaliland') return ISO_TO_COUNTRY_ID['706'];
  if (geoName === 'Kosovo') return ISO_TO_COUNTRY_ID['688'];
  if (geoName === 'N. Cyprus') return ISO_TO_COUNTRY_ID['196'];
  if (geoName === 'Siachen Glacier') return ISO_TO_COUNTRY_ID['356'];
  if (geoName === 'Indian Ocean Ter.') return ISO_TO_COUNTRY_ID['036'];
  if (geoName === 'Ashmore and Cartier Is.') return ISO_TO_COUNTRY_ID['036'];
  return null;
}

let cachedMapData: WorldMapData | null = null;

export function buildWorldMapData(): WorldMapData {
  if (cachedMapData) return cachedMapData;

  const ownerGrid = new Int16Array(TOTAL_PIXELS);
  ownerGrid.fill(-1);

  const topology = world50m as unknown as Topology<{
    countries: GeometryCollection<{ name?: string }>;
  }>;
  const geo = feature(topology, topology.objects.countries);

  interface PolyTask {
    countryId: number;
    rings: number[][][];
    area: number;
  }

  const tasks: PolyTask[] = [];

  for (const feat of geo.features) {
    const rawId = feat.id != null ? String(feat.id).padStart(3, '0') : undefined;
    const name = feat.properties?.name;
    if (rawId === '010' || name === 'Antarctica') continue;

    const cid = resolveCountryId(rawId, name);
    if (cid === null || !feat.geometry) continue;

    if (feat.geometry.type === 'Polygon') {
      const rings = feat.geometry.coordinates as number[][][];
      tasks.push({ countryId: cid, rings, area: ringArea(rings[0] || []) });
    } else if (feat.geometry.type === 'MultiPolygon') {
      for (const poly of feat.geometry.coordinates as number[][][][]) {
        tasks.push({ countryId: cid, rings: poly, area: ringArea(poly[0] || []) });
      }
    }
  }

  // Paint largest territories first so enclaves (Lesotho, Vatican, San Marino, Andorra, Monaco) sit cleanly on top
  tasks.sort((a, b) => b.area - a.area);
  for (const task of tasks) {
    rasterizePolygonRings(task.rings, task.countryId, ownerGrid);
  }

  // Count pixels per country
  const pixelCounts = new Int32Array(COUNTRIES_195.length);
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    const id = ownerGrid[i];
    if (id >= 0) pixelCounts[id]++;
  }

  // Guarantee every single one of the 195 countries is visibly present and clickable on the map
  const capitalX = new Int16Array(COUNTRIES_195.length);
  const capitalY = new Int16Array(COUNTRIES_195.length);

  for (const c of COUNTRIES_195) {
    const cx = lonToX(c.lon);
    const cy = latToY(c.lat);
    capitalX[c.id] = cx;
    capitalY[c.id] = cy;

    if (pixelCounts[c.id] === 0) {
      // Microstates inside Europe/land get compact 2x2 pixel footprint; oceanic island microstates get 3x3
      const radius = c.continent === 'Oceanía' || c.continent === 'América' || c.iso2 === 'MV' || c.iso2 === 'SC' || c.iso2 === 'KM' || c.iso2 === 'MU' || c.iso2 === 'CV' || c.iso2 === 'ST' || c.iso2 === 'MT' || c.iso2 === 'BH'
        ? 1
        : 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = Math.max(0, Math.min(MAP_W - 1, cx + dx));
          const py = Math.max(0, Math.min(MAP_H - 1, cy + dy));
          const idx = py * MAP_W + px;
          const prev = ownerGrid[idx];
          if (prev >= 0 && prev !== c.id && pixelCounts[prev] > 2) {
            pixelCounts[prev]--;
          }
          if (prev !== c.id) {
            ownerGrid[idx] = c.id;
            pixelCounts[c.id]++;
          }
        }
      }
      // Ensure at least a 2-pixel cluster for microstates with radius 0 if still 1 pixel
      if (pixelCounts[c.id] === 1 && cx + 1 < MAP_W) {
        const idx = cy * MAP_W + (cx + 1);
        const prev = ownerGrid[idx];
        if (prev < 0 || pixelCounts[prev] > 3) {
          if (prev >= 0) pixelCounts[prev]--;
          ownerGrid[idx] = c.id;
          pixelCounts[c.id]++;
        }
      }
    } else if (ownerGrid[cy * MAP_W + cx] !== c.id) {
      // Snap capital marker to nearest pixel actually owned by that country
      let bestDist = Infinity;
      let bestX = cx;
      let bestY = cy;
      const searchR = 14;
      for (let dy = -searchR; dy <= searchR; dy++) {
        const py = cy + dy;
        if (py < 0 || py >= MAP_H) continue;
        for (let dx = -searchR; dx <= searchR; dx++) {
          const px = cx + dx;
          if (px < 0 || px >= MAP_W) continue;
          if (ownerGrid[py * MAP_W + px] === c.id) {
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              bestX = px;
              bestY = py;
            }
          }
        }
      }
      if (ownerGrid[bestY * MAP_W + bestX] === c.id) {
        capitalX[c.id] = bestX;
        capitalY[c.id] = bestY;
      } else {
        const idx = cy * MAP_W + cx;
        const prev = ownerGrid[idx];
        if (prev >= 0 && pixelCounts[prev] > 2) {
          pixelCounts[prev]--;
          ownerGrid[idx] = c.id;
          pixelCounts[c.id]++;
        } else if (prev < 0) {
          ownerGrid[idx] = c.id;
          pixelCounts[c.id]++;
        }
      }
    }
  }

  const originalGrid = new Int16Array(ownerGrid);

  // Build ocean bathymetry bands (1 = adjacent coast, 2 = shelf, 3 = deep ocean)
  const oceanBand = new Uint8Array(TOTAL_PIXELS);
  oceanBand.fill(3);
  for (let i = 0; i < TOTAL_PIXELS; i++) {
    if (ownerGrid[i] >= 0) oceanBand[i] = 0;
  }
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      if (oceanBand[idx] !== 3) continue;
      let nearLand = false;
      for (let dy = -2; dy <= 2 && !nearLand; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= MAP_H) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const nx = (x + dx + MAP_W) % MAP_W;
          if (ownerGrid[ny * MAP_W + nx] >= 0) {
            nearLand = true;
            if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
              oceanBand[idx] = 1;
            } else {
              oceanBand[idx] = 2;
            }
            break;
          }
        }
      }
    }
  }

  // Deterministic pixel-art relief / ocean dither texture
  const terrainShade = new Int8Array(TOTAL_PIXELS);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const idx = y * MAP_W + x;
      const hash = ((x * 73856093) ^ (y * 19349663)) & 255;
      if (ownerGrid[idx] >= 0) {
        // Subtle cartographic land grain
        terrainShade[idx] = ((hash % 9) - 4);
      } else {
        // Crisp pixel-art water dither lines
        terrainShade[idx] = (x + y * 2) % 4 === 0 && hash < 90 ? 3 : 0;
      }
    }
  }

  // Compute land border adjacency
  const landNeighbors: Set<number>[] = Array.from({ length: COUNTRIES_195.length }, () => new Set<number>());
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const id = ownerGrid[y * MAP_W + x];
      if (id < 0) continue;
      if (x + 1 < MAP_W) {
        const right = ownerGrid[y * MAP_W + x + 1];
        if (right >= 0 && right !== id) {
          landNeighbors[id].add(right);
          landNeighbors[right].add(id);
        }
      }
      if (y + 1 < MAP_H) {
        const down = ownerGrid[(y + 1) * MAP_W + x];
        if (down >= 0 && down !== id) {
          landNeighbors[id].add(down);
          landNeighbors[down].add(id);
        }
      }
    }
  }

  // Compute naval sea-lane neighbors using coastal distance (allows island nations to contest neighbors)
  const navalNeighbors: Set<number>[] = Array.from({ length: COUNTRIES_195.length }, () => new Set<number>());
  for (let i = 0; i < COUNTRIES_195.length; i++) {
    for (let j = i + 1; j < COUNTRIES_195.length; j++) {
      if (landNeighbors[i].has(j)) continue;
      const dx = Math.abs(capitalX[i] - capitalX[j]);
      const wrappedDx = Math.min(dx, MAP_W - dx);
      const dy = capitalY[i] - capitalY[j];
      const distSq = wrappedDx * wrappedDx + dy * dy;
      // Within ~48 pixels (~20 degrees) maritime reach
      if (distSq <= 48 * 48) {
        navalNeighbors[i].add(j);
        navalNeighbors[j].add(i);
      }
    }
  }

  // 1-to-1 unique color assignment: each of the 195 countries gets its own unshared color
  // while maximizing perceptual color contrast against bordering and nearby nations
  const colorIdx = new Int16Array(COUNTRIES_195.length).fill(-1);
  const usedPalette = new Uint8Array(UNIQUE_COUNTRY_PALETTE_195.length);

  // Sort by neighbor degree descending (land weighted heavily, naval as tie-breaker)
  const order = COUNTRIES_195.map((c) => c.id).sort(
    (a, b) =>
      landNeighbors[b].size * 4 +
      navalNeighbors[b].size -
      (landNeighbors[a].size * 4 + navalNeighbors[a].size)
  );

  for (const id of order) {
    const coloredLand: [number, number, number][] = [];
    for (const nb of landNeighbors[id]) {
      if (colorIdx[nb] >= 0) coloredLand.push(UNIQUE_COUNTRY_PALETTE_195[colorIdx[nb]]);
    }
    const coloredNaval: [number, number, number][] = [];
    for (const nb of navalNeighbors[id]) {
      if (colorIdx[nb] >= 0) coloredNaval.push(UNIQUE_COUNTRY_PALETTE_195[colorIdx[nb]]);
    }

    let bestColorIdx = -1;
    let bestScore = -1;
    const startOffset = (id * 37) % UNIQUE_COUNTRY_PALETTE_195.length;

    for (let k = 0; k < UNIQUE_COUNTRY_PALETTE_195.length; k++) {
      const candidateIdx = (startOffset + k) % UNIQUE_COUNTRY_PALETTE_195.length;
      if (usedPalette[candidateIdx]) continue;
      const cand = UNIQUE_COUNTRY_PALETTE_195[candidateIdx];

      let minLand = 9999;
      for (let i = 0; i < coloredLand.length; i++) {
        const d = colorDist(cand, coloredLand[i]);
        if (d < minLand) minLand = d;
      }

      let minNaval = 9999;
      for (let i = 0; i < coloredNaval.length; i++) {
        const d = colorDist(cand, coloredNaval[i]);
        if (d < minNaval) minNaval = d;
      }

      const score =
        (coloredLand.length > 0 ? minLand * 1000 : 500000) +
        (coloredNaval.length > 0 ? minNaval : 500);

      if (score > bestScore) {
        bestScore = score;
        bestColorIdx = candidateIdx;
      }
    }

    colorIdx[id] = bestColorIdx;
    usedPalette[bestColorIdx] = 1;
  }

  const countryColors = COUNTRIES_195.map((_, id) => UNIQUE_COUNTRY_PALETTE_195[colorIdx[id]]);

  cachedMapData = {
    ownerGrid,
    originalGrid,
    oceanBand,
    terrainShade,
    capitalX,
    capitalY,
    initialPixelCounts: pixelCounts,
    landNeighbors,
    navalNeighbors,
    countryColors,
  };

  return cachedMapData;
}
