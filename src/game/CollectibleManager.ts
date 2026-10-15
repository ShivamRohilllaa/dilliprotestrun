import * as THREE from 'three';
import { CONFIG } from './GameConfig';
import { ObjectPool } from './ObjectPool';
import { batchStatic, box, cylinder, disposeObject, mesh } from './AssetManager';
import type { Player } from '../player/Player';

interface Token {
  group: THREE.Group;
  id: string;
  distance: number;
  phase: number;
  active: boolean;
}
export interface PoolStats {
  active: number;
  allocated: number;
  available: number;
  capacity: number;
}

function createChaiToken(): THREE.Group {
  const group = new THREE.Group();
  const coin = cylinder(0.34, 0.11, '#edb641');
  coin.rotation.x = Math.PI / 2;
  group.add(coin);
  const rim = mesh('torus', '#ffdc78');
  rim.scale.setScalar(0.3);
  rim.position.z = 0.065;
  group.add(rim);
  group.add(box(0.22, 0.21, 0.025, '#fff1b9', -0.025, -0.01, 0.075));
  group.add(box(0.27, 0.035, 0.03, '#fff1b9', -0.025, -0.125, 0.075));
  const handle = mesh('torus', '#fff1b9');
  handle.scale.set(0.078, 0.075, 0.06);
  handle.position.set(0.1, 0.01, 0.075);
  group.add(handle);
  group.add(box(0.025, 0.075, 0.025, '#fff1b9', -0.067, 0.17, 0.075));
  group.add(box(0.025, 0.06, 0.025, '#fff1b9', 0.017, 0.18, 0.075));
  group.name = 'chai-token';
  return batchStatic(group);
}

/** Pooled coins carry stable run IDs; collection removes them before invoking user code. */
export class CollectibleManager {
  private readonly all = new Set<Token>();
  private readonly active: Token[] = [];
  private readonly pool: ObjectPool<Token>;
  private previousDistance = 0;
  private elapsed = 0;

  constructor(private readonly scene: THREE.Scene) {
    this.pool = new ObjectPool(
      () => {
        const token: Token = {
          group: createChaiToken(),
          id: '',
          distance: 0,
          phase: 0,
          active: false,
        };
        token.group.visible = false;
        this.scene.add(token.group);
        this.all.add(token);
        return token;
      },
      (token) => {
        token.group.visible = false;
        token.active = false;
      },
      48,
    );
  }

  get stats(): PoolStats {
    return {
      active: this.pool.activeCount,
      allocated: this.pool.size,
      available: this.pool.availableCount,
      capacity: this.pool.capacity,
    };
  }

  spawn(id: string, lane: number, distance: number, y = 1): void {
    const token = this.pool.acquire();
    if (!token) return;
    token.id = id;
    token.distance = distance;
    token.phase = distance * 0.14;
    token.active = true;
    token.group.position.set((lane - 1) * CONFIG.laneWidth, y, -distance + this.previousDistance);
    token.group.rotation.y = 0;
    token.group.visible = true;
    this.active.push(token);
  }

  update(dt: number, distance: number, player: Player, onCoin: (id: string) => void): void {
    this.elapsed += dt;
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const token = this.active[index];
      const z = distance - token.distance;
      const previousZ = this.previousDistance - token.distance;
      token.group.position.z = z;
      token.group.rotation.y = this.elapsed * 2.3 + token.phase;
      const collected =
        previousZ <= 0.8 &&
        z >= -0.8 &&
        Math.abs(player.x - token.group.position.x) < 0.75 &&
        Math.abs(player.y + 0.9 - token.group.position.y) < 1.1;
      if (collected || z > 8) {
        const id = token.id;
        this.pool.release(token);
        this.active.splice(index, 1);
        if (collected) onCoin(id);
      }
    }
    this.previousDistance = distance;
  }

  reset(): void {
    this.pool.reset();
    this.active.length = 0;
    this.previousDistance = 0;
    this.elapsed = 0;
  }

  dispose(): void {
    this.reset();
    this.all.forEach((token) => disposeObject(token.group));
    this.all.clear();
  }
}
