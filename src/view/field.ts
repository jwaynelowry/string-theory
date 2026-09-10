import * as THREE from 'three';
import type { Course } from '../maps/types';

function tape(w: number, len: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, len),
    new THREE.MeshBasicMaterial({ color: 0xf7f4ea, transparent: true, opacity: 0.88, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.025;
  m.renderOrder = 1;
  return m;
}

/** Paintball-field hash marks so the lawn reads as a course, not a void. */
export function makeFieldMarkings(course: Course): THREE.Group {
  const g = new THREE.Group();
  g.name = 'field-marks';
  const half = course.size * 0.42;
  const mid = tape(0.28, half * 2);
  g.add(mid);
  for (const x of [-half * 0.55, half * 0.55]) {
    const side = tape(0.14, half * 2);
    side.position.x = x;
    g.add(side);
  }
  const midStripe = tape(half * 0.9, 0.22);
  g.add(midStripe);
  for (const team of [course.bases.pink, course.bases.cyan]) {
    const box = tape(12, 8);
    box.position.set(team.x, 0.026, team.z);
    box.material = new THREE.MeshBasicMaterial({
      color: team === course.bases.pink ? 0xff7ab6 : 0x5ce6ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    g.add(box);
  }
  return g;
}

export function makeFlag(x: number, z: number, color: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 3.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8d0c4, metalness: 0.4, roughness: 0.35 }),
  );
  pole.position.y = 1.7;
  pole.castShadow = true;
  const cloth = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.85, 8, 4),
    new THREE.MeshPhysicalMaterial({
      color,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0,
      sheen: 0.3,
    }),
  );
  cloth.position.set(0.72, 2.85, 0);
  cloth.name = 'flag-cloth';
  g.add(pole, cloth);
  return g;
}
