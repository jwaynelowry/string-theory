import * as THREE from 'three';
import { TEAM_CYAN, TEAM_PINK } from '../constants';
import { vinylTex } from '../fx/textures';
import { makeHealthBar } from './health';

export function makeFloatText(text: string, color: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.font = '900 42px Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.strokeStyle = '#1a1208';
  g.lineWidth = 10;
  g.strokeText(text, 128, 48);
  g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  g.fillText(text, 128, 48);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }),
  );
  spr.scale.set(2.2, 0.85, 1);
  spr.userData.age = 0;
  spr.renderOrder = 9;
  return spr;
}

export function makeNameplate(name: string, color: number): THREE.Sprite {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff6d8';
  g.strokeStyle = '#1a1208';
  g.lineWidth = 8;
  g.beginPath();
  g.roundRect(8, 8, 240, 48, 16);
  g.fill();
  g.stroke();
  g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  g.font = '700 28px Trebuchet MS, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name.slice(0, 14), 128, 34);
  const spr = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }),
  );
  spr.position.y = 2.2;
  spr.scale.set(1.7, 0.42, 1);
  spr.name = 'nameplate';
  spr.renderOrder = 8;
  return spr;
}

export function makeCharacter(color: number, name = 'Camper', goggle: number = 0x102028): THREE.Group {
  const g = new THREE.Group();
  const jersey = vinylTex(color).clone();
  jersey.repeat.set(2, 2);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: jersey,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.02,
    sheen: 0.25,
    sheenColor: new THREE.Color(color),
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.8 });
  const lens = new THREE.MeshPhongMaterial({
    color: goggle,
    shininess: 120,
    specular: 0xaad4ff,
    emissive: color,
    emissiveIntensity: 0.16,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c8a0, roughness: 0.7 });
  const canMat = new THREE.MeshPhysicalMaterial({
    color: 0xf4f0e6,
    roughness: 0.3,
    metalness: 0.15,
    clearcoat: 0.4,
  });

  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bodyMat);
  hips.position.y = 0.72;
  hips.scale.set(1.15, 0.7, 0.9);
  g.add(hips);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.52, 6, 12), bodyMat);
  torso.position.y = 1.12;
  torso.castShadow = true;
  g.add(torso);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.1, 0.34),
    new THREE.MeshPhysicalMaterial({ color: 0xffe566, roughness: 0.4, clearcoat: 0.3 }),
  );
  stripe.position.set(0, 1.18, 0.14);
  g.add(stripe);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skin);
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(head);

  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0.4, 0.7), lens);
  visor.position.set(0, 1.62, 0.06);
  visor.scale.set(1.05, 0.7, 1.15);
  visor.name = 'goggles';
  g.add(visor);

  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), dark);
  strap.position.y = 1.62;
  strap.rotation.x = Math.PI / 2;
  g.add(strap);

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 4, 8), bodyMat);
  armL.position.set(-0.38, 1.05, 0.02);
  armL.rotation.z = 0.25;
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.38;
  armR.rotation.z = -0.25;
  g.add(armR);

  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.48, 4, 8), dark);
  legL.position.set(-0.13, 0.38, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.13;
  g.add(legR);

  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.24, 14), canMat);
  can.position.set(0.42, 0.98, 0.22);
  can.rotation.z = 0.45;
  can.name = 'can';
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.6 }),
  );
  cap.position.y = 0.14;
  can.add(cap);
  g.add(can);

  const wraps = new THREE.Group();
  wraps.name = 'wraps';
  for (let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32 + i * 0.02, 0.045, 6, 12),
      new THREE.MeshPhysicalMaterial({
        color: color === TEAM_PINK ? TEAM_CYAN : TEAM_PINK,
        roughness: 0.35,
        clearcoat: 0.5,
      }),
    );
    ring.position.y = 0.55 + i * 0.22;
    ring.rotation.x = Math.PI / 2 + (i - 2) * 0.15;
    ring.visible = false;
    wraps.add(ring);
  }
  g.add(wraps);
  g.userData.wraps = wraps;
  g.add(makeNameplate(name, color));
  g.add(makeHealthBar());
  return g;
}

export function setWraps(group: THREE.Group, tangle: number): void {
  const wraps = group.getObjectByName('wraps') as THREE.Group | null;
  if (!wraps) return;
  const n = Math.floor(tangle * wraps.children.length);
  wraps.children.forEach((c, i) => {
    c.visible = i < n;
  });
}

export function makeViewmodel(color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.06, 0.26, 20),
    new THREE.MeshPhysicalMaterial({ color: 0xf7f1e4, roughness: 0.28, metalness: 0.12, clearcoat: 0.55 }),
  );
  body.rotation.z = Math.PI / 2;
  body.rotation.y = 0.35;
  body.name = 'can-body';
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.062, 0.07, 20),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.3, clearcoat: 0.7 }),
  );
  band.rotation.z = Math.PI / 2;
  band.rotation.y = 0.35;
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.034, 0.05, 12),
    new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 0.8 }),
  );
  cap.position.x = 0.15;
  cap.rotation.z = Math.PI / 2;
  cap.name = 'can-cap';
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.009, 0.07, 8),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.35 }),
  );
  nozzle.position.set(0.2, 0.025, 0);
  nozzle.rotation.z = Math.PI / 2;
  const trigger = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.05, 0.018),
    new THREE.MeshStandardMaterial({ color: 0x222 }),
  );
  trigger.position.set(0.02, -0.04, 0.02);
  const jet = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.62, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide }),
  );
  jet.position.set(0.48, 0.03, 0);
  jet.rotation.z = -Math.PI / 2;
  jet.name = 'spray-jet';
  jet.visible = false;
  g.add(body, band, cap, nozzle, trigger, jet);
  g.position.set(0.3, -0.24, -0.48);
  g.name = 'viewmodel';
  return g;
}
