import * as THREE from 'three';
import { assets } from './AssetManager';
export class Effects {
  private mesh: THREE.InstancedMesh;
  private age = 2;
  private origin = new THREE.Vector3();
  private dummy = new THREE.Object3D();
  private reduced = false;
  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.InstancedMesh(
      assets.geometry('box'),
      assets.material('#ffca64', true),
      18,
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }
  burst(x: number, y: number, reduced: boolean): void {
    this.age = 0;
    this.origin.set(x, y, 0);
    this.reduced = reduced;
    this.mesh.visible = !reduced;
  }
  update(dt: number): void {
    this.age += dt;
    if (this.age > 0.55 || this.reduced) {
      this.mesh.visible = false;
      return;
    }
    for (let i = 0; i < 18; i++) {
      const angle = i * 2.39996;
      this.dummy.position.set(
        this.origin.x + Math.cos(angle) * this.age * 3,
        this.origin.y + Math.sin(i * 2) * this.age * 3 + this.age * 2 - this.age * this.age * 7,
        Math.sin(angle) * this.age * 3,
      );
      this.dummy.rotation.set(this.age * 8, i, this.age * 7);
      this.dummy.scale.setScalar(0.12 * (1 - this.age / 0.55));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  reset(): void {
    this.age = 2;
    this.mesh.visible = false;
  }
  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.dispose();
  }
}
