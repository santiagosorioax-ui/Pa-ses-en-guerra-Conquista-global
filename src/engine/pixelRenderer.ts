import {
  MAP_H,
  MAP_W,
  type WorldMapData,
} from './mapRasterizer';
import {
  TREATY_ALLIANCE,
  TREATY_WAR,
  hasTreaty,
  type MapMode,
  type SimulationState,
} from './gameSimulation';

function packAbgr(r: number, g: number, b: number): number {
  const cr = r < 0 ? 0 : r > 255 ? 255 : r;
  const cg = g < 0 ? 0 : g > 255 ? 255 : g;
  const cb = b < 0 ? 0 : b > 255 ? 255 : b;
  return (255 << 24) | (cb << 16) | (cg << 8) | cr;
}

export interface EmpireHighlightConfig {
  ownerCountryId: number;
  empireName: string;
  targetCountryIds: number[];
  expiresAtMs: number;
  durationMs: number;
}

export class PixelMapRenderer {
  public offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private buf32: Uint32Array;
  private lastSignature = '';

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = MAP_W;
    this.offscreenCanvas.height = MAP_H;
    const ctx = this.offscreenCanvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D context unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    this.offscreenCtx = ctx;
    this.imageData = ctx.createImageData(MAP_W, MAP_H);
    this.buf32 = new Uint32Array(this.imageData.data.buffer);
  }

  public renderToBuffer(
    sim: SimulationState,
    mapMode: MapMode,
    selectedId: number | null,
    hoveredId: number | null,
    force = false,
    empireHighlight: EmpireHighlightConfig | null = null,
    pulseStep = 0
  ) {
    const focusId = selectedId ?? sim.playerId;
    const empSig = empireHighlight
      ? `${empireHighlight.ownerCountryId}:${empireHighlight.targetCountryIds.join(',')}:${pulseStep}`
      : 'none';
    const sig = `${mapMode}|${selectedId ?? -1}|${hoveredId ?? -1}|${sim.totalDays}|${sim.dirtyPixels ? 1 : 0}|${empSig}`;
    if (!force && !sim.dirtyPixels && sig === this.lastSignature) {
      return;
    }
    this.lastSignature = sig;
    sim.dirtyPixels = false;

    const { ownerGrid, mapData, countries } = sim;
    const { oceanBand, terrainShade, ownerGrid: origOwnerGrid } = mapData;

    let empireTargetLookup: Uint8Array | null = null;
    if (empireHighlight && empireHighlight.targetCountryIds.length > 0) {
      empireTargetLookup = new Uint8Array(countries.length);
      for (const tid of empireHighlight.targetCountryIds) {
        if (tid >= 0 && tid < countries.length) {
          empireTargetLookup[tid] = 1;
        }
      }
    }
    const pulseMix = empireHighlight
      ? 0.42 + 0.22 * (0.5 + 0.5 * Math.sin((pulseStep / 6) * Math.PI * 2))
      : 0;

    const countryRgb = new Array<[number, number, number]>(countries.length);
    for (let i = 0; i < countries.length; i++) {
      const c = countries[i];
      if (!c.alive) {
        countryRgb[i] = [40, 48, 60];
        continue;
      }

      if (mapMode === 'political') {
        countryRgb[i] = c.color;
      } else {
        if (i === focusId) {
          countryRgb[i] = [245, 158, 11];
        } else if (hasTreaty(sim, focusId, i, TREATY_WAR)) {
          countryRgb[i] = [220, 38, 38];
        } else if (hasTreaty(sim, focusId, i, TREATY_ALLIANCE)) {
          countryRgb[i] = [14, 165, 233];
        } else {
          const rel = sim.relations[focusId * countries.length + i];
          if (rel >= 65) {
            countryRgb[i] = [44, 134, 102];
          } else if (rel <= 35) {
            countryRgb[i] = [156, 56, 54];
          } else {
            countryRgb[i] = [68, 82, 102];
          }
        }
      }
    }

    const buf = this.buf32;

    for (let y = 0; y < MAP_H; y++) {
      const row = y * MAP_W;
      // Subtle latitude ocean depth gradient
      const latFactor = Math.round(Math.sin((y / MAP_H) * Math.PI) * 5);
      for (let x = 0; x < MAP_W; x++) {
        const idx = row + x;
        const owner = ownerGrid[idx];

        if (owner < 0) {
          const band = oceanBand[idx];
          if (band === 1) {
            buf[idx] = packAbgr(21, 52, 86);
          } else if (band === 2) {
            buf[idx] = packAbgr(14, 34, 60 + latFactor);
          } else {
            buf[idx] = packAbgr(9, 22, 42 + latFactor);
          }
          continue;
        }

        const base = countryRgb[owner];
        let r = base[0] + terrainShade[idx];
        let g = base[1] + terrainShade[idx];
        let b = base[2] + terrainShade[idx];

        const left = x > 0 ? ownerGrid[idx - 1] : -1;
        const right = x + 1 < MAP_W ? ownerGrid[idx + 1] : -1;
        const up = y > 0 ? ownerGrid[idx - MAP_W] : -1;
        const down = y + 1 < MAP_H ? ownerGrid[idx + MAP_W] : -1;

        const isEdge = left !== owner || right !== owner || up !== owner || down !== owner;
        const isOuterHighlight =
          (owner === selectedId || owner === sim.playerId) &&
          !isEdge &&
          ((x > 1 && ownerGrid[idx - 2] !== owner) ||
            (x + 2 < MAP_W && ownerGrid[idx + 2] !== owner) ||
            (y > 1 && ownerGrid[idx - MAP_W * 2] !== owner) ||
            (y + 2 < MAP_H && ownerGrid[idx + MAP_W * 2] !== owner));

        if (isEdge || isOuterHighlight) {
          if (owner === selectedId) {
            r = 253;
            g = 224;
            b = 71;
          } else if (owner === hoveredId && isEdge) {
            r = Math.min(255, r + 65);
            g = Math.min(255, g + 65);
            b = Math.min(255, b + 65);
          } else if (owner === sim.playerId) {
            r = 245;
            g = 158;
            b = 11;
          } else if (isEdge) {
            r = Math.round(r * 0.65);
            g = Math.round(g * 0.65);
            b = Math.round(b * 0.65);
          }
        } else if (owner === hoveredId) {
          r += 22;
          g += 22;
          b += 22;
        } else if (owner === selectedId) {
          r += 14;
          g += 14;
          b += 8;
        }

        // 10-second Empire Territory Invasion Preview Highlight
        if (empireHighlight && empireTargetLookup) {
          const origOwner = origOwnerGrid[idx];
          const isEmpireTarget = origOwner >= 0 && empireTargetLookup[origOwner] === 1;
          const isEmpireBuilder = owner === empireHighlight.ownerCountryId;

          if (isEmpireTarget) {
            const origL = x > 0 ? origOwnerGrid[idx - 1] : -1;
            const origR = x + 1 < MAP_W ? origOwnerGrid[idx + 1] : -1;
            const origU = y > 0 ? origOwnerGrid[idx - MAP_W] : -1;
            const origD = y + 1 < MAP_H ? origOwnerGrid[idx + MAP_W] : -1;
            const isTargetEdge =
              origL !== origOwner || origR !== origOwner || origU !== origOwner || origD !== origOwner;
            const isTargetRing =
              !isTargetEdge &&
              ((x > 1 && origOwnerGrid[idx - 2] !== origOwner) ||
                (x + 2 < MAP_W && origOwnerGrid[idx + 2] !== origOwner) ||
                (y > 1 && origOwnerGrid[idx - MAP_W * 2] !== origOwner) ||
                (y + 2 < MAP_H && origOwnerGrid[idx + MAP_W * 2] !== origOwner));

            if (isEmpireBuilder) {
              // Already conquered territory of the empire -> luminous emerald-gold
              if (isTargetEdge || isTargetRing) {
                r = 52;
                g = 211;
                b = 153;
              } else {
                r = Math.round(r * 0.62 + 16 * 0.38);
                g = Math.round(g * 0.62 + 185 * 0.38);
                b = Math.round(b * 0.62 + 129 * 0.38);
              }
            } else {
              // Territory still to invade -> unmistakable glowing amber-crimson pulse + gold border
              if (isTargetEdge || isTargetRing) {
                r = 254;
                g = 240;
                b = 138;
              } else {
                const hatch = ((x + y) & 3) === 0;
                const tr = hatch ? 251 : 239;
                const tg = hatch ? 191 : 68;
                const tb = hatch ? 36 : 68;
                const m = hatch ? Math.min(0.85, pulseMix + 0.22) : pulseMix;
                r = Math.round(r * (1 - m) + tr * m);
                g = Math.round(g * (1 - m) + tg * m);
                b = Math.round(b * (1 - m) + tb * m);
              }
            }
          } else if (!isEmpireBuilder) {
            // Dim surrounding non-target countries so invasion territory stands out clearly
            r = Math.round(r * 0.52);
            g = Math.round(g * 0.52);
            b = Math.round(b * 0.52);
          }
        }

        buf[idx] = packAbgr(r, g, b);
      }
    }

    this.offscreenCtx.putImageData(this.imageData, 0, 0);
  }
}

