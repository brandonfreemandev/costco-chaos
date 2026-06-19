import type { GamePhase } from '../types/state';

type MusicMood = 'off' | 'parking' | 'warehouse' | 'checkout' | 'win';

/** Soft chord voicings — retail hold-music energy. */
const PROGRESSIONS: Record<Exclude<MusicMood, 'off' | 'win'>, number[][]> = {
  parking: [
    [196.0, 246.94, 293.66],
    [174.61, 220.0, 261.63],
    [220.0, 277.18, 329.63],
    [196.0, 246.94, 293.66],
  ],
  warehouse: [
    [261.63, 329.63, 392.0],
    [349.23, 440.0, 523.25],
    [293.66, 369.99, 440.0],
    [392.0, 493.88, 587.33],
  ],
  checkout: [
    [220.0, 261.63, 329.63],
    [246.94, 293.66, 369.99],
    [207.65, 246.94, 311.13],
    [233.08, 277.18, 349.23],
  ],
};

const BAR_SECONDS: Record<Exclude<MusicMood, 'off' | 'win'>, number> = {
  parking: 3.6,
  warehouse: 4.0,
  checkout: 3.2,
};

const MOOD_GAIN: Record<MusicMood, number> = {
  off: 0,
  parking: 0.11,
  warehouse: 0.14,
  checkout: 0.16,
  win: 0.08,
};

export class StoreMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mood: MusicMood = 'off';
  private prevMood: MusicMood = 'off';
  private barIndex = 0;
  private nextBarTime = 0;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  attachContext(ctx: AudioContext): void {
    if (this.ctx === ctx) return;
    this.ctx = ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(ctx.destination);
  }

  start(): void {
    if (!this.ctx || !this.masterGain || this.running) return;
    this.running = true;
    this.nextBarTime = this.ctx.currentTime + 0.5;
    this.schedulerId = setInterval(() => this.schedule(), 120);
  }

  setMood(mood: MusicMood): void {
    if (!this.ctx || !this.masterGain) return;

    if (mood === 'win' && this.prevMood !== 'win') {
      this.playWinFanfare(this.ctx.currentTime + 0.15);
    }
    this.prevMood = mood;
    this.mood = mood;

    const target = mood === 'win' ? 0.06 : MOOD_GAIN[mood];
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.8);
    if (mood === 'off') {
      this.barIndex = 0;
    }
  }

  setMoodFromPhase(phase: GamePhase, checkoutWon: boolean): void {
    if (phase === 'MENU' || phase === 'END') {
      this.setMood('off');
      return;
    }
    if (checkoutWon) {
      this.setMood('win');
      return;
    }
    if (phase === 'CHECKOUT') {
      this.setMood('checkout');
      return;
    }
    if (phase === 'SHOPPING') {
      this.setMood('warehouse');
      return;
    }
    this.setMood('parking');
  }

  stop(): void {
    this.running = false;
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }
    this.mood = 'off';
    this.prevMood = 'off';
    this.barIndex = 0;
  }

  dispose(): void {
    this.stop();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.ctx = null;
  }

  private schedule(): void {
    if (!this.ctx || !this.masterGain || !this.running) return;
    if (this.mood === 'off' || this.mood === 'win') return;

    const now = this.ctx.currentTime;
    const lookAhead = 0.2;

    while (this.nextBarTime < now + lookAhead) {
      const progression = PROGRESSIONS[this.mood];
      const barLen = BAR_SECONDS[this.mood];
      const chord = progression[this.barIndex % progression.length];
      this.playBar(chord, this.nextBarTime, barLen, this.mood);
      this.barIndex += 1;
      this.nextBarTime += barLen;
    }
  }

  private playBar(chord: number[], start: number, duration: number, mood: Exclude<MusicMood, 'off' | 'win'>): void {
    if (!this.ctx || !this.masterGain) return;

    const ctx = this.ctx;
    const padTypes: OscillatorType[] = ['triangle', 'sine', 'triangle'];

    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = mood === 'checkout' ? 900 : 1200;

      osc.type = padTypes[i] ?? 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * 4;

      const peak = mood === 'parking' ? 0.045 : 0.038;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.9);
      gain.gain.setValueAtTime(peak * 0.85, start + duration - 0.8);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    // Gentle bass root
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.value = chord[0] / 2;
    bassGain.gain.setValueAtTime(0.0001, start);
    bassGain.gain.exponentialRampToValueAtTime(0.055, start + 0.5);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    bass.connect(bassGain);
    bassGain.connect(this.masterGain);
    bass.start(start);
    bass.stop(start + duration + 0.05);

    // Soft arpeggio sparkle (warehouse + checkout)
    if (mood !== 'parking') {
      const arpNotes = [...chord, chord[0] * 2];
      arpNotes.forEach((freq, step) => {
        const t = start + 0.35 + step * (duration / (arpNotes.length + 1));
        const ping = ctx.createOscillator();
        const pingGain = ctx.createGain();
        ping.type = 'sine';
        ping.frequency.value = freq * 2;
        pingGain.gain.setValueAtTime(0.0001, t);
        pingGain.gain.exponentialRampToValueAtTime(0.012, t + 0.04);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        ping.connect(pingGain);
        pingGain.connect(this.masterGain!);
        ping.start(t);
        ping.stop(t + 0.4);
      });
    }
  }

  private playWinFanfare(start: number): void {
    if (!this.ctx || !this.masterGain) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const t = start + i * 0.18;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.6);
    });
  }
}

export const storeMusic = new StoreMusic();
