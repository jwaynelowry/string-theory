/** ImageData-style RGBA paints. No DOM / WebGL. Seeded so tests are stable. */

import { clamp, rand } from '../engine/math';

function setPx(data: Uint8ClampedArray, size: number, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  const i = (((y % size) + size) % size * size + ((x % size) + size) % size) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = a;
}

function mix(a: number, b: number, t: number): number {
  return (a + (b - a) * t) | 0;
}

export function paintGrass(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rand(seed + x * 13.1 + y * 7.7);
      const n2 = rand(seed + x * 3.3 + y * 19.1);
      const r = mix(46, 92, n);
      const g = mix(118, 186, n2);
      const b = mix(32, 72, n);
      setPx(data, size, x, y, r, g, b);
    }
  }
  for (let i = 0; i < size * 22; i++) {
    const x = (rand(seed + i * 2.1) * size) | 0;
    const y = (rand(seed + i * 5.7) * size) | 0;
    const h = 3 + ((rand(seed + i * 9) * 6) | 0);
    const lean = ((rand(seed + i * 11) - 0.5) * 3) | 0;
    const light = rand(seed + i) > 0.5;
    for (let k = 0; k < h; k++) {
      setPx(data, size, x + lean, y - k, light ? 130 : 48, light ? 210 : 110, light ? 70 : 36);
    }
  }
}

export function paintVinyl(data: Uint8ClampedArray, size: number, hex = 0xff3d8a, seed = 1): void {
  const br = (hex >> 16) & 255;
  const bg = (hex >> 8) & 255;
  const bb = hex & 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wrinkle = rand(seed + x * 0.7 + y * 1.9) * 0.22;
      const seam = x < 3 || y < 3 || x > size - 4 || y > size - 4 ? 0.18 : 0;
      const t = clamp(0.78 + wrinkle - seam, 0.55, 1);
      setPx(data, size, x, y, mix(br * 0.45, br, t), mix(bg * 0.45, bg, t), mix(bb * 0.45, bb, t));
    }
  }
  const cx = size * 0.32;
  const cy = size * 0.28;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / (size * 0.38);
      const dy = (y - cy) / (size * 0.16);
      if (dx * dx + dy * dy < 1) {
        const i = (y * size + x) * 4;
        data[i] = clamp(data[i]! + 48, 0, 255);
        data[i + 1] = clamp(data[i + 1]! + 48, 0, 255);
        data[i + 2] = clamp(data[i + 2]! + 48, 0, 255);
      }
    }
  }
}

export function paintWood(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(y * 0.35 + Math.sin(x * 0.08) * 3 + seed) * 0.5 + 0.5;
      const n = rand(seed + x + y * size);
      const t = clamp(grain * 0.7 + n * 0.3, 0, 1);
      setPx(data, size, x, y, mix(96, 196, t), mix(62, 148, t), mix(28, 88, t));
    }
  }
  for (let k = 0; k < 4; k++) {
    const kx = 8 + ((rand(seed + k * 17) * (size - 16)) | 0);
    const ky = 8 + ((rand(seed + k * 31) * (size - 16)) | 0);
    const rad = 2 + ((rand(seed + k * 5) * 3) | 0);
    for (let y = -rad; y <= rad; y++) {
      for (let x = -rad; x <= rad; x++) {
        if (x * x + y * y <= rad * rad) setPx(data, size, kx + x, ky + y, 72, 42, 22);
      }
    }
  }
}

export function paintMetal(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rand(seed + x * 2.2 + y * 8.8);
      const scratch = rand(seed * 3 + y * 0.15 + x * 0.01) > 0.97 ? 40 : 0;
      const r = mix(92, 168, n) + scratch;
      const g = mix(98, 172, n) + scratch;
      const b = mix(108, 180, n) + scratch;
      setPx(data, size, x, y, clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255));
    }
  }
  for (let i = 0; i < 18; i++) {
    const x = 4 + ((rand(seed + i * 8) * (size - 8)) | 0);
    const y = 4 + ((rand(seed + i * 13) * (size - 8)) | 0);
    setPx(data, size, x, y, 168, 92, 48);
    setPx(data, size, x + 1, y, 140, 70, 36);
  }
}

export function paintHay(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rand(seed + x * 4 + y);
      setPx(data, size, x, y, mix(170, 230, n), mix(130, 190, n), mix(40, 90, n));
    }
  }
  for (let i = 0; i < size * 8; i++) {
    const x = (rand(seed + i) * size) | 0;
    const y = (rand(seed + i * 2) * size) | 0;
    setPx(data, size, x, y, 240, 210, 110);
  }
}

export function paintSky(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    const t = y / Math.max(1, size - 1);
    const r = mix(90, 255, t);
    const g = mix(170, 210, t);
    const b = mix(255, 140, t);
    for (let x = 0; x < size; x++) {
      const puff = rand(seed + x * 0.2 + Math.floor(y / 6) * 9);
      const cloud = puff > 0.72 && t < 0.62 ? (puff - 0.72) * 180 : 0;
      setPx(data, size, x, y, clamp(r + cloud, 0, 255), clamp(g + cloud, 0, 255), clamp(b + cloud * 0.7, 0, 255));
    }
  }
}

export function paintLeaf(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rand(seed + x * 6.1 + y * 2.4);
      setPx(data, size, x, y, mix(20, 70, n), mix(90, 170, n), mix(24, 70, n));
    }
  }
}

export function paintBark(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const crack = Math.abs(Math.sin(x * 0.8 + seed)) > 0.85 ? 0.35 : 0;
      const n = rand(seed + y * 3 + x);
      const t = clamp(n * 0.7 + crack, 0, 1);
      setPx(data, size, x, y, mix(48, 120, t), mix(28, 72, t), mix(16, 44, t));
    }
  }
}

export function paintRock(data: Uint8ClampedArray, size: number, seed = 1): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = rand(seed + x * 1.7 + y * 1.3);
      setPx(data, size, x, y, mix(90, 160, n), mix(86, 150, n), mix(78, 140, n));
    }
  }
}
