import * as THREE from 'three';
import {
  paintBark,
  paintGrass,
  paintHay,
  paintLeaf,
  paintMetal,
  paintRock,
  paintSky,
  paintVinyl,
  paintWood,
} from './paints';

const cache = new Map<string, THREE.CanvasTexture>();

function fromPaint(
  key: string,
  size: number,
  paint: (data: Uint8ClampedArray, size: number) => void,
): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  paint(img.data, size);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

export function grassTex(): THREE.CanvasTexture {
  return fromPaint('grass', 512, (d, s) => paintGrass(d, s, 3));
}

export function dirtTex(): THREE.CanvasTexture {
  return fromPaint('dirt', 128, (d, s) => paintHay(d, s, 9));
}

export function vinylTex(hex: number): THREE.CanvasTexture {
  return fromPaint(`vinyl:${hex}`, 128, (d, s) => paintVinyl(d, s, hex, 2));
}

export function woodTex(): THREE.CanvasTexture {
  return fromPaint('wood', 128, (d, s) => paintWood(d, s, 4));
}

export function metalTex(): THREE.CanvasTexture {
  return fromPaint('metal', 128, (d, s) => paintMetal(d, s, 5));
}

export function hayTex(): THREE.CanvasTexture {
  return fromPaint('hay', 128, (d, s) => paintHay(d, s, 6));
}

export function leafTex(): THREE.CanvasTexture {
  return fromPaint('leaf', 128, (d, s) => paintLeaf(d, s, 7));
}

export function barkTex(): THREE.CanvasTexture {
  return fromPaint('bark', 64, (d, s) => paintBark(d, s, 8));
}

export function rockTex(): THREE.CanvasTexture {
  return fromPaint('rock', 128, (d, s) => paintRock(d, s, 10));
}

export function skyTex(): THREE.CanvasTexture {
  const t = fromPaint('sky', 256, (d, s) => paintSky(d, s, 11));
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export type SurfaceKind = 'vinyl' | 'wood' | 'metal' | 'hay' | 'leaf' | 'bark' | 'rock' | 'dirt' | 'grass';

const WOOD = 0xc4a06a;
const HAY = 0xd8b14a;
const TIRE = 0x2a2a2e;
const STEEL = 0x8a93a0;
const RUST = 0xa86a3a;
const LEAF = 0x2f8f3a;
const LEAF2 = 0x4cb05a;
const BARK = 0x6a4424;
const ROCK = 0x8b8478;
const NET = 0xd9c27a;

export function surfaceForColor(color: number, name?: string, soft?: boolean): SurfaceKind {
  if (name === 'canopy') return 'leaf';
  if (name === 'trench' || name === 'lane') return 'dirt';
  if (color === WOOD || color === NET) return 'wood';
  if (color === HAY) return 'hay';
  if (color === TIRE || color === STEEL || color === RUST) return 'metal';
  if (color === BARK) return 'bark';
  if (color === ROCK) return 'rock';
  if (color === LEAF || color === LEAF2 || soft) return 'leaf';
  return 'vinyl';
}

export function mapForSurface(kind: SurfaceKind, color: number): THREE.CanvasTexture {
  switch (kind) {
    case 'wood':
      return woodTex();
    case 'metal':
      return metalTex();
    case 'hay':
      return hayTex();
    case 'leaf':
      return leafTex();
    case 'bark':
      return barkTex();
    case 'rock':
      return rockTex();
    case 'dirt':
      return dirtTex();
    case 'grass':
      return grassTex();
    default:
      return vinylTex(color);
  }
}
