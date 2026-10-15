import * as THREE from 'three';
import { createCharacter } from '../characters/CharacterFactory';
import { CROWD_CHARACTERS, type CharacterDefinition } from '../characters/CharacterDefinitions';
import { box, cylinder, disposeObject, mesh, signBoard, sphere } from './AssetManager';
import type { Quality } from './SceneFactory';
import { seededRandom } from '../utils/random';

const PRESETS = {
  low: { total: 60, animated: 6, depth: 2 },
  medium: { total: 80, animated: 8, depth: 3 },
  high: { total: 110, animated: 10, depth: 3 },
} as const;
const SLOGANS = ['MORE CHAI\nLESS SIGH', 'DILLI\nKA JOSH!', 'CHAI TIME\nIS A RIGHT'];

export interface CrowdStats {
  total: number;
  animated: number;
  instanced: number;
  meshes: number;
  quality: Quality;
}

interface InstanceBatch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  transforms: THREE.Matrix4[];
}

/** The distant crowd uses shared primitive geometry, with no individual animation rigs. */
function silhouette(definition: CharacterDefinition, raised: boolean): THREE.Group {
  const person = new THREE.Group();
  const skin = '#bc754b';
  const dark = '#252d36';
  person.add(box(0.56, 0.65, 0.34, definition.color, 0, 1.02, 0));
  person.add(cylinder(0.09, 0.15, skin, 0, 1.4, 0));
  const head = sphere(0.26, skin, 0, 1.65, 0);
  head.scale.y *= 1.08;
  person.add(head);
  const hair = sphere(0.267, dark, 0, 1.78, 0.025);
  hair.scale.y *= 0.48;
  person.add(hair);
  person.add(box(0.1, 0.07, 0.09, skin, 0, 1.61, -0.26));
  for (const side of [-1, 1]) {
    person.add(box(0.2, 0.6, 0.23, '#304757', side * 0.15, 0.38, 0));
    person.add(box(0.22, 0.14, 0.35, '#f5dfb6', side * 0.15, 0.07, -0.06));
    const arm = new THREE.Group();
    arm.position.set(side * 0.35, 1.28, 0);
    arm.rotation.z = raised ? -side * 2.4 : side * 0.12;
    arm.add(box(0.18, 0.3, 0.22, definition.color, 0, -0.13, 0));
    arm.add(box(0.14, 0.3, 0.16, skin, 0, -0.41, 0));
    person.add(arm);
  }
  if (definition.accessory === 'scarf') {
    person.add(box(0.6, 0.14, 0.39, definition.accent, 0, 1.3, 0));
    person.add(box(0.17, 0.46, 0.06, definition.accent, 0.14, 1.06, 0.22));
  } else if (definition.accessory === 'apron') {
    person.add(box(0.43, 0.55, 0.06, definition.accent, 0, 0.92, -0.2));
    person.add(cylinder(0.24, 0.12, '#f1d7aa', 0, 1.9, 0));
  } else if (definition.accessory === 'headphones') {
    const band = mesh('torus', definition.accent);
    band.position.set(0, 1.71, 0);
    band.scale.setScalar(0.31);
    person.add(band);
    for (const side of [-1, 1])
      person.add(box(0.12, 0.2, 0.2, definition.accent, side * 0.29, 1.65, 0));
  } else {
    person.add(cylinder(0.28, 0.15, definition.accent, 0, 1.9, 0));
    for (const side of [-1, 0, 1]) {
      const point = mesh('cone', definition.accent);
      point.scale.set(0.07, 0.2, 0.07);
      point.position.set(side * 0.2, 2.03, 0);
      person.add(point);
    }
  }
  return person;
}

function addPlacard(person: THREE.Group, index: number): void {
  person.add(box(0.055, 1.1, 0.055, '#836847', 0.25, 1.98, 0.12));
  const board = signBoard(SLOGANS[index % SLOGANS.length], 1.05, 0.65);
  board.position.set(0.25, 2.52, 0.12);
  person.add(board);
}

/** Decorative roadside participants never occupy a playable lane. */
export class CrowdManager {
  readonly group = new THREE.Group();
  private animated: THREE.Group[] = [];
  private total = 0;
  private time = 0;
  private cheering = false;

