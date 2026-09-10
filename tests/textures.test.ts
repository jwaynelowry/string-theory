import { describe, expect, it } from 'vitest';
import { paintGrass, paintMetal, paintVinyl, paintWood } from '../src/fx/paints';

const SIZE = 64;

function paintBuffer(paint: (data: Uint8ClampedArray, size: number, seed?: number) => void, seed = 7): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  paint(data, SIZE, seed);
  return data;
}

function texel(data: Uint8ClampedArray, x: number, y: number): [number, number, number] {
  const i = (y * SIZE + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}

/** Fail if every sampled texel is the same RGB (a solid fill). */
function assertNonUniform(data: Uint8ClampedArray, label: string): void {
  let minR = 255;
  let maxR = 0;
  let minG = 255;
  let maxG = 0;
  let minB = 255;
  let maxB = 0;
  let n = 0;
  for (let y = 4; y < SIZE; y += 11) {
    for (let x = 3; x < SIZE; x += 9) {
      const [r, g, b] = texel(data, x, y);
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
      n += 1;
    }
  }
  expect(n).toBeGreaterThan(8);
  const flat = minR === maxR && minG === maxG && minB === maxB;
  expect(flat, `${label} must vary across texels (got RGB ${minR},${minG},${minB})`).toBe(false);
}

describe('generated surface paints', () => {
  it('grass, vinyl, wood, and metal are not a single uniform color', () => {
    assertNonUniform(paintBuffer(paintGrass), 'grass');
    assertNonUniform(paintBuffer((d, s, seed) => paintVinyl(d, s, 0xff3d8a, seed)), 'vinyl');
    assertNonUniform(paintBuffer(paintWood), 'wood');
    assertNonUniform(paintBuffer(paintMetal), 'metal');
  });
});
