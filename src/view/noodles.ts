import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type { Droplet } from '../weapons/stream';

const MAX_PTS = 28;

export class StringNoodles {
  private lines = new Map<number, Line2>();
  private mats: LineMaterial[] = [];

  constructor(private scene: THREE.Scene) {}

  resize(w: number, h: number): void {
    for (const m of this.mats) m.resolution.set(w, h);
  }

  sync(droplets: Droplet[]): void {
    const byOwner = new Map<number, Droplet[]>();
    for (const d of droplets) {
      if (!d.alive) continue;
      let list = byOwner.get(d.ownerId);
      if (!list) {
        list = [];
        byOwner.set(d.ownerId, list);
      }
      list.push(d);
    }
    const live = new Set<number>();
    for (const [id, list] of byOwner) {
      if (list.length < 2) continue;
      live.add(id);
      const slice = list.slice(-MAX_PTS);
      const pos: number[] = [];
      for (const d of slice) pos.push(d.x, d.y, d.z);
      const last = slice[slice.length - 1]!;
      while (pos.length < MAX_PTS * 3) pos.push(last.x, last.y, last.z);
      let line = this.lines.get(id);
      if (!line) {
        const geo = new LineGeometry();
        geo.setPositions(pos);
        const mat = new LineMaterial({
          color: slice[0]!.color,
          linewidth: 4.2,
          transparent: true,
          opacity: 0.92,
          worldUnits: false,
          dashed: false,
        });
        this.mats.push(mat);
        line = new Line2(geo, mat);
        line.frustumCulled = false;
        this.scene.add(line);
        this.lines.set(id, line);
      } else {
        const geo = line.geometry as LineGeometry;
        if (pos.length >= 6) {
          geo.setPositions(pos);
          line.computeLineDistances();
        }
        (line.material as LineMaterial).color.setHex(slice[0]!.color);
      }
      line.visible = true;
    }
    for (const [id, line] of this.lines) {
      if (!live.has(id)) line.visible = false;
    }
  }
}
