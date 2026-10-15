import * as THREE from 'three';
import { batchStatic, box, cylinder, signBoard, sphere } from './AssetManager';
import type { ObstacleKind } from './ObstacleSpawner';
import { createRickshaw } from '../locations/LocationFactory';

export const OBSTACLE_HALF_DEPTH: Readonly<Record<ObstacleKind, number>> = {
  barricade: 0.65,
  divider: 0.65,
  rickshaw: 1.6,
  bus: 2.6,
  pothole: 0.78,
  banner: 0.65,
  sign: 0.65,
};
const DARK = '#2d424a';
const YELLOW = '#eebd49';

/** Geometry is cosmetic; matching forgiving collision volumes live in simulation. */
export function createObstacle(kind: ObstacleKind): THREE.Group {
  const group = new THREE.Group();
  group.name = `obstacle-${kind}`;
  if (kind === 'rickshaw') return batchStatic(createRickshaw());
  if (kind === 'barricade') {
    group.add(box(1.85, 0.55, 0.18, YELLOW, 0, 0.77, 0));
    for (const side of [-1, 1]) {
      group.add(box(0.12, 0.87, 0.13, '#f3c65c', side * 0.7, 0.44, 0));
      group.add(box(0.4, 0.12, 0.78, DARK, side * 0.7, 0.06, 0));
    }
    for (let i = 0; i < 4; i += 1) {
      const stripe = box(0.2, 0.5, 0.2, DARK, -0.65 + i * 0.43, 0.77, 0);
      stripe.rotation.z = -0.32;
      group.add(stripe);
    }
    group.add(sphere(0.11, '#f2783c', -0.73, 1.1, 0), sphere(0.11, '#f2783c', 0.73, 1.1, 0));
  } else if (kind === 'divider') {
    group.add(box(1.8, 0.25, 0.8, '#ceb78f', 0, 0.125, 0));
    group.add(box(1.65, 0.36, 0.57, '#e0cba6', 0, 0.41, 0));
    group.add(box(1.52, 0.3, 0.3, YELLOW, 0, 0.72, 0));
    for (let i = 0; i < 3; i += 1) group.add(box(0.25, 0.3, 0.32, DARK, -0.5 + i * 0.5, 0.72, 0));
  } else if (kind === 'bus') {
    group.add(box(1.8, 2.1, 4.6, '#bb6c68', 0, 1.42, 0));
    group.add(box(1.88, 0.17, 4.75, '#ebc5a2', 0, 2.52, 0));
    group.add(box(1.82, 0.16, 4.63, '#ecd4a4', 0, 0.95, 0));
    group.add(box(1.48, 0.85, 0.08, '#789d9e', 0, 1.91, 2.34));
    group.add(box(0.08, 0.9, 0.1, '#e4b798', 0, 1.91, 2.39));
    for (const side of [-1, 1]) {
      for (let window = 0; window < 4; window += 1)
        group.add(box(0.07, 0.8, 0.75, '#6a9496', side * 0.94, 1.91, -1.6 + window * 1.04));
      for (const z of [-1.5, 1.5]) {
        const wheel = cylinder(0.39, 0.17, DARK, side * 0.94, 0.4, z);
        wheel.rotation.z = Math.PI / 2;
        group.add(wheel);
      }
      group.add(box(0.28, 0.17, 0.08, '#ffe4a0', side * 0.6, 0.73, 2.34));
    }
    group.add(box(1.88, 0.16, 0.17, DARK, 0, 0.46, 2.39));
    const sign = signBoard('DILLI LOCAL', 1.35, 0.32, '#f0d39a', '#5b4638');
    sign.position.set(0, 2.37, 2.34);
    group.add(sign);
  } else if (kind === 'pothole') {
    group.add(cylinder(0.96, 0.035, '#cf9764', 0, 0.028, 0));
    group.add(cylinder(0.81, 0.045, '#30434a', 0, 0.044, 0));
    group.add(cylinder(0.58, 0.048, '#20343c', 0, 0.05, 0));
    group.add(box(0.16, 0.04, 0.35, '#e9bc72', -0.7, 0.07, 0.3));
    group.add(box(0.2, 0.04, 0.23, '#e9bc72', 0.63, 0.07, -0.4));
  } else if (kind === 'banner') {
    for (const side of [-1, 1]) {
      group.add(box(0.09, 2.7, 0.1, '#6b6c54', side * 0.99, 1.35, 0));
      group.add(box(0.35, 0.12, 0.55, DARK, side * 0.99, 0.06, 0));
    }
    group.add(box(2.12, 0.1, 0.12, '#f1c65f', 0, 2.54, 0));
    const banner = signBoard('THODA\nJHUKO!', 1.9, 1.22, '#e9ba57', '#6f453c');
    banner.position.set(0, 1.82, 0);
    group.add(banner);
    for (const side of [-1, 1]) {
      const arrow = box(0.08, 0.3, 0.14, '#6f453c', side * 0.68, 1.15, 0);
      arrow.rotation.z = side * 0.55;
      group.add(arrow);
    }
  } else {
    const board = signBoard('CHAI\nBREAK!', 1.5, 0.83, '#d6b28b', '#604837');
    board.position.set(0, 0.64, 0);
    board.rotation.z = -0.06;
    group.add(board);
    for (const side of [-1, 1]) {
      const leg = box(0.12, 0.65, 0.16, '#976a4d', side * 0.51, 0.32, 0);
      leg.rotation.x = side * 0.4;
      group.add(leg);
      group.add(box(0.3, 0.09, 0.6, '#976a4d', side * 0.51, 0.05, 0));
    }
  }
  return batchStatic(group);
}
