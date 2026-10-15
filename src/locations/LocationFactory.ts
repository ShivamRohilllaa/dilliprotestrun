import * as THREE from 'three';
import type { LocationDefinition } from './LocationDefinitions';
import { assets, batchStatic, box, cylinder, mesh, signBoard, sphere } from '../game/AssetManager';

const LEAVES = ['#5d987d', '#82ad86', '#427a69'];
const WALLS = ['#d18a67', '#edb28a', '#ce7558', '#dfaa79', '#f0c89a'];
const CREAM = '#f5dcb1';
const NAVY = '#29464c';

function tree(x: number, z: number, height = 4): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(cylinder(0.17, height * 0.65, '#7e6351', 0, height * 0.32, 0));
  for (let i = 0; i < 3; i += 1) {
    const crown = sphere(
      height * (0.27 - i * 0.015),
      LEAVES[i],
      (i - 1) * 0.42,
      height * 0.7 + i * 0.34,
      (i % 2) * 0.38,
    );
    crown.scale.y *= 1.13;
    group.add(crown);
  }
  group.add(box(1.55, 0.22, 1.55, '#dbc4a0', 0, 0.1, 0));
  group.add(box(1.24, 0.23, 1.24, '#7a8c63', 0, 0.14, 0));
  return group;
}

function lamp(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(cylinder(0.08, 4.6, NAVY, 0, 2.3, 0), cylinder(0.19, 0.28, NAVY, 0, 0.14, 0));
  group.add(box(0.7, 0.1, 0.12, NAVY, -Math.sign(x) * 0.3, 4.58, 0));
  group.add(box(0.38, 0.16, 0.35, '#ffdc8c', -Math.sign(x) * 0.65, 4.5, 0));
  return group;
}

function building(x: number, z: number, index: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const height = 4.7 + (index % 3) * 1.5;
  const color = WALLS[index % WALLS.length];
  const width = 4.5 + (index % 2) * 0.5;
  group.add(box(width, height, 5.4, color, 0, height / 2, 0));
  group.add(box(width + 0.3, 0.23, 5.7, CREAM, 0, height + 0.05, 0));
  group.add(box(width + 0.15, 0.18, 5.6, CREAM, 0, 2.8, 0));
  group.add(box(width, 0.5, 0.18, color, 0, height + 0.35, 2.65));
  group.add(box(0.18, 0.5, 5.4, color, -width / 2, height + 0.35, 0));
  group.add(box(0.18, 0.5, 5.4, color, width / 2, height + 0.35, 0));
  for (let floor = 0; floor < Math.floor((height - 1) / 2); floor += 1) {
    for (const side of [-1, 1]) {
      const y = 3.65 + floor * 1.8;
      if (y > height - 0.35) continue;
      group.add(box(1.15, 1.35, 0.13, CREAM, side * 1.03, y, 2.77));
      group.add(box(0.91, 1.14, 0.14, NAVY, side * 1.03, y, 2.85));
      group.add(box(1.2, 0.12, 0.35, color, side * 1.03, y - 0.65, 2.91));
      group.add(box(0.06, 1.15, 0.16, '#86a7a2', side * 1.03, y, 2.93));
      group.add(box(0.1, 1.22, 1.1, CREAM, Math.sign(-x) * (width / 2 + 0.03), y, side * 1.3));
      group.add(box(0.13, 1.02, 0.85, NAVY, Math.sign(-x) * (width / 2 + 0.1), y, side * 1.3));
    }
  }
  group.add(box(1.25, 2.25, 0.16, '#4d6462', -0.9, 1.1, 2.78));
  group.add(box(1.25, 1.7, 0.16, '#63958a', 0.9, 1.25, 2.78));
  const awning = box(width + 0.1, 0.16, 1.1, index % 2 ? '#cf5d40' : '#6c9d8b', 0, 2.55, 3.12);
  awning.rotation.x = 0.17;
  group.add(awning);
  for (let i = 0; i < 6; i += 1)
    group.add(box(0.3, 0.17, 1.11, CREAM, -width / 2 + 0.35 + i * 0.75, 2.57, 3.12));
  const title = signBoard(
    ['DILLI\nGENERAL STORE', 'CHAI & CO.', 'MANTAR\nBOOK HOUSE', 'LOCAL\nGOOD VIBES'][index % 4],
    3.7,
    0.8,
    '#f4dbad',
    '#6d3d2f',
  );
  title.position.set(0, 2.99, 2.86);
  group.add(title);
  const tank = cylinder(0.6, 1.2, '#466162', 0.8, height + 0.65, -0.8);
  group.add(tank, cylinder(0.63, 0.1, '#30484a', 0.8, height + 1.28, -0.8));
  group.add(box(0.85, 0.62, 0.55, '#c5d0bf', -width / 2 - 0.21, 3.2, 1.9));
  return group;
}

