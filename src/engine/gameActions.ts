import {
  ARMY_RECRUIT_AMOUNT,
  CITY_INCOME,
  GIFT_MONEY_PER_REL,
  GOLD_MINE_INCOME,
  REBEL_RECRUIT_AMOUNT,
  buildCity,
  buildDefenseAt,
  buildGoldMine,
  buildPort,
  canReachToAttack,
  declareWar,
  getCountryDisplayName,
  getRelation,
  launchNuclearBombAt,
  proposeAlliance,
  recruitRebelArmy,
  recruitSoldiers,
  requestAllyHelp,
  requestHumanPeace,
  respondToHumanDiplomaticOffer,
  sendDiplomaticGift,
  startRebellion,
  unlockCountryTreeNode,
  type SimulationState,
} from './gameSimulation';

export type GameActionPayload =
  | { type: 'recruit_soldiers' }
  | { type: 'build_gold_mine' }
  | { type: 'build_city' }
  | { type: 'build_port'; towardsId?: number }
  | { type: 'build_defense'; x: number; y: number }
  | { type: 'launch_nuke'; x: number; y: number }
  | { type: 'declare_war'; targetId: number }
  | { type: 'make_peace'; targetId: number }
  | { type: 'propose_alliance'; targetId: number }
  | { type: 'request_ally_help'; allyId: number }
  | { type: 'send_gift'; targetId: number; points: number }
  | { type: 'respond_human_offer'; offerId: number; accept: boolean }
  | { type: 'recruit_rebel_army' }
  | { type: 'start_rebellion' }
  | { type: 'unlock_tree_node'; nodeId: string };

export interface GameActionResult {
  ok: boolean;
  message: string;
  needsPort?: boolean;
}

export function executeGameAction(
  sim: SimulationState,
  actorCountryId: number,
  action: GameActionPayload
): GameActionResult {
  switch (action.type) {
    case 'recruit_soldiers': {
      const err = recruitSoldiers(sim, actorCountryId);
      return {
        ok: !err,
        message: err ?? `¡+${ARMY_RECRUIT_AMOUNT} soldados reclutados para tu Ejército!`,
      };
    }

    case 'build_gold_mine': {
      const err = buildGoldMine(sim, actorCountryId);
      return {
        ok: !err,
        message: err ?? `Mina de Oro construida (+$${GOLD_MINE_INCOME}/seg).`,
      };
    }

    case 'build_city': {
      const err = buildCity(sim, actorCountryId);
      return {
        ok: !err,
        message: err ?? `Ciudad construida (+$${CITY_INCOME}/seg).`,
      };
    }

    case 'build_port': {
      const err = buildPort(sim, actorCountryId, action.towardsId);
      const towardCountry =
        action.towardsId !== undefined ? sim.countries[action.towardsId] : undefined;
      const towardName = towardCountry ? getCountryDisplayName(towardCountry) : undefined;
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

    case 'launch_nuke': {
      const res = launchNuclearBombAt(sim, actorCountryId, action.x, action.y);
      if (!res.ok) {
        return {
          ok: false,
          message: res.error ?? 'No se pudo lanzar la Bomba Nuclear.',
        };
      }
      const defTxt =
        res.defensesDestroyed && res.defensesDestroyed > 0
          ? ` y destruyó ${res.defensesDestroyed} defensa${res.defensesDestroyed > 1 ? 's' : ''}`
          : '';
      return {
        ok: true,
        message: `¡Impacto nuclear sobre ${res.targetName ?? 'el objetivo'}! Eliminó ${(res.armyDestroyed ?? 0).toLocaleString('es-ES')} soldados${defTxt}.`,
      };
    }

    case 'declare_war': {
      const reach = canReachToAttack(sim, actorCountryId, action.targetId);
      const res = declareWar(sim, actorCountryId, action.targetId);
      const targetCountry = sim.countries[action.targetId];
      const targetName = targetCountry ? getCountryDisplayName(targetCountry) : 'Objetivo';
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
      const targetCountry = sim.countries[action.targetId];
      const targetName = targetCountry ? getCountryDisplayName(targetCountry) : 'País';
      if (!res.ok) {
        return { ok: false, message: res.error ?? 'No se pudo enviar dinero.' };
      }
      const gained = res.gained ?? action.points;
      const newRel = getRelation(sim, actorCountryId, action.targetId);
      return {
        ok: true,
        message: `Enviaste $${gained * GIFT_MONEY_PER_REL} a ${targetName}. La relación subió +${gained} (${newRel}/100).`,
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

    case 'unlock_tree_node': {
      const res = unlockCountryTreeNode(sim, actorCountryId, action.nodeId);
      if (!res.ok) {
        return { ok: false, message: res.error ?? 'No se pudo completar el hito histórico.' };
      }
      return {
        ok: true,
        message: res.renamedTo
          ? `¡Proclamación histórica! Tu nación ahora se llama ${res.renamedTo}.`
          : `¡Hito histórico completado: ${res.title ?? 'Árbol Genealógico'}!`,
      };
    }
  }
}
