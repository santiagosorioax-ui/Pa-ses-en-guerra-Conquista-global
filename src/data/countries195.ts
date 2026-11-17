export type Continent = 'Europa' | 'Asia' | 'África' | 'América' | 'Oceanía';

export type FlagLayout = 'h3' | 'v3' | 'h2' | 'cross' | 'canton' | 'circle' | 'diag';

export interface CountrySeed {
  id: number;
  isoNumeric: string;
  iso2: string;
  name: string;
  capital: string;
  continent: Continent;
  lon: number;
  lat: number;
  popM: number; // Population in millions
  gdp: number; // Base economic power (billions scale index)
  military: number; // Starting military strength
  resources: {
    energy: number; // Base monthly production
    steel: number;
    food: number;
    tech: number;
  };
  color: [number, number, number];
  flagColors: [string, string, string];
  flagLayout: FlagLayout;
}

type RawRow = [
  isoNumeric: string,
  iso2: string,
  name: string,
  capital: string,
  continent: Continent,
  lon: number,
  lat: number,
  popM: number,
  gdp: number,
  military: number,
  energy: number,
  steel: number,
  food: number,
  tech: number,
  flagColors: [string, string, string],
  flagLayout: FlagLayout,
];

export function colorDist(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const rMean = (a[0] + b[0]) * 0.5;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function buildUniquePalette195(count: number): [number, number, number][] {
  const oceanRef: [number, number, number][] = [
    [9, 22, 42],
    [14, 34, 60],
    [21, 52, 86],
  ];
  const selectionRef: [number, number, number] = [253, 224, 71];

  const pool: [number, number, number][] = [];
  const seen = new Set<string>();
  for (let h = 0; h < 360; h += 4) {
    for (const s of [46, 62, 78, 92]) {
      for (const l of [38, 47, 56, 65, 73]) {
        const rgb = hslToRgb(h, s, l);
        if (oceanRef.some((o) => colorDist(rgb, o) < 95)) continue;
        if (colorDist(rgb, selectionRef) < 55) continue;
        const key = `${rgb[0]},${rgb[1]},${rgb[2]}`;
        if (!seen.has(key)) {
          seen.add(key);
          pool.push(rgb);
        }
      }
    }
  }

  // Farthest-point sampling guarantees every single country has a strictly unique, high-contrast color
  const chosen: [number, number, number][] = [pool[0]];
  const minDists = new Float64Array(pool.length);
  for (let i = 0; i < pool.length; i++) {
    minDists[i] = colorDist(pool[i], chosen[0]);
  }

  while (chosen.length < count) {
    let bestIdx = 0;
    let bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      if (minDists[i] > bestDist) {
        bestDist = minDists[i];
        bestIdx = i;
      }
    }
    const pick = pool[bestIdx];
    chosen.push(pick);
    for (let i = 0; i < pool.length; i++) {
      const d = colorDist(pool[i], pick);
      if (d < minDists[i]) minDists[i] = d;
    }
  }

  return chosen;
}

export const UNIQUE_COUNTRY_PALETTE_195: [number, number, number][] = buildUniquePalette195(195);

