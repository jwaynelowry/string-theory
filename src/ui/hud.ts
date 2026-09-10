import type { Simulation } from '../engine/simulation';
import { MODE_META } from '../modes/modes';
import { healthColor, remainingHealth } from '../view/health';

export class HUD {
  private hitUntil = 0;
  private lastHitAt = -1;

  constructor(
    private root: HTMLElement,
    private mini: HTMLCanvasElement,
  ) {}

  update(sim: Simulation, opts: { tab: boolean; bigCross: boolean; colorblind: boolean }): void {
    const st = sim.getState();
    const p = st.entities.find((e) => e.isPlayer);
    const set = (id: string, text: string) => {
      const el = this.root.querySelector(`[data-hud="${id}"]`);
      if (el) el.textContent = text;
    };
    let modeName = MODE_META.find((m) => m.id === st.mode)?.name ?? st.mode;
    if (st.mode === 'potato') {
      const pot = sim.extra.potato as { fuse: number; carrierId: number } | undefined;
      const holder = st.entities.find((e) => e.id === pot?.carrierId)?.name ?? '?';
      modeName = `Hot Can ${pot ? pot.fuse.toFixed(1) : '?'}s · ${holder}`;
    }
    set('mode', modeName);
    set('course', st.course);
    const remain = Math.max(0, st.roundDuration - st.roundTime);
    const m = Math.floor(remain / 60);
    const s = Math.floor(remain % 60)
      .toString()
      .padStart(2, '0');
    set('clock', st.phase === 'countdown' ? Math.ceil(st.countdown).toString() : `${m}:${s}`);
    set('pink', Math.floor(st.scores.pink).toString());
    set('cyan', Math.floor(st.scores.cyan).toString());
    if (p) {
      set('pressure', `${Math.round(p.pressure)}`);
      set('cans', `${p.cans}`);
      set('kind', p.kind);
      const fill = this.root.querySelector<HTMLElement>('[data-pressure-fill]');
      if (fill) fill.style.height = `${p.pressure}%`;
      const tangle = this.root.querySelector<HTMLElement>('[data-tangle-vignette]');
      if (tangle) tangle.style.opacity = String(Math.min(1, p.tangle * 0.9 + (p.tangled ? 0.35 : 0)));
      const hp = remainingHealth(p.tangle, p.tangled);
      set('health', `${Math.round(hp * 100)}`);
      const hfill = this.root.querySelector<HTMLElement>('[data-health-fill]');
      if (hfill) {
        hfill.style.width = `${hp * 100}%`;
        hfill.style.background = `#${healthColor(hp).toString(16).padStart(6, '0')}`;
      }
    }
    const feed = this.root.querySelector('[data-feed]');
    if (feed) {
      feed.innerHTML = st.events
        .slice(0, 6)
        .map((e) => `<div class="feed-line">${escapeHtml(e.text)}</div>`)
        .join('');
    }
    const board = this.root.querySelector('[data-scoreboard]');
    if (board) {
      (board as HTMLElement).hidden = !opts.tab;
      if (opts.tab) {
        const rows = [...sim.entities]
          .sort((a, b) => b.kills - a.kills)
          .map(
            (e) =>
              `<tr class="${e.team === 0 ? 'pink' : 'cyan'}"><td>${escapeHtml(e.name)}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${e.captures}</td><td>${Math.round(e.cans.pressure)}</td></tr>`,
          )
          .join('');
        board.innerHTML = `<table><thead><tr><th>Camper</th><th>Wraps</th><th>Down</th><th>Flags</th><th>PSI</th></tr></thead><tbody>${rows}</tbody></table>`;
      }
    }
    const latest = st.events[0];
    if (latest && latest.t !== this.lastHitAt && latest.text.startsWith('You ')) {
      this.lastHitAt = latest.t;
      this.hitUntil = st.time + 0.22;
    }
    const xhair = this.root.querySelector<HTMLElement>('[data-xhair]');
    if (xhair) {
      xhair.classList.toggle('big', opts.bigCross);
      xhair.classList.toggle('hit', st.time < this.hitUntil);
    }

    const tangled = this.root.querySelector<HTMLElement>('[data-tangled]');
    if (tangled) tangled.hidden = !p?.tangled;

    const cd = this.root.querySelector<HTMLElement>('[data-countdown]');
    if (cd) {
      cd.hidden = st.phase !== 'countdown';
      cd.textContent = st.phase === 'countdown' ? String(Math.max(1, Math.ceil(st.countdown))) : '';
    }
    this.drawMini(sim, opts.colorblind);
  }

  private drawMini(sim: Simulation, colorblind: boolean): void {
    const ctx = this.mini.getContext('2d');
    if (!ctx) return;
    const w = this.mini.width;
    const h = this.mini.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#4db338';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(w * 0.48, 8, 3, h - 16);
    ctx.fillRect(8, h * 0.48, w - 16, 3);
    const size = sim.course.size;
    const to = (x: number, z: number) => ({
      x: ((x + size / 2) / size) * w,
      y: ((z + size / 2) / size) * h,
    });
    ctx.fillStyle = '#3d7a2c';
    for (const b of sim.course.colliders) {
      if (b.id === 'ground' || b.soft) continue;
      const a = to(b.minX, b.minZ);
      const c = to(b.maxX, b.maxZ);
      ctx.fillRect(a.x, a.y, c.x - a.x, c.y - a.y);
    }
    for (const e of sim.entities) {
      const p = to(e.x, e.z);
      ctx.fillStyle = e.team === 0 ? (colorblind ? '#ffb000' : '#ff3d8a') : colorblind ? '#3d7eff' : '#14d4ff';
      if (e.isPlayer) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(e.yaw);
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 6);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
