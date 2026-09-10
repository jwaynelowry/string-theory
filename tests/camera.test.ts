import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { lookDir } from '../src/weapons/stream';
import { applyFpsCamera } from '../src/view/camera';

describe('FPS camera', () => {
  it('looks along the move/look vector even after a leftover lookAt roll', () => {
    const cam = new THREE.PerspectiveCamera(78, 1, 0.1, 200);
    cam.rotation.order = 'YXZ';
    cam.position.set(0, 18, 38);
    cam.lookAt(0, 1, 0);
    cam.rotation.z = Math.PI;

    const yaw = Math.PI / 2;
    const pitch = 0.2;
    applyFpsCamera(cam, { x: 0, y: 1.6, z: 0, yaw, pitch });

    expect(Math.abs(cam.rotation.z)).toBeLessThan(1e-6);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const look = lookDir(yaw, pitch);
    const dot = fwd.x * look.x + fwd.y * look.y + fwd.z * look.z;
    expect(dot).toBeGreaterThan(0.98);
  });
});
