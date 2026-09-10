import * as THREE from 'three';

export function remainingHealth(tangle: number, tangled: boolean): number {
  if (tangled) return 0;
  return Math.max(0, Math.min(1, 1 - tangle));
}

export function healthColor(h: number): number {
  if (h > 0.55) return 0x7dff6b;
  if (h > 0.28) return 0xffe566;
  return 0xff3d8a;
}

export function makeHealthBar(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'health-bar';
  g.position.y = 2.52;
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1208, depthTest: false }));
  bg.scale.set(1.28, 0.2, 1);
  bg.renderOrder = 7;
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x7dff6b, depthTest: false }));
  fill.name = 'health-fill';
  fill.scale.set(1.18, 0.13, 1);
  fill.renderOrder = 8;
  g.add(bg, fill);
  return g;
}

export function setHealthBar(bar: THREE.Object3D, tangle: number, tangled: boolean): void {
  const h = remainingHealth(tangle, tangled);
  const fill = bar.getObjectByName('health-fill') as THREE.Sprite | undefined;
  if (!fill) return;
  const w = 1.18 * Math.max(0.05, h);
  fill.scale.x = w;
  fill.position.x = -0.59 + w / 2;
  (fill.material as THREE.SpriteMaterial).color.setHex(healthColor(h));
}
