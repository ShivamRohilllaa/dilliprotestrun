import * as THREE from 'three';

export type CameraMode = 'menu' | 'intro' | 'playing';

export class CameraController {
  mode: CameraMode = 'menu';
  crowdChase = false;
  private elapsed = 0;
  private initialized = false;
  private readonly target = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();
  private readonly desiredTarget = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  update(dt: number, playerX = 0, reducedMotion = false): void {
    this.elapsed += dt;
    const mobile = this.camera.aspect < 0.85;
    let fov: number;
    if (this.mode === 'menu') {
      const drift = reducedMotion ? 0 : Math.sin(this.elapsed * 0.11) * 0.55;
      this.desiredPosition.set(mobile ? 17 : 18 + drift, mobile ? 20 : 15, mobile ? 26 : 24);
      this.desiredTarget.set(
        mobile ? (this.camera.aspect < 0.6 ? -13 : -9) : -10,
        mobile ? 0 : 1,
        mobile ? -7 : -5,
      );
      fov = mobile ? 49 : 43;
    } else if (this.mode === 'intro') {
      this.desiredPosition.set(mobile ? 6.4 : 8, mobile ? 5.8 : 5.2, mobile ? 12 : 11);
      this.desiredTarget.set(0, 1.4, -3);
      fov = mobile ? 58 : 48;
    } else {
      this.desiredPosition.set(
        playerX * 0.12,
        this.crowdChase ? (mobile ? 8.4 : 7.2) : mobile ? 7 : 5.2,
        this.crowdChase ? 14 : mobile ? 12 : 9.5,
      );
      this.desiredTarget.set(playerX * 0.08, 1, this.crowdChase ? -7 : -11);
      fov = this.crowdChase ? (mobile ? 72 : 60) : mobile ? 66 : 53;
    }
    const amount = !this.initialized || reducedMotion ? 1 : 1 - Math.exp(-dt * 4.5);
    this.camera.position.lerp(this.desiredPosition, amount);
    this.target.lerp(this.desiredTarget, amount);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, amount);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.initialized = true;
  }
}
