import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { MeshSpec } from '../maps/types';
import { mapForSurface, surfaceForColor, type SurfaceKind } from '../fx/textures';

export function vinylMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.04,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    sheen: 0.55,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(0xffffff),
    envMapIntensity: 1.1,
  });
}

export function woodMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
  });
}

export function metalMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map,
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.72,
    envMapIntensity: 1.2,
  });
}

export function natureMaterial(map: THREE.Texture, soft: boolean): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    map,
    color: 0xffffff,
    transparent: soft,
    opacity: soft ? 0.9 : 1,
  });
}

export function materialForSurface(kind: SurfaceKind, map: THREE.Texture, soft: boolean): THREE.Material {
  if (kind === 'vinyl') return vinylMaterial(map);
  if (kind === 'wood' || kind === 'hay' || kind === 'bark') return woodMaterial(map);
  if (kind === 'metal') return metalMaterial(map);
  return natureMaterial(map, soft);
}

export function geometryForSpec(m: MeshSpec, kind: SurfaceKind): THREE.BufferGeometry {
  if (m.kind === 'cyl') {
    return new THREE.CylinderGeometry(m.sx / 2, m.sx / 2, m.sy, kind === 'vinyl' ? 28 : 16);
  }
  if (m.kind === 'sphere') {
    return new THREE.SphereGeometry(Math.max(m.sx, m.sz) / 2, 18, 14);
  }
  if (kind === 'vinyl') {
    const r = Math.min(m.sx, m.sy, m.sz) * 0.18;
    return new RoundedBoxGeometry(m.sx, m.sy, m.sz, 4, Math.max(0.08, r));
  }
  return new THREE.BoxGeometry(m.sx, m.sy, m.sz);
}

export function meshFromSpec(m: MeshSpec): THREE.Mesh {
  const kind = surfaceForColor(m.color, m.name, m.soft);
  const map = mapForSurface(kind, m.color).clone();
  map.repeat.set(Math.max(1, m.sx / 2.4), Math.max(1, m.sy / 2.4));
  map.needsUpdate = true;
  const mesh = new THREE.Mesh(geometryForSpec(m, kind), materialForSurface(kind, map, !!m.soft));
  mesh.position.set(m.x, m.y, m.z);
  mesh.rotation.y = m.rotY ?? 0;
  mesh.castShadow = !m.soft;
  mesh.receiveShadow = true;
  if (m.name === 'slide') mesh.rotation.z = -0.32;
  mesh.userData.surface = kind;
  return mesh;
}
