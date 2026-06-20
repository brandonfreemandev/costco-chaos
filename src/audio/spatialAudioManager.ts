import { mapRange } from '../utils/math';
import { MIN_IMPACT, MAX_IMPACT } from '../systems/handleCollision';
import type { GamePhase } from '../types/state';
import { storeMusic } from './storeMusic';

class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private wheelGain: GainNode | null = null;
  private wheelFilter: BiquadFilterNode | null = null;
  private wheelSource: AudioBufferSourceNode | null = null;

  // HVAC drone
  private hvacSource: AudioBufferSourceNode | null = null;
  private hvacGain: GainNode | null = null;

  // Squeak throttle
  private lastSqueakTime = 0;

  async init(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    storeMusic.attachContext(this.ctx);

    if (!this.wheelSource) {
      this.startWheelLoop();
    }

    storeMusic.start();
    storeMusic.setMood('parking');

    this.playCorporateDing();
  }

  /** Subtle concrete roll — filtered noise, not a squeaky oscillator. */
  private startWheelLoop(): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = last;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();

    this.wheelSource = source;
    this.wheelFilter = filter;
    this.wheelGain = gain;
  }

  /** Oppressive 55 Hz HVAC hum — warehouse ambience. */
  private startHvac(): void {
    if (!this.ctx || this.hvacSource) return;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.995 + white * 0.005;
      data[i] = last;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 120;

    // Subtle 55 Hz sine underneath the noise for the "duct" sensation
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.04;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    source.connect(lp);
    lp.connect(gain);
    osc.connect(oscGain);
    oscGain.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    osc.start();

    this.hvacSource = source;
    this.hvacGain = gain;
  }

  private setHvacLevel(target: number): void {
    if (!this.ctx || !this.hvacGain) return;
    this.hvacGain.gain.setTargetAtTime(target, this.ctx.currentTime, 1.2);
  }

  setGamePhase(phase: GamePhase, checkoutWon: boolean): void {
    storeMusic.setMoodFromPhase(phase, checkoutWon);
    if (!this.hvacSource) this.startHvac();
    // HVAC is loudest in the warehouse, faint elsewhere
    const hvacLevels: Partial<Record<GamePhase, number>> = {
      SHOPPING: 0.18,
      CHECKOUT: 0.1,
      PARKING: 0.03,
      MENU: 0,
      END: 0,
    };
    this.setHvacLevel(hvacLevels[phase] ?? 0);
  }

  updateCartMotion(speed: number): void {
    if (!this.ctx || !this.wheelGain || !this.wheelFilter) return;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const moving = speed > 0.08;
    const intensity = moving ? mapRange(speed, 0.08, 4.5, 0.012, 0.07) : 0;
    const cutoff = mapRange(speed, 0, 4.5, 220, 520);

    this.wheelGain.gain.setTargetAtTime(intensity, this.ctx.currentTime, 0.08);
    this.wheelFilter.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.1);

    // Irregular cart squeak — random timing, random pitch deviation
    const now = this.ctx.currentTime;
    if (moving && speed > 0.9 && now - this.lastSqueakTime > 0.8 + Math.random() * 2.2) {
      this.playCartSqueak(speed);
      this.lastSqueakTime = now;
    }
  }

  /** Irregular cart squeak — short, pitch-randomized creak. */
  private playCartSqueak(speed: number): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const baseFreq = mapRange(speed, 0, 4.5, 700, 1400);
    const freq = baseFreq * (0.85 + Math.random() * 0.3);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.07);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 6;

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Short crowd-murmur burst — voices-in-a-crowd texture. */
  private playCrowdMurmur(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Layer 3 pitched noise bursts at voice frequencies
    const voiceFreqs = [280, 370, 420];
    voiceFreqs.forEach((baseF) => {
      const f = baseF * (0.9 + Math.random() * 0.2);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.22, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        last = last * 0.93 + w * 0.07;
        d[i] = last;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.06, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.28);
    });
  }

  playCartSlam(force: number): void {
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    const noise = this.ctx.createBufferSource();

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.12, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const volume = mapRange(force, MIN_IMPACT, MAX_IMPACT, 0.22, 0.55);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.14);

    this.playCrowdMurmur();
  }

  playCorporateDing(): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1174.7, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  dispose(): void {
    this.wheelSource?.stop();
    this.wheelSource = null;
    this.wheelGain = null;
    this.wheelFilter = null;
    this.hvacSource?.stop();
    this.hvacSource = null;
    this.hvacGain = null;
    storeMusic.dispose();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const spatialAudio = new SpatialAudioManager();
