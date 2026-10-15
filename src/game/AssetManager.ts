import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Original procedural artwork and shared GPU assets, with no network dependencies. */
export class AssetManager {
  private geometries = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private textures: THREE.Texture[] = [];

  geometry(kind: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus'): THREE.BufferGeometry {
    let result = this.geometries.get(kind);
    if (!result) {
      switch (kind) {
        case 'box':
          result = new THREE.BoxGeometry(1, 1, 1);
          break;
        case 'cylinder':
          result = new THREE.CylinderGeometry(1, 1, 1, 10);
          break;
        case 'cone':
          result = new THREE.ConeGeometry(1, 1, 8);
          break;
        case 'torus':
          result = new THREE.TorusGeometry(1, 0.13, 5, 12);
          break;
        default:
          result = new THREE.SphereGeometry(1, 10, 7);
      }
      this.geometries.set(kind, result);
    }
    return result;
  }

  material(color: THREE.ColorRepresentation, emissive = false): THREE.MeshStandardMaterial {
    const key = `${color}-${emissive}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        flatShading: true,
        ...(emissive ? { emissive: color, emissiveIntensity: 0.32 } : {}),
      });
      this.materials.set(key, material);
    }
    return material;
  }

  sign(text: string, background = '#f5db9f', ink = '#392b25'): THREE.MeshStandardMaterial {
    const key = `sign:${text}:${background}:${ink}`;
    let material = this.materials.get(key);
    if (!material) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = background;
        context.fillRect(0, 0, 512, 256);
        context.strokeStyle = ink;
        context.lineWidth = 8;
        context.strokeRect(14, 14, 484, 228);
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const lines = text.split('\n');
        context.fillStyle = ink;
        context.font = `900 ${lines.length > 1 ? 56 : 68}px "Arial", "Noto Sans Devanagari", sans-serif`;
        lines.forEach((line, index) =>
          context.fillText(line, 256, 128 + (index - (lines.length - 1) / 2) * 67, 448),
        );
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(texture);
      material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
      this.materials.set(key, material);
    }
    return material;
  }

  dispose(): void {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.geometries.clear();
    this.materials.clear();
    this.textures = [];
  }
}

export const assets = new AssetManager();

export function mesh(
  kind: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus',
  color: THREE.ColorRepresentation,
): THREE.Mesh {
  const result = new THREE.Mesh(assets.geometry(kind), assets.material(color));
  result.castShadow = true;
  result.receiveShadow = true;
  result.userData.sharedAsset = true;
  return result;
}

export function box(
  width: number,
  height: number,
  depth: number,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const result = mesh('box', color);
  result.scale.set(width, height, depth);
  result.position.set(x, y, z);
  return result;
}

export function cylinder(
  radius: number,
  height: number,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const result = mesh('cylinder', color);
  result.scale.set(radius, height, radius);
  result.position.set(x, y, z);
  return result;
}

export function sphere(
  radius: number,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const result = mesh('sphere', color);
  result.scale.setScalar(radius);
  result.position.set(x, y, z);
  return result;
}

export function signBoard(
  text: string,
  width: number,
  height: number,
  background = '#f5db9f',
  ink = '#392b25',
): THREE.Mesh {
  const result = new THREE.Mesh(assets.geometry('box'), assets.sign(text, background, ink));
  result.scale.set(width, height, 0.12);
  result.userData.sharedAsset = true;
  result.castShadow = true;
  return result;
}

/** Batch static prop geometry by material, preserving the movable parent group. */
export function batchStatic(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
    const geometry = object.geometry
      .clone()
      .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
    const list = batches.get(object.material) ?? [];
    list.push(geometry);
    batches.set(object.material, list);
    remove.push(object);
  });
  remove.forEach((object) => {
    object.removeFromParent();
    if (!object.userData.sharedAsset) object.geometry.dispose();
  });
  batches.forEach((geometries, material) => {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((source) => source.dispose());
    if (geometry) {
      const object = new THREE.Mesh(geometry, material);
      object.castShadow = true;
      object.receiveShadow = true;
      group.add(object);
    }
  });
  return group;
}

/** Shared cache is released separately; only unique geometry belongs to a group. */
export function disposeObject(group: THREE.Object3D): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && !object.userData.sharedAsset) object.geometry.dispose();
  });
  group.removeFromParent();
  group.clear();
}
