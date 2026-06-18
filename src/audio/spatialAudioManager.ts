import { mapRange } from '../utils/math';
import { MIN_IMPACT, MAX_IMPACT } from '../systems/handleCollision';

class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private squeakOsc: OscillatorNode | null = null;
  private squeakGain: GainNode | null = null;
  private lfo: OscillatorNode | null = null;

  async init(): Promise<void> {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.squeakOsc) {
      this.startSqueakLoop();
    }

    this.playCorporateDing();
  }

  private startSqueakLoop(): void {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 200;

    lfo.type = 'sine';
    lfo.frequency.value = 4.2;
    lfoGain.gain.value = 55;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    lfo.start();

    this.squeakOsc = osc;
    this.squeakGain = gain;
    this.lfo = lfo;
  }

  updateCartMotion(speed: number): void {
    if (!this.ctx || !this.squeakOsc || !this.squeakGain) return;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const intensity = mapRange(speed, 0, 4.5, 0, 0.18);
    this.squeakGain.gain.setTargetAtTime(intensity, this.ctx.currentTime, 0.04);
    this.squeakOsc.frequency.setTargetAtTime(
      mapRange(speed, 0, 4.5, 140, 380),
      this.ctx.currentTime,
      0.06,
    );
  }

  playCartSlam(force: number): void {
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.1, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;

    const volume = mapRange(force, MIN_IMPACT, MAX_IMPACT, 0.35, 1.0);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

    noise.connect(gain);
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.1);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playCorporateDing(): void {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  dispose(): void {
    this.squeakOsc?.stop();
    this.lfo?.stop();
    this.squeakOsc = null;
    this.lfo = null;
    this.squeakGain = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const spatialAudio = new SpatialAudioManager();
