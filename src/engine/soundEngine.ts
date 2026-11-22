class SoundEngine {
  private ctx: AudioContext | null = null;
  private lastPeriodicCoinAt = 0;
  public enabled = true;

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    gainVal = 0.04,
    delay = 0,
    endFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playClick() {
    this.tone(520, 0.045, 'square', 0.022);
  }

  playSelectCountry() {
    this.tone(440, 0.05, 'triangle', 0.03);
    this.tone(660, 0.07, 'triangle', 0.028, 0.045);
  }

  // Aviso de guerra: sirena de alerta nuclear (subida y bajada grave con filtro)
  playWarDeclared() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const baseTime = ctx.currentTime;

    const cycles = [0, 0.72];
    for (const offset of cycles) {
      const t0 = baseTime + offset;
      const dur = 0.68;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, t0);
      filter.frequency.linearRampToValueAtTime(1750, t0 + 0.3);
      filter.frequency.linearRampToValueAtTime(850, t0 + dur);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, t0);
      masterGain.gain.linearRampToValueAtTime(0.055, t0 + 0.14);
      masterGain.gain.setValueAtTime(0.055, t0 + 0.42);
      masterGain.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);

      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Dos osciladores ligeramente desafinados para el timbre clásico de sirena de alerta
      for (const [type, detuneRatio] of [
        ['sawtooth', 1.0],
        ['triangle', 1.008],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(300 * detuneRatio, t0);
        osc.frequency.exponentialRampToValueAtTime(690 * detuneRatio, t0 + 0.31);
        osc.frequency.exponentialRampToValueAtTime(320 * detuneRatio, t0 + dur);
        osc.connect(filter);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      }

      // Pulso grave de advertencia debajo de la sirena
      this.tone(82, 0.36, 'sine', 0.05, offset, 48);
    }
  }

  playCapitalCaptured(playerLostCapital = false) {
    if (playerLostCapital) {
      // Alerta descendente al perder la capital
      this.tone(140, 0.18, 'triangle', 0.07, 0, 58);
      this.tone(330, 0.14, 'sawtooth', 0.045, 0.03);
      this.tone(247, 0.22, 'sawtooth', 0.045, 0.15);
    } else {
      // Golpe victorioso al tomar una capital enemiga
      this.tone(150, 0.14, 'triangle', 0.065, 0, 75);
      this.tone(392, 0.12, 'sawtooth', 0.04, 0.04);
      this.tone(523.25, 0.22, 'triangle', 0.05, 0.14);
    }
  }

  playAnnexation(playerWon = true) {
    if (playerWon) {
      this.tone(523.25, 0.11, 'triangle', 0.045, 0);
      this.tone(659.25, 0.11, 'triangle', 0.045, 0.09);
      this.tone(783.99, 0.13, 'triangle', 0.045, 0.18);
      this.tone(1046.5, 0.28, 'triangle', 0.055, 0.28);
    } else {
      this.tone(261.63, 0.18, 'sawtooth', 0.04, 0);
      this.tone(196, 0.28, 'sawtooth', 0.04, 0.16, 146);
    }
  }

  playPeaceTreaty() {
    this.tone(392, 0.12, 'sine', 0.038, 0);
    this.tone(493.88, 0.12, 'sine', 0.038, 0.09);
    this.tone(587.33, 0.2, 'sine', 0.042, 0.18);
  }

  // Alianzas logradas: acorde diplomático ascendente
  playAllianceFormed() {
    this.tone(523.25, 0.1, 'triangle', 0.042, 0);
    this.tone(659.25, 0.1, 'triangle', 0.042, 0.075);
    this.tone(783.99, 0.12, 'triangle', 0.042, 0.15);
    this.tone(1046.5, 0.22, 'sine', 0.048, 0.23);
  }

  playAllyJoinedWar() {
    this.tone(293.66, 0.1, 'triangle', 0.042, 0);
    this.tone(369.99, 0.1, 'triangle', 0.042, 0.08);
    this.tone(440, 0.14, 'triangle', 0.045, 0.16);
    this.tone(587.33, 0.22, 'sawtooth', 0.036, 0.24);
  }

  playTreaty() {
    this.playAllianceFormed();
  }

  // Sonido metálico de monedas cuando el jugador gana dinero
  playMoneyEarned(periodic = false) {
    if (periodic) {
      const nowMs = Date.now();
      if (nowMs - this.lastPeriodicCoinAt < 2800) return;
      this.lastPeriodicCoinAt = nowMs;
      this.tone(1046.5, 0.045, 'sine', 0.015, 0);
      this.tone(1318.51, 0.065, 'sine', 0.016, 0.04);
      return;
    }
    this.tone(1046.5, 0.055, 'sine', 0.03, 0);
    this.tone(1567.98, 0.1, 'sine', 0.032, 0.045);
  }

  // Construcción de estructuras (Mina, Ciudad, Puerto, Defensa)
  playBuildStructure(kind: 'mine' | 'city' | 'port' | 'defense') {
    // Golpe inicial de obra
    this.tone(160, 0.07, 'triangle', 0.048, 0, 95);
    this.tone(280, 0.055, 'square', 0.022, 0.055);

    if (kind === 'mine') {
      // Picotazo + destello dorado
      this.tone(880, 0.06, 'sine', 0.028, 0.11);
      this.tone(1174.66, 0.12, 'sine', 0.03, 0.16);
    } else if (kind === 'city') {
      // Acorde urbano cálido
      this.tone(392, 0.09, 'triangle', 0.035, 0.11);
      this.tone(523.25, 0.14, 'triangle', 0.038, 0.17);
    } else if (kind === 'port') {
      // Campana naval
      this.tone(659.25, 0.11, 'sine', 0.035, 0.11);
      this.tone(987.77, 0.16, 'sine', 0.03, 0.18);
    } else {
      // Cierre metálico de fortaleza defensiva
      this.tone(240, 0.08, 'sawtooth', 0.03, 0.11);
      this.tone(360, 0.14, 'triangle', 0.04, 0.17);
    }
  }

  playRecruit() {
    this.tone(210, 0.05, 'triangle', 0.04, 0, 130);
    this.tone(260, 0.05, 'triangle', 0.04, 0.07, 160);
    this.tone(392, 0.09, 'square', 0.024, 0.14);
  }

  playCapture() {
    this.tone(310, 0.035, 'square', 0.015);
  }

  playEvent() {
    this.tone(392, 0.09, 'triangle', 0.04);
    this.tone(587.33, 0.14, 'triangle', 0.04, 0.08);
  }

  playNuclearExplosion() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Onda expansiva de ruido filtrado (detonación + retumbo largo)
    const duration = 1.45;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.14, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration + 0.02);

    // 2. Golpe sub-grave profundo del impacto
    this.tone(95, 1.25, 'sine', 0.11, 0, 24);
    this.tone(145, 0.65, 'triangle', 0.06, 0.02, 36);

    // 3. Eco metálico breve de alerta
    this.tone(520, 0.22, 'sawtooth', 0.026, 0.08, 220);
  }

  playAntiNukeIntercept() {
    // Bloqueo de radar + disparo interceptor + detonación defensiva en altura
    this.tone(780, 0.07, 'sine', 0.05, 0, 1240);
    this.tone(1180, 0.09, 'triangle', 0.055, 0.08, 1680);
    this.tone(420, 0.16, 'sawtooth', 0.04, 0.16, 180);
    this.tone(920, 0.18, 'sine', 0.045, 0.2, 640);
  }
}

export const soundEngine = new SoundEngine();