  constructor(
    scene: THREE.Scene,
    private readonly seed = 42,
    private readonly density = 1,
    private quality: Quality = 'medium',
  ) {
    this.group.name = 'roadside-crowd';
    this.populate();
    scene.add(this.group);
  }

  get stats(): CrowdStats {
    let meshes = 0;
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes += 1;
    });
    return {
      total: this.total,
      animated: this.animated.length,
      instanced: this.total - this.animated.length,
      meshes,
      quality: this.quality,
    };
  }

  setQuality(quality: Quality): void {
    if (quality === this.quality) return;
    this.clearParticipants();
    this.quality = quality;
    this.populate();
    this.update(0, false);
  }

  private populate(): void {
    const random = seededRandom(this.seed);
    const preset = PRESETS[this.quality];
    const density = Number.isFinite(this.density) ? Math.max(1, Math.min(3, this.density)) : 1;
    this.total = preset.total + Math.round((density - 1) * 4);
    // New named playable characters must never leak into the anonymous crowd.
    const definitions = CROWD_CHARACTERS;
    const batches = new Map<string, InstanceBatch>();
    for (let i = 0; i < this.total; i += 1) {
      const definition = definitions[Math.floor(random() * definitions.length)];
      const animated = i < preset.animated;
      const person = animated ? createCharacter(definition) : silhouette(definition, i % 3 === 0);
      const side = i % 2 ? 1 : -1;
      const pair = Math.floor(i / 2);
      const depth = pair % preset.depth;
      const row = Math.floor(pair / preset.depth);
      person.name = `crowd-${definition.id}-${i}`;
      person.position.set(
        side * (5.45 + depth * 1.13 + random() * 0.16),
        0,
        2.4 - row * 1.65 - depth * 0.34 - random() * 0.25,
      );
      person.scale.setScalar(0.83 + random() * 0.22);
      person.rotation.y = -side * (0.62 + random() * 0.28);
      if (i % 5 === 0) addPlacard(person, Math.floor(i / 5));
      if (animated) {
        this.animated.push(person);
        this.group.add(person);
        continue;
      }
      person.updateMatrixWorld(true);
      person.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
        const key = `${object.geometry.uuid}:${object.material.uuid}`;
        let batch = batches.get(key);
        if (!batch) {
          batch = { geometry: object.geometry, material: object.material, transforms: [] };
          batches.set(key, batch);
        }
        batch.transforms.push(object.matrixWorld.clone());
      });
      // Silhouettes reference only the global asset cache; there is no owned geometry here.
      person.clear();
    }
    batches.forEach(({ geometry, material, transforms }) => {
      const instances = new THREE.InstancedMesh(geometry, material, transforms.length);
      instances.name = 'crowd-instances';
      instances.userData.sharedAsset = true;
      transforms.forEach((transform, index) => instances.setMatrixAt(index, transform));
      instances.instanceMatrix.needsUpdate = true;
      instances.computeBoundingSphere();
      instances.receiveShadow = true;
      // Distant participants do not add another shadow draw for every material batch.
      instances.castShadow = false;
      this.group.add(instances);
    });
  }

  cheer(): void {
    this.cheering = true;
  }

  reset(): void {
    this.cheering = false;
    this.time = 0;
    this.group.position.z = 0;
    this.group.visible = true;
    this.update(0, true);
  }

  update(dt: number, reduced: boolean): void {
    if (Number.isFinite(dt) && dt > 0) this.time += dt;
    this.animated.forEach((person, i) => {
      person.position.y = reduced
        ? 0
        : this.cheering
          ? Math.abs(Math.sin(this.time * 8 + i)) * 0.18
          : Math.sin(this.time * 2 + i) * 0.025;
      const arm = person.getObjectByName('rightArm');
      if (arm)
        arm.rotation.z = this.cheering
          ? -2.4 + (reduced ? 0 : Math.sin(this.time * 8 + i) * 0.3)
          : -0.1;
      const left = person.getObjectByName('leftArm');
      if (left) left.rotation.z = this.cheering ? 2.5 : 0.1;
    });
  }

  private clearParticipants(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    for (const child of [...this.group.children]) disposeObject(child);
    this.animated = [];
    this.total = 0;
  }

  dispose(): void {
    this.clearParticipants();
    this.group.removeFromParent();
  }
}
