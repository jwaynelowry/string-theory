import { hypot2 } from '../engine/math';
import type { BoxCollider } from '../engine/physics';
import type { Course } from '../maps/types';

export interface NavNode {
  x: number;
  y: number;
  z: number;
  cover: boolean;
}

export interface NavGraph {
  nodes: NavNode[];
  adj: number[][];
}

export function lineBlocked(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  colliders: BoxCollider[],
): boolean {
  const dist = hypot2(bx - ax, bz - az);
  const steps = Math.max(2, Math.ceil(dist / 0.7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    for (const b of colliders) {
      if (b.soft || b.ramp || b.ladder || b.id === 'ground' || b.id === 'lane') continue;
      if (b.maxY < 0.45) continue;
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    }
  }
  return false;
}

function uniqueNodes(nodes: NavNode[]): NavNode[] {
  const out: NavNode[] = [];
  for (const n of nodes) {
    if (out.some((o) => hypot2(o.x - n.x, o.z - n.z) < 1.4)) continue;
    out.push(n);
  }
  return out;
}

export function buildNav(course: Course): NavGraph {
  const nodes: NavNode[] = course.waypoints.map((w) => ({
    x: w.x,
    y: w.y,
    z: w.z,
    cover: !!w.cover,
  }));
  const step = 14;
  const lim = course.size * 0.45;
  for (let x = -lim; x <= lim; x += step) {
    for (let z = -lim; z <= lim; z += step) {
      let blocked = false;
      for (const b of course.colliders) {
        if (b.soft || b.id === 'ground') continue;
        if (x > b.minX - 0.8 && x < b.maxX + 0.8 && z > b.minZ - 0.8 && z < b.maxZ + 0.8 && b.maxY > 0.5) {
          blocked = true;
          break;
        }
      }
      if (!blocked) nodes.push({ x, y: 0, z, cover: false });
    }
  }
  const uniq = uniqueNodes(nodes);
  const adj: number[][] = uniq.map(() => []);
  const maxDist = 22;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const a = uniq[i]!;
      const b = uniq[j]!;
      const d = hypot2(a.x - b.x, a.z - b.z);
      if (d > maxDist || d < 0.5) continue;
      if (lineBlocked(a.x, a.z, b.x, b.z, course.colliders)) continue;
      adj[i]!.push(j);
      adj[j]!.push(i);
    }
  }
  return { nodes: uniq, adj };
}

export function nearestNode(graph: NavGraph, x: number, z: number): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < graph.nodes.length; i++) {
    const n = graph.nodes[i]!;
    const d = hypot2(n.x - x, n.z - z);
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

export function astar(graph: NavGraph, start: number, goal: number): number[] {
  if (start === goal) return [goal];
  if (!graph.nodes.length) return [];
  const n = graph.nodes.length;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const used = new Uint8Array(n);
  dist[start] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      if (!used[i] && dist[i]! < best) {
        best = dist[i]!;
        u = i;
      }
    }
    if (u < 0) break;
    if (u === goal) break;
    used[u] = 1;
    const un = graph.nodes[u]!;
    for (const v of graph.adj[u] ?? []) {
      const vn = graph.nodes[v]!;
      const nd = dist[u]! + hypot2(un.x - vn.x, un.z - vn.z);
      if (nd < dist[v]!) {
        dist[v] = nd;
        prev[v] = u;
      }
    }
  }
  if (prev[goal] < 0 && start !== goal) {
    return [start, goal];
  }
  const path: number[] = [];
  for (let at = goal; at >= 0; at = prev[at]!) path.push(at);
  path.reverse();
  if (path[0] !== start) path.unshift(start);
  return path;
}
