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
  completeFocusNode,
  declareWar,
  getCountryName,
  getRelation,
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

export type GameActionPayload =
  | { type: 'recruit_soldiers' }
  | { type: 'recruit_soldiers_max' }
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
  | { type: 'suppress_rebellion'; targetId: number }
  | { type: 'complete_focus'; nodeId: string };

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

    case 'recruit_soldiers_max': {
      const res = recruitSoldiersMax(sim, actorCountryId);
      return {
        ok: res.ok,
        message: res.message,
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

    case 'suppress_rebellion': {
      return suppressRebellion(sim, actorCountryId, action.targetId);
    }

    case 'complete_focus': {
      return completeFocusNode(sim, actorCountryId, action.nodeId);
    }
  }
}
