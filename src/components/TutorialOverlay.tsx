import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Coins,
  Keyboard,
  Pickaxe,
  Shield,
  Swords,
  X,
  ZoomIn,
} from 'lucide-react';

import type { DeviceMode } from './DeviceModeScreen';

interface TutorialOverlayProps {
  countryName: string;
  deviceMode?: DeviceMode;
  onFinish: () => void;
}

export function TutorialOverlay({
  countryName,
  deviceMode = 'desktop',
  onFinish,
}: TutorialOverlayProps) {
  const [step, setStep] = useState(0);
  const isMobile = deviceMode === 'mobile';

  const steps = [
    {
      badge: 'Paso 1 de 3 · Navegación',
      title: `Bienvenido al mando de ${countryName}`,
      subtitle: 'Controles básicos para explorar el mapa mundial en tiempo real.',
      icon: Compass,
      items: [
        {
          icon: Keyboard,
          color: 'text-amber-400',
          label: isMobile
            ? 'Mover cámara (Arrastrar con un dedo)'
            : 'Mover cámara (WASD / Arrastrar)',
          desc: isMobile
            ? 'Desliza un dedo sobre el mapa para desplazarte por todos los continentes y océanos.'
            : 'Usa las teclas W, A, S, D, las flechas o mantén clic y arrastra para desplazarte por el mundo.',
        },
        {
          icon: ZoomIn,
          color: 'text-sky-400',
          label: isMobile
            ? 'Zoom (Pellizcar con 2 dedos o + / -)'
            : 'Zoom (+ / - o Rueda del ratón)',
          desc: isMobile
            ? 'Pellizca con dos dedos o usa los botones + y - abajo a la izquierda para acercarte a cualquier frontera.'
            : 'Gira la rueda del ratón para acercarte a cualquier frontera, capital o puerto.',
        },
      ],
    },
    {
      badge: 'Paso 2 de 3 · Economía y Minas',
      title: 'Genera dinero cada segundo',
      subtitle: isMobile
        ? 'Abre la pestaña inferior «Mando» para construir y fortalecer tu economía.'
        : 'Construye en el panel derecho «Mando» para fortalecer tu economía.',
      icon: Pickaxe,
      items: [
        {
          icon: Pickaxe,
          color: 'text-amber-400',
          label: 'Minas de Oro y Ciudades',
          desc: 'Las Minas de Oro (máx. 1/mes) y Ciudades (máx. 2/mes) aumentan tu ingreso por segundo; las Ciudades además amplían tu capacidad militar.',
        },
        {
          icon: Coins,
          color: 'text-emerald-400',
          label: 'Puertos y Defensas',
          desc: 'Construye Puertos hacia un objetivo para atacar por mar y coloca Defensas para proteger tu territorio.',
        },
      ],
    },
    {
      badge: 'Paso 3 de 3 · Ejército y Diplomacia',
      title: 'Recluta soldados, alíate o conquista',
      subtitle: 'La fuerza numérica y tus alianzas deciden cada guerra.',
      icon: Swords,
      items: [
        {
          icon: Swords,
          color: 'text-rose-400',
          label: 'Gestión del Ejército ($100 = +25 soldados)',
          desc: isMobile
            ? 'Toca «Mando» → «Ejército» para reclutar tropas hasta tu límite militar. Capturar una capital enemiga reduce 50% de su ejército.'
            : 'Pulsa «Ejército» en el panel Mando para reclutar tropas hasta tu límite militar. Capturar una capital enemiga reduce 50% de su ejército.',
        },
        {
          icon: Shield,
          color: 'text-sky-400',
          label: isMobile ? 'Toca cualquier país en el mapa' : 'Haz clic en cualquier país',
          desc: 'Verás su bandera, capital y botones para Atacar, enviar dinero (+1 relación por $100), formar Alianza o Pedir ayuda.',
        },
      ],
    },
  ];

  const current = steps[step];
  const HeaderIcon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="absolute inset-0 z-40 bg-[#07101D]/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto bg-[#111B2B]/98 border border-amber-500/60 shadow-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Top bar: step badge & skip */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
              <HeaderIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono-num font-semibold text-amber-400">
                {current.badge}
              </div>
              <h2 className="text-sm font-bold text-white truncate">{current.title}</h2>
            </div>
          </div>

          <button
            onClick={onFinish}
            className="px-2.5 py-1.5 bg-[#0B121E] hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
            title="Saltar tutorial (Esc)"
          >
            <span>Saltar</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-slate-300">{current.subtitle}</p>

        {/* Step details */}
        <div className="space-y-2.5">
          {current.items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="p-3 bg-[#0B121E] border border-slate-800 flex items-start gap-3"
              >
                <Icon className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-slate-100">{item.label}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step dots + navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                aria-label={`Ir al paso ${i + 1}`}
                className={`h-2 transition-all cursor-pointer ${
                  i === step ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onFinish}
              className="hidden sm:inline-block px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Saltar tutorial
            </button>

            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-3 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}

            {!isLast ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-3.5 py-2 sm:py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="px-4 py-2 sm:py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                ¡Entendido, a jugar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
