import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Scale,
  Send,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  TREATY_ALLIANCE,
  TREATY_WAR,
  formatFullDate,
  getAllies,
  getArmyCap,
  getCountryName,
  getEnemies,
  getRelation,
  hasTreaty,
  type SimulationState,
} from '../engine/gameSimulation';
import type {
  AppliedMeetingResult,
  DiplomaticMeetingContext,
  DiplomaticMeetingOutcome,
  DiplomaticMessage,
  DiplomaticReplySentiment,
} from '../types/diplomacy';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface DiplomaticMeetingModalProps {
  deviceMode: DeviceMode;
  sim: SimulationState;
  targetId: number;
  onApplyOutcome: (
    targetId: number,
    outcome: DiplomaticMeetingOutcome
  ) => Promise<AppliedMeetingResult | null>;
  onClose: () => void;
}

function getStanceLabel(relation: number): { label: string; colorClass: string; barClass: string } {
  if (relation < 35) {
    return { label: 'Desconfiada', colorClass: 'text-orange-400', barClass: 'bg-orange-500' };
  }
  if (relation < 55) {
    return { label: 'Cautelosa', colorClass: 'text-amber-300', barClass: 'bg-amber-400' };
  }
  if (relation < 75) {
    return { label: 'Cordial', colorClass: 'text-sky-300', barClass: 'bg-sky-400' };
  }
  return { label: 'Hermandad', colorClass: 'text-emerald-400', barClass: 'bg-emerald-400' };
}

function buildMeetingContext(sim: SimulationState, targetId: number): DiplomaticMeetingContext {
  const player = sim.countries[sim.playerId];
  const target = sim.countries[targetId];

  const snapshot = (c: typeof player) => ({
    name: getCountryName(c),
    baseName: c.seed.name,
    capital: c.seed.capital,
    continent: c.seed.continent,
    money: Math.round(c.money),
    netIncome: Math.round(c.netIncome),
    army: Math.round(c.army),
    armyCap: Math.round(getArmyCap(c, sim.difficulty)),
    territoryKm2: Math.round(c.pixels * 100),
    defenses: c.defenses.length,
    antiNukes: c.antiNukes.length,
    barracks: c.barracks.length,
    ports: c.ports.length,
    allies: getAllies(sim, c.id).map((id) => getCountryName(sim.countries[id])),
    enemies: getEnemies(sim, c.id).map((id) => getCountryName(sim.countries[id])),
  });

  const aliveCountryNames = sim.countries
    .filter((c) => c.alive && c.id !== player.id && c.id !== target.id)
    .map((c) => getCountryName(c));

  return {
    player: snapshot(player),
    target: snapshot(target),
    relation: getRelation(sim, player.id, target.id),
    atWar: hasTreaty(sim, player.id, target.id, TREATY_WAR),
    allied: hasTreaty(sim, player.id, target.id, TREATY_ALLIANCE),
    difficulty: sim.difficulty,
    dateLabel: formatFullDate(sim.day, sim.month, sim.year),
    globalTension: Math.round(sim.globalTension),
    aliveCountryNames,
  };
}

