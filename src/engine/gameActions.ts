import {
  DEFENSE_COST,
  MAX_CITIES_PER_MONTH,
  MAX_CITIES_TOTAL,
  MAX_GOLD_MINES_PER_MONTH,
  MAX_GOLD_MINES_TOTAL,
  PORT_COST,
  REBEL_RECRUIT_AMOUNT,
  REBEL_RECRUIT_COST,
  TREATY_ALLIANCE,
  TREATY_WAR,
  buildAntiNukeAt,
  buildBarracksAt,
  buildCity,
  buildDefenseAt,
  buildGoldMine,
  buildPort,
  canReachToAttack,
  completeFocusNode,
  declareWar,
  evaluateFocusNodeStatus,
  getAntiNukeCost,
  getArmyCap,
  getArmyRecruitAmount,
  getArmyRecruitCost,
  getBarracksCost,
  getCityCost,
  getCityIncome,
  getCountryName,
  getEnemies,
  getGiftMoneyPerRel,
  getGoldMineCost,
  getGoldMineIncome,
  getNukeCost,
  getRebellionStatus,
  getRelation,
  hasCoast,
  hasTreaty,
  launchNukeAt,
  proposeAlliance,
  recruitRebelArmy,
  recruitSoldiers,
  recruitSoldiersMax,
  requestAllyHelp,
  requestHumanPeace,
  respondToHumanDiplomaticOffer,
  sendDiplomaticGift,
  startRebellion,
  suppressRebellion,
  type SimulationState,
} from './gameSimulation';
import { MAP_H, MAP_W } from './mapRasterizer';
import { getCountryGenealogyTree } from '../data/countryTrees';

export type GameActionPayload =
  | { type: 'recruit_soldiers' }
  | { type: 'recruit_soldiers_max' }
  | { type: 'build_gold_mine' }
  | { type: 'build_city' }
  | { type: 'build_port'; towardsId?: number }
  | { type: 'build_defense'; x: number; y: number }
  | { type: 'build_anti_nuke'; x: number; y: number }
  | { type: 'build_barracks'; x: number; y: number }
  | { type: 'launch_nuke'; x: number; y: number }
  | { type: 'declare_war'; targetId: number }
  | { type: 'make_peace'; targetId: number }
  | { type: 'propose_alliance'; targetId: number }
  | { type: 'request_ally_help'; allyId: number }
  | { type: 'send_gift'; targetId: number; points: number }
  | { type: 'respond_human_offer'; offerId: number; accept: boolean }
  | { type: 'recruit_rebel_army' }
  | { type: 'start_rebellion' }
  | { type: 'suppress_rebellion'; targetId: number }
  | { type: 'complete_focus'; nodeId: string };

export interface GameActionResult {
  ok: boolean;
  message: string;
  needsPort?: boolean;
}

/**
 * Pure read-only validation used by Online Guests before dispatching a Firestore action.
 * Returns null if the action looks valid against the latest snapshot, or an error result otherwise.
 */
