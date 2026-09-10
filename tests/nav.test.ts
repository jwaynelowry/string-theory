import { describe, expect, it } from 'vitest';
import { astar, buildNav, lineBlocked, nearestNode } from '../src/bots/nav';
import { getCourse } from '../src/maps/courses';

describe('nav graph', () => {
  it('builds a connected graph on the test course', () => {
    const course = getCourse('test');
    const nav = buildNav(course);
    expect(nav.nodes.length).toBeGreaterThan(5);
    const linked = nav.adj.filter((a) => a.length > 0).length;
    expect(linked).toBeGreaterThan(3);
  });

  it('blocks a line through a solid wall and allows open ground', () => {
    const wall = [{ minX: -1, minY: 0, minZ: -4, maxX: 1, maxY: 2, maxZ: 4 }];
    expect(lineBlocked(-3, 0, 3, 0, wall)).toBe(true);
    expect(lineBlocked(-3, 8, 3, 8, wall)).toBe(false);
  });

  it('returns a path between two nodes', () => {
    const course = getCourse('test');
    const nav = buildNav(course);
    const a = nearestNode(nav, 0, -22);
    const b = nearestNode(nav, 0, 22);
    const path = astar(nav, a, b);
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe(a);
  });
});