export function DiplomaticMeetingModal({
  deviceMode,
  sim,
  targetId,
  onApplyOutcome,
  onClose,
}: DiplomaticMeetingModalProps) {
  const player = sim.countries[sim.playerId];
  const target = sim.countries[targetId];

  // Freeze meeting context snapshot at summit start so both AIs reason over consistent live facts
  const meetingContext = useMemo(() => buildMeetingContext(sim, targetId), [sim, targetId]);

  const playerName = getCountryName(player);
  const targetName = getCountryName(target);
  const rel = meetingContext.relation;
  const stance = getStanceLabel(rel);
  const isMobile = deviceMode === 'mobile';

  // Instant opening line (0ms wait) matching exact relation & status so player can write immediately
  const initialGreeting = useMemo<DiplomaticMessage>(() => {
    if (meetingContext.atWar) {
      return {
        role: 'country',
        text: `Estamos en guerra, ${playerName}. Habla claro y rápido: ¿qué propones?`,
        sentiment: 'negative',
        timestamp: Date.now(),
      };
    }
    if (meetingContext.allied || rel >= 75) {
      return {
        role: 'country',
        text: `Bienvenido, ${playerName}. Eres un socio de confianza; dinos qué necesitas.`,
        sentiment: 'positive',
        timestamp: Date.now(),
      };
    }
    if (rel < 35) {
      return {
        role: 'country',
        text: `Nuestra confianza hacia ${playerName} es baja. Ve directo al grano.`,
        sentiment: 'negative',
        timestamp: Date.now(),
      };
    }
    if (rel >= 55) {
      return {
        role: 'country',
        text: `Saludos, ${playerName}. Te escuchamos con buena disposición; ¿qué propones?`,
        sentiment: 'positive',
        timestamp: Date.now(),
      };
    }
    return {
      role: 'country',
      text: `Adelante, ${playerName}. Escuchamos tu propuesta.`,
      sentiment: 'neutral',
      timestamp: Date.now(),
    };
  }, [meetingContext.atWar, meetingContext.allied, playerName, rel]);

  const [messages, setMessages] = useState<DiplomaticMessage[]>(() => [initialGreeting]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appliedResult, setAppliedResult] = useState<AppliedMeetingResult | null>(null);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const playerMessageCount = messages.filter((m) => m.role === 'player').length;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, evaluating]);

  // Request contextual diplomatic reply from AI #1 with strict 10-second max wait
  const requestLeaderReply = useCallback(
    async (history: DiplomaticMessage[]) => {
      setSending(true);
      setErrorMsg(null);
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch('/api/diplomacy/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            context: meetingContext,
            messages: history,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          sentiment?: DiplomaticReplySentiment;
          error?: string;
        };
        if (!res.ok || !data.reply) {
          throw new Error(data.error || 'No se recibió respuesta del representante extranjero.');
        }
        setMessages((prev) => [
          ...prev,
          {
            role: 'country',
            text: data.reply!,
            sentiment: data.sentiment ?? 'neutral',
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setErrorMsg('La respuesta tardó más de 10 segundos. Pulsa Reintentar para recibirla de nuevo.');
        } else {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Error de conexión al comunicarse con la IA diplomática.'
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        setSending(false);
      }
    },
    [meetingContext]
  );

  const handleSendMessage = async (presetText?: string) => {
    const clean = (presetText ?? inputText).trim();
    if (!clean || sending || evaluating || appliedResult) return;

    const nextMsg: DiplomaticMessage = {
      role: 'player',
      text: clean,
      timestamp: Date.now(),
    };
    const nextHistory = [...messages, nextMsg];
    setMessages(nextHistory);
    if (!presetText) {
      setInputText('');
    }
    await requestLeaderReply(nextHistory);
    inputRef.current?.focus();
  };

  const handleRetryLast = async () => {
    if (sending || evaluating) return;
    await requestLeaderReply(messages);
  };

  const handleEndMeeting = async () => {
    if (evaluating || sending) return;

    // If the player never sent a message, leave cleanly without altering the game
    if (playerMessageCount === 0) {
      onClose();
      return;
    }

    setEvaluating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/diplomacy/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: meetingContext,
          messages,
        }),
      });
      const data = (await res.json()) as {
        outcome?: DiplomaticMeetingOutcome;
        error?: string;
      };
      if (!res.ok || !data.outcome) {
        throw new Error(
          data.error || 'La 2ª IA no pudo evaluar la conversación diplomática.'
        );
      }

      const applied = await onApplyOutcome(targetId, data.outcome);
      if (applied) {
        setAppliedResult(applied);
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al evaluar los acuerdos de la reunión.'
      );
    } finally {
      setEvaluating(false);
    }
  };

  const quickTopics = useMemo(() => {
    const topics: string[] = [];
    if (meetingContext.atWar) {
      topics.push('Propongo firmar la paz ahora mismo si nos cedes el 20% de tu territorio.');
    } else if (!meetingContext.allied) {
      topics.push('Queremos proponer una alianza estratégica y pacto de no agresión.');
    } else {
      topics.push('Como aliados, ¿nos puedes ayudar con defensas, cuarteles o minas de oro?');
    }
    topics.push('¿Nos puedes dar ayuda financiera o refuerzos militares?');
    topics.push('¿Aceptarías vendernos o cedernos un 15% de tu territorio?');
    return topics;
  }, [meetingContext.atWar, meetingContext.allied]);

  if (!player || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070D18] text-slate-100 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Reunión diplomática con ${targetName}`}
    >
      {/* Full-Screen Ceremonial Top Banner with Both Nation Flags */}
      <header className="px-3 sm:px-8 py-2.5 sm:py-4 bg-[#0D1728] border-b border-slate-800 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-6">
          {/* Player Nation */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
            <PixelFlag country={player.seed} size={isMobile ? 'md' : 'xl'} />
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-amber-300 font-semibold truncate">
                Tu nación
              </div>
              <div className="text-xs sm:text-lg font-extrabold text-white truncate">
                {playerName}
              </div>
              <div className="hidden sm:block text-xs text-slate-400 truncate">
                Capital: {player.seed.capital}
              </div>
            </div>
          </div>

          {/* Center Relation Status */}
          <div className="shrink-0 text-center px-2 sm:px-4">
            <div className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
              Cumbre · {meetingContext.dateLabel}
            </div>
            <div className={`text-xs sm:text-base font-mono-num font-extrabold ${stance.colorClass}`}>
              {rel}/100 · <span className="font-sans font-bold">{stance.label}</span>
            </div>
            <div className="mt-1 w-24 sm:w-40 mx-auto h-1.5 bg-[#070D18] border border-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all ${stance.barClass}`}
                style={{ width: `${rel}%` }}
              />
            </div>
          </div>

          {/* Foreign Nation */}
          <div className="flex items-center justify-end gap-2.5 sm:gap-4 min-w-0 flex-1 text-right">
            <div className="min-w-0">
              <div className="text-[10px] sm:text-xs text-sky-300 font-semibold truncate">
                {meetingContext.atWar
                  ? 'En guerra'
                  : meetingContext.allied
                    ? 'Aliado'
                    : 'Representante extranjero'}
              </div>
              <div className="text-xs sm:text-lg font-extrabold text-white truncate">
                {targetName}
              </div>
              <div className="hidden sm:block text-xs text-slate-400 truncate">
                Capital: {target.seed.capital}
              </div>
            </div>
            <PixelFlag country={target.seed} size={isMobile ? 'md' : 'xl'} />
          </div>
        </div>
      </header>

      {/* Main Stage: Either Verdict Screen (After 2nd AI) OR Live Full-Screen Conversation */}
      {appliedResult ? (
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl bg-[#0E1829] border border-slate-700 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3 min-w-0">
                <Scale className="w-6 h-6 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">
                    Revisión oficial aplicada al juego
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    {appliedResult.outcome.diplomaticHeadline}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <PixelFlag country={player.seed} size="md" />
                <PixelFlag country={target.seed} size="md" />
              </div>
            </div>

            {/* Relation Change Highlight */}
            <div className="bg-[#080F1B] border border-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Cambio de relación bilateral</div>
                <div className="mt-1 flex items-baseline gap-2.5 font-mono-num">
                  <span className="text-base text-slate-400">
                    {appliedResult.previousRelation}/100
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="text-2xl font-extrabold text-white">
                    {appliedResult.newRelation}/100
                  </span>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 text-lg font-mono-num font-extrabold ${
                  appliedResult.actualRelationDelta > 0
                    ? 'text-emerald-400'
                    : appliedResult.actualRelationDelta < 0
                      ? 'text-red-400'
                      : 'text-slate-300'
                }`}
              >
                {appliedResult.actualRelationDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 shrink-0" />
                ) : appliedResult.actualRelationDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 shrink-0" />
                ) : null}
                <span>
                  {appliedResult.actualRelationDelta > 0 ? '+' : ''}
                  {appliedResult.actualRelationDelta} relación
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-400">Resumen de la cumbre</div>
              <p className="text-sm text-slate-200 leading-relaxed">
                {appliedResult.outcome.summary}
              </p>
            </div>

            {/* Applied Concrete Effects */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-400">
                Efectos aplicados a la partida
              </div>
              <ul className="space-y-2">
                {appliedResult.appliedEffects.map((eff, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-100 bg-[#080F1B] border border-slate-800/90 px-3.5 py-2.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{eff}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Volver al Mapa</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Live Conversation Transcript */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-8 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg, idx) => {
                const isPlayer = msg.role === 'player';
                const sentiment = msg.sentiment ?? 'neutral';
                const countryBoxClass =
                  sentiment === 'positive'
                    ? 'bg-emerald-950/35 border-emerald-500/65 text-emerald-200'
                    : sentiment === 'negative'
                      ? 'bg-red-950/35 border-red-500/65 text-red-200'
                      : 'bg-[#0E1829] border-slate-600/80 text-white';
                const countryHeaderClass =
                  sentiment === 'positive'
                    ? 'text-emerald-400'
                    : sentiment === 'negative'
                      ? 'text-red-400'
                      : 'text-white';
                const sentimentLabel =
                  sentiment === 'positive'
                    ? 'Positiva'
                    : sentiment === 'negative'
                      ? 'Negativa'
                      : 'Neutral';

                return (
                  <div
                    key={`${msg.timestamp}-${idx}`}
                    className={`flex items-start gap-3 sm:gap-4 ${
                      isPlayer ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className="shrink-0 pt-1">
                      <PixelFlag
                        country={isPlayer ? player.seed : target.seed}
                        size={isMobile ? 'md' : 'lg'}
                      />
                    </div>

                    <div
                      className={`max-w-[82%] sm:max-w-[76%] px-4 py-3 sm:px-5 sm:py-3.5 border ${
                        isPlayer
                          ? 'bg-[#152033] border-amber-500/45 text-slate-100'
                          : countryBoxClass
                      }`}
                    >
                      <div
                        className={`text-[11px] font-semibold mb-1.5 flex items-center gap-2 ${
                          isPlayer ? 'justify-end text-amber-300' : `justify-start ${countryHeaderClass}`
                        }`}
                      >
                        <span>{isPlayer ? playerName : targetName}</span>
                        <span className="text-slate-400 font-normal">
                          · {isPlayer ? 'Tú' : sentimentLabel}
                        </span>
                      </div>
                      <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words select-text">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* AI #1 Typing Indicator */}
              {sending && (
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="shrink-0 pt-1">
                    <PixelFlag country={target.seed} size={isMobile ? 'md' : 'lg'} />
                  </div>
                  <div className="px-4 py-3 bg-[#0E1829] border border-slate-800 text-xs sm:text-sm text-slate-300 flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                    <span>{targetName} está redactando su respuesta...</span>
                  </div>
                </div>
              )}

              {/* AI #2 Evaluation State */}
              {evaluating && (
                <div className="p-5 bg-[#0E1829] border border-amber-500/60 flex items-center gap-3.5">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-amber-300">
                      La 2ª IA está revisando la reunión...
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Analizando el tono de la conversación, los acuerdos alcanzados y aplicando los cambios al juego.
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3.5 bg-red-950/50 border border-red-700/70 text-xs sm:text-sm text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                  {!evaluating && (
                    <button
                      type="button"
                      onClick={() => void handleRetryLast()}
                      className="px-3 py-1.5 bg-red-800/80 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap self-start sm:self-auto"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}

              {/* Suggested Quick Openers (only before first user message) */}
              {playerMessageCount === 0 && !sending && !evaluating && messages.length > 0 && (
                <div className="pt-2 space-y-2">
                  <div className="text-xs text-slate-400">
                    Temas rápidos sugeridos (o escribe lo que quieras abajo):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quickTopics.map((topic) => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => void handleSendMessage(topic)}
                        className="px-3 py-2 bg-[#0E1829] hover:bg-[#16243D] border border-slate-700 hover:border-amber-500/60 text-left text-xs text-slate-200 cursor-pointer transition-colors"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={scrollEndRef} />
            </div>
          </div>

          {/* Bottom Free-Form Composer & End Meeting Controls */}
          <footer className="px-3 sm:px-8 py-3 sm:py-4 bg-[#0D1728] border-t border-slate-800 shrink-0">
            <div className="max-w-4xl mx-auto space-y-2.5">
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="hidden sm:block pb-1 shrink-0">
                  <PixelFlag country={player.seed} size="md" />
                </div>
                <textarea
                  ref={inputRef}
                  rows={isMobile ? 2 : 2}
                  value={inputText}
                  disabled={sending || evaluating}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={`Escribe lo que quieras decirle a ${targetName}...`}
                  className="flex-1 min-h-[48px] max-h-32 resize-none bg-[#070D18] border border-slate-700 focus:border-amber-500 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none select-text"
                />
                <button
                  type="button"
                  disabled={!inputText.trim() || sending || evaluating}
                  onClick={() => void handleSendMessage()}
                  className="min-h-[48px] px-4 sm:px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">
                  {playerMessageCount === 0
                    ? 'Escribe cualquier pregunta, propuesta o negociación. Enter para enviar.'
                    : `${playerMessageCount} ${
                        playerMessageCount === 1 ? 'mensaje enviado' : 'mensajes enviados'
                      } · Al terminar, la 2ª IA revisará la charla y aplicará los resultados.`}
                </span>

                <button
                  type="button"
                  disabled={sending || evaluating}
                  onClick={() => void handleEndMeeting()}
                  className={`min-h-[40px] px-4 py-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 ${
                    playerMessageCount > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-[#121F35] hover:bg-slate-800 border border-slate-700 text-slate-200'
                  }`}
                >
                  {playerMessageCount > 0 ? (
                    <>
                      <Scale className="w-3.5 h-3.5 shrink-0" />
                      <span>Terminar Reunión y Aplicar Acuerdos</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>Salir sin cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
