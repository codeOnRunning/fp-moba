type ToneOptions = {
  type?: OscillatorType;
  frequency: number;
  endFrequency?: number;
  duration: number;
  volume?: number;
};

export class AudioSystem {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private masterVolume = 0.7;
  private sfxVolume = 0.7;
  private musicVolume = 0.5;

  resume(): void {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.applyVolumes();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
  }

  setVolumes(master: number, sfx: number, music: number): void {
    this.masterVolume = Math.max(0, Math.min(1, master / 100));
    this.sfxVolume = Math.max(0, Math.min(1, sfx / 100));
    this.musicVolume = Math.max(0, Math.min(1, music / 100));
    this.applyVolumes();
  }

  startMusic(phase: 1 | 2 = 1): void {
    if (!this.context || !this.musicGain) return;
    this.stopMusic();
    const now = this.context.currentTime;
    const base = phase === 1 ? 55 : 73.42;
    const fifth = phase === 1 ? 82.41 : 110;
    for (const [frequency, volume] of [
      [base, 0.035],
      [fifth, 0.018],
    ] as const) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 1.2);
      oscillator.connect(gain);
      gain.connect(this.musicGain);
      oscillator.start(now);
      this.musicOscillators.push(oscillator);
    }
  }

  setMusicPhase(phase: 1 | 2): void {
    if (this.musicOscillators.length === 0) {
      this.startMusic(phase);
      return;
    }
    const now = this.context?.currentTime ?? 0;
    const frequencies = phase === 1 ? [55, 82.41] : [73.42, 110];
    this.musicOscillators.forEach((oscillator, index) => {
      oscillator.frequency.exponentialRampToValueAtTime(
        frequencies[index] ?? frequencies[0],
        now + 0.8,
      );
    });
  }

  stopMusic(): void {
    for (const oscillator of this.musicOscillators) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch {
        // Oscillator may already have stopped.
      }
    }
    this.musicOscillators = [];
  }

  shoot(): void {
    this.tone({
      type: 'triangle',
      frequency: 420,
      endFrequency: 140,
      duration: 0.11,
      volume: 0.028,
    });
  }

  qCast(): void {
    this.tone({
      type: 'sawtooth',
      frequency: 520,
      endFrequency: 120,
      duration: 0.22,
      volume: 0.035,
    });
    this.tone({
      type: 'sine',
      frequency: 880,
      endFrequency: 240,
      duration: 0.18,
      volume: 0.018,
    });
  }

  hit(): void {
    this.tone({
      type: 'square',
      frequency: 140,
      endFrequency: 68,
      duration: 0.07,
      volume: 0.022,
    });
  }

  enemyShoot(): void {
    this.tone({
      type: 'square',
      frequency: 220,
      endFrequency: 90,
      duration: 0.13,
      volume: 0.018,
    });
  }

  hurt(): void {
    this.tone({
      type: 'sawtooth',
      frequency: 110,
      endFrequency: 48,
      duration: 0.18,
      volume: 0.035,
    });
  }

  kill(): void {
    this.tone({
      type: 'triangle',
      frequency: 740,
      endFrequency: 980,
      duration: 0.12,
      volume: 0.026,
    });
    window.setTimeout(() => {
      this.tone({
        type: 'sine',
        frequency: 980,
        endFrequency: 1320,
        duration: 0.16,
        volume: 0.022,
      });
    }, 90);
  }

  private applyVolumes(): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.masterGain?.gain.setTargetAtTime(this.masterVolume, now, 0.03);
    this.sfxGain?.gain.setTargetAtTime(this.sfxVolume, now, 0.03);
    this.musicGain?.gain.setTargetAtTime(this.musicVolume, now, 0.03);
  }

  private tone(options: ToneOptions): void {
    if (!this.context || !this.sfxGain) return;

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, now);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, options.endFrequency),
        now + options.duration,
      );
    }

    const volume = options.volume ?? 0.025;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + options.duration + 0.02);
  }
}
