import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { surfaceForColor } from '../src/fx/textures.ts';

const src = join(dirname(fileURLToPath(import.meta.url)), '../src');

function read(rel) {
  return readFileSync(join(src, rel), 'utf8');
}

describe('production visual wiring', () => {
  it('grounds and obstacles use generated maps; sky is a dome not a solid Color', () => {
    const world = read('view/world.ts');
    const mats = read('view/materials.ts');
    expect(world).toMatch(/grassTex\(\)/);
    expect(mats).toMatch(/mapForSurface/);
    expect(world).toMatch(/makePhysicalSky|makeSkyDome/);
    expect(world).not.toMatch(/scene\.background\s*=\s*new THREE\.Color/);
    expect(world).toMatch(/showNav\s*=\s*false/);
    expect(world).toMatch(/navGroup\.visible\s*=\s*false/);
  });

  it('team figures keep goggles, a held can, and lit (not MeshBasic) materials', () => {
    const chars = read('view/characters.ts');
    expect(chars).toMatch(/name = 'goggles'/);
    expect(chars).toMatch(/name = 'can'/);
    expect(chars).toMatch(/MeshPhongMaterial/);
    expect(chars).toMatch(/MeshPhysicalMaterial/);
    expect(chars).toMatch(/spray-jet/);
    expect(chars).toMatch(/nameplate/);
    expect(chars).toMatch(/vinylTex\(color\)/);
  });

  it('classifies obstacle families onto map kinds', () => {
    expect(surfaceForColor(0xc4a06a)).toBe('wood');
    expect(surfaceForColor(0x8a93a0)).toBe('metal');
    expect(surfaceForColor(0xff3d8a)).toBe('vinyl');
    expect(surfaceForColor(0x2f8f3a, 'canopy')).toBe('leaf');
  });
});
