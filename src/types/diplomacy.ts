export type DiplomaticReplySentiment = 'positive' | 'negative' | 'neutral';

export interface DiplomaticMessage {
  role: 'player' | 'country';
  text: string;
  timestamp: number;
  sentiment?: DiplomaticReplySentiment;
}

export interface DiplomaticNationSnapshot {
  name: string;
  baseName: string;
  capital: string;
  continent: string;
  money: number;
  netIncome: number;
  army: number;
  armyCap: number;
  territoryKm2: number;
  defenses: number;
  antiNukes: number;
  barracks: number;
  ports: number;
  allies: string[];
  enemies: string[];
}

export interface DiplomaticMeetingContext {
  player: DiplomaticNationSnapshot;
  target: DiplomaticNationSnapshot;
  relation: number; // 1..100
  atWar: boolean;
  allied: boolean;
  difficulty: 'normal' | 'hard';
  dateLabel: string;
  globalTension: number;
  aliveCountryNames: string[];
}

export type DiplomaticTreatyAction =
  | 'none'
  | 'form_alliance'
  | 'break_alliance'
  | 'make_peace'
  | 'declare_war';

export type DiplomaticTone = 'hostile' | 'tense' | 'neutral' | 'friendly' | 'historic';

export interface DiplomaticMeetingOutcome {
  summary: string;
  diplomaticHeadline: string;
  tone: DiplomaticTone;
  relationDelta: number; // -40..+35
  treatyAction: DiplomaticTreatyAction;
  moneyTransferToTarget: number;
  moneyTransferToPlayer: number;
  soldiersTransferToPlayer: number;
  soldiersTransferToTarget: number;
  territoryPctToPlayer?: number; // 0..100 (100 = peaceful annexation / total surrender)
  territoryPctToTarget?: number; // 0..60
  goldMinesToPlayer?: number; // 0..5
  citiesToPlayer?: number; // 0..5
  portsToPlayer?: number; // 0..2
  defensesToPlayer?: number; // 0..4
  barracksToPlayer?: number; // 0..3
  antiNukesToPlayer?: number; // 0..2
  truceMonthsToSet?: number; // 0..24 (non-aggression pact)
  targetDeclaresWarOnCountryName: string;
  targetMakesPeaceWithCountryName?: string;
  targetBreaksAllianceWithCountryName?: string;
  targetLaunchesNukeOnCountryName?: string;
  improveRelationsWithAlliesDelta?: number; // -15..+15
  resetPlayerNukeCooldown?: boolean;
  suppressPlayerRebellions?: boolean;
  inciteRebellionInCountryName?: string;
  reasons: string[];
}

export interface AppliedMeetingResult {
  previousRelation: number;
  newRelation: number;
  actualRelationDelta: number;
  appliedEffects: string[];
  outcome: DiplomaticMeetingOutcome;
}
