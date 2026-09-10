export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function saturate(t: number): number {
  return clamp(t, 0, 1);
}

export function hypot2(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

export function hypot3(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

export function finite(n: number, fallback = 0): number {
  return Number.isFinite(n) ? n : fallback;
}

export function rand(seed: number): number {
  const t = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return t - Math.floor(t);
}
