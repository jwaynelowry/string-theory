import type { PerspectiveCamera } from 'three';
import { lookDir } from '../weapons/stream';

/** Aim the camera along the same vector WASD and the string stream use. */
export function applyFpsCamera(
  camera: PerspectiveCamera,
  pose: { x: number; y: number; z: number; yaw: number; pitch: number },
): void {
  const look = lookDir(pose.yaw, pose.pitch);
  camera.up.set(0, 1, 0);
  camera.position.set(pose.x, pose.y, pose.z);
  camera.lookAt(pose.x + look.x, pose.y + look.y, pose.z + look.z);
}
