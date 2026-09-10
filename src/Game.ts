import { Clock } from './engine/clock';
import { Input } from './engine/input';
import { AudioEngine } from './engine/audio';
import { Simulation, defaultConfig } from './engine/simulation';
import { MODE_META } from './modes/modes';
import { COURSE_LIST } from './maps/courses';
import type { CourseId, Difficulty, ModeId, SimConfig } from './types';
import { HUD } from './ui/hud';
import { loadSettings, saveSettings, type Settings } from './ui/settings';
import { burstConfetti, tickConfetti } from './fx/particles';
import { WorldView } from './view/world';
import * as THREE from 'three';

export class Game {
  readonly sim = new Simulation();
  readonly audio = new AudioEngine();
  readonly clock = new Clock();
  readonly input: Input;
  view: WorldView | null = null;
  hud: HUD | null = null;
  settings: Settings;
  screen: 'menu' | 'play' | 'pause' | 'end' = 'menu';
  private confetti: THREE.Points[] = [];
  private lastSwap = false;
  private lastFire = false;
  private lastEvents = 0;
  private wasTangled = false;
  private stepT = 0;
  private lastDry = false;
  private raf = 0;
  private cfg: SimConfig = defaultConfig({ botCount: 12, course: 'speedball', mode: 'tangle' });

  constructor(
    private canvas: HTMLCanvasElement,
    private hudRoot: HTMLElement,
    private uiRoot: HTMLElement,
  ) {
    this.settings = loadSettings();
    this.input = new Input(canvas);
    this.input.sensitivity = this.settings.sensitivity;
    this.input.invertY = this.settings.invertY;
    try {
      this.view = new WorldView(canvas);
      this.view.fov = this.settings.fov;
      this.view.setQuality(this.settings.quality);
      this.view.bigCrosshair = this.settings.bigCrosshair;
    } catch (err) {
      console.warn('WebGL unavailable, sim-only', err);
    }
    const mini = hudRoot.querySelector<HTMLCanvasElement>('#minimap');
    if (mini) this.hud = new HUD(hudRoot, mini);
    this.bindUi();
    window.addEventListener('resize', this.resize);
    this.resize();
    this.sim.start(this.cfg);
    this.view?.loadCourse(this.sim.course, this.sim);
  }

