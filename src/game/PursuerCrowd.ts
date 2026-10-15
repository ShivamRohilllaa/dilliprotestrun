import * as THREE from 'three';
import { assets } from './AssetManager';
import type { Quality } from './SceneFactory';
import { seededRandom } from '../utils/random';

export type PursuerCrowdStyle = 'bajrang' | 'rss' | 'mixed' | null;
type MemberStyle = 'bajrang' | 'rss';

const COUNTS: Record<Quality, number> = { low: 24, medium: 36, high: 50 };
const MIXED_COUNTS: Record<Quality, number> = { low: 36, medium: 54, high: 72 };
const SKIN = ['#ba8058', '#d5a17a', '#a86c48', '#c48c62'];
const CASUAL = ['#f2e9d8', '#ef9b36', '#d97b31', '#c3c8ba', '#e6d4ba', '#698d91'];
const ORANGE = '#f0781d';
const DARK = '#26272b';

interface Member {
  style: MemberStyle;
  x: number;
  z: number;
  scale: number;
  phase: number;
  skin: string;
  shirt: string;
  trousers: string;
}

interface PartBatch {
  mesh: THREE.InstancedMesh;
  cursor: number;
}

/** Fictional unarmed arcade squads, drawn in three shared-geometry batches. */
export class PursuerCrowd {
  readonly group = new THREE.Group();
  private style: PursuerCrowdStyle = null;
  private members: Member[] = [];
  private batches = new Map<'box' | 'sphere' | 'cylinder', PartBatch>();
  private time = 0;
  private reducedMotion = false;
  private readonly body = new THREE.Matrix4();
  private readonly part = new THREE.Matrix4();
  private readonly transform = new THREE.Matrix4();
  private readonly position = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly rotation = new THREE.Euler();
  private readonly quaternion = new THREE.Quaternion();
  private readonly color = new THREE.Color();

  constructor(
    scene: THREE.Scene,
    private quality: Quality = 'medium',
  ) {
    this.group.name = 'pursuer-crowd';
    this.group.visible = false;
    scene.add(this.group);
  }

  get stats(): { total: number; style: PursuerCrowdStyle } {
    return { total: this.members.length, style: this.style };
  }

  configure(style: PursuerCrowdStyle): void {
    if (style === this.style) return;
    this.clear();
    this.style = style;
    if (style) this.populate();
    this.reset();
  }

  setQuality(quality: Quality): void {
    if (quality === this.quality) return;
    this.quality = quality;
    if (!this.style) return;
    this.clear();
    this.populate();
  }

