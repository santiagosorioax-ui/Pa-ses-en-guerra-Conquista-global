import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Error inesperado en la aplicación.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    let parsedDetail = this.state.message;
    try {
      const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string };
      if (parsed && typeof parsed.error === 'string') {
        parsedDetail = `${parsed.error}${parsed.operationType ? ` (${parsed.operationType})` : ''}`;
      }
    } catch {
      // keep raw message
    }

    return (
      <div className="w-screen h-screen bg-[#0B121E] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#111B2B] border border-red-500/50 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-base font-bold text-white">
              Error de Sincronización o Aplicación
            </h2>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Ocurrió un problema al acceder a los datos guardados en la nube. Puedes recargar la partida para continuar.
          </p>
          <div className="bg-[#0B121E] border border-slate-800 p-3 text-[11px] font-mono-num text-red-300 break-words max-h-32 overflow-y-auto">
            {parsedDetail}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Recargar Juego</span>
          </button>
        </div>
      </div>
    );
  }
}
