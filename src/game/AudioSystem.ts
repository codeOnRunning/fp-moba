type ToneOptions = {
  type?: OscillatorType;
  frequency: number;
  endFrequency?: number;
  duration: number;
  volume?: number;
};

export class AudioSystem {
  private context: AudioContext | null = null;

  resume(): void {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
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

  private tone(options: ToneOptions): void {
    if (!this.context) return;

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
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + options.duration + 0.02);
  }
}