function chaiStall(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = -0.13;
  group.add(box(2.6, 1.05, 1.65, '#df9b55', 0, 0.72, 0));
  group.add(box(2.85, 0.13, 1.9, '#694d3e', 0, 1.31, 0));
  for (const side of [-1, 1]) group.add(cylinder(0.07, 2.6, NAVY, side * 1.16, 1.5, -0.65));
  const canopy = box(3.1, 0.17, 2.25, '#d75d3c', 0, 2.77, 0);
  canopy.rotation.x = -0.08;
  group.add(canopy);
  for (let i = 0; i < 5; i += 1)
    group.add(box(0.31, 0.17, 2.27, '#ffe3ad', -1.23 + i * 0.62, 2.79, 0));
  const sign = signBoard('CHAI\n& CHARCHA', 2.35, 0.72, '#f6d59a', '#5f392a');
  sign.position.set(0, 2.34, 0.85);
  group.add(sign);
  group.add(cylinder(0.29, 0.4, '#a7b9b0', -0.54, 1.57, 0));
  group.add(cylinder(0.32, 0.06, '#d2ddd0', -0.54, 1.8, 0));
  for (let i = 0; i < 4; i += 1)
    group.add(cylinder(0.09, 0.14, '#a35536', 0.11 + i * 0.25, 1.45, 0.35));
  for (const side of [-1, 1]) {
    const wheel = cylinder(0.3, 0.1, NAVY, side * 1.08, 0.3, 0);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
  }
  return group;
}

export function createRickshaw(): THREE.Group {
  const group = new THREE.Group();
  group.add(box(1.48, 0.7, 2.3, '#5d9570', 0, 0.74, 0));
  group.add(box(1.55, 0.16, 2.42, '#f0bd48', 0, 1.91, 0));
  group.add(box(1.45, 0.84, 0.14, '#efbe4d', 0, 1.44, 1.04));
  group.add(box(1.24, 0.58, 0.15, '#a1c3b1', 0, 1.42, 1.13));
  for (const side of [-1, 1]) {
    group.add(box(0.08, 0.92, 0.08, '#e6b240', side * 0.7, 1.43, -1.03));
    group.add(box(0.08, 0.92, 0.08, '#e6b240', side * 0.7, 1.43, 1.03));
    const wheel = cylinder(0.3, 0.17, '#293b3e', side * 0.75, 0.3, 0.73);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);
    group.add(sphere(0.12, '#fff2bd', side * 0.51, 0.78, -1.16));
  }
  const front = cylinder(0.29, 0.16, '#293b3e', 0, 0.3, -0.84);
  front.rotation.z = Math.PI / 2;
  group.add(front);
  group.add(box(1.1, 0.18, 0.65, '#3c4c44', 0, 1.12, 0.2));
  return group;
}