  startLoop(): void {
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop);
      this.tick(t);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stopLoop(): void {
    cancelAnimationFrame(this.raf);
  }

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.view?.resize(w, h);
  };

  startMatch(over: Partial<SimConfig> = {}): void {
    this.cfg = defaultConfig({ ...this.cfg, ...over, headless: false });
    this.clock.reset();
    this.sim.start(this.cfg);
    const p = this.sim.entities.find((e) => e.isPlayer);
    if (p) {
      this.input.state.yaw = p.yaw;
      this.input.state.pitch = 0;
    }
    this.view?.loadCourse(this.sim.course, this.sim);
    this.view?.setPlaying(true);
    this.screen = 'play';
    this.lastEvents = 0;
    this.audio.unlock();
    this.audio.beep(false);
    this.show('play');
    this.canvas.requestPointerLock?.();
  }

  private tick(now: number): void {
    if (this.screen === 'play' && this.input.pauseQueued) {
      this.input.pauseQueued = false;
      this.screen = 'pause';
      document.exitPointerLock?.();
      this.show('pause');
    }

    const stepping = this.screen === 'play' || this.screen === 'menu';
    if (this.screen === 'play') {
      this.sim.setInput(this.input.state);
    }

    if (stepping) {
      this.clock.frame(
        now,
        (dt) => this.sim.step(dt),
        () => {},
      );
    }

    const player = this.sim.entities.find((e) => e.isPlayer);
    this.audio.setSpray(!!(this.screen === 'play' && player?.input.fire && (player.cans.pressure ?? 0) > 1));
    if (player?.cans.swapping && !this.lastSwap) this.audio.rattle();
    this.lastSwap = !!player?.cans.swapping;
    if (this.sim.events.length > this.lastEvents) {
      const latest = this.sim.events[0]?.text ?? '';
      if (/tangled|wrapped|stringed|mummified|ribboned|party-fouled/i.test(latest)) this.audio.boing();
      else if (/captured|flag/i.test(latest)) this.audio.fanfare();
      else if (/SPRAY/.test(latest)) this.audio.beep(true);
      this.lastEvents = this.sim.events.length;
    }
    if (player?.input.fire && !this.lastFire && (player.cans.pressure ?? 0) > 1) this.audio.splat();
    this.lastFire = !!player?.input.fire;
    const dry = !!(this.screen === 'play' && player?.input.fire && (player.cans.pressure ?? 0) <= 1 && !player.cans.swapping);
    if (dry && !this.lastDry) this.audio.dryClick();
    this.lastDry = dry;
    if (this.screen === 'play' && player && !player.tangled && player.onGround && Math.hypot(player.vx, player.vz) > 1.2) {
      this.stepT += 1 / 60;
      if (this.stepT > (player.sprinting ? 0.28 : 0.4)) {
        this.audio.step();
        this.stepT = 0;
      }
    }

    if (this.view) {
      this.view.showNav = this.input.debugNav;
      this.view.fov = this.settings.fov;
      this.view.skin = this.settings.skin;
      this.view.shakeEnabled = this.settings.shake;
      if (player?.tangled && !this.wasTangled) this.view.addTrauma(0.62);
      this.wasTangled = !!player?.tangled;
      if (this.screen === 'menu') {
        this.view.setPlaying(false);
        this.view.attract(now);
      } else {
        this.view.setPlaying(true);
        this.view.sync(this.sim, 1 / 60);
      }
      for (const c of [...this.confetti]) {
        if (!tickConfetti(c, 1 / 60)) this.confetti.splice(this.confetti.indexOf(c), 1);
      }
      this.view.render();
    }

    if (this.screen === 'play') {
      const hint = this.hudRoot.querySelector<HTMLElement>('.click-msg');
      if (hint) hint.hidden = this.input.locked;
      this.hud?.update(this.sim, {
        tab: this.input.tab,
        bigCross: this.settings.bigCrosshair,
        colorblind: this.settings.colorblind,
      });
      if (this.sim.phase === 'ended' && this.screen === 'play') {
        this.screen = 'end';
        document.exitPointerLock?.();
        this.showEnd();
        if (this.view) {
          const p = this.sim.entities.find((e) => e.isPlayer);
          this.confetti.push(
            burstConfetti(this.view.scene, new THREE.Vector3(p?.x ?? 0, (p?.y ?? 0) + 2, p?.z ?? 0)),
          );
        }
        this.audio.fanfare();
      }
    }
  }

  private bindUi(): void {
    const ui = this.uiRoot;
    const modeSel = ui.querySelector<HTMLSelectElement>('#mode');
    const courseSel = ui.querySelector<HTMLSelectElement>('#course');
    const bots = ui.querySelector<HTMLInputElement>('#bots');
    const diff = ui.querySelector<HTMLSelectElement>('#diff');
    if (modeSel) {
      modeSel.innerHTML = MODE_META.map((m) => `<option value="${m.id}">${m.name}</option>`).join('');
    }
    if (courseSel) {
      courseSel.innerHTML = COURSE_LIST.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
      courseSel.value = 'speedball';
    }
    ui.querySelector('#play-btn')?.addEventListener('click', () => {
      this.startMatch({
        mode: (modeSel?.value as ModeId) ?? 'tangle',
        course: (courseSel?.value as CourseId) ?? 'speedball',
        botCount: Number(bots?.value ?? 12),
        difficulty: (diff?.value as Difficulty) ?? 'medium',
      });
    });
    ui.querySelector('#resume-btn')?.addEventListener('click', () => {
      this.screen = 'play';
      this.show('play');
      this.canvas.requestPointerLock?.();
    });
    ui.querySelector('#menu-btn')?.addEventListener('click', () => this.toMenu());
    ui.querySelector('#end-menu-btn')?.addEventListener('click', () => this.toMenu());
    ui.querySelector('#rematch-btn')?.addEventListener('click', () => this.startMatch());
    ui.querySelector('#next-btn')?.addEventListener('click', () => {
      const i = COURSE_LIST.findIndex((c) => c.id === this.cfg.course);
      const next = COURSE_LIST[(i + 1) % COURSE_LIST.length]!;
      this.startMatch({ course: next.id });
    });
    this.bindSettings();
    this.show('menu');
  }

  private bindSettings(): void {
    const ui = this.uiRoot;
    const bind = (id: string, apply: (v: string) => void) => {
      const el = ui.querySelector<HTMLInputElement | HTMLSelectElement>(id);
      if (!el) return;
      el.addEventListener('input', () => {
        apply(el.value);
        saveSettings(this.settings);
        this.applySettings();
      });
      el.addEventListener('change', () => {
        apply(el.value);
        saveSettings(this.settings);
        this.applySettings();
      });
    };
    bind('#sens', (v) => {
      this.settings.sensitivity = Number(v);
    });
    bind('#fov', (v) => {
      this.settings.fov = Number(v);
    });
    bind('#vol', (v) => {
      this.settings.volume = Number(v);
    });
    bind('#quality', (v) => {
      this.settings.quality = v as Settings['quality'];
    });
    bind('#skin', (v) => {
      this.settings.skin = v as Settings['skin'];
    });
    ui.querySelector('#invert')?.addEventListener('change', (e) => {
      this.settings.invertY = (e.target as HTMLInputElement).checked;
      saveSettings(this.settings);
      this.applySettings();
    });
    ui.querySelector('#shake')?.addEventListener('change', (e) => {
      this.settings.shake = (e.target as HTMLInputElement).checked;
      saveSettings(this.settings);
    });
    ui.querySelector('#xhair')?.addEventListener('change', (e) => {
      this.settings.bigCrosshair = (e.target as HTMLInputElement).checked;
      saveSettings(this.settings);
    });
    ui.querySelector('#colorblind')?.addEventListener('change', (e) => {
      this.settings.colorblind = (e.target as HTMLInputElement).checked;
      saveSettings(this.settings);
    });
    const s = this.settings;
    const setNum = (id: string, v: string) => {
      const el = ui.querySelector<HTMLInputElement | HTMLSelectElement>(id);
      if (el) el.value = v;
    };
    setNum('#sens', String(s.sensitivity));
    setNum('#fov', String(s.fov));
    setNum('#vol', String(s.volume));
    setNum('#quality', s.quality);
    setNum('#skin', s.skin);
    const chk = (id: string, v: boolean) => {
      const el = ui.querySelector<HTMLInputElement>(id);
      if (el) el.checked = v;
    };
    chk('#invert', s.invertY);
    chk('#shake', s.shake);
    chk('#xhair', s.bigCrosshair);
    chk('#colorblind', s.colorblind);
    this.applySettings();
  }

  private applySettings(): void {
    this.input.sensitivity = this.settings.sensitivity;
    this.input.invertY = this.settings.invertY;
    this.audio.setVolume(this.settings.volume);
    this.view?.setQuality(this.settings.quality);
    if (this.view) this.view.fov = this.settings.fov;
  }

  private toMenu(): void {
    this.screen = 'menu';
    document.exitPointerLock?.();
    this.show('menu');
  }

  private show(which: 'menu' | 'play' | 'pause' | 'end'): void {
    for (const id of ['menu-screen', 'pause-screen', 'end-screen']) {
      const el = this.uiRoot.querySelector<HTMLElement>(`#${id}`);
      if (el) el.hidden = true;
    }
    this.hudRoot.style.display = which === 'play' ? 'block' : 'none';
    this.uiRoot.classList.toggle('interactive', which !== 'play');
    if (which === 'menu') this.uiRoot.querySelector<HTMLElement>('#menu-screen')!.hidden = false;
    if (which === 'pause') this.uiRoot.querySelector<HTMLElement>('#pause-screen')!.hidden = false;
    if (which === 'end') this.uiRoot.querySelector<HTMLElement>('#end-screen')!.hidden = false;
  }

  private showEnd(): void {
    this.show('end');
    const st = this.sim.getState();
    const title = this.uiRoot.querySelector('[data-end-title]');
    const stats = this.uiRoot.querySelector('[data-end-stats]');
    const awards = this.uiRoot.querySelector('[data-end-awards]');
    if (title) {
      title.textContent =
        st.winner === 'draw'
          ? 'Gooey tie!'
          : st.winner === 'player'
            ? 'You wrapped the camp!'
            : st.winner === 'pink'
              ? 'Party Pink wins!'
              : 'Pool Cyan wins!';
    }
    if (stats) {
      stats.innerHTML = `Pink ${Math.floor(st.scores.pink)} · Cyan ${Math.floor(st.scores.cyan)}`;
    }
    if (awards) {
      const ents = this.sim.entities;
      const tangled = [...ents].sort((a, b) => b.deaths - a.deaths)[0];
      const spray = [...ents].sort((a, b) => b.shots - a.shots)[0];
      const hog = [...ents].sort((a, b) => b.captures - a.captures)[0];
      awards.innerHTML = [
        tangled ? `Most Tangled: ${tangled.name}` : '',
        spray ? `Spray & Pray: ${spray.name}` : '',
        hog && hog.captures ? `Flag Hog: ${hog.name}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
    }
  }
}

export function attachHeadless(game: Game): void {
  const api = {
    start: (cfg: Partial<SimConfig>) => game.startMatch(cfg),
    step: (dt: number) => game.sim.step(dt),
    simulate: (s: number) => game.sim.simulate(s),
    getState: () => game.sim.getState(),
    forceTimer: (t: number) => game.sim.forceTimer(t),
    game,
    sim: game.sim,
  };
  (globalThis as unknown as { __game: typeof api }).__game = api;
}
