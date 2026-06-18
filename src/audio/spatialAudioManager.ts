import { mapRange } from '../utils/math';
import { MIN_IMPACT, MAX_IMPACT } from '../systems/handleCollision';

class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private squeakOsc: OscillatorNode | null = null;
  private squeakGain: GainNode | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    this.ctx = new AudioContext();
    await this.ctx.resume();
    this.initialized = true;
    this.startSqueakLoop();
  }

  private startSqueakLoop(): void {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 180;

    lfo.type = 'sine';
    lfo.frequency.value = 3.7;
    lfoGain.gain.value = 40;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.value = 0.02;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    lfo.start();

    this.squeakOsc = osc;
    this.squeakGain = gain;
  }

  updateCartMotion(speed: number): void {
    if (!this.squeakOsc || !this.squeakGain) return;
    const intensity = mapRange(speed, 0, 4.5, 0.005, 0.06);
    this.squeakGain.gain.setTargetAtTime(intensity, this.ctx!.currentTime, 0.05);
    this.squeakOsc.frequency.setTargetAtTime(
      mapRange(speed, 0, 4.5, 120, 320) + Math.random() * 8,
      this.ctx!.currentTime,
      0.08,
    );
  }

  playCartSlam(force: number): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;

    const volume = mapRange(force, MIN_IMPACT, MAX_IMPACT, 0.15, 0.7);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.type = 'square';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    noise.connect(gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.08);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playCorporateDing(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const spatialAudio = new SpatialAudioManager();
