import * as THREE from 'three';
import { DECAL_CAP, DROPLET_CAP, EYE_HEIGHT, TEAM_CYAN, TEAM_PINK } from '../constants';
import type { Simulation } from '../engine/simulation';
import { makePhysicalSky, makeSkyDome } from '../fx/sky';
import { grassTex } from '../fx/textures';
import type { Course } from '../maps/types';
import { applyFpsCamera } from './camera';
import { makeCharacter, makeFloatText, makeViewmodel, setWraps } from './characters';
import { makeFieldMarkings, makeFlag } from './field';
import { setHealthBar } from './health';
import { meshFromSpec } from './materials';
import { StringNoodles } from './noodles';
import { PostFx } from './postfx';

export type Quality = 'low' | 'med' | 'high';

const _n = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _look = new THREE.Vector3();

export class WorldView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  private courseGroup = new THREE.Group();
  private navGroup = new THREE.Group();
  private actors = new Map<number, THREE.Group>();
  private decals: THREE.InstancedMesh;
  private drops: THREE.InstancedMesh;
  private viewmodel: THREE.Group;
  private dummy = new THREE.Object3D();
  private sun: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private post: PostFx | null = null;
  private flags: THREE.Group[] = [];
  private noodles: StringNoodles;
  private pops: THREE.Sprite[] = [];
  private sawTangled = new Set<number>();
  private sprayKick = 0;
  private bob = 0;
  private recoil = 0;
  private spinners: THREE.Object3D[] = [];
  fov = 78;
  quality: Quality = 'med';
  showNav = false;
  bigCrosshair = false;
  skin: 'classic' | 'zebra' | 'sunset' | 'slime' = 'classic';
  playing = false;
  shakeEnabled = true;
  trauma = 0;
  private wasAir = false;
  private landPunch = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.08, 1600);
    this.camera.rotation.order = 'YXZ';
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x7eb7e8, 1);
    this.scene.fog = new THREE.Fog(0x9ec9e8, 90, 280);

    this.scene.add(makeSkyDome());
    const { sky, sunDir } = makePhysicalSky();
    this.scene.add(sky);

    const hemi = new THREE.HemisphereLight(0xfff1d6, 0x3d6b28, 0.85);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff3c8, 2.15);
    this.sun.position.copy(sunDir).multiplyScalar(80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.camera.near = 4;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90;
    this.sun.shadow.camera.bottom = -90;
    this.scene.add(this.sun);
    this.fill = new THREE.DirectionalLight(0x8eb8ff, 0.35);
    this.fill.position.set(-40, 28, -18);
    this.scene.add(this.fill);

    const decalGeo = new THREE.SphereGeometry(0.5, 10, 8);
    decalGeo.scale(1, 0.28, 1);
    const decalMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.45,
      clearcoat: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    this.decals = new THREE.InstancedMesh(decalGeo, decalMat, DECAL_CAP);
    this.decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.decals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DECAL_CAP * 3), 3);
    this.decals.frustumCulled = false;
    this.scene.add(this.decals);

    const dropGeo = new THREE.CapsuleGeometry(0.045, 0.22, 3, 6);
    dropGeo.rotateX(Math.PI / 2);
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.25,
      clearcoat: 0.6,
      transparent: true,
      opacity: 0.95,
    });
    this.drops = new THREE.InstancedMesh(dropGeo, dropMat, DROPLET_CAP);
    this.drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.drops.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(DROPLET_CAP * 3), 3);
    this.drops.frustumCulled = false;
    this.scene.add(this.drops);

    this.viewmodel = makeViewmodel(TEAM_PINK);
    this.viewmodel.visible = false;
    this.camera.add(this.viewmodel);
    this.scene.add(this.camera);

    this.navGroup.visible = false;
    this.scene.add(this.courseGroup, this.navGroup);
    this.noodles = new StringNoodles(this.scene);

    this.post = null;
  }

  setPlaying(on: boolean): void {
    this.playing = on;
    this.viewmodel.visible = on;
  }

  addTrauma(n: number): void {
    this.trauma = Math.min(1, this.trauma + n);
  }

  attract(now: number): void {
    const t = now * 0.00009;
    const r = 36;
    this.camera.position.set(Math.sin(t) * r, 11 + Math.sin(t * 0.55) * 2.2, Math.cos(t) * r);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0.6, 0);
    this.viewmodel.visible = false;
  }

  setQuality(q: Quality): void {
    this.quality = q;
    const pr = q === 'low' ? 1 : q === 'high' ? Math.min(devicePixelRatio, 1.75) : Math.min(devicePixelRatio, 1.4);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sun.castShadow = q !== 'low';
    const map = q === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(map, map);
    this.post?.setEnabled(q !== 'low');
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.post?.resize(w, h);
    this.noodles.resize(w, h);
  }

  loadCourse(course: Course, sim: Simulation): void {
    this.courseGroup.clear();
    this.navGroup.clear();
    this.spinners = [];
    this.flags = [];
    for (const g of this.actors.values()) this.scene.remove(g);
    this.actors.clear();

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(course.size + 40, course.size + 40),
      new THREE.MeshStandardMaterial({ map: grassTex(), color: 0xffffff, roughness: 0.92, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const map = (ground.material as THREE.MeshStandardMaterial).map;
    if (map) {
      map.repeat.set((course.size + 40) / 10, (course.size + 40) / 10);
      map.needsUpdate = true;
    }
    this.courseGroup.add(ground);
    this.courseGroup.add(makeFieldMarkings(course));

    const fp = makeFlag(course.bases.pink.x, course.bases.pink.z - 3, TEAM_PINK);
    const fc = makeFlag(course.bases.cyan.x, course.bases.cyan.z + 3, TEAM_CYAN);
    this.flags.push(fp, fc);
    this.courseGroup.add(fp, fc);

    for (const m of course.meshes) {
      const obj = meshFromSpec(m);
      if (m.name === 'spinner') this.spinners.push(obj);
      this.courseGroup.add(obj);
    }

    for (const e of sim.entities) {
      if (e.isPlayer) continue;
      const ch = makeCharacter(e.color, e.name);
      ch.position.set(e.x, e.y, e.z);
      this.actors.set(e.id, ch);
      this.scene.add(ch);
    }

    const navMat = new THREE.LineBasicMaterial({ color: 0xffff66, transparent: true, opacity: 0.55 });
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < sim.nav.nodes.length; i++) {
      const n = sim.nav.nodes[i]!;
      for (const j of sim.nav.adj[i] ?? []) {
        if (j <= i) continue;
        const m = sim.nav.nodes[j]!;
        pts.push(new THREE.Vector3(n.x, n.y + 0.4, n.z), new THREE.Vector3(m.x, m.y + 0.4, m.z));
      }
    }
    if (pts.length) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      this.navGroup.add(new THREE.LineSegments(geo, navMat));
    }
  }

  sync(sim: Simulation, dt: number): void {
    for (const s of this.spinners) s.rotation.y += dt * 0.8;
    for (const f of this.flags) {
      const cloth = f.getObjectByName('flag-cloth');
      if (cloth) cloth.rotation.y = Math.sin(sim.time * 2.4 + f.position.x) * 0.35;
    }
    this.navGroup.visible = this.showNav;
    const player = sim.entities.find((e) => e.isPlayer);
    this.sprayKick = THREE.MathUtils.lerp(
      this.sprayKick,
      player?.input.fire && player.cans.pressure > 1 ? 6 : 0,
      0.18,
    );
    this.camera.fov = this.fov + this.sprayKick;
    this.camera.updateProjectionMatrix();
    this.viewmodel.visible = this.playing;
    if (player && this.playing) {
      const moving = Math.hypot(player.vx, player.vz) > 0.4;
      this.bob += dt * (moving ? 10 : 2);
      const bobY = moving ? Math.sin(this.bob) * 0.035 : 0;
      const eye = player.crouching ? 0.95 : EYE_HEIGHT;
      this.recoil = THREE.MathUtils.lerp(this.recoil, player.input.fire ? 0.045 : 0, 0.25);
      if (this.wasAir && player.onGround) this.landPunch = 0.08;
      this.wasAir = !player.onGround;
      this.landPunch = THREE.MathUtils.lerp(this.landPunch, 0, 0.2);
      this.trauma *= 0.86;
      const j = this.shakeEnabled ? this.trauma : 0;
      applyFpsCamera(this.camera, {
        x: player.x + (Math.random() - 0.5) * j * 0.16,
        y: player.y + eye + bobY - this.landPunch,
        z: player.z + (Math.random() - 0.5) * j * 0.16,
        yaw: player.yaw + (Math.random() - 0.5) * j * 0.08,
        pitch: player.pitch + this.recoil - this.landPunch * 0.6,
      });
      const jet = this.viewmodel.getObjectByName('spray-jet');
      if (jet) {
        const spraying = !!player.input.fire && player.cans.pressure > 1 && !player.cans.swapping && !player.tangled;
        jet.visible = spraying;
        jet.scale.set(1, spraying ? 1 + Math.sin(sim.time * 48) * 0.25 : 1, 1);
      }
      this.viewmodel.rotation.x = this.recoil * 2;
      this.viewmodel.rotation.z = player.cans.swapping
        ? Math.sin(player.cans.swapT * 12) * 0.8
        : Math.sin(this.bob) * 0.03;
      const canMat = this.viewmodel.children[0] as THREE.Mesh;
      const capMat = this.viewmodel.children[1] as THREE.Mesh;
      const skinColor =
        this.skin === 'zebra' ? 0x2a2a2a : this.skin === 'sunset' ? 0xff7a3a : this.skin === 'slime' ? 0x88ff55 : 0xf7f1e4;
      if (canMat?.material && 'color' in canMat.material) {
        (canMat.material as THREE.MeshStandardMaterial).color.setHex(skinColor);
      }
      if (capMat?.material && 'color' in capMat.material) {
        (capMat.material as THREE.MeshStandardMaterial).color.set(player.color);
      }
    }

    for (const e of sim.entities) {
      if (e.isPlayer) continue;
      let g = this.actors.get(e.id);
      if (!g) {
        g = makeCharacter(e.color, e.name);
        this.actors.set(e.id, g);
        this.scene.add(g);
      }
      const spd = Math.hypot(e.vx, e.vz);
      const walk = Math.min(1, spd / 6);
      g.position.set(e.x, e.y + Math.abs(Math.sin(sim.time * 11 + e.id)) * 0.07 * walk, e.z);
      g.rotation.y = e.yaw;
      g.rotation.z = Math.sin(sim.time * 11 + e.id) * 0.1 * walk;
      g.rotation.x = e.tangled ? 1.15 : 0;
      const pot = sim.extra.potato as { carrierId: number } | undefined;
      const hot = sim.mode === 'potato' && pot?.carrierId === e.id;
      g.scale.setScalar(hot ? 1.12 : 1);
      g.scale.y = e.tangled ? 0.55 : g.scale.y;
      setWraps(g, e.tangle);
      const hb = g.getObjectByName('health-bar');
      if (hb) setHealthBar(hb, e.tangle, e.tangled);
      if (e.tangled && !this.sawTangled.has(e.id)) {
        this.sawTangled.add(e.id);
        const pop = makeFloatText('WRAP!', e.color);
        pop.position.set(e.x, e.y + 2.3, e.z);
        this.scene.add(pop);
        this.pops.push(pop);
      }
      if (!e.tangled) this.sawTangled.delete(e.id);
    }

    const dummy = this.dummy;
    let di = 0;
    for (let i = 0; i < sim.decals.count && di < DECAL_CAP; i++) {
      const d = sim.decals.items[i]!;
      if (!d.alive) continue;
      dummy.position.set(d.x, d.y + 0.04, d.z);
      _n.set(d.nx, d.ny, d.nz);
      if (_n.lengthSq() < 0.01) _n.copy(_up);
      else _n.normalize();
      dummy.quaternion.setFromUnitVectors(_up, _n);
      dummy.scale.set(d.size * 2.6, d.size * 0.7, d.size * 2.6);
      dummy.updateMatrix();
      this.decals.setMatrixAt(di, dummy.matrix);
      this.decals.setColorAt?.(di, new THREE.Color(d.color));
      di += 1;
    }
    this.decals.count = di;
    this.decals.instanceMatrix.needsUpdate = true;
    if (this.decals.instanceColor) this.decals.instanceColor.needsUpdate = true;

    let dri = 0;
    for (const drop of sim.droplets) {
      if (!drop.alive || dri >= DROPLET_CAP) continue;
      dummy.position.set(drop.x, drop.y, drop.z);
      _look.set(drop.x + drop.vx, drop.y + drop.vy, drop.z + drop.vz);
      dummy.lookAt(_look);
      const spd = Math.hypot(drop.vx, drop.vy, drop.vz);
      dummy.scale.setScalar(0.85 + Math.min(1.4, spd * 0.03));
      dummy.updateMatrix();
      this.drops.setMatrixAt(dri, dummy.matrix);
      this.drops.setColorAt?.(dri, new THREE.Color(drop.color));
      dri += 1;
    }
    this.drops.count = dri;
    this.drops.instanceMatrix.needsUpdate = true;
    if (this.drops.instanceColor) this.drops.instanceColor.needsUpdate = true;

    this.noodles.sync(sim.droplets);
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i]!;
      p.userData.age += dt;
      p.position.y += dt * 1.4;
      const mat = p.material as THREE.SpriteMaterial;
      mat.opacity = Math.max(0, 1 - p.userData.age / 0.85);
      if (p.userData.age > 0.85) {
        p.removeFromParent();
        this.pops.splice(i, 1);
      }
    }
  }

  render(): void {
    if (this.post && this.quality !== 'low') this.post.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

export { meshFromSpec } from './materials';
export const TEAM_COLORS = { pink: TEAM_PINK, cyan: TEAM_CYAN };
