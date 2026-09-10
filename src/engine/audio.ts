/** All sounds synthesized. No sample files. */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hiss: GainNode | null = null;
  private spraying = false;
  volume = 0.7;
  muted = false;

  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(ctx.destination);
      this.hiss = this.makeHiss(ctx);
      this.makeWind(ctx);
    }
    void this.ctx.resume();
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = this.muted ? 0 : v;
  }

  setSpray(on: boolean): void {
    if (on === this.spraying) return;
    this.spraying = on;
    if (!this.hiss || !this.ctx) return;
    this.hiss.gain.cancelScheduledValues(this.ctx.currentTime);
    this.hiss.gain.linearRampToValueAtTime(on ? 0.18 : 0.0001, this.ctx.currentTime + 0.05);
  }

  rattle(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    for (let i = 0; i < 6; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 80 + Math.random() * 40;
      g.gain.value = 0.05;
      o.connect(g).connect(master);
      const t = ctx.currentTime + i * 0.04;
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start(t);
      o.stop(t + 0.06);
    }
  }

  splat(): void {
    this.noiseBurst(0.07, 900, 0.2);
    this.blip(180, 90, 0.12, 0.08);
  }

  boing(): void {
    this.blip(420, 120, 0.28, 0.12);
  }

  fanfare(): void {
    this.blip(392, 392, 0.12, 0.08);
    this.blip(494, 494, 0.12, 0.08, 0.12);
    this.blip(587, 587, 0.2, 0.1, 0.24);
  }

  beep(high = false): void {
    this.blip(high ? 880 : 520, high ? 880 : 520, 0.1, 0.08);
  }

  chirp(): void {
    this.blip(1400, 1900, 0.08, 0.03);
  }

  step(): void {
    this.noiseBurst(0.04, 220, 0.08);
  }

  dryClick(): void {
    this.blip(220, 90, 0.06, 0.05);
  }

  private blip(f0: number, f1: number, dur: number, gain: number, delay = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, ctx.currentTime + delay);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), ctx.currentTime + delay + dur);
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + dur);
    o.connect(g).connect(master);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + dur + 0.02);
  }

  private noiseBurst(dur: number, freq: number, gain: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(bp).connect(g).connect(master);
    src.start();
  }

  private makeHiss(ctx: AudioContext): GainNode {
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(bp).connect(g).connect(this.master!);
    src.start();
    return g;
  }

  private makeWind(ctx: AudioContext): GainNode {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.value = 0.04;
    src.connect(lp).connect(g).connect(this.master!);
    src.start();
    return g;
  }
}
