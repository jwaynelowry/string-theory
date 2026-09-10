import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { skyTex } from './textures';

export function makeSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(260, 32, 20);
  geo.scale(-1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({
    map: skyTex(),
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sky-dome';
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

/** Physical sky + matching sun direction. */
export function makePhysicalSky(): { sky: Sky; sunDir: THREE.Vector3 } {
  const sky = new Sky();
  sky.scale.setScalar(1400);
  sky.name = 'sky-physical';
  const u = sky.material.uniforms;
  u['turbidity'].value = 4.2;
  u['rayleigh'].value = 2.4;
  u['mieCoefficient'].value = 0.004;
  u['mieDirectionalG'].value = 0.82;
  const sunDir = new THREE.Vector3();
  const phi = THREE.MathUtils.degToRad(78);
  const theta = THREE.MathUtils.degToRad(155);
  sunDir.setFromSphericalCoords(1, phi, theta);
  u['sunPosition'].value.copy(sunDir);
  return { sky, sunDir };
}