const RAW_COUNTRIES_195: RawRow[] = [
  // AMÉRICA (35)
  ['028', 'AG', 'Antigua y Barbuda', 'Saint John', 'América', -61.8, 17.1, 0.1, 2, 2, 1, 1, 2, 1, ['#CE1126', '#0072C6', '#FCD116'], 'diag'],
  ['032', 'AR', 'Argentina', 'Buenos Aires', 'América', -58.4, -34.6, 46.2, 620, 46, 14, 10, 24, 9, ['#74ACDF', '#FFFFFF', '#74ACDF'], 'h3'],
  ['044', 'BS', 'Bahamas', 'Nasáu', 'América', -77.3, 25.0, 0.4, 14, 3, 1, 1, 2, 2, ['#00778B', '#FFC72C', '#000000'], 'h3'],
  ['052', 'BB', 'Barbados', 'Bridgetown', 'América', -59.6, 13.1, 0.3, 6, 2, 1, 1, 2, 2, ['#00267F', '#FFC726', '#00267F'], 'v3'],
  ['084', 'BZ', 'Belice', 'Belmopán', 'América', -88.7, 17.2, 0.4, 3, 2, 1, 1, 3, 1, ['#171696', '#D90F19', '#FFFFFF'], 'h3'],
  ['068', 'BO', 'Bolivia', 'La Paz', 'América', -68.1, -16.5, 12.2, 46, 14, 7, 6, 8, 2, ['#D52B1E', '#F9E300', '#007934'], 'h3'],
  ['076', 'BR', 'Brasil', 'Brasilia', 'América', -47.9, -15.8, 215.3, 2130, 92, 22, 24, 34, 14, ['#009B3A', '#FEDF00', '#002776'], 'circle'],
  ['124', 'CA', 'Canadá', 'Ottawa', 'América', -75.7, 45.4, 39.8, 2140, 68, 28, 22, 20, 22, ['#FF0000', '#FFFFFF', '#FF0000'], 'v3'],
  ['152', 'CL', 'Chile', 'Santiago', 'América', -70.6, -33.4, 19.6, 335, 34, 6, 15, 11, 7, ['#0039A6', '#FFFFFF', '#D52B1E'], 'canton'],
  ['170', 'CO', 'Colombia', 'Bogotá', 'América', -74.1, 4.7, 52.1, 365, 44, 12, 8, 14, 6, ['#FCD116', '#003893', '#CE1126'], 'h3'],
  ['188', 'CR', 'Costa Rica', 'San José', 'América', -84.1, 9.9, 5.2, 86, 6, 3, 2, 6, 5, ['#002B7F', '#FFFFFF', '#CE1126'], 'h3'],
  ['192', 'CU', 'Cuba', 'La Habana', 'América', -82.4, 23.1, 11.2, 107, 22, 4, 4, 7, 4, ['#002A8F', '#FFFFFF', '#CF142B'], 'h3'],
  ['212', 'DM', 'Dominica', 'Roseau', 'América', -61.4, 15.3, 0.1, 1, 1, 1, 1, 2, 1, ['#006B3F', '#FCD116', '#D41C30'], 'cross'],
  ['218', 'EC', 'Ecuador', 'Quito', 'América', -78.5, -0.2, 18.2, 118, 20, 8, 4, 9, 3, ['#FFD100', '#034EA2', '#EE2B33'], 'h3'],
  ['222', 'SV', 'El Salvador', 'San Salvador', 'América', -89.2, 13.7, 6.3, 34, 10, 2, 2, 5, 2, ['#0F47AF', '#FFFFFF', '#0F47AF'], 'h3'],
  ['840', 'US', 'Estados Unidos', 'Washington D. C.', 'América', -77.0, 38.9, 334.9, 27360, 240, 48, 42, 46, 52, ['#0A3161', '#B31942', '#FFFFFF'], 'canton'],
  ['308', 'GD', 'Granada', 'Saint George', 'América', -61.7, 12.1, 0.1, 1, 1, 1, 1, 2, 1, ['#CE1126', '#FCD116', '#007A5E'], 'diag'],
  ['320', 'GT', 'Guatemala', 'Ciudad de Guatemala', 'América', -90.5, 14.6, 17.8, 102, 14, 3, 3, 8, 2, ['#4997D0', '#FFFFFF', '#4997D0'], 'v3'],
  ['328', 'GY', 'Guyana', 'Georgetown', 'América', -58.2, 6.8, 0.8, 17, 4, 7, 3, 4, 1, ['#009E49', '#FCD116', '#CE1126'], 'diag'],
  ['332', 'HT', 'Haití', 'Puerto Príncipe', 'América', -72.3, 18.5, 11.7, 21, 5, 1, 1, 5, 1, ['#00209F', '#D21034', '#FFFFFF'], 'h2'],
  ['340', 'HN', 'Honduras', 'Tegucigalpa', 'América', -87.2, 14.1, 10.6, 34, 9, 2, 2, 6, 2, ['#00BCE4', '#FFFFFF', '#00BCE4'], 'h3'],
  ['388', 'JM', 'Jamaica', 'Kingston', 'América', -76.8, 18.0, 2.8, 19, 5, 1, 3, 4, 2, ['#009B3A', '#FED100', '#000000'], 'diag'],
  ['484', 'MX', 'México', 'Ciudad de México', 'América', -99.1, 19.4, 128.5, 1788, 66, 20, 18, 22, 12, ['#006847', '#FFFFFF', '#CE1126'], 'v3'],
  ['558', 'NI', 'Nicaragua', 'Managua', 'América', -86.3, 12.1, 7.0, 18, 8, 2, 2, 5, 2, ['#0067C6', '#FFFFFF', '#0067C6'], 'h3'],
  ['591', 'PA', 'Panamá', 'Ciudad de Panamá', 'América', -79.5, 9.0, 4.4, 83, 8, 3, 3, 5, 5, ['#FFFFFF', '#D21034', '#005293'], 'canton'],
  ['600', 'PY', 'Paraguay', 'Asunción', 'América', -57.6, -25.3, 6.8, 43, 11, 5, 2, 10, 2, ['#D52B1E', '#FFFFFF', '#0038A8'], 'h3'],
  ['604', 'PE', 'Perú', 'Lima', 'América', -77.0, -12.0, 34.4, 267, 36, 8, 14, 12, 5, ['#D91023', '#FFFFFF', '#D91023'], 'v3'],
  ['214', 'DO', 'República Dominicana', 'Santo Domingo', 'América', -69.9, 18.5, 11.3, 121, 16, 3, 4, 8, 4, ['#002D62', '#FFFFFF', '#CE1126'], 'cross'],
  ['659', 'KN', 'San Cristóbal y Nieves', 'Basseterre', 'América', -62.7, 17.3, 0.1, 1, 1, 1, 1, 2, 1, ['#009E49', '#CE1126', '#000000'], 'diag'],
  ['670', 'VC', 'San Vicente y las Granadinas', 'Kingstown', 'América', -61.2, 13.2, 0.1, 1, 1, 1, 1, 2, 1, ['#0072C6', '#FCD116', '#009E60'], 'v3'],
  ['662', 'LC', 'Santa Lucía', 'Castries', 'América', -61.0, 14.0, 0.2, 2, 1, 1, 1, 2, 1, ['#66CCFF', '#FCD116', '#000000'], 'circle'],
  ['740', 'SR', 'Surinam', 'Paramaribo', 'América', -55.2, 5.8, 0.6, 4, 3, 3, 3, 3, 1, ['#377E3F', '#FFFFFF', '#B40A2D'], 'h3'],
  ['780', 'TT', 'Trinidad y Tobago', 'Puerto España', 'América', -61.5, 10.7, 1.5, 28, 5, 6, 2, 3, 3, ['#CE1126', '#FFFFFF', '#000000'], 'diag'],
  ['858', 'UY', 'Uruguay', 'Montevideo', 'América', -56.2, -34.9, 3.4, 77, 12, 3, 2, 10, 5, ['#FFFFFF', '#0038A8', '#FCD116'], 'canton'],
  ['862', 'VE', 'Venezuela', 'Caracas', 'América', -66.9, 10.5, 28.8, 98, 32, 22, 9, 8, 4, ['#FFCC00', '#00247D', '#CF142B'], 'h3'],

  // EUROPA (44)
  ['008', 'AL', 'Albania', 'Tirana', 'Europa', 19.8, 41.3, 2.8, 23, 9, 3, 3, 4, 3, ['#E41E20', '#000000', '#E41E20'], 'circle'],
  ['276', 'DE', 'Alemania', 'Berlín', 'Europa', 13.4, 52.5, 84.5, 4456, 118, 18, 34, 28, 38, ['#000000', '#DD0000', '#FFCE00'], 'h3'],
  ['020', 'AD', 'Andorra', 'Andorra la Vieja', 'Europa', 1.5, 42.5, 0.1, 4, 2, 1, 1, 2, 3, ['#0018A8', '#FEDF00', '#D0103A'], 'v3'],
  ['040', 'AT', 'Austria', 'Viena', 'Europa', 16.4, 48.2, 9.1, 516, 24, 6, 10, 10, 14, ['#ED2939', '#FFFFFF', '#ED2939'], 'h3'],
  ['056', 'BE', 'Bélgica', 'Bruselas', 'Europa', 4.3, 50.8, 11.8, 632, 28, 6, 12, 10, 16, ['#000000', '#FAE042', '#ED2939'], 'v3'],
  ['112', 'BY', 'Bielorrusia', 'Minsk', 'Europa', 27.6, 53.9, 9.2, 72, 28, 5, 7, 10, 6, ['#C8313E', '#4AA657', '#FFFFFF'], 'h2'],
  ['070', 'BA', 'Bosnia y Herzegovina', 'Sarajevo', 'Europa', 18.4, 43.9, 3.2, 27, 10, 3, 4, 4, 3, ['#002395', '#FECB00', '#FFFFFF'], 'diag'],
  ['100', 'BG', 'Bulgaria', 'Sofía', 'Europa', 23.3, 42.7, 6.4, 101, 20, 5, 6, 8, 6, ['#FFFFFF', '#00966E', '#D62612'], 'h3'],
  ['203', 'CZ', 'Chequia', 'Praga', 'Europa', 14.4, 50.1, 10.8, 330, 26, 6, 11, 9, 13, ['#FFFFFF', '#D7141A', '#11457E'], 'h2'],
  ['336', 'VA', 'Ciudad del Vaticano', 'Ciudad del Vaticano', 'Europa', 12.45, 41.9, 0.01, 2, 2, 1, 1, 1, 4, ['#FFE000', '#FFFFFF', '#D4AF37'], 'v3'],
  ['191', 'HR', 'Croacia', 'Zagreb', 'Europa', 16.0, 45.8, 3.8, 82, 16, 4, 4, 6, 6, ['#FF0000', '#FFFFFF', '#171796'], 'h3'],
  ['208', 'DK', 'Dinamarca', 'Copenhague', 'Europa', 12.6, 55.7, 5.9, 404, 24, 9, 6, 12, 15, ['#C60C30', '#FFFFFF', '#C60C30'], 'cross'],
  ['703', 'SK', 'Eslovaquia', 'Bratislava', 'Europa', 17.1, 48.1, 5.4, 132, 18, 4, 7, 7, 8, ['#FFFFFF', '#0B4EA2', '#EE1C25'], 'h3'],
  ['705', 'SI', 'Eslovenia', 'Liubliana', 'Europa', 14.5, 46.1, 2.1, 68, 12, 3, 4, 5, 8, ['#FFFFFF', '#005DA4', '#ED1C24'], 'h3'],
  ['724', 'ES', 'España', 'Madrid', 'Europa', -3.7, 40.4, 48.3, 1580, 74, 12, 18, 22, 20, ['#AA151B', '#F1BF00', '#AA151B'], 'h3'],
  ['233', 'EE', 'Estonia', 'Tallin', 'Europa', 24.7, 59.4, 1.4, 41, 12, 3, 3, 4, 9, ['#0072CE', '#000000', '#FFFFFF'], 'h3'],
  ['246', 'FI', 'Finlandia', 'Helsinki', 'Europa', 24.9, 60.2, 5.6, 300, 28, 7, 9, 7, 16, ['#FFFFFF', '#002F6C', '#FFFFFF'], 'cross'],
  ['250', 'FR', 'Francia', 'París', 'Europa', 2.35, 48.85, 68.1, 3030, 125, 22, 24, 32, 34, ['#002395', '#FFFFFF', '#ED2939'], 'v3'],
  ['300', 'GR', 'Grecia', 'Atenas', 'Europa', 23.7, 38.0, 10.4, 239, 36, 5, 7, 10, 9, ['#0D5EAF', '#FFFFFF', '#0D5EAF'], 'canton'],
  ['348', 'HU', 'Hungría', 'Budapest', 'Europa', 19.0, 47.5, 9.6, 212, 22, 5, 7, 11, 9, ['#CD2A3E', '#FFFFFF', '#436F4D'], 'h3'],
  ['372', 'IE', 'Irlanda', 'Dublín', 'Europa', -6.3, 53.3, 5.3, 545, 14, 4, 5, 11, 17, ['#169B62', '#FFFFFF', '#FF883E'], 'v3'],
  ['352', 'IS', 'Islandia', 'Reikiavik', 'Europa', -21.9, 64.1, 0.4, 31, 4, 7, 2, 4, 7, ['#02529C', '#FFFFFF', '#DC1E35'], 'cross'],
  ['380', 'IT', 'Italia', 'Roma', 'Europa', 12.5, 41.9, 58.8, 2254, 92, 12, 22, 24, 26, ['#009246', '#FFFFFF', '#CE2B37'], 'v3'],
  ['428', 'LV', 'Letonia', 'Riga', 'Europa', 24.1, 56.9, 1.9, 44, 12, 3, 3, 5, 6, ['#9E3039', '#FFFFFF', '#9E3039'], 'h3'],
  ['438', 'LI', 'Liechtenstein', 'Vaduz', 'Europa', 9.5, 47.1, 0.04, 7, 2, 1, 1, 2, 4, ['#002B7F', '#CE1126', '#FFD100'], 'h2'],
  ['440', 'LT', 'Lituania', 'Vilna', 'Europa', 25.3, 54.7, 2.9, 78, 16, 3, 4, 6, 8, ['#FDB913', '#006A44', '#C1272D'], 'h3'],
  ['442', 'LU', 'Luxemburgo', 'Luxemburgo', 'Europa', 6.1, 49.6, 0.7, 86, 6, 2, 4, 3, 9, ['#EA142A', '#FFFFFF', '#51ADDA'], 'h3'],
  ['807', 'MK', 'Macedonia del Norte', 'Skopie', 'Europa', 21.4, 42.0, 1.8, 15, 7, 2, 3, 4, 3, ['#D20000', '#FFE600', '#D20000'], 'circle'],
  ['470', 'MT', 'Malta', 'La Valeta', 'Europa', 14.5, 35.9, 0.5, 21, 4, 1, 1, 2, 5, ['#FFFFFF', '#CF142B', '#94A3B8'], 'v3'],
  ['498', 'MD', 'Moldavia', 'Chisináu', 'Europa', 28.8, 47.0, 2.5, 16, 7, 2, 2, 6, 3, ['#0046AE', '#FFD200', '#CC092F'], 'v3'],
  ['492', 'MC', 'Mónaco', 'Mónaco', 'Europa', 7.4, 43.7, 0.04, 9, 2, 1, 1, 1, 5, ['#CE1126', '#FFFFFF', '#CE1126'], 'h2'],
  ['499', 'ME', 'Montenegro', 'Podgorica', 'Europa', 19.3, 42.4, 0.6, 7, 5, 2, 2, 3, 3, ['#C40308', '#D4AF37', '#C40308'], 'circle'],
  ['578', 'NO', 'Noruega', 'Oslo', 'Europa', 10.7, 59.9, 5.5, 485, 34, 24, 10, 8, 18, ['#BA0C2F', '#00205B', '#FFFFFF'], 'cross'],
  ['528', 'NL', 'Países Bajos', 'Ámsterdam', 'Europa', 4.9, 52.4, 17.9, 1118, 44, 10, 14, 18, 25, ['#AE1C28', '#FFFFFF', '#21468B'], 'h3'],
  ['616', 'PL', 'Polonia', 'Varsovia', 'Europa', 21.0, 52.2, 36.8, 811, 76, 12, 18, 20, 16, ['#FFFFFF', '#DC143C', '#FFFFFF'], 'h2'],
  ['620', 'PT', 'Portugal', 'Lisboa', 'Europa', -9.1, 38.7, 10.5, 287, 26, 6, 6, 10, 11, ['#006600', '#FF0000', '#FFCC00'], 'v3'],
  ['826', 'GB', 'Reino Unido', 'Londres', 'Europa', -0.1, 51.5, 67.7, 3340, 130, 22, 20, 20, 36, ['#012169', '#C8102E', '#FFFFFF'], 'cross'],
  ['642', 'RO', 'Rumania', 'Bucarest', 'Europa', 26.1, 44.4, 19.0, 351, 40, 10, 11, 14, 10, ['#002B7F', '#FCD116', '#CE1126'], 'v3'],
  ['643', 'RU', 'Rusia', 'Moscú', 'Europa', 37.6, 55.7, 144.2, 2021, 195, 48, 40, 34, 26, ['#FFFFFF', '#0039A6', '#D52B1E'], 'h3'],
  ['674', 'SM', 'San Marino', 'San Marino', 'Europa', 12.45, 43.9, 0.03, 2, 1, 1, 1, 1, 3, ['#FFFFFF', '#5EB6E4', '#FCD116'], 'h2'],
  ['688', 'RS', 'Serbia', 'Belgrado', 'Europa', 20.5, 44.8, 6.6, 75, 24, 5, 6, 8, 6, ['#C6363C', '#0C4076', '#FFFFFF'], 'h3'],
  ['752', 'SE', 'Suecia', 'Estocolmo', 'Europa', 18.1, 59.3, 10.5, 593, 38, 10, 14, 10, 22, ['#006AA7', '#FECC02', '#006AA7'], 'cross'],
  ['756', 'CH', 'Suiza', 'Berna', 'Europa', 7.4, 46.9, 8.9, 885, 32, 6, 8, 8, 26, ['#FF0000', '#FFFFFF', '#FF0000'], 'cross'],
  ['804', 'UA', 'Ucrania', 'Kiev', 'Europa', 30.5, 50.4, 36.7, 178, 88, 10, 18, 26, 12, ['#005BBB', '#FFD500', '#005BBB'], 'h2'],

  // ASIA (48)
  ['004', 'AF', 'Afganistán', 'Kabul', 'Asia', 69.2, 34.5, 42.2, 15, 18, 3, 4, 6, 1, ['#000000', '#BF0000', '#009900'], 'v3'],
  ['682', 'SA', 'Arabia Saudita', 'Riad', 'Asia', 46.7, 24.7, 36.9, 1068, 86, 44, 14, 8, 14, ['#006C35', '#FFFFFF', '#006C35'], 'circle'],
  ['051', 'AM', 'Armenia', 'Ereván', 'Asia', 44.5, 40.2, 2.8, 24, 12, 2, 4, 4, 4, ['#D90012', '#0033A0', '#F2A800'], 'h3'],
  ['031', 'AZ', 'Azerbaiyán', 'Bakú', 'Asia', 49.9, 40.4, 10.1, 72, 26, 14, 5, 6, 5, ['#00B5E2', '#EF3340', '#509E2F'], 'h3'],
  ['050', 'BD', 'Bangladés', 'Daca', 'Asia', 90.4, 23.8, 172.9, 437, 38, 6, 7, 18, 6, ['#006A4E', '#F42A41', '#006A4E'], 'circle'],
  ['048', 'BH', 'Baréin', 'Manama', 'Asia', 50.6, 26.2, 1.5, 43, 10, 8, 3, 2, 5, ['#FFFFFF', '#CE1126', '#FFFFFF'], 'v3'],
  ['104', 'MM', 'Birmania', 'Naipyidó', 'Asia', 96.1, 19.8, 54.6, 65, 34, 6, 6, 12, 3, ['#FECB00', '#34B233', '#EA2839'], 'h3'],
  ['096', 'BN', 'Brunéi', 'Bandar Seri Begawan', 'Asia', 114.9, 4.9, 0.5, 15, 5, 7, 2, 2, 4, ['#F7E017', '#FFFFFF', '#000000'], 'diag'],
  ['064', 'BT', 'Bután', 'Timbu', 'Asia', 89.6, 27.5, 0.8, 3, 4, 3, 1, 3, 2, ['#FFCC33', '#FF4E12', '#FFFFFF'], 'diag'],
  ['116', 'KH', 'Camboya', 'Nom Pen', 'Asia', 104.9, 11.6, 16.9, 32, 15, 3, 3, 8, 3, ['#032EA1', '#E00025', '#FFFFFF'], 'h3'],
  ['634', 'QA', 'Catar', 'Doha', 'Asia', 51.5, 25.3, 2.7, 235, 20, 26, 5, 3, 10, ['#8A1538', '#FFFFFF', '#8A1538'], 'v3'],
  ['156', 'CN', 'China', 'Pekín', 'Asia', 116.4, 39.9, 1411.0, 17790, 225, 36, 52, 44, 46, ['#EE1C25', '#FFFF00', '#EE1C25'], 'canton'],
  ['196', 'CY', 'Chipre', 'Nicosia', 'Asia', 33.4, 35.2, 1.3, 32, 8, 2, 2, 3, 6, ['#FFFFFF', '#D57800', '#4E5B31'], 'circle'],
  ['408', 'KP', 'Corea del Norte', 'Pionyang', 'Asia', 125.7, 39.0, 26.2, 30, 68, 4, 10, 5, 7, ['#024FA2', '#ED1C27', '#FFFFFF'], 'h3'],
  ['410', 'KR', 'Corea del Sur', 'Seúl', 'Asia', 127.0, 37.6, 51.7, 1712, 96, 8, 28, 12, 34, ['#FFFFFF', '#CD2E3A', '#0047A0'], 'circle'],
  ['784', 'AE', 'Emiratos Árabes Unidos', 'Abu Dabi', 'Asia', 54.4, 24.5, 9.5, 504, 38, 26, 8, 4, 15, ['#FF0000', '#00732F', '#000000'], 'h3'],
  ['608', 'PH', 'Filipinas', 'Manila', 'Asia', 121.0, 14.6, 117.3, 437, 42, 6, 9, 15, 8, ['#0038A8', '#CE1126', '#FCD116'], 'h2'],
  ['268', 'GE', 'Georgia', 'Tiflis', 'Asia', 44.8, 41.7, 3.7, 30, 11, 3, 3, 5, 4, ['#FFFFFF', '#FF0000', '#FFFFFF'], 'cross'],
  ['356', 'IN', 'India', 'Nueva Delhi', 'Asia', 77.2, 28.6, 1428.6, 3550, 165, 22, 34, 42, 28, ['#FF9933', '#FFFFFF', '#138808'], 'h3'],
  ['360', 'ID', 'Indonesia', 'Yakarta', 'Asia', 106.8, -6.2, 277.5, 1371, 68, 20, 18, 26, 11, ['#FF0000', '#FFFFFF', '#FF0000'], 'h2'],
  ['368', 'IQ', 'Irak', 'Bagdad', 'Asia', 44.4, 33.3, 45.5, 250, 44, 24, 6, 8, 4, ['#CE1126', '#FFFFFF', '#000000'], 'h3'],
  ['364', 'IR', 'Irán', 'Teherán', 'Asia', 51.4, 35.7, 89.2, 401, 78, 28, 16, 15, 12, ['#239F40', '#FFFFFF', '#DA0000'], 'h3'],
  ['376', 'IL', 'Israel', 'Jerusalén', 'Asia', 35.2, 31.8, 9.8, 509, 76, 6, 8, 7, 26, ['#FFFFFF', '#0038B8', '#FFFFFF'], 'h3'],
  ['392', 'JP', 'Japón', 'Tokio', 'Asia', 139.7, 35.7, 124.5, 4212, 112, 8, 34, 16, 42, ['#FFFFFF', '#BC002D', '#FFFFFF'], 'circle'],
  ['400', 'JO', 'Jordania', 'Amán', 'Asia', 35.9, 31.9, 11.3, 51, 20, 3, 4, 4, 5, ['#000000', '#FFFFFF', '#007A3D'], 'h3'],
  ['398', 'KZ', 'Kazajistán', 'Astaná', 'Asia', 71.4, 51.2, 19.9, 261, 32, 22, 16, 14, 7, ['#00AFCA', '#FEC50C', '#00AFCA'], 'circle'],
  ['417', 'KG', 'Kirguistán', 'Biskek', 'Asia', 74.6, 42.9, 7.1, 14, 9, 3, 4, 5, 2, ['#E8112D', '#FFEF00', '#E8112D'], 'circle'],
  ['414', 'KW', 'Kuwait', 'Ciudad de Kuwait', 'Asia', 48.0, 29.4, 4.3, 161, 18, 20, 3, 2, 6, ['#007A3D', '#FFFFFF', '#CE1126'], 'h3'],
  ['418', 'LA', 'Laos', 'Vientián', 'Asia', 102.6, 18.0, 7.6, 15, 10, 4, 3, 6, 2, ['#CE1126', '#002868', '#FFFFFF'], 'h3'],
  ['422', 'LB', 'Líbano', 'Beirut', 'Asia', 35.5, 33.9, 5.4, 18, 14, 2, 2, 4, 4, ['#ED1C24', '#FFFFFF', '#00A651'], 'h3'],
  ['458', 'MY', 'Malasia', 'Kuala Lumpur', 'Asia', 101.7, 3.1, 34.3, 400, 34, 14, 10, 11, 12, ['#010066', '#CC0001', '#FFFFFF'], 'canton'],
  ['462', 'MV', 'Maldivas', 'Malé', 'Asia', 73.5, 4.2, 0.5, 7, 2, 1, 1, 2, 2, ['#D21034', '#007E3A', '#FFFFFF'], 'circle'],
  ['496', 'MN', 'Mongolia', 'Ulán Bator', 'Asia', 106.9, 47.9, 3.4, 20, 10, 5, 9, 6, 2, ['#DA2032', '#0066B3', '#FFD900'], 'v3'],
  ['524', 'NP', 'Nepal', 'Katmandú', 'Asia', 85.3, 27.7, 30.9, 41, 16, 3, 2, 9, 3, ['#DC143C', '#003893', '#FFFFFF'], 'diag'],
  ['512', 'OM', 'Omán', 'Mascate', 'Asia', 58.4, 23.6, 4.6, 108, 22, 14, 4, 4, 5, ['#DB161B', '#FFFFFF', '#008000'], 'h3'],
  ['586', 'PK', 'Pakistán', 'Islamabad', 'Asia', 73.0, 33.7, 240.5, 338, 94, 10, 12, 22, 10, ['#01411C', '#FFFFFF', '#01411C'], 'v3'],
  ['275', 'PS', 'Palestina', 'Jerusalén Este', 'Asia', 35.2, 31.9, 5.4, 18, 8, 1, 2, 3, 3, ['#000000', '#FFFFFF', '#007A3D'], 'h3'],
  ['702', 'SG', 'Singapur', 'Singapur', 'Asia', 103.8, 1.35, 5.9, 501, 34, 4, 6, 3, 24, ['#EF3340', '#FFFFFF', '#EF3340'], 'h2'],
  ['760', 'SY', 'Siria', 'Damasco', 'Asia', 36.3, 33.5, 23.2, 19, 28, 6, 3, 6, 3, ['#CE1126', '#FFFFFF', '#000000'], 'h3'],
  ['144', 'LK', 'Sri Lanka', 'Sri Jayawardenepura', 'Asia', 79.9, 6.9, 22.0, 84, 22, 3, 3, 9, 5, ['#8D153A', '#EB7400', '#00534E'], 'v3'],
  ['764', 'TH', 'Tailandia', 'Bangkok', 'Asia', 100.5, 13.7, 71.8, 515, 52, 10, 11, 19, 11, ['#A51931', '#FFFFFF', '#2D2A4A'], 'h3'],
  ['762', 'TJ', 'Tayikistán', 'Dusambé', 'Asia', 68.8, 38.6, 10.1, 12, 10, 4, 3, 5, 2, ['#CC0000', '#FFFFFF', '#006600'], 'h3'],
  ['626', 'TL', 'Timor Oriental', 'Dili', 'Asia', 125.6, -8.6, 1.4, 2, 3, 3, 1, 2, 1, ['#DC241F', '#FFC726', '#000000'], 'diag'],
  ['795', 'TM', 'Turkmenistán', 'Asjabad', 'Asia', 58.4, 37.9, 6.5, 60, 18, 16, 4, 5, 3, ['#00843D', '#D22630', '#FFFFFF'], 'v3'],
  ['792', 'TR', 'Turquía', 'Ankara', 'Asia', 32.9, 39.9, 85.3, 1108, 105, 14, 20, 22, 18, ['#E30A17', '#FFFFFF', '#E30A17'], 'circle'],
  ['860', 'UZ', 'Uzbekistán', 'Taskent', 'Asia', 69.3, 41.3, 36.4, 90, 30, 11, 9, 12, 5, ['#1EB53A', '#0099B5', '#FFFFFF'], 'h3'],
  ['704', 'VN', 'Vietnam', 'Hanói', 'Asia', 105.8, 21.0, 98.9, 430, 66, 11, 12, 20, 10, ['#DA251D', '#FFFF00', '#DA251D'], 'circle'],
  ['887', 'YE', 'Yemen', 'Saná', 'Asia', 44.2, 15.4, 34.4, 21, 20, 5, 2, 5, 1, ['#CE1126', '#FFFFFF', '#000000'], 'h3'],

  // ÁFRICA (54)
  ['024', 'AO', 'Angola', 'Luanda', 'África', 13.2, -8.8, 36.7, 85, 28, 16, 5, 8, 3, ['#CC092F', '#000000', '#FFCB00'], 'h2'],
  ['012', 'DZ', 'Argelia', 'Argel', 'África', 3.0, 36.7, 45.6, 240, 52, 22, 9, 10, 6, ['#006233', '#FFFFFF', '#D21034'], 'v3'],
  ['204', 'BJ', 'Benín', 'Porto Novo', 'África', 2.6, 6.5, 13.7, 20, 7, 2, 2, 6, 2, ['#008751', '#FCD116', '#E8112D'], 'v3'],
  ['072', 'BW', 'Botsuana', 'Gaborone', 'África', 25.9, -24.6, 2.7, 19, 8, 3, 7, 4, 3, ['#6DA9D2', '#000000', '#FFFFFF'], 'h3'],
  ['854', 'BF', 'Burkina Faso', 'Uagadugú', 'África', -1.5, 12.4, 23.3, 20, 11, 2, 4, 6, 2, ['#EF2B2D', '#009E49', '#FCD116'], 'h2'],
  ['108', 'BI', 'Burundi', 'Gitega', 'África', 29.9, -3.4, 13.2, 3, 7, 1, 2, 5, 1, ['#CE1126', '#1EB53A', '#FFFFFF'], 'diag'],
  ['132', 'CV', 'Cabo Verde', 'Praia', 'África', -23.5, 14.9, 0.6, 3, 2, 1, 1, 2, 2, ['#003893', '#FFFFFF', '#CF2027'], 'h3'],
  ['120', 'CM', 'Camerún', 'Yaundé', 'África', 11.5, 3.9, 28.6, 48, 18, 6, 4, 9, 3, ['#007A5E', '#CE1126', '#FCD116'], 'v3'],
  ['148', 'TD', 'Chad', 'Yamena', 'África', 15.0, 12.1, 18.3, 13, 14, 6, 2, 5, 1, ['#002664', '#FECB00', '#C60C30'], 'v3'],
  ['174', 'KM', 'Comoras', 'Moroni', 'África', 43.3, -11.7, 0.9, 1, 2, 1, 1, 2, 1, ['#FFC61E', '#FFFFFF', '#3D8E33'], 'h3'],
  ['384', 'CI', 'Costa de Marfil', 'Yamusukro', 'África', -5.3, 6.8, 28.9, 79, 16, 5, 4, 11, 4, ['#F77F00', '#FFFFFF', '#009E60'], 'v3'],
  ['818', 'EG', 'Egipto', 'El Cairo', 'África', 31.2, 30.0, 112.7, 396, 84, 16, 12, 18, 9, ['#CE1126', '#FFFFFF', '#000000'], 'h3'],
  ['232', 'ER', 'Eritrea', 'Asmara', 'África', 38.9, 15.3, 3.7, 3, 14, 2, 3, 3, 1, ['#EA0437', '#12AD2B', '#4189DD'], 'diag'],
  ['748', 'SZ', 'Esuatini', 'Mbabane', 'África', 31.1, -26.3, 1.2, 5, 3, 1, 2, 3, 2, ['#3E5EB9', '#FFD900', '#B10C0C'], 'h3'],
  ['231', 'ET', 'Etiopía', 'Adís Abeba', 'África', 38.7, 9.0, 126.5, 164, 42, 7, 6, 18, 5, ['#078930', '#FCDD09', '#DA121A'], 'h3'],
  ['266', 'GA', 'Gabón', 'Libreville', 'África', 9.4, 0.4, 2.4, 21, 7, 8, 4, 3, 2, ['#009E60', '#FCD116', '#3A75C4'], 'h3'],
  ['270', 'GM', 'Gambia', 'Banjul', 'África', -16.6, 13.5, 2.8, 2, 3, 1, 1, 3, 1, ['#CE1126', '#0C1C8C', '#3A7728'], 'h3'],
  ['288', 'GH', 'Ghana', 'Acra', 'África', -0.2, 5.6, 34.1, 76, 16, 6, 6, 10, 4, ['#CE1126', '#FCD116', '#006B3F'], 'h3'],
  ['324', 'GN', 'Guinea', 'Conakri', 'África', -13.7, 9.5, 14.2, 24, 10, 3, 9, 6, 2, ['#CE1126', '#FCD116', '#009460'], 'v3'],
  ['624', 'GW', 'Guinea-Bisáu', 'Bisáu', 'África', -15.6, 11.9, 2.1, 2, 4, 1, 1, 3, 1, ['#CE1126', '#FCD116', '#009E49'], 'v3'],
  ['226', 'GQ', 'Guinea Ecuatorial', 'Malabo', 'África', 8.8, 3.7, 1.7, 12, 5, 7, 2, 2, 2, ['#3E9A00', '#FFFFFF', '#E32118'], 'h3'],
  ['404', 'KE', 'Kenia', 'Nairobi', 'África', 36.8, -1.3, 55.1, 108, 24, 5, 5, 12, 6, ['#000000', '#BB0000', '#006600'], 'h3'],
  ['426', 'LS', 'Lesoto', 'Maseru', 'África', 27.5, -29.3, 2.3, 2, 3, 2, 2, 3, 1, ['#00209F', '#FFFFFF', '#009543'], 'h3'],
  ['430', 'LR', 'Liberia', 'Monrovia', 'África', -10.8, 6.3, 5.4, 4, 4, 1, 3, 4, 1, ['#BF0A30', '#FFFFFF', '#002868'], 'canton'],
  ['434', 'LY', 'Libia', 'Trípoli', 'África', 13.2, 32.9, 6.9, 50, 22, 18, 4, 4, 3, ['#E70013', '#000000', '#239E46'], 'h3'],
  ['450', 'MG', 'Madagascar', 'Antananarivo', 'África', 47.5, -18.9, 30.3, 16, 11, 2, 4, 9, 2, ['#FFFFFF', '#FC3D32', '#007E3A'], 'v3'],
  ['454', 'MW', 'Malaui', 'Lilongüe', 'África', 33.8, -14.0, 20.9, 14, 8, 2, 2, 7, 2, ['#000000', '#CE1126', '#339E35'], 'h3'],
  ['466', 'ML', 'Malí', 'Bamako', 'África', -8.0, 12.6, 23.3, 21, 14, 2, 5, 7, 2, ['#14B53A', '#FCD116', '#CE1126'], 'v3'],
  ['504', 'MA', 'Marruecos', 'Rabat', 'África', -6.8, 34.0, 37.8, 141, 46, 5, 11, 12, 7, ['#C1272D', '#006233', '#C1272D'], 'circle'],
  ['480', 'MU', 'Mauricio', 'Port Louis', 'África', 57.5, -20.2, 1.3, 14, 3, 1, 1, 3, 4, ['#EA2839', '#1A206D', '#FFD500'], 'h3'],
  ['478', 'MR', 'Mauritania', 'Nuakchot', 'África', -16.0, 18.1, 4.9, 10, 8, 4, 6, 3, 1, ['#00A95C', '#FFD700', '#D01C1F'], 'h3'],
  ['508', 'MZ', 'Mozambique', 'Maputo', 'África', 32.6, -25.9, 33.9, 21, 12, 7, 5, 8, 2, ['#009739', '#000000', '#FCE100'], 'h3'],
  ['516', 'NA', 'Namibia', 'Windhoek', 'África', 17.1, -22.6, 2.6, 12, 7, 3, 6, 4, 3, ['#003580', '#D21034', '#009543'], 'diag'],
  ['562', 'NE', 'Níger', 'Niamey', 'África', 2.1, 13.5, 27.2, 17, 12, 4, 5, 6, 1, ['#E05206', '#FFFFFF', '#0DB02B'], 'h3'],
  ['566', 'NG', 'Nigeria', 'Abuya', 'África', 7.5, 9.1, 223.8, 362, 62, 24, 12, 24, 9, ['#008751', '#FFFFFF', '#008751'], 'v3'],
  ['140', 'CF', 'República Centroafricana', 'Bangui', 'África', 18.6, 4.4, 5.7, 3, 5, 1, 2, 4, 1, ['#003082', '#FFFFFF', '#289728'], 'h3'],
  ['178', 'CG', 'República del Congo', 'Brazzaville', 'África', 15.3, -4.3, 6.1, 15, 8, 7, 3, 4, 2, ['#009543', '#FBDE4A', '#DC241F'], 'diag'],
  ['180', 'CD', 'República Democrática del Congo', 'Kinsasa', 'África', 15.3, -4.4, 102.3, 66, 32, 8, 16, 14, 3, ['#007FFF', '#F7D618', '#CE1021'], 'diag'],
  ['646', 'RW', 'Ruanda', 'Kigali', 'África', 30.1, -1.9, 14.1, 14, 12, 2, 3, 6, 4, ['#00A1DE', '#FAD201', '#20603D'], 'h3'],
  ['678', 'ST', 'Santo Tomé y Príncipe', 'Santo Tomé', 'África', 6.7, 0.3, 0.2, 1, 1, 1, 1, 2, 1, ['#12AD2B', '#FFCE00', '#D21034'], 'h3'],
  ['686', 'SN', 'Senegal', 'Dakar', 'África', -17.4, 14.7, 17.8, 31, 13, 4, 4, 7, 4, ['#00853F', '#FDEF42', '#E31B23'], 'v3'],
  ['690', 'SC', 'Seychelles', 'Victoria', 'África', 55.4, -4.6, 0.1, 2, 2, 1, 1, 2, 2, ['#003F87', '#FCD856', '#D62828'], 'diag'],
  ['694', 'SL', 'Sierra Leona', 'Freetown', 'África', -13.2, 8.5, 8.8, 4, 5, 1, 4, 4, 1, ['#1EB53A', '#FFFFFF', '#0072C6'], 'h3'],
  ['706', 'SO', 'Somalia', 'Mogadiscio', 'África', 45.3, 2.0, 18.1, 12, 10, 2, 2, 5, 1, ['#4189DD', '#FFFFFF', '#4189DD'], 'circle'],
  ['710', 'ZA', 'Sudáfrica', 'Pretoria', 'África', 28.2, -25.7, 60.4, 378, 52, 14, 22, 16, 12, ['#007749', '#FFB81C', '#E03C31'], 'diag'],
  ['729', 'SD', 'Sudán', 'Jartum', 'África', 32.5, 15.5, 48.1, 30, 28, 7, 5, 10, 2, ['#D21034', '#FFFFFF', '#000000'], 'h3'],
  ['728', 'SS', 'Sudán del Sur', 'Yuba', 'África', 31.6, 4.8, 11.1, 7, 10, 6, 2, 4, 1, ['#000000', '#DA121A', '#078930'], 'h3'],
  ['834', 'TZ', 'Tanzania', 'Dodoma', 'África', 35.7, -6.2, 67.4, 79, 22, 5, 6, 14, 4, ['#1EB53A', '#FCD116', '#00A3DD'], 'diag'],
  ['768', 'TG', 'Togo', 'Lomé', 'África', 1.2, 6.1, 9.1, 9, 6, 2, 3, 5, 2, ['#006A4E', '#FFCE00', '#D21034'], 'canton'],
  ['788', 'TN', 'Túnez', 'Túnez', 'África', 10.2, 36.8, 12.5, 49, 18, 4, 4, 7, 5, ['#E70013', '#FFFFFF', '#E70013'], 'circle'],
  ['800', 'UG', 'Uganda', 'Kampala', 'África', 32.6, 0.3, 48.6, 49, 20, 4, 4, 12, 3, ['#000000', '#FCDC04', '#D90000'], 'h3'],
  ['262', 'DJ', 'Yibuti', 'Yibuti', 'África', 43.1, 11.6, 1.1, 4, 5, 2, 1, 2, 2, ['#6AB2E7', '#12AD2B', '#FFFFFF'], 'h2'],
  ['894', 'ZM', 'Zambia', 'Lusaka', 'África', 28.3, -15.4, 20.6, 28, 12, 4, 9, 7, 3, ['#198A00', '#DE2010', '#EF7D00'], 'circle'],
  ['716', 'ZW', 'Zimbabue', 'Harare', 'África', 31.0, -17.8, 16.7, 27, 14, 4, 6, 6, 3, ['#006400', '#FFD200', '#D40000'], 'h3'],

  // OCEANÍA (14)
  ['036', 'AU', 'Australia', 'Canberra', 'Oceanía', 149.1, -35.3, 26.6, 1724, 74, 28, 30, 24, 24, ['#012169', '#FFFFFF', '#E4002B'], 'canton'],
  ['242', 'FJ', 'Fiyi', 'Suva', 'Oceanía', 178.4, -18.1, 0.9, 5, 3, 1, 1, 3, 2, ['#68BFE5', '#012169', '#CE1126'], 'canton'],
  ['584', 'MH', 'Islas Marshall', 'Majuro', 'Oceanía', 171.4, 7.1, 0.04, 1, 1, 1, 1, 2, 1, ['#003893', '#DD7500', '#FFFFFF'], 'diag'],
  ['090', 'SB', 'Islas Salomón', 'Honiara', 'Oceanía', 159.9, -9.4, 0.7, 2, 2, 1, 2, 2, 1, ['#0051BA', '#215B33', '#FCD116'], 'diag'],
  ['296', 'KI', 'Kiribati', 'Tarawa', 'Oceanía', 173.0, 1.4, 0.1, 1, 1, 1, 1, 2, 1, ['#CE1126', '#FCD116', '#003F87'], 'h2'],
  ['583', 'FM', 'Micronesia', 'Palikir', 'Oceanía', 158.2, 6.9, 0.1, 1, 1, 1, 1, 2, 1, ['#75B2DD', '#FFFFFF', '#75B2DD'], 'circle'],
  ['520', 'NR', 'Nauru', 'Yaren', 'Oceanía', 166.9, -0.5, 0.01, 1, 1, 1, 2, 1, 1, ['#002B7F', '#FFC61E', '#FFFFFF'], 'h3'],
  ['554', 'NZ', 'Nueva Zelanda', 'Wellington', 'Oceanía', 174.8, -41.3, 5.2, 253, 20, 7, 5, 14, 13, ['#00247D', '#CC142B', '#FFFFFF'], 'canton'],
  ['585', 'PW', 'Palaos', 'Ngerulmud', 'Oceanía', 134.6, 7.5, 0.02, 1, 1, 1, 1, 2, 1, ['#0085CA', '#FFD100', '#0085CA'], 'circle'],
  ['598', 'PG', 'Papúa Nueva Guinea', 'Port Moresby', 'Oceanía', 147.2, -9.5, 10.3, 31, 9, 8, 7, 6, 2, ['#CE1126', '#000000', '#FCD116'], 'diag'],
  ['882', 'WS', 'Samoa', 'Apia', 'Oceanía', -171.8, -13.8, 0.2, 1, 1, 1, 1, 2, 1, ['#CE1126', '#002B7F', '#FFFFFF'], 'canton'],
  ['776', 'TO', 'Tonga', 'Nukualofa', 'Oceanía', -175.2, -21.1, 0.1, 1, 1, 1, 1, 2, 1, ['#C10000', '#FFFFFF', '#C10000'], 'canton'],
  ['798', 'TV', 'Tuvalu', 'Funafuti', 'Oceanía', 179.2, -8.5, 0.01, 1, 1, 1, 1, 1, 1, ['#5B97B1', '#FFCE00', '#012169'], 'canton'],
  ['548', 'VU', 'Vanuatu', 'Port Vila', 'Oceanía', 168.3, -17.7, 0.3, 1, 1, 1, 1, 2, 1, ['#D21034', '#009543', '#FDCE12'], 'diag'],
];