function arch(z: number, grand: boolean): THREE.Group {
  const group = new THREE.Group();
  group.position.z = z;
  const height = grand ? 12 : 9;
  const color = grand ? '#d7b079' : '#d78458';
  for (const side of [-1, 1]) {
    group.add(box(2.7, height - 2.2, 3.2, color, side * 5.4, (height - 2.2) / 2, 0));
    group.add(box(3.15, 0.55, 3.7, '#e6bd89', side * 5.4, 0.28, 0));
    group.add(box(3.1, 0.27, 3.65, CREAM, side * 5.4, height - 3.1, 0));
    group.add(box(1.05, height - 4.4, 0.1, '#c29164', side * 5.4, (height - 3.1) / 2, 1.64));
  }
  group.add(box(13.3, 2.6, 3.2, color, 0, height - 1.8, 0));
  group.add(box(14, 0.35, 3.7, CREAM, 0, height - 0.34, 0));
  group.add(box(11.6, 0.9, 3.1, '#e5b57c', 0, height + 0.25, 0));
  group.add(box(12.1, 0.25, 3.4, CREAM, 0, height + 0.79, 0));
  const sign = signBoard(grand ? 'DILLI DARWAZA' : 'DILLI DIL SE', 5.3, 0.83, '#e8bf8a', '#875b40');
  sign.position.set(0, height - 1.25, 1.66);
  group.add(sign);
  // Stepped corbels soften the rectangular opening into a stylized monumental arch.
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i += 1) {
      group.add(
        box(0.5 + i * 0.35, 0.43, 3.2, color, side * (4.0 - i * 0.16), height - 3.3 + i * 0.4, 0),
      );
    }
  return batchStatic(group);
}

function observatory(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-13, 0, -25);
  group.add(cylinder(4.0, 0.6, '#b16a4d', 0, 0.3, 0));
  group.add(cylinder(3.6, 1.8, '#d97f58', 0, 1.4, 0));
  group.add(cylinder(3.7, 0.25, '#efb38a', 0, 2.38, 0));
  for (let i = 0; i < 14; i += 1) {
    const height = 0.7 + i * 0.47;
    group.add(box(1.55, height, 0.5, '#db875e', 0, height / 2, 4.8 - i * 0.49));
    group.add(box(1.65, 0.08, 0.51, '#f1ba8a', 0, height + 0.04, 4.8 - i * 0.49));
  }
  group.add(box(0.32, 7.7, 4, '#ce7751', -1.1, 3.85, -0.8));
  group.add(box(0.32, 7.7, 4, '#ce7751', 1.1, 3.85, -0.8));
  return batchStatic(group);
}

function bunting(z: number, index: number): THREE.Group {
  const group = new THREE.Group();
  group.position.z = z;
  group.add(
    cylinder(0.07, 6.1, '#586d64', -5.1, 3.05, 0),
    cylinder(0.07, 6.1, '#586d64', 5.1, 3.05, 0),
  );
  for (let i = 0; i < 12; i += 1) {
    const x = -4.8 + i * 0.87;
    const y = 5.52 + Math.pow(x / 5, 2) * 0.42;
    const flag = mesh('cone', ['#e77c4c', '#eac271', '#68a58c', '#f0dfbd'][(i + index) % 4]);
    flag.scale.set(0.32, 0.62, 0.035);
    flag.position.set(x, y - 0.25, 0);
    flag.rotation.z = Math.PI;
    group.add(flag);
    group.add(box(0.91, 0.025, 0.025, '#3d514e', x, y + 0.06, 0));
  }
  return group;
}

function tent(x: number, z: number, color: string): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.add(box(4, 2.3, 4, '#f2dcba', 0, 1.15, 0));
  const roof = mesh('cone', color);
  roof.scale.set(3.3, 2.2, 3.3);
  roof.position.y = 3.3;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);
  group.add(box(1.3, 2.05, 0.08, '#6e5360', 0, 1.05, 2.05));
  return group;
}

