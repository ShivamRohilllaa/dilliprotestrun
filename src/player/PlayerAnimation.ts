import type { Group, Object3D } from 'three';

/** Small procedural poses keep the original low-poly model readable without assets. */
export class PlayerAnimation {
  private phase = 0;
  private readonly limbs: (Object3D | undefined)[];
  private readonly baseScale;
  private readonly baseRotation;

  constructor(private readonly group: Group) {
    this.limbs = ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].map((name) =>
      group.getObjectByName(name),
    );
    this.baseScale = group.scale.clone();
    this.baseRotation = group.rotation.clone();
  }

  update(
    dt: number,
    running: boolean,
    y: number,
    sliding: boolean,
    reducedMotion: boolean,
    crashed = false,
    chanting = false,
  ): void {
    if (Number.isFinite(dt) && dt > 0) this.phase += dt * 12;
    this.group.scale.copy(this.baseScale);
    this.group.rotation.copy(this.baseRotation);
    const [leftArm, rightArm, leftLeg, rightLeg] = this.limbs;
    const pose = (limb: Object3D | undefined, angle: number): void => {
      if (limb) limb.rotation.x = angle;
    };
    if (crashed) {
      this.group.rotation.z += 0.48;
      this.group.rotation.x -= 0.3;
      pose(leftArm, -1.5);
      pose(rightArm, -1.1);
      pose(leftLeg, 0.35);
      pose(rightLeg, -0.2);
    } else if (sliding) {
      this.group.scale.y *= 0.44;
      this.group.scale.z *= 1.28;
      this.group.rotation.x -= 0.22;
      pose(leftArm, -0.8);
      pose(rightArm, -0.8);
      pose(leftLeg, -0.5);
      pose(rightLeg, -0.5);
    } else if (y > 0.02) {
      pose(leftArm, -1.25);
      pose(rightArm, -1.25);
      pose(leftLeg, -0.5);
      pose(rightLeg, 0.5);
    } else {
      const swing = running ? Math.sin(this.phase) * (reducedMotion ? 0.32 : 0.75) : 0;
      pose(leftArm, swing);
      pose(rightArm, -swing);
      pose(leftLeg, -swing);
      pose(rightLeg, swing);
      if (chanting) pose(rightArm, -2.65 + (reducedMotion ? 0 : Math.sin(this.phase * 0.5) * 0.12));
      if (running && !reducedMotion) this.group.rotation.z += Math.sin(this.phase) * 0.025;
    }
  }

  reset(): void {
    this.phase = 0;
    this.group.scale.copy(this.baseScale);
    this.group.rotation.copy(this.baseRotation);
    for (const limb of this.limbs) if (limb) limb.rotation.x = 0;
  }
}