export const COUNTRIES_195: CountrySeed[] = RAW_COUNTRIES_195.map((row, idx) => {
  const color = UNIQUE_COUNTRY_PALETTE_195[idx];
  return {
    id: idx,
    isoNumeric: row[0],
    iso2: row[1],
    name: row[2],
    capital: row[3],
    continent: row[4],
    lon: row[5],
    lat: row[6],
    popM: row[7],
    gdp: row[8],
    military: row[9],
    resources: {
      energy: row[10],
      steel: row[11],
      food: row[12],
      tech: row[13],
    },
    color,
    flagColors: row[14],
    flagLayout: row[15],
  };
});

export const ISO_TO_COUNTRY_ID: Record<string, number> = Object.fromEntries(
  COUNTRIES_195.map((c) => [c.isoNumeric, c.id])
);

// Map dependent territories / overseas regions in world-atlas 50m to their sovereign country ISO
export const DEPENDENT_ISO_MAP: Record<string, string> = {
  '304': '208', // Greenland -> Denmark
  '234': '208', // Faeroe Is -> Denmark
  '630': '840', // Puerto Rico -> USA
  '850': '840', // US Virgin Is -> USA
  '316': '840', // Guam -> USA
  '016': '840', // American Samoa -> USA
  '580': '840', // Northern Mariana -> USA
  '258': '250', // French Polynesia -> France
  '540': '250', // New Caledonia -> France
  '666': '250', // St Pierre & Miquelon -> France
  '876': '250', // Wallis & Futuna -> France
  '663': '250', // St Martin -> France
  '652': '250', // St Barthelemy -> France
  '260': '250', // French Southern Lands -> France
  '238': '826', // Falkland Is -> UK
  '239': '826', // South Georgia -> UK
  '086': '826', // BIOT -> UK
  '654': '826', // Saint Helena -> UK
  '612': '826', // Pitcairn -> UK
  '660': '826', // Anguilla -> UK
  '136': '826', // Cayman -> UK
  '060': '826', // Bermuda -> UK
  '092': '826', // BVI -> UK
  '796': '826', // Turks & Caicos -> UK
  '500': '826', // Montserrat -> UK
  '832': '826', // Jersey -> UK
  '831': '826', // Guernsey -> UK
  '833': '826', // Isle of Man -> UK
  '533': '528', // Aruba -> Netherlands
  '531': '528', // Curacao -> Netherlands
  '534': '528', // Sint Maarten -> Netherlands
  '248': '246', // Aland -> Finland
  '446': '156', // Macao -> China
  '344': '156', // Hong Kong -> China
  '158': '156', // Taiwan -> China
  '570': '554', // Niue -> New Zealand
  '184': '554', // Cook Is -> New Zealand
  '574': '036', // Norfolk -> Australia
  '334': '036', // Heard & McDonald -> Australia
  '732': '504', // W. Sahara -> Morocco
};