export function renderStaticPreviewToBuffer(
  mapData: WorldMapData,
  selectedId: number | null,
  hoveredId: number | null,
  targetCanvas: HTMLCanvasElement
) {
  targetCanvas.width = MAP_W;
  targetCanvas.height = MAP_H;
  const ctx = targetCanvas.getContext('2d', { alpha: false });
  if (!ctx) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const img = ctx.createImageData(MAP_W, MAP_H);
  const buf = new Uint32Array(img.data.buffer);
  const { ownerGrid, oceanBand, terrainShade, countryColors } = mapData;

  for (let y = 0; y < MAP_H; y++) {
    const row = y * MAP_W;
    const latFactor = Math.round(Math.sin((y / MAP_H) * Math.PI) * 5);
    for (let x = 0; x < MAP_W; x++) {
      const idx = row + x;
      const owner = ownerGrid[idx];
      if (owner < 0) {
        const band = oceanBand[idx];
        if (band === 1) buf[idx] = packAbgr(21, 52, 86);
        else if (band === 2) buf[idx] = packAbgr(14, 34, 60 + latFactor);
        else buf[idx] = packAbgr(9, 22, 42 + latFactor);
        continue;
      }

      const base = countryColors[owner];
      let r = base[0] + terrainShade[idx];
      let g = base[1] + terrainShade[idx];
      let b = base[2] + terrainShade[idx];

      const left = x > 0 ? ownerGrid[idx - 1] : -1;
      const right = x + 1 < MAP_W ? ownerGrid[idx + 1] : -1;
      const up = y > 0 ? ownerGrid[idx - MAP_W] : -1;
      const down = y + 1 < MAP_H ? ownerGrid[idx + MAP_W] : -1;
      const isEdge = left !== owner || right !== owner || up !== owner || down !== owner;
      const isSelectedRing =
        owner === selectedId &&
        !isEdge &&
        ((x > 1 && ownerGrid[idx - 2] !== owner) ||
          (x + 2 < MAP_W && ownerGrid[idx + 2] !== owner) ||
          (y > 1 && ownerGrid[idx - MAP_W * 2] !== owner) ||
          (y + 2 < MAP_H && ownerGrid[idx + MAP_W * 2] !== owner));

      if (isEdge || isSelectedRing) {
        if (owner === selectedId) {
          r = 253;
          g = 224;
          b = 71;
        } else if (owner === hoveredId && isEdge) {
          r = Math.min(255, r + 65);
          g = Math.min(255, g + 65);
          b = Math.min(255, b + 65);
        } else if (isEdge) {
          r = Math.round(r * 0.65);
          g = Math.round(g * 0.65);
          b = Math.round(b * 0.65);
        }
      } else if (owner === hoveredId) {
        r += 22;
        g += 22;
        b += 22;
      } else if (owner === selectedId) {
        r += 16;
        g += 16;
        b += 10;
      }

      buf[idx] = packAbgr(r, g, b);
    }
  }

  ctx.putImageData(img, 0, 0);
}
