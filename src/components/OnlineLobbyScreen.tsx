import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Globe,
  Loader2,
  LogIn,
  Monitor,
  Play,
  Plus,
  Search,
  Smartphone,
  Users,
  ArrowLeft,
  DoorOpen,
} from 'lucide-react';
import { COUNTRIES_195, type Continent } from '../data/countries195';
import { useFirebase } from '../contexts/FirebaseContext';
import { computeInitialArmy, computeInitialMoney } from '../engine/gameSimulation';
import { soundEngine } from '../engine/soundEngine';
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
  updateMemberSelection,
  type MultiplayerRoom,
  type RoomMember,
} from '../services/multiplayerService';
import type { DeviceMode } from './DeviceModeScreen';
import { PixelFlag } from './PixelFlag';

interface OnlineLobbyScreenProps {
  deviceMode: DeviceMode;
  onChangeDeviceMode: (mode: DeviceMode) => void;
  roomCode: string | null;
  room: MultiplayerRoom | null;
  members: RoomMember[];
  syncError?: string | null;
  onEnterRoom: (code: string) => void;
  onLeaveRoom: () => Promise<void>;
  onHostStartMatch: () => Promise<void>;
  onBack: () => void;
}

const CONTINENTS: Array<'Todos' | Continent> = [
  'Todos',
  'América',
  'Europa',
  'Asia',
  'África',
  'Oceanía',
];

