export type GeopoliticalBloc =
  | 'WESTERN'
  | 'EURASIA'
  | 'ARAB_SUNNI'
  | 'SHIA_AXIS'
  | 'LATAM'
  | 'AFRICA_UNION'
  | 'NON_ALIGNED';

// Explicit real-world geopolitical bloc affiliations by ISO-2 code
const BLOC_MEMBERS: Record<Exclude<GeopoliticalBloc, 'NON_ALIGNED'>, string[]> = {
  WESTERN: [
    'US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'PL', 'CZ',
    'SK', 'RO', 'BG', 'GR', 'TR', 'NO', 'DK', 'SE', 'FI', 'IS', 'IE', 'AT', 'CH',
    'EE', 'LV', 'LT', 'HR', 'SI', 'AL', 'ME', 'MK', 'HU', 'AU', 'NZ', 'JP', 'KR',
    'IL', 'UA', 'MT', 'CY', 'AD', 'MC', 'SM', 'LI', 'VA',
  ],
  EURASIA: [
    'RU', 'CN', 'BY', 'KP', 'KZ', 'KG', 'TJ', 'UZ', 'TM', 'AM', 'CU', 'VE', 'NI',
    'RS', 'LA', 'MM', 'ER',
  ],
  ARAB_SUNNI: [
    'SA', 'AE', 'EG', 'JO', 'KW', 'BH', 'OM', 'QA', 'MA', 'TN', 'DJ', 'SO', 'SD',
    'KM', 'MR', 'PS',
  ],
  SHIA_AXIS: [
    'IR', 'IQ', 'SY', 'LB', 'YE',
  ],
  LATAM: [
    'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'EC', 'BO', 'PY', 'UY', 'CR', 'PA', 'DO',
    'GT', 'HN', 'SV', 'HT', 'JM', 'TT', 'BS', 'BB', 'GY', 'SR', 'BZ', 'AG', 'DM',
    'GD', 'KN', 'LC', 'VC',
  ],
  AFRICA_UNION: [
    'NG', 'ZA', 'KE', 'ET', 'GH', 'CI', 'SN', 'CM', 'AO', 'TZ', 'UG', 'RW', 'BI',
    'CD', 'CG', 'GA', 'GQ', 'TD', 'NE', 'ML', 'BF', 'BJ', 'TG', 'GN', 'GW', 'SL',
    'LR', 'GM', 'CV', 'ST', 'MZ', 'ZM', 'ZW', 'BW', 'NA', 'MW', 'LS', 'SZ', 'MG',
    'MU', 'SC', 'DZ', 'LY', 'SS', 'CF',
  ],
};

export function getCountryBloc(iso2: string): GeopoliticalBloc {
  for (const [bloc, list] of Object.entries(BLOC_MEMBERS) as Array<
    [Exclude<GeopoliticalBloc, 'NON_ALIGNED'>, string[]]
  >) {
    if (list.includes(iso2)) return bloc;
  }
  return 'NON_ALIGNED';
}

// Baseline matrix between geopolitical blocs
export const BLOC_AFFINITY: Record<GeopoliticalBloc, Record<GeopoliticalBloc, number>> = {
  WESTERN: {
    WESTERN: 38,
    EURASIA: -32,
    ARAB_SUNNI: 12,
    SHIA_AXIS: -42,
    LATAM: 14,
    AFRICA_UNION: 6,
    NON_ALIGNED: 10,
  },
  EURASIA: {
    WESTERN: -32,
    EURASIA: 35,
    ARAB_SUNNI: 4,
    SHIA_AXIS: 24,
    LATAM: 6,
    AFRICA_UNION: 12,
    NON_ALIGNED: 10,
  },
  ARAB_SUNNI: {
    WESTERN: 12,
    EURASIA: 4,
    ARAB_SUNNI: 34,
    SHIA_AXIS: -22,
    LATAM: 8,
    AFRICA_UNION: 14,
    NON_ALIGNED: 15,
  },
  SHIA_AXIS: {
    WESTERN: -42,
    EURASIA: 24,
    ARAB_SUNNI: -22,
    SHIA_AXIS: 45,
    LATAM: 4,
    AFRICA_UNION: 2,
    NON_ALIGNED: 0,
  },
  LATAM: {
    WESTERN: 14,
    EURASIA: 6,
    ARAB_SUNNI: 8,
    SHIA_AXIS: 4,
    LATAM: 30,
    AFRICA_UNION: 10,
    NON_ALIGNED: 12,
  },
  AFRICA_UNION: {
    WESTERN: 6,
    EURASIA: 12,
    ARAB_SUNNI: 14,
    SHIA_AXIS: 2,
    LATAM: 10,
    AFRICA_UNION: 24,
    NON_ALIGNED: 12,
  },
  NON_ALIGNED: {
    WESTERN: 10,
    EURASIA: 10,
    ARAB_SUNNI: 15,
    SHIA_AXIS: 0,
    LATAM: 12,
    AFRICA_UNION: 12,
    NON_ALIGNED: 18,
  },
};

