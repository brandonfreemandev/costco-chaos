import { mapRange } from '../utils/math';
import { MIN_IMPACT, MAX_IMPACT } from '../systems/handleCollision';
import type { GamePhase } from '../types/state';
import { storeMusic } from './storeMusic';

class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private wheelGain: GainNode | null = null;
  private wheelFilter: BiquadFilterNode | null = null;
  private wheelSource: AudioBufferSourceNode | null = null;

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

  setGamePhase(phase: GamePhase, checkoutWon: boolean): void {
    storeMusic.setMoodFromPhase(phase, checkoutWon);
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

    // Occasional soft wheel tick at very low volume when rolling
    if (moving && speed > 1.2 && Math.random() < 0.02) {
      this.playWheelTick(speed);
    }
  }

  private playWheelTick(speed: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = mapRange(speed, 0, 4.5, 180, 320);
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
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
    storeMusic.dispose();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const spatialAudio = new SpatialAudioManager();