export function OnlineLobbyScreen({
  deviceMode,
  onChangeDeviceMode,
  roomCode,
  room,
  members,
  syncError,
  onEnterRoom,
  onLeaveRoom,
  onHostStartMatch,
  onBack,
}: OnlineLobbyScreenProps) {
  const { user, authReady, authBusy, authError, signInWithGoogle } = useFirebase();

  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinBox, setShowJoinBox] = useState(false);
  const [busyAction, setBusyAction] = useState<'create' | 'join' | 'pick' | 'start' | 'leave' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [search, setSearch] = useState('');
  const [continent, setContinent] = useState<'Todos' | Continent>('Todos');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COUNTRIES_195.filter((c) => {
      if (continent !== 'Todos' && c.continent !== continent) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.capital.toLowerCase().includes(q) ||
        c.iso2.toLowerCase() === q
      );
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [search, continent]);

  const takenByOther = useMemo(() => {
    const map = new Map<number, RoomMember>();
    for (const m of members) {
      if (m.countryId >= 0 && m.uid !== user?.uid) {
        map.set(m.countryId, m);
      }
    }
    return map;
  }, [members, user?.uid]);

  const myMember = useMemo(
    () => members.find((m) => m.uid === user?.uid) ?? null,
    [members, user?.uid]
  );

  const isHost = Boolean(
    user && ((room && room.hostUid === user.uid) || myMember?.isHost)
  );
  const allPicked = members.length > 0 && members.every((m) => m.countryId >= 0);

  const handleCreateRoom = async () => {
    if (!user) return;
    setErrorMsg(null);
    setBusyAction('create');
    try {
      soundEngine.playClick();
      const code = await createMultiplayerRoom(user);
      onEnterRoom(code);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinRoom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    const cleaned = joinCodeInput.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length !== 4) {
      setErrorMsg('Introduce el código numérico de 4 dígitos.');
      return;
    }
    setBusyAction('join');
    try {
      soundEngine.playClick();
      const joined = await joinMultiplayerRoom(user, cleaned);
      onEnterRoom(joined.roomCode);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setBusyAction(null);
    }
  };

  const handlePickCountry = async (countryId: number) => {
    if (!user || !roomCode) return;
    if (takenByOther.has(countryId)) return;
    setErrorMsg(null);
    setBusyAction('pick');
    try {
      soundEngine.playSelectCountry();
      await updateMemberSelection(roomCode, user, countryId, true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo seleccionar el país.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const [mobileLobbyTab, setMobileLobbyTab] = useState<'room' | 'country'>('room');

  const isMobile = deviceMode === 'mobile';
  const myPickedCountry =
    myMember && myMember.countryId >= 0 ? COUNTRIES_195[myMember.countryId] : null;

  const renderDeviceSwitcher = () => (
    <div
      className="flex items-center bg-[#0B121E] border border-slate-700 p-0.5 shrink-0"
      role="group"
      aria-label="Modo de pantalla"
    >
      <button
        onClick={() => {
          soundEngine.playClick();
          onChangeDeviceMode('desktop');
        }}
        title="Modo Computador"
        className={`px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
          deviceMode === 'desktop'
            ? 'bg-amber-500 text-slate-950'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <Monitor className="w-3.5 h-3.5 shrink-0" />
        <span>PC</span>
      </button>
      <button
        onClick={() => {
          soundEngine.playClick();
          onChangeDeviceMode('mobile');
        }}
        title="Modo Celular"
        className={`px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap ${
          deviceMode === 'mobile'
            ? 'bg-sky-500 text-slate-950'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>Celular</span>
      </button>
    </div>
  );

  const renderRoomCodeCard = (compact = false) => (
    <div
      className={`bg-[#111B2B] border border-emerald-500/40 shrink-0 ${
        compact ? 'p-3.5 space-y-2' : 'p-4 space-y-2'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-semibold">
            Código de Sala (4 dígitos)
          </div>
          <div
            className={`font-mono-num font-extrabold tracking-[0.25em] text-white mt-0.5 ${
              compact ? 'text-3xl' : 'text-3xl sm:text-4xl'
            }`}
          >
            {roomCode}
          </div>
        </div>
        <button
          onClick={handleCopyCode}
          className={`bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0 ${
            compact ? 'min-h-[42px] px-3.5' : 'px-3 py-2'
          }`}
        >
          {copiedCode ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <p className="text-[11px] sm:text-xs text-slate-400">
        Comparte este código para que pulsen «Unirse a sala». Los demás países serán manejados por la IA.
      </p>
    </div>
  );

  const renderPlayersCard = (mobileView = false) => (
    <div
      className={`bg-[#111B2B] border border-slate-800 flex flex-col gap-2.5 overflow-hidden ${
        mobileView ? 'p-3.5 flex-1 min-h-[180px]' : 'p-4 flex-1 min-h-[160px]'
      }`}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-sky-400" />
          <span>Jugadores en Sala ({members.length})</span>
        </div>
        {myPickedCountry && (
          <span className="text-[11px] text-emerald-400 font-semibold truncate ml-2">
            {myPickedCountry.name}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
        {members.map((m) => {
          const picked = m.countryId >= 0 ? COUNTRIES_195[m.countryId] : null;
          return (
            <div
              key={m.uid}
              className={`bg-[#0B121E] border flex items-center justify-between gap-2 ${
                mobileView ? 'p-2.5 min-h-[52px]' : 'p-2'
              } ${m.uid === user?.uid ? 'border-amber-500/50' : 'border-slate-800'}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {m.photoUrl ? (
                  <img
                    src={m.photoUrl}
                    alt={m.displayName}
                    className="w-7 h-7 border border-slate-700 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{m.displayName}</span>
                    {m.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {picked ? (
                      <span className="text-emerald-300 font-medium">{picked.name}</span>
                    ) : (
                      'Eligiendo país...'
                    )}
                  </div>
                </div>
              </div>

              {picked ? (
                <PixelFlag country={picked} size="sm" />
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                  Pendiente
                </span>
              )}
            </div>
          );
        })}
      </div>

      {mobileView && !myPickedCountry && (
        <button
          onClick={() => {
            soundEngine.playClick();
            setMobileLobbyTab('country');
          }}
          className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Globe className="w-4 h-4" />
          <span>Elegir tu país ahora →</span>
        </button>
      )}
    </div>
  );

  const renderCountryPicker = (mobileView = false) => (
    <div
      className={`bg-[#111B2B] flex flex-col overflow-hidden ${
        mobileView
          ? 'flex-1 min-h-0'
          : 'md:col-span-7 border border-slate-800 h-full min-h-0'
      }`}
    >
      <div
        className={`border-b border-slate-800 space-y-2.5 shrink-0 ${
          mobileView ? 'p-3' : 'p-3.5'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-100">
            Elige tu país ({filteredCountries.length}/195)
          </h2>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Si te eliminan, podrás iniciar una rebelión
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar país, capital o código..."
            className={`w-full bg-[#0B121E] border border-slate-700 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 ${
              mobileView ? 'py-2.5' : 'py-2'
            }`}
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {CONTINENTS.map((cont) => (
            <button
              key={cont}
              onClick={() => setContinent(cont)}
              className={`font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                mobileView ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
              } ${
                continent === cont
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cont}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/70">
        {filteredCountries.map((c) => {
          const isMine = myMember?.countryId === c.id;
          const takenBy = takenByOther.get(c.id);
          return (
            <button
              key={c.id}
              disabled={Boolean(takenBy) || busyAction === 'pick'}
              onClick={() => handlePickCountry(c.id)}
              className={`w-full flex items-center justify-between text-left transition-colors ${
                mobileView ? 'px-4 py-3 min-h-[54px]' : 'px-3.5 py-2.5'
              } ${
                takenBy
                  ? 'opacity-50 cursor-not-allowed bg-slate-950/60'
                  : isMine
                    ? 'bg-emerald-500/15 border-l-2 border-emerald-400 cursor-pointer'
                    : 'hover:bg-slate-800/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <PixelFlag country={c} size="sm" />
                <div className="min-w-0">
                  <div
                    className={`text-xs font-semibold truncate ${
                      isMine ? 'text-emerald-300' : 'text-slate-100'
                    }`}
                  >
                    {c.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {takenBy
                      ? `Elegido por ${takenBy.displayName}`
                      : `${c.capital} · ${c.continent}`}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2 font-mono-num text-[11px]">
                {isMine ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-semibold">
                    Tu país
                  </span>
                ) : takenBy ? (
                  <span className="text-slate-500">Ocupado</span>
                ) : (
                  <>
                    <div className="text-amber-300">${computeInitialMoney(c.gdp, c.military)}</div>
                    <div className="text-rose-300">Ej. {computeInitialArmy(c.military)}</div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-[#0B121E] text-slate-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header
        className={`border-b border-slate-800 bg-[#111B2B] flex items-center justify-between gap-2 sm:gap-3 shrink-0 ${
          isMobile ? 'h-12 px-2.5' : 'h-14 px-4 sm:px-6'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={async () => {
              soundEngine.playClick();
              if (roomCode) {
                setBusyAction('leave');
                try {
                  await onLeaveRoom();
                } finally {
                  setBusyAction(null);
                }
              } else {
                onBack();
              }
            }}
            disabled={busyAction === 'leave'}
            className={`bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
              isMobile ? 'px-2.5 py-2 min-h-[36px]' : 'px-2.5 py-1.5'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{roomCode ? 'Salir' : 'Volver'}</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-pixel text-xs sm:text-base text-emerald-400 truncate">
              MODO ONLINE
            </h1>
            {!isMobile && (
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Multijugador en tiempo real con los 195 países y rebeliones
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {renderDeviceSwitcher()}
          {user && (
            <div className="flex items-center gap-2 bg-[#0B121E] border border-slate-800 px-2 py-1">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Jugador'}
                  className="w-5 h-5 object-cover border border-slate-700 shrink-0"
                />
              )}
              <span
                className={`text-xs font-medium text-slate-200 truncate ${
                  isMobile ? 'hidden sm:inline max-w-[90px]' : 'max-w-[115px]'
                }`}
              >
                {user.displayName || 'Comandante'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Waiting Room Navigation Tabs */}
      {user && roomCode && isMobile && (
        <div className="grid grid-cols-2 border-b border-slate-800 bg-[#0E1726] shrink-0">
          <button
            onClick={() => {
              soundEngine.playClick();
              setMobileLobbyTab('room');
            }}
            className={`min-h-[44px] px-2 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mobileLobbyTab === 'room'
                ? 'border-emerald-400 text-emerald-300 bg-[#111B2B]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Sala {roomCode} ({members.length})</span>
          </button>
          <button
            onClick={() => {
              soundEngine.playClick();
              setMobileLobbyTab('country');
            }}
            className={`min-h-[44px] px-2 flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              mobileLobbyTab === 'country'
                ? 'border-amber-400 text-amber-300 bg-[#111B2B]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {myPickedCountry ? myPickedCountry.name : 'Elegir País (195)'}
            </span>
          </button>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 min-h-0 ${
          roomCode && isMobile
            ? 'flex flex-col overflow-hidden'
            : roomCode
              ? 'p-4 sm:p-5 overflow-y-auto md:overflow-hidden'
              : 'p-3 sm:p-5 overflow-y-auto flex flex-col'
        }`}
      >
        {!authReady ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Verificando sesión de Google...</span>
            </div>
          </div>
        ) : !user ? (
          /* Mandatory Google Sign-In Gate */
          <div className="flex-1 flex items-center justify-center p-3">
            <div className="w-full max-w-md bg-[#111B2B] border border-slate-700 p-5 sm:p-6 space-y-5 text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Globe className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Inicia sesión con Google para jugar Online
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Es obligatorio iniciar sesión con Google para crear salas o unirte a partidas multijugador con tus amigos y los 195 países.
                </p>
              </div>

              {(authError || errorMsg) && (
                <div className="p-2.5 bg-red-950/60 border border-red-700/70 text-xs text-red-200">
                  {errorMsg || authError}
                </div>
              )}

              <button
                onClick={signInWithGoogle}
                disabled={authBusy}
                className="w-full min-h-[46px] py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {authBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>Iniciar sesión con Google</span>
              </button>
            </div>
          </div>
        ) : !roomCode ? (
          /* Two Primary Buttons: "Crear sala" & "Unirse a sala" */
          <div className="flex-1 flex items-center justify-center">
            <div className={`w-full space-y-4 ${isMobile ? 'max-w-md' : 'max-w-2xl space-y-5'}`}>
              <div className="text-center space-y-1.5">
                <h2 className={`font-extrabold text-white ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                  Multijugador Global
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Crea una sala con código de 4 dígitos o únete a la de tus amigos. Gana quien elimine a los 195 países.
                </p>
              </div>

              {(errorMsg || syncError || authError) && (
                <div className="p-3 bg-red-950/70 border border-red-700/80 text-xs text-red-200 text-center leading-relaxed">
                  {errorMsg || syncError || authError}
                </div>
              )}

              <div className={isMobile ? 'flex flex-col gap-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                {/* Botón 1: Crear sala */}
                <button
                  onClick={handleCreateRoom}
                  disabled={busyAction !== null}
                  className={`text-left bg-[#111B2B] hover:bg-[#172338] border border-slate-700 hover:border-emerald-400/80 flex flex-col justify-between gap-3.5 transition-colors cursor-pointer disabled:opacity-60 ${
                    isMobile ? 'p-4' : 'p-5 sm:p-6 min-h-[185px]'
                  }`}
                >
                  <div className={isMobile ? 'flex items-start gap-3' : 'space-y-3'}>
                    <div
                      className={`bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 ${
                        isMobile ? 'w-11 h-11' : 'w-12 h-12'
                      }`}
                    >
                      {busyAction === 'create' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Plus className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-bold text-white">
                        {busyAction === 'create' ? 'Creando sala...' : 'Crear sala'}
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300">
                        Genera un código numérico de 4 dígitos para invitar jugadores y controlar cuándo empezar.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center justify-between">
                    <span>Ser anfitrión</span>
                    <span>{busyAction === 'create' ? 'Conectando...' : 'Crear →'}</span>
                  </div>
                </button>

                {/* Botón 2: Unirse a sala */}
                <div
                  className={`bg-[#111B2B] border border-slate-700 flex flex-col justify-between gap-3.5 ${
                    isMobile ? 'p-4' : 'p-5 sm:p-6 min-h-[185px]'
                  }`}
                >
                  <div className={isMobile ? 'flex items-start gap-3' : 'space-y-3'}>
                    <div
                      className={`bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 ${
                        isMobile ? 'w-11 h-11' : 'w-12 h-12'
                      }`}
                    >
                      <DoorOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-bold text-white">Unirse a sala</div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-300">
                        Ingresa el código de 4 dígitos de una sala activa para escoger tu país.
                      </p>
                    </div>
                  </div>

                  {!showJoinBox ? (
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setShowJoinBox(true);
                        setErrorMsg(null);
                      }}
                      className="w-full min-h-[44px] py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer transition-colors"
                    >
                      Unirse a sala
                    </button>
                  ) : (
                    <form onSubmit={handleJoinRoom} className="space-y-2 pt-1">
                      <div className={isMobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="Ej: 4821"
                          autoFocus
                          className={`bg-[#0B121E] border border-slate-600 px-3 text-center font-mono-num text-base tracking-[0.25em] text-white placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none focus:border-sky-400 ${
                            isMobile ? 'w-full min-h-[44px] py-2.5' : 'flex-1 py-2'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={busyAction !== null || joinCodeInput.length !== 4}
                          className={`bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                            isMobile ? 'w-full min-h-[44px] py-2.5' : 'px-4 py-2'
                          }`}
                        >
                          {busyAction === 'join' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span>Entrar a la sala</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isMobile ? (
          /* MOBILE WAITING ROOM LOBBY (Tabbed: Sala vs Elegir País) */
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {mobileLobbyTab === 'room' ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
                {renderRoomCodeCard(true)}
                {renderPlayersCard(true)}
              </div>
            ) : (
              renderCountryPicker(true)
            )}
          </div>
        ) : (
          /* DESKTOP WAITING ROOM LOBBY (2-Column PC Layout) */
          <div className="max-w-6xl w-full mx-auto flex flex-col md:grid md:grid-cols-12 md:h-full gap-4">
            <div className="md:col-span-5 flex flex-col gap-3 md:h-full md:min-h-0 shrink-0">
              {renderRoomCodeCard(false)}
              {renderPlayersCard(false)}
            </div>
            {renderCountryPicker(false)}
          </div>
        )}
      </main>

      {/* Pinned Always-Visible Action Footer inside Lobby */}
      {user && roomCode && (
        <footer
          className={`shrink-0 border-t border-slate-800 bg-[#111B2B] ${
            isMobile ? 'px-3 py-2.5' : 'px-4 sm:px-6 py-3'
          }`}
        >
          <div
            className={`max-w-6xl mx-auto flex gap-2.5 ${
              isMobile
                ? 'flex-col items-stretch'
                : 'flex-col sm:flex-row items-stretch sm:items-center justify-between'
            }`}
          >
            <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
              {myPickedCountry ? (
                <div className="flex items-center gap-2 min-w-0">
                  <PixelFlag country={myPickedCountry} size="sm" />
                  <div className="text-xs truncate">
                    <span className="text-slate-400">Tu país: </span>
                    <span className="font-bold text-emerald-300">{myPickedCountry.name}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-xs text-amber-300 font-medium truncate">
                    Selecciona tu país para poder jugar
                  </span>
                  {isMobile && mobileLobbyTab !== 'country' && (
                    <button
                      onClick={() => {
                        soundEngine.playClick();
                        setMobileLobbyTab('country');
                      }}
                      className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      Elegir
                    </button>
                  )}
                </div>
              )}

              {(errorMsg || syncError) && (
                <span className="text-xs text-red-400 truncate">{errorMsg || syncError}</span>
              )}
            </div>

            {isHost ? (
              <button
                onClick={async () => {
                  setErrorMsg(null);
                  setBusyAction('start');
                  try {
                    soundEngine.playTreaty();
                    await onHostStartMatch();
                  } catch (err) {
                    setErrorMsg(
                      err instanceof Error ? err.message : 'No se pudo iniciar la partida.'
                    );
                  } finally {
                    setBusyAction(null);
                  }
                }}
                disabled={!allPicked || busyAction !== null}
                className={`bg-amber-500 hover:bg-amber-400 disabled:opacity-45 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 ${
                  isMobile ? 'w-full min-h-[46px] py-2.5 px-4' : 'sm:w-auto w-full py-2.5 px-6'
                }`}
              >
                {busyAction === 'start' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>Empezar la partida</span>
              </button>
            ) : (
              <div
                className={`bg-[#0B121E] border border-slate-800 text-xs text-center text-slate-300 shrink-0 ${
                  isMobile ? 'py-2.5 px-3' : 'px-4 py-2'
                }`}
              >
                {myPickedCountry
                  ? 'Esperando a que el anfitrión pulse «Empezar la partida»...'
                  : 'Escoge tu país en la lista para estar listo.'}
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