// Explicit real-world friendships (+) and rivalries (-) [ISO2_A, ISO2_B, relationScore]
export const BILATERAL_PRESETS: Array<[string, string, number]> = [
  // Grandes potencias y relaciones clave
  ['US', 'DE', 68],
  ['US', 'GB', 82],
  ['US', 'CA', 78],
  ['US', 'FR', 66],
  ['US', 'JP', 76],
  ['US', 'KR', 74],
  ['US', 'AU', 78],
  ['US', 'IL', 75],
  ['US', 'PL', 65],
  ['US', 'IT', 62],
  ['US', 'ES', 58],
  ['US', 'MX', 42],
  ['US', 'IN', 45],
  ['US', 'CN', -58],
  ['US', 'RU', -76],
  ['US', 'IR', -82],
  ['US', 'KP', -88],
  ['US', 'VE', -58],
  ['US', 'CU', -62],
  ['US', 'SY', -64],
  ['US', 'BY', -56],

  // Europa y Eurasia
  ['DE', 'FR', 82],
  ['DE', 'ES', 70],
  ['DE', 'IT', 68],
  ['DE', 'NL', 76],
  ['DE', 'AT', 74],
  ['DE', 'PL', 58],
  ['DE', 'RU', -54],
  ['DE', 'CN', -24],
  ['ES', 'PT', 80],
  ['ES', 'FR', 72],
  ['ES', 'IT', 70],
  ['ES', 'MX', 58],
  ['ES', 'AR', 52],
  ['ES', 'CO', 55],
  ['ES', 'CL', 55],
  ['RU', 'CN', 72],
  ['RU', 'BY', 80],
  ['RU', 'IR', 62],
  ['RU', 'KP', 65],
  ['RU', 'IN', 48],
  ['RU', 'UA', -92],
  ['RU', 'PL', -68],
  ['RU', 'GB', -66],
  ['RU', 'EE', -72],
  ['RU', 'LV', -70],
  ['RU', 'LT', -72],
  ['RU', 'FI', -58],
  ['RU', 'GE', -56],
  ['GB', 'FR', 68],
  ['GB', 'CA', 76],
  ['GB', 'AU', 78],
  ['GB', 'UA', 68],
  ['GR', 'TR', -46],
  ['CY', 'TR', -55],
  ['GR', 'CY', 82],
  ['RS', 'RU', 58],
  ['RS', 'CN', 52],

  // Asia y Pacífico
  ['CN', 'PK', 74],
  ['CN', 'KP', 66],
  ['CN', 'IR', 54],
  ['CN', 'KH', 58],
  ['CN', 'IN', -48],
  ['CN', 'JP', -52],
  ['CN', 'PH', -52],
  ['CN', 'VN', -38],
  ['CN', 'AU', -32],
  ['IN', 'PK', -82],
  ['IN', 'JP', 62],
  ['IN', 'FR', 56],
  ['IN', 'BT', 75],
  ['IN', 'BD', 42],
  ['KR', 'KP', -88],
  ['KR', 'JP', 45],
  ['JP', 'AU', 68],
  ['JP', 'PH', 56],
  ['AU', 'NZ', 85],
  ['ID', 'MY', 48],
  ['TH', 'VN', 42],

  // Oriente Medio y Norte de África
  ['SA', 'AE', 74],
  ['SA', 'EG', 58],
  ['SA', 'JO', 62],
  ['SA', 'BH', 76],
  ['SA', 'KW', 68],
  ['SA', 'US', 42],
  ['SA', 'SY', 24],
  ['SA', 'IR', -52],
  ['SA', 'YE', -58],
  ['SA', 'IL', -35],
  ['IL', 'IR', -92],
  ['IL', 'SY', -82],
  ['IL', 'LB', -72],
  ['IL', 'PS', -86],
  ['IL', 'YE', -68],
  ['IL', 'EG', 22],
  ['IL', 'JO', 25],
  ['TR', 'AZ', 80],
  ['TR', 'QA', 64],
  ['TR', 'PK', 60],
  ['TR', 'AM', -68],
  ['TR', 'SY', -44],
  ['AM', 'AZ', -84],
  ['IR', 'SY', 72],
  ['IR', 'IQ', 48],
  ['MA', 'DZ', -58],
  ['MA', 'ES', 32],

  // América Latina y África
  ['BR', 'AR', 58],
  ['BR', 'UY', 64],
  ['BR', 'PY', 56],
  ['BR', 'PT', 72],
  ['AR', 'UY', 62],
  ['AR', 'CL', 48],
  ['CO', 'PE', 56],
  ['CO', 'EC', 50],
  ['CO', 'VE', -28],
  ['VE', 'CU', 74],
  ['VE', 'GY', -64],
  ['CL', 'PE', 34],
  ['ET', 'ER', -54],
  ['ET', 'EG', -44],
  ['ET', 'SO', -46],
  ['KE', 'TZ', 52],
  ['KE', 'UG', 48],
  ['NG', 'GH', 56],
  ['ZA', 'NA', 58],
  ['ZA', 'BW', 54],
  ['CD', 'RW', -58],
  ['SD', 'SS', -45],
];
