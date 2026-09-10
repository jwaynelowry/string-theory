import * as THREE from 'three';

export function burstConfetti(scene: THREE.Scene, origin: THREE.Vector3): THREE.Points {
  const n = 80;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const vel: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = origin.x;
    pos[i * 3 + 1] = origin.y;
    pos[i * 3 + 2] = origin.z;
    const c = i % 2 ? new THREE.Color(0xff3d8a) : new THREE.Color(0x14d4ff);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
    vel.push(
      new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 6, (Math.random() - 0.5) * 8),
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 1 }),
  );
  pts.userData.vel = vel;
  pts.userData.age = 0;
  scene.add(pts);
  return pts;
}

export function tickConfetti(pts: THREE.Points, dt: number): boolean {
  pts.userData.age += dt;
  const pos = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
  const vel = pts.userData.vel as THREE.Vector3[];
  for (let i = 0; i < vel.length; i++) {
    vel[i]!.y -= 12 * dt;
    pos.setX(i, pos.getX(i) + vel[i]!.x * dt);
    pos.setY(i, pos.getY(i) + vel[i]!.y * dt);
    pos.setZ(i, pos.getZ(i) + vel[i]!.z * dt);
  }
  pos.needsUpdate = true;
  (pts.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - pts.userData.age / 2.2);
  if (pts.userData.age > 2.2) {
    pts.removeFromParent();
    pts.geometry.dispose();
    return false;
  }
  return true;
}