/** Each roadside segment can translate and wrap independently during a run. */
export function createLocation(definition: LocationDefinition): THREE.Group {
  const environment = new THREE.Group();
  environment.name = `location-${definition.id}`;
  const ground = box(
    80,
    0.5,
    180,
    definition.id === 'ramlila' ? '#bcae89' : '#d6b58e',
    0,
    -0.35,
    -52,
  );
  environment.add(ground);
  environment.add(box(8.7, 0.12, 160, '#63746e', 0, -0.05, -55));
  for (const side of [-1, 1])
    environment.add(box(3.1, 0.22, 160, '#e7cda2', side * 5.9, 0.01, -55));

  for (let segmentIndex = 0; segmentIndex < 7; segmentIndex += 1) {
    const segment = new THREE.Group();
    segment.name = `streetscape-${segmentIndex}`;
    segment.position.z = 15 - segmentIndex * 20;
    segment.userData.recycle = true;
    segment.userData.initialZ = segment.position.z;
    for (const side of [-1, 1]) {
      for (let curb = 0; curb < 10; curb += 1)
        segment.add(
          box(0.22, 0.24, 2, curb % 2 ? '#eee0b9' : '#ca9768', side * 4.42, 0.1, -curb * 2),
        );
      segment.add(tree(side * 6, -5, 3.9 + (segmentIndex % 3) * 0.35));
      segment.add(lamp(side * 4.95, -13));
      if (definition.id === 'ramlila') {
        segment.add(tent(side * 10, -8, segmentIndex % 2 ? '#b2809b' : '#d99162'));
        segment.add(tree(side * 16, -15, 6));
      } else if (definition.id === 'india') {
        segment.add(tree(side * 9, -12, 5.2));
        segment.add(tree(side * 13, -4, 6));
        if (segmentIndex % 2 === 0)
          segment.add(building(side * 19, -10, segmentIndex + (side > 0 ? 1 : 2)));
      } else {
        if (!(side < 0 && segmentIndex === 2))
          segment.add(building(side * 9.5, -12, segmentIndex + (side > 0 ? 1 : 0)));
        segment.add(building(side * 15, -15, segmentIndex + 2));
      }
      const bench = new THREE.Group();
      bench.add(box(1.6, 0.16, 0.55, '#b78258', 0, 0.62, 0));
      bench.add(box(1.6, 0.5, 0.11, '#b78258', 0, 0.94, 0.25));
      bench.add(
        box(0.13, 0.65, 0.5, NAVY, -0.6, 0.32, 0),
        box(0.13, 0.65, 0.5, NAVY, 0.6, 0.32, 0),
      );
      bench.position.set(side * 6.3, 0, -0.3);
      segment.add(bench);
    }
    for (let dash = 0; dash < 4; dash += 1)
      for (const side of [-1, 1])
        segment.add(box(0.075, 0.012, 2, '#d6d0ad', side * 1.25, 0.018, -dash * 5));
    if (segmentIndex % 2 === 1) segment.add(bunting(-3, segmentIndex));
    batchStatic(segment);
    environment.add(segment);
  }
  const tea = chaiStall(6.4, -0.4);
  tea.userData.recycle = true;
  tea.userData.initialZ = tea.position.z;
  environment.add(batchStatic(tea));
  const auto = createRickshaw();
  auto.position.set(-6.3, 0.13, -7.7);
  auto.rotation.y = 0.23;
  auto.userData.recycle = true;
  auto.userData.initialZ = auto.position.z;
  environment.add(batchStatic(auto));
  if (definition.id === 'jantar') environment.add(observatory(), arch(-37, false));
  if (definition.id === 'india') environment.add(arch(-40, true));
  if (definition.id === 'ramlila') {
    const stage = new THREE.Group();
    stage.position.set(0, 0, -105);
    stage.add(box(15, 0.6, 6, '#705363', 0, 0.3, 0));
    for (const side of [-1, 1]) stage.add(box(0.3, 7, 0.3, '#5e5463', side * 6.5, 3.5, 1));
    stage.add(box(14, 0.3, 5, '#c38a9b', 0, 7, 0));
    const title = signBoard('DILLI KA JOSH!', 10.5, 1.5, '#e6be91', '#694957');
    title.position.set(0, 5.8, 1.1);
    stage.add(title);
    environment.add(batchStatic(stage));
  }
  // The sun is a simple original world decoration, not a dynamic light source.
  const sun = new THREE.Mesh(assets.geometry('sphere'), assets.material('#ffe1a0', true));
  sun.userData.sharedAsset = true;
  sun.scale.setScalar(6);
  sun.position.set(-42, 27, -96);
  environment.add(sun);
  return environment;
}