export function validateGameActionLocally(
  sim: SimulationState,
  actorCountryId: number,
  action: GameActionPayload
): GameActionResult | null {
  if (sim.outcome !== 'none') {
    return { ok: false, message: 'La partida ya ha terminado.' };
  }
  const c = sim.countries[actorCountryId];
  if (!c) {
    return { ok: false, message: 'País no encontrado.' };
  }

  switch (action.type) {
    case 'recruit_soldiers': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      const cap = getArmyCap(c, sim.difficulty);
      const recruitCost = getArmyRecruitCost(sim.difficulty);
      const recruitAmount = getArmyRecruitAmount(sim.difficulty);
      if (c.army >= cap) {
        return {
          ok: false,
          message: `Capacidad militar máxima alcanzada (${cap.toLocaleString('es-ES')}). Construye Ciudades o conquista territorio para ampliarla.`,
        };
      }
      if (c.money < recruitCost) {
        return {
          ok: false,
          message: `Necesitas $${recruitCost} para reclutar ${recruitAmount} soldados.`,
        };
      }
      return null;
    }

    case 'recruit_soldiers_max': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      const cap = getArmyCap(c, sim.difficulty);
      const recruitCost = getArmyRecruitCost(sim.difficulty);
      const recruitAmount = getArmyRecruitAmount(sim.difficulty);
      if (cap - c.army < 1) {
        return {
          ok: false,
          message: `Capacidad militar máxima alcanzada (${cap.toLocaleString('es-ES')}). Construye Ciudades o conquista territorio para ampliarla.`,
        };
      }
      const affordable = Math.floor((c.money * recruitAmount) / recruitCost);
      if (affordable < 1) {
        return {
          ok: false,
          message: `Necesitas al menos $${Math.ceil(recruitCost / recruitAmount)} para reclutar soldados.`,
        };
      }
      return null;
    }

    case 'build_gold_mine': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (c.goldMines >= MAX_GOLD_MINES_TOTAL) {
        return { ok: false, message: `Ya alcanzaste el límite máximo de ${MAX_GOLD_MINES_TOTAL} Minas de Oro.` };
      }
      if (c.goldMinesBuiltThisMonth >= MAX_GOLD_MINES_PER_MONTH) {
        return { ok: false, message: `Solo puedes construir ${MAX_GOLD_MINES_PER_MONTH} Mina de Oro por mes.` };
      }
      const cost = getGoldMineCost(c, sim.difficulty);
      if (c.money < cost) {
        return { ok: false, message: `Necesitas $${cost.toLocaleString('es-ES')} de dinero.` };
      }
      return null;
    }

    case 'build_city': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (c.cities >= MAX_CITIES_TOTAL) {
        return { ok: false, message: `Ya alcanzaste el límite máximo de ${MAX_CITIES_TOTAL} Ciudades.` };
      }
      if (c.citiesBuiltThisMonth >= MAX_CITIES_PER_MONTH) {
        return { ok: false, message: `Solo puedes construir ${MAX_CITIES_PER_MONTH} Ciudades por mes.` };
      }
      const cost = getCityCost(c, sim.difficulty);
      if (c.money < cost) {
        return { ok: false, message: `Necesitas $${cost.toLocaleString('es-ES')} de dinero.` };
      }
      return null;
    }

    case 'build_port': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (c.money < PORT_COST) {
        return { ok: false, message: `Necesitas $${PORT_COST} de dinero.` };
      }
      if (!hasCoast(sim, actorCountryId)) {
        return { ok: false, message: 'Tu país no tiene costa al mar para construir un Puerto.' };
      }
      return null;
    }

    case 'build_defense': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (action.x < 0 || action.x >= MAP_W || action.y < 0 || action.y >= MAP_H) {
        return { ok: false, message: 'Posición fuera del mapa.' };
      }
      if (sim.ownerGrid[action.y * MAP_W + action.x] !== actorCountryId) {
        return { ok: false, message: 'Debes colocar la defensa dentro de tu propio territorio.' };
      }
      if (c.defenses.some((d) => Math.hypot(d.x - action.x, d.y - action.y) < 6)) {
        return { ok: false, message: 'Ya existe una defensa muy cerca de ese punto.' };
      }
      if (c.money < DEFENSE_COST) {
        return { ok: false, message: `Necesitas $${DEFENSE_COST} para construir una Defensa.` };
      }
      return null;
    }

    case 'build_anti_nuke': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (action.x < 0 || action.x >= MAP_W || action.y < 0 || action.y >= MAP_H) {
        return { ok: false, message: 'Posición fuera del mapa.' };
      }
      if (sim.ownerGrid[action.y * MAP_W + action.x] !== actorCountryId) {
        return { ok: false, message: 'Debes colocar el Antibombas dentro de tu propio territorio.' };
      }
      if (c.antiNukes.some((a) => Math.hypot(a.x - action.x, a.y - action.y) < 8)) {
        return { ok: false, message: 'Ya existe un Antibombas muy cerca de ese punto.' };
      }
      const antiNukeCost = getAntiNukeCost(sim.difficulty);
      if (c.money < antiNukeCost) {
        return {
          ok: false,
          message: `Necesitas $${antiNukeCost.toLocaleString('es-ES')} para construir un Antibombas.`,
        };
      }
      return null;
    }

    case 'build_barracks': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      if (action.x < 0 || action.x >= MAP_W || action.y < 0 || action.y >= MAP_H) {
        return { ok: false, message: 'Posición fuera del mapa.' };
      }
      if (sim.ownerGrid[action.y * MAP_W + action.x] !== actorCountryId) {
        return { ok: false, message: 'Debes colocar el Cuartel Militar dentro de tu propio territorio.' };
      }
      if (c.barracks.some((b) => Math.hypot(b.x - action.x, b.y - action.y) < 8)) {
        return { ok: false, message: 'Ya existe un Cuartel Militar muy cerca de ese punto.' };
      }
      const barracksCost = getBarracksCost(sim.difficulty);
      if (c.money < barracksCost) {
        return {
          ok: false,
          message: `Necesitas $${barracksCost.toLocaleString('es-ES')} para construir un Cuartel Militar.`,
        };
      }
      return null;
    }

    case 'launch_nuke': {
      if (!c.alive) {
        return { ok: false, message: 'Tu país debe estar activo para lanzar bombas nucleares.' };
      }
      if (action.x < 0 || action.x >= MAP_W || action.y < 0 || action.y >= MAP_H) {
        return { ok: false, message: 'Objetivo fuera del mapa.' };
      }
      if ((c.nukeCooldownDays ?? 0) > 0) {
        return {
          ok: false,
          message: `Misil nuclear en recarga (${c.nukeCooldownDays} días restantes).`,
        };
      }
      const nukeCost = getNukeCost(sim, actorCountryId);
      if (c.money < nukeCost) {
        return {
          ok: false,
          message: `Necesitas $${nukeCost.toLocaleString('es-ES')} para lanzar una Bomba Nuclear.`,
        };
      }
      const targetId = sim.ownerGrid[action.y * MAP_W + action.x];
      if (targetId < 0) {
        return { ok: false, message: 'Debes apuntar a territorio terrestre, no al océano.' };
      }
      if (targetId === actorCountryId) {
        return { ok: false, message: 'No puedes detonar una bomba nuclear sobre tu propio territorio.' };
      }
      if (hasTreaty(sim, actorCountryId, targetId, TREATY_ALLIANCE)) {
        return { ok: false, message: 'No puedes bombardear a un país aliado.' };
      }
      return null;
    }

    case 'declare_war': {
      const target = sim.countries[action.targetId];
      if (!c.alive || !target?.alive) return { ok: false, message: 'País no activo.' };
      if (actorCountryId === action.targetId) {
        return { ok: false, message: 'No puedes atacarte a ti mismo.' };
      }
      if (hasTreaty(sim, actorCountryId, action.targetId, TREATY_WAR)) {
        return { ok: false, message: 'Ya están en guerra.' };
      }
      const reach = canReachToAttack(sim, actorCountryId, action.targetId);
      if (!reach.ok) {
        return {
          ok: false,
          message: reach.reason ?? 'Necesitas un puerto para atacar por mar.',
          needsPort: reach.viaSea,
        };
      }
      return null;
    }

    case 'make_peace': {
      if (!hasTreaty(sim, actorCountryId, action.targetId, TREATY_WAR)) {
        return { ok: false, message: 'No están en guerra.' };
      }
      return null;
    }

    case 'propose_alliance': {
      const target = sim.countries[action.targetId];
      if (!c.alive || !target?.alive) return { ok: false, message: 'País inactivo.' };
      if (hasTreaty(sim, actorCountryId, action.targetId, TREATY_WAR)) {
        return { ok: false, message: 'Están en guerra actualmente.' };
      }
      if (hasTreaty(sim, actorCountryId, action.targetId, TREATY_ALLIANCE)) {
        return { ok: false, message: 'Ya existe una alianza activa.' };
      }
      return null;
    }

    case 'request_ally_help': {
      const ally = sim.countries[action.allyId];
      if (!c.alive || !ally?.alive) return { ok: false, message: 'País no disponible.' };
      if (!hasTreaty(sim, actorCountryId, action.allyId, TREATY_ALLIANCE)) {
        return { ok: false, message: `${getCountryName(ally)} no es tu aliado.` };
      }
      if (getEnemies(sim, actorCountryId).length === 0) {
        return { ok: false, message: 'Actualmente no estás en guerra.' };
      }
      return null;
    }

    case 'send_gift': {
      const target = sim.countries[action.targetId];
      if (!c.alive || !target?.alive) return { ok: false, message: 'País inactivo.' };
      if (hasTreaty(sim, actorCountryId, action.targetId, TREATY_WAR)) {
        return { ok: false, message: 'No puedes enviar dinero mientras están en guerra.' };
      }
      const rel = getRelation(sim, actorCountryId, action.targetId);
      if (rel >= 100) {
        return { ok: false, message: `Tu relación con ${getCountryName(target)} ya está al máximo (100/100).` };
      }
      const actualPoints = Math.max(1, Math.min(action.points, 100 - rel));
      const cost = actualPoints * getGiftMoneyPerRel(sim.difficulty);
      if (c.money < cost) {
        return {
          ok: false,
          message: `Necesitas $${cost.toLocaleString('es-ES')} de dinero para subir +${actualPoints} de relación.`,
        };
      }
      return null;
    }

    case 'recruit_rebel_army': {
      const slot = sim.humanPlayers[actorCountryId];
      if (c.alive || !slot) {
        return { ok: false, message: 'Solo puedes recaudar ejército rebelde mientras tu país esté anexado.' };
      }
      if (slot.rebelMoney < REBEL_RECRUIT_COST) {
        return {
          ok: false,
          message: `Necesitas $${REBEL_RECRUIT_COST} clandestinos para reclutar ${REBEL_RECRUIT_AMOUNT} rebeldes.`,
        };
      }
      return null;
    }

    case 'start_rebellion': {
      const status = getRebellionStatus(sim, actorCountryId);
      if (c.alive) return { ok: false, message: 'Tu país ya es independiente.' };
      if (status.occupierId === null) return { ok: false, message: 'No hay país ocupante activo.' };
      if (!status.canRebel) {
        return {
          ok: false,
          message: `Necesitas al menos la mitad del ejército de ${status.occupierName} (${status.requiredArmy} soldados).`,
        };
      }
      return null;
    }

    case 'complete_focus': {
      if (!c.alive) return { ok: false, message: 'País inactivo.' };
      const tree = getCountryGenealogyTree(c.seed);
      const node = tree.nodes.find((n) => n.id === action.nodeId);
      if (!node) return { ok: false, message: 'Enfoque no encontrado.' };
      const st = evaluateFocusNodeStatus(sim, actorCountryId, node);
      if (!st.canComplete) {
        if (st.completed) {
          return { ok: false, message: 'Este enfoque ya fue completado.' };
        }
        if (!st.parentsMet) {
          return { ok: false, message: 'Debes completar primero los enfoques previos.' };
        }
        const firstMissing = st.checks.find((ch) => !ch.met);
        return {
          ok: false,
          message: firstMissing
            ? `Falta requisito: ${firstMissing.label}.`
            : 'Aún no cumples los requisitos de este enfoque.',
        };
      }
      return null;
    }

    default:
      return null;
  }
}

