import type { ObstacleKind } from './ObstacleSpawner';

/** Check lateral/vertical overlap. The track manager separately gates longitudinal overlap. */
export function hitsObstacle(
  playerX: number,
  y: number,
  sliding: boolean,
  obstacleX: number,
  kind: ObstacleKind,
): boolean {
  // A forgiving combined half-width makes adjacent lanes and late dodges readable.
  if (Math.abs(playerX - obstacleX) >= 0.8) return false;
  switch (kind) {
    case 'rickshaw':
    case 'bus':
      return true;
    case 'banner':
      return !sliding && y <= 3;
    case 'pothole':
      return y <= 0.55;
    case 'barricade':
    case 'divider':
    case 'sign':
      return y <= 1.05;
  }
}
