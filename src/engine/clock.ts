import { MAX_DT, TICK } from '../constants';

export class Clock {
  private last = 0;
  private acc = 0;
  readonly tick: number;
  readonly maxDt: number;

  constructor(tick = TICK, maxDt = MAX_DT) {
    this.tick = tick;
    this.maxDt = maxDt;
  }

  reset(): void {
    this.last = 0;
    this.acc = 0;
  }

  frame(nowMs: number, step: (dt: number) => void, render: (alpha: number) => void): void {
    const now = nowMs * 0.001;
    if (!this.last) this.last = now;
    let dt = now - this.last;
    if (dt > this.maxDt) dt = this.maxDt;
    if (dt < 0) dt = 0;
    this.last = now;
    this.acc += dt;
    let guard = 0;
    while (this.acc >= this.tick && guard++ < 8) {
      step(this.tick);
      this.acc -= this.tick;
    }
    if (this.acc > this.tick) this.acc = this.tick;
    render(this.acc / this.tick);
  }
}
