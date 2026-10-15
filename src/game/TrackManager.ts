import * as THREE from 'three';
import { CONFIG } from './GameConfig';
import { CollectibleManager, type PoolStats } from './CollectibleManager';
import { hitsObstacle } from './CollisionSystem';
import { DifficultyManager } from './DifficultyManager';
import { disposeObject } from './AssetManager';
import { ObjectPool } from './ObjectPool';
import { createObstacle, OBSTACLE_HALF_DEPTH } from './ObstacleFactory';
import { ObstacleSpawner, type ObstacleKind } from './ObstacleSpawner';
import type { Player } from '../player/Player';

export interface TrackCallbacks {
  coin: (id: string) => void;
  hit: (kind: ObstacleKind) => void;
}
interface Obstacle {
  group: THREE.Group;
  kind: ObstacleKind;
  distance: number;
  hit: boolean;
}
interface Scenery {
  group: THREE.Object3D;
  initialZ: number;
}

/** Distance-driven rows and fixed-budget pools keep long runs bounded and reproducible. */
export class TrackManager {
  readonly collectibles: CollectibleManager;
  private readonly obstaclePools = new Map<ObstacleKind, ObjectPool<Obstacle>>();
  private readonly allObstacles = new Set<Obstacle>();
  private readonly active: Obstacle[] = [];
  private readonly scenery: Scenery[] = [];
  private readonly difficulty = new DifficultyManager();
  private spawner = new ObstacleSpawner(1);
  private nextRowDistance = 55;
  private previousDistance = 0;
  private locationDifficulty = 1;
  private runId = 0;
  private rowCount = 0;

  constructor(
    private readonly scene: THREE.Scene,
    environment?: THREE.Group,
  ) {
    this.collectibles = new CollectibleManager(scene);
    if (environment) this.setEnvironment(environment);
  }

  get stats(): { obstacles: PoolStats; coins: PoolStats; rows: number; scenerySegments: number } {
    let allocated = 0;
    let available = 0;
    this.obstaclePools.forEach((pool) => {
      allocated += pool.size;
      available += pool.availableCount;
    });
    return {
      obstacles: { active: this.active.length, allocated, available, capacity: 84 },
      coins: this.collectibles.stats,
      rows: this.rowCount,
      scenerySegments: this.scenery.length,
    };
  }

  setEnvironment(environment: THREE.Group): void {
    this.scenery.length = 0;
    environment.children.forEach((group) => {
      if (group.userData.recycle === true)
        this.scenery.push({ group, initialZ: Number(group.userData.initialZ ?? group.position.z) });
    });
  }

  reset(seed: number, locationDifficulty: number): void {
    this.obstaclePools.forEach((pool) => pool.reset());
    this.active.length = 0;
    this.collectibles.reset();
    this.spawner = new ObstacleSpawner(seed);
    this.locationDifficulty = locationDifficulty;
    this.nextRowDistance = 55;
    this.previousDistance = 0;
    this.rowCount = 0;
    this.runId += 1;
    this.scenery.forEach(({ group, initialZ }) => {
      group.position.z = initialZ;
    });
  }

  update(
    dt: number,
    speed: number,
    distance: number,
    player: Player,
    callbacks: TrackCallbacks,
  ): void {
    if (
      !Number.isFinite(dt) ||
      dt < 0 ||
      !Number.isFinite(speed) ||
      speed < 0 ||
      !Number.isFinite(distance) ||
      distance < this.previousDistance
    )
      return;
    while (this.nextRowDistance <= distance + 110) {
      this.spawnRow(this.nextRowDistance);
      this.difficulty.update(this.nextRowDistance, this.locationDifficulty);
      this.nextRowDistance += this.difficulty.spacing;
    }
    for (let index = this.active.length - 1; index >= 0; index -= 1) {
      const obstacle = this.active[index];
      const z = distance - obstacle.distance;
      const previousZ = this.previousDistance - obstacle.distance;
      obstacle.group.position.z = z;
      const depth = OBSTACLE_HALF_DEPTH[obstacle.kind];
      if (
        !obstacle.hit &&
        previousZ <= depth &&
        z >= -depth &&
        hitsObstacle(
          player.x,
          player.y,
          player.slide.active,
          obstacle.group.position.x,
          obstacle.kind,
        )
      ) {
        obstacle.hit = true;
        callbacks.hit(obstacle.kind);
      }
      if (z > 10) {
        this.obstaclePools.get(obstacle.kind)?.release(obstacle);
        this.active.splice(index, 1);
      }
    }
    this.collectibles.update(dt, distance, player, callbacks.coin);
    for (const { group, initialZ } of this.scenery)
      group.position.z = ((((initialZ + distance + 105) % 140) + 140) % 140) - 105;
    this.previousDistance = distance;
  }

  private spawnRow(distance: number): void {
    const pattern = this.spawner.next(distance, this.locationDifficulty);
    pattern.obstacles.forEach((placement) => {
      const obstacle = this.poolFor(placement.kind).acquire();
      if (!obstacle) return;
      obstacle.distance = distance;
      obstacle.hit = false;
      obstacle.group.position.set(
        (placement.lane - 1) * CONFIG.laneWidth,
        0,
        this.previousDistance - distance,
      );
      obstacle.group.visible = true;
      this.active.push(obstacle);
    });
    pattern.coins.forEach((coin, index) =>
      this.collectibles.spawn(
        `${this.runId}:${pattern.id}:${index}`,
        coin.lane,
        distance + coin.offset,
        coin.y,
      ),
    );
    this.rowCount += 1;
  }

  private poolFor(kind: ObstacleKind): ObjectPool<Obstacle> {
    let pool = this.obstaclePools.get(kind);
    if (!pool) {
      pool = new ObjectPool(
        () => {
          const obstacle: Obstacle = { group: createObstacle(kind), kind, distance: 0, hit: false };
          obstacle.group.visible = false;
          this.scene.add(obstacle.group);
          this.allObstacles.add(obstacle);
          return obstacle;
        },
        (obstacle) => {
          obstacle.group.visible = false;
          obstacle.hit = false;
        },
        12,
      );
      this.obstaclePools.set(kind, pool);
    }
    return pool;
  }

  dispose(): void {
    this.reset(1, 1);
    this.collectibles.dispose();
    this.allObstacles.forEach((obstacle) => disposeObject(obstacle.group));
    this.allObstacles.clear();
    this.obstaclePools.clear();
    this.scenery.length = 0;
  }
}