export function executeGameAction(
  sim: SimulationState,
  actorCountryId: number,
  action: GameActionPayload
): GameActionResult {
  switch (action.type) {
    case 'recruit_soldiers': {
      const err = recruitSoldiers(sim, actorCountryId);
      const amount = getArmyRecruitAmount(sim.difficulty);
      return {
        ok: !err,
        message: err ?? `¡+${amount} soldados reclutados para tu Ejército!`,
      };
    }

    case 'recruit_soldiers_max': {
      const res = recruitSoldiersMax(sim, actorCountryId);
      return {
        ok: res.ok,
        message: res.message,
      };
    }

    case 'build_gold_mine': {
      const err = buildGoldMine(sim, actorCountryId);
      const mineIncome = getGoldMineIncome(sim.difficulty);
      return {
        ok: !err,
        message: err ?? `Mina de Oro construida (+$${mineIncome}/seg).`,
      };
    }

    case 'build_city': {
      const err = buildCity(sim, actorCountryId);
      const cityIncome = getCityIncome(sim.difficulty);
      return {
        ok: !err,
        message: err ?? `Ciudad construida (+$${cityIncome}/seg).`,
      };
    }

    case 'build_port': {
      const err = buildPort(sim, actorCountryId, action.towardsId);
      const towardName =
        action.towardsId !== undefined ? getCountryName(sim.countries[action.towardsId]) : undefined;
      return {
        ok: !err,
        message:
          err ??
          (towardName
            ? `Puerto construido orientado hacia ${towardName}.`
            : 'Puerto naval construido en tu costa.'),
      };
    }

    case 'build_defense': {
      const err = buildDefenseAt(sim, actorCountryId, action.x, action.y);
      return {
        ok: !err,
        message: err ?? '¡Defensa construida! Protege tu territorio dentro de su radio.',
      };
    }

    case 'build_anti_nuke': {
      const err = buildAntiNukeAt(sim, actorCountryId, action.x, action.y);
      return {
        ok: !err,
        message:
          err ??
          '¡Antibombas desplegado! Su radar interceptará bombas nucleares enemigas dentro de su radio.',
      };
    }

    case 'build_barracks': {
      return buildBarracksAt(sim, actorCountryId, action.x, action.y);
    }

    case 'launch_nuke': {
      return launchNukeAt(sim, actorCountryId, action.x, action.y);
    }

    case 'declare_war': {
      const reach = canReachToAttack(sim, actorCountryId, action.targetId);
      const res = declareWar(sim, actorCountryId, action.targetId);
      const targetName = getCountryName(sim.countries[action.targetId]);
      if (!res.ok) {
        return {
          ok: false,
          message: res.error ?? 'No se puede declarar la guerra.',
          needsPort: !reach.ok && reach.viaSea,
        };
      }
      return {
        ok: true,
        message: reach.viaSea
          ? `¡Guerra declarada! Tu flota zarpó desde tu puerto hacia ${targetName}.`
          : `¡Guerra declarada contra ${targetName}!`,
      };
    }

    case 'make_peace': {
      const res = requestHumanPeace(sim, actorCountryId, action.targetId);
      return {
        ok: res.ok,
        message: res.reason,
      };
    }

    case 'propose_alliance': {
      const res = proposeAlliance(sim, actorCountryId, action.targetId);
      return {
        ok: res.accepted || Boolean(res.pendingHuman),
        message: res.reason,
      };
    }

    case 'request_ally_help': {
      const res = requestAllyHelp(sim, actorCountryId, action.allyId);
      return {
        ok: res.accepted || Boolean(res.pendingHuman),
        message: res.reason,
      };
    }

    case 'send_gift': {
      const res = sendDiplomaticGift(sim, actorCountryId, action.targetId, action.points);
      const targetName = getCountryName(sim.countries[action.targetId]);
      if (!res.ok) {
        return { ok: false, message: res.error ?? 'No se pudo enviar dinero.' };
      }
      const gained = res.gained ?? action.points;
      const newRel = getRelation(sim, actorCountryId, action.targetId);
      const giftCost = gained * getGiftMoneyPerRel(sim.difficulty);
      return {
        ok: true,
        message: `Enviaste $${giftCost.toLocaleString('es-ES')} a ${targetName}. La relación subió +${gained} (${newRel}/100).`,
      };
    }

    case 'respond_human_offer': {
      respondToHumanDiplomaticOffer(sim, action.offerId, actorCountryId, action.accept);
      return {
        ok: true,
        message: action.accept ? 'Propuesta aceptada.' : 'Propuesta rechazada.',
      };
    }

    case 'recruit_rebel_army': {
      const err = recruitRebelArmy(sim, actorCountryId);
      return {
        ok: !err,
        message: err ?? `¡+${REBEL_RECRUIT_AMOUNT} rebeldes reclutados en la clandestinidad!`,
      };
    }

    case 'start_rebellion': {
      const res = startRebellion(sim, actorCountryId);
      return {
        ok: res.ok,
        message: res.ok
          ? '¡Rebelión iniciada! Tu país ha recuperado su independencia y está en guerra por su libertad.'
          : (res.error ?? 'No se pudo iniciar la rebelión.'),
      };
    }

    case 'suppress_rebellion': {
      return suppressRebellion(sim, actorCountryId, action.targetId);
    }

    case 'complete_focus': {
      return completeFocusNode(sim, actorCountryId, action.nodeId);
    }
  }
}