  private populate(): void {
    if (!this.style) return;
    const random = seededRandom(
      this.style === 'rss' ? 74193 : this.style === 'mixed' ? 58139 : 31231,
    );
    const total = (this.style === 'mixed' ? MIXED_COUNTS : COUNTS)[this.quality];
    for (let i = 0; i < total; i += 1) {
      const pair = Math.floor(i / 2);
      const side = i % 2 ? 1 : -1;
      const front = i < 12;
      const depth = Math.floor(pair / 2);
      const file = pair % 2;
      // Split the front wings so both outfits remain readable around the player.
      const style: MemberStyle =
        this.style === 'mixed' ? (side < 0 ? 'rss' : 'bajrang') : this.style;
      this.members.push({
        style,
        // Side wings stay visible around the runner; the larger herd trails behind.
        x: front ? side * (3.2 + file * 0.94 + depth * 0.1) : (((i - 12) % 6) - 2.5) * 1.16,
        z: front ? 2.95 + depth * 0.92 + file * 0.3 : 6.15 + Math.floor((i - 12) / 6) * 1.85,
        scale: 0.87 + random() * 0.16,
        phase: random() * Math.PI * 2,
        skin: SKIN[Math.floor(random() * SKIN.length)],
        shirt: style === 'rss' ? '#f4f0e3' : CASUAL[Math.floor(random() * CASUAL.length)],
        trousers: style === 'rss' ? '#79563c' : i % 2 ? '#334b5f' : '#4c5048',
      });
    }
    const counts = { box: this.style === 'rss' ? 14 : 16, sphere: 4, cylinder: 1 };
    for (const kind of ['box', 'sphere', 'cylinder'] as const) {
      const mesh = new THREE.InstancedMesh(
        assets.geometry(kind),
        assets.material('#ffffff'),
        total * counts[kind],
      );
      mesh.name = `pursuer-${kind}`;
      mesh.userData.sharedAsset = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      // The entire formation moves every frame. A fixed conservative bound avoids
      // scanning all instances for a fresh bounding sphere after each limb swing.
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 10), 15);
      this.batches.set(kind, { mesh, cursor: 0 });
      this.group.add(mesh);
    }
    this.renderMembers(true);
  }

  update(dt: number, pressure: number, playerX: number, reducedMotion: boolean): void {
    if (!this.style) return;
    const elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
    const safePressure = Number.isFinite(pressure) ? THREE.MathUtils.clamp(pressure, 0, 1) : 0.2;
    const safeX = Number.isFinite(playerX) ? THREE.MathUtils.clamp(playerX, -2.5, 2.5) : 0;
    const amount = 1 - Math.exp(-elapsed * 3.2);
    this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, safeX * 0.3, amount);
    this.group.position.z = THREE.MathUtils.lerp(
      this.group.position.z,
      0.8 - safePressure * 2.2,
      amount,
    );
    this.time += elapsed * (safePressure > 0.65 ? 1.17 : 1);
    this.reducedMotion = reducedMotion;
    this.renderMembers();
  }

  reset(): void {
    this.time = 0;
    this.group.position.set(0, 0, 0.36);
    this.group.visible = this.style !== null;
    if (this.style) this.renderMembers();
  }

  private writePart(
    kind: 'box' | 'sphere' | 'cylinder',
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    angle = 0,
    writeColors = false,
  ): void {
    const batch = this.batches.get(kind)!;
    this.position.set(x, y, z);
    this.scale.set(sx, sy, sz);
    this.rotation.set(angle, 0, 0);
    this.quaternion.setFromEuler(this.rotation);
    this.part.compose(this.position, this.quaternion, this.scale);
    this.transform.multiplyMatrices(this.body, this.part);
    batch.mesh.setMatrixAt(batch.cursor, this.transform);
    if (writeColors) batch.mesh.setColorAt(batch.cursor, this.color.set(color));
    batch.cursor += 1;
  }

  private renderMembers(writeColors = false): void {
    if (!this.style) return;
    this.batches.forEach((batch) => {
      batch.cursor = 0;
    });
    for (const member of this.members) {
      const cycle = this.time * 11 + member.phase;
      const bounce = this.reducedMotion ? 0 : Math.abs(Math.sin(cycle)) * 0.075;
      this.position.set(member.x, bounce, member.z);
      this.scale.setScalar(member.scale);
      this.rotation.set(-0.07, 0, 0);
      this.quaternion.setFromEuler(this.rotation);
      this.body.compose(this.position, this.quaternion, this.scale);
      const part = (
        kind: 'box' | 'sphere' | 'cylinder',
        color: string,
        x: number,
        y: number,
        z: number,
        sx: number,
        sy: number,
        sz: number,
        angle = 0,
      ) => this.writePart(kind, color, x, y, z, sx, sy, sz, angle, writeColors);
      part('box', member.shirt, 0, 1.02, 0, 0.57, 0.65, 0.35);
      part('box', '#3b332d', 0, 0.74, 0, 0.58, 0.07, 0.36);
      part('sphere', member.skin, 0, 1.64, 0, 0.255, 0.278, 0.255);
      part('sphere', DARK, 0, 1.79, 0.035, 0.26, 0.126, 0.25);
      part('box', member.skin, 0, 1.61, -0.25, 0.095, 0.08, 0.1);
      for (const side of [-1, 1]) {
        const swing = this.reducedMotion ? 0 : Math.sin(cycle) * side * 0.62;
        const arm = -swing;
        part(
          'box',
          member.shirt,
          side * 0.36,
          1.28 - 0.16 * Math.cos(arm),
          -0.16 * Math.sin(arm),
          0.18,
          0.31,
          0.22,
          arm,
        );
        part(
          'box',
          member.skin,
          side * 0.36,
          1.28 - 0.42 * Math.cos(arm),
          -0.42 * Math.sin(arm),
          0.145,
          0.24,
          0.17,
          arm,
        );
        part(
          'sphere',
          member.skin,
          side * 0.36,
          1.28 - 0.55 * Math.cos(arm),
          -0.55 * Math.sin(arm),
          0.087,
          0.087,
          0.087,
        );
        part(
          'box',
          member.trousers,
          side * 0.15,
          0.7 - 0.27 * Math.cos(swing),
          -0.27 * Math.sin(swing),
          0.21,
          0.56,
          0.25,
          swing,
        );
        part(
          'box',
          DARK,
          side * 0.15,
          0.7 - 0.6 * Math.cos(swing),
          -0.6 * Math.sin(swing) - 0.06,
          0.23,
          0.14,
          0.37,
          swing,
        );
      }
      if (member.style === 'rss') {
        part('cylinder', DARK, 0, 1.91, 0.02, 0.27, 0.15, 0.25);
        part('box', DARK, 0, 1.9, -0.15, 0.42, 0.08, 0.21);
        for (const side of [-1, 1])
          part('box', '#deddd5', side * 0.1, 1.31, -0.2, 0.16, 0.12, 0.06);
      } else {
        part('cylinder', ORANGE, 0, 1.78, 0, 0.27, 0.075, 0.27);
        part('box', ORANGE, 0.12, 1.67, 0.29, 0.085, 0.3, 0.055, -0.23);
        part('box', ORANGE, 0.21, 1.69, 0.27, 0.075, 0.28, 0.055, 0.25);
        part('box', ORANGE, 0, 1.29, 0, 0.61, 0.12, 0.39);
        part('box', ORANGE, -0.17, 1.08, -0.22, 0.14, 0.43, 0.055);
        part('box', '#edab39', 0.17, 1.12, -0.22, 0.13, 0.35, 0.055);
      }
    }
    this.batches.forEach(({ mesh, cursor }) => {
      // Mixed squads reserve the larger outfit's capacity but draw only written parts.
      mesh.count = cursor;
      mesh.instanceMatrix.needsUpdate = true;
      if (writeColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }

  private clear(): void {
    this.batches.forEach(({ mesh }) => {
      mesh.dispose();
      mesh.removeFromParent();
    });
    this.batches.clear();
    this.members = [];
  }

  dispose(): void {
    this.clear();
    this.style = null;
    this.group.visible = false;
    this.group.removeFromParent();
  }
}
