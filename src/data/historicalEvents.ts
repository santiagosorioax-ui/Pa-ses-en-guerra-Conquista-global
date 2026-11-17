export interface EventChoice {
  label: string;
  summary: string;
  effects: {
    moneyDelta?: number;
    armyDeltaPct?: number;
    globalTensionDelta?: number;
    globalStabilityDelta?: number;
  };
}

export interface HistoricalEventTemplate {
  id: string;
  title: string;
  category: 'Geopolítica' | 'Economía' | 'Militar' | 'Crisis Global';
  description: string;
  isGlobal: boolean;
  globalEffects?: {
    globalStabilityDelta: number;
    globalTensionDelta: number;
  };
  choices: EventChoice[];
}

export const HISTORICAL_EVENTS: HistoricalEventTemplate[] = [
  {
    id: 'gold_rush',
    title: 'Fiebre de Reservas Auríferas',
    category: 'Economía',
    description:
      'Nuevos yacimientos detectados en rutas estratégicas elevan la recaudación nacional y atraen capital hacia las grandes ciudades.',
    isGlobal: true,
    globalEffects: {
      globalStabilityDelta: 4,
      globalTensionDelta: -2,
    },
    choices: [
      {
        label: 'Invertir en tesorería nacional',
        summary: 'Aumenta tus reservas directas de dinero.',
        effects: { moneyDelta: 220 },
      },
      {
        label: 'Financiar reclutamiento inmediato',
        summary: 'Convierte la bonanza en nuevos soldados.',
        effects: { moneyDelta: 60, armyDeltaPct: 0.12 },
      },
    ],
  },
  {
    id: 'global_market_crash',
    title: 'Crisis Financiera Internacional',
    category: 'Crisis Global',
    description:
      'Una caída repentina en los mercados globales golpea las arcas públicas y aumenta la tensión militar en varios continentes.',
    isGlobal: true,
    globalEffects: {
      globalStabilityDelta: -8,
      globalTensionDelta: 8,
    },
    choices: [
      {
        label: 'Rescate de emergencia',
        summary: 'Usa dinero público para proteger al ejército.',
        effects: { moneyDelta: -140 },
      },
      {
        label: 'Recorte militar de austeridad',
        summary: 'Protege las arcas reduciendo tropas activas.',
        effects: { moneyDelta: 40, armyDeltaPct: -0.1 },
      },
    ],
  },
  {
    id: 'peace_summit',
    title: 'Cumbre Mundial de Seguridad',
    category: 'Geopolítica',
    description:
      'Las potencias firman acuerdos de distensión diplomática para estabilizar fronteras y reducir la tensión global.',
    isGlobal: true,
    globalEffects: {
      globalStabilityDelta: 9,
      globalTensionDelta: -10,
    },
    choices: [
      {
        label: 'Respaldar la cumbre',
        summary: 'Recibe ayuda económica internacional.',
        effects: { moneyDelta: 120, globalTensionDelta: -4 },
      },
      {
        label: 'Reforzar defensa nacional',
        summary: 'Amplía el ejército aprovechando la calma global.',
        effects: { armyDeltaPct: 0.1, globalTensionDelta: 3 },
      },
    ],
  },
  {
    id: 'arms_race',
    title: 'Carrera Armamentista Global',
    category: 'Militar',
    description:
      'Las tensiones fronterizas impulsan a múltiples naciones a movilizar soldados y modernizar sus ejércitos.',
    isGlobal: true,
    globalEffects: {
      globalStabilityDelta: -5,
      globalTensionDelta: 10,
    },
    choices: [
      {
        label: 'Movilización general',
        summary: 'Invierte dinero para sumar un 18% más de soldados.',
        effects: { moneyDelta: -130, armyDeltaPct: 0.18 },
      },
      {
        label: 'Vender equipamiento militar',
        summary: 'Obtén dinero rápido en el mercado internacional.',
        effects: { moneyDelta: 180 },
      },
    ],
  },
  {
    id: 'border_crisis',
    title: 'Tensión Militar en Fronteras',
    category: 'Geopolítica',
    description:
      'Movimientos de tropas en regiones vecinas ponen en alerta al alto mando y exigen una respuesta rápida.',
    isGlobal: false,
    choices: [
      {
        label: 'Reforzar guarniciones',
        summary: 'Contrata tropas adicionales para proteger la capital.',
        effects: { moneyDelta: -100, armyDeltaPct: 0.14 },
      },
      {
        label: 'Desescalada diplomática',
        summary: 'Reduce tensión mundial sin gastar reservas.',
        effects: { globalTensionDelta: -4, globalStabilityDelta: 4 },
      },
    ],
  },
];
