import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { CrowdManager } from '../../src/game/CrowdManager';
import { assets } from '../../src/game/AssetManager';

beforeAll(() => {
  vi.stubGlobal('document', {
    createElement: () => ({ width: 0, height: 0, getContext: () => null }),
  });
});
afterAll(() => {
  assets.dispose();
  vi.unstubAllGlobals();
});

function crowdSignature(crowd: CrowdManager): unknown[] {
  return crowd.group.children.map((child) =>
    child instanceof THREE.InstancedMesh
      ? Array.from(child.instanceMatrix.array)
      : [child.name, child.position.toArray(), child.rotation.toArray(), child.scale.toArray()],
  );
}

describe('CrowdManager', () => {
  test.each([
    ['low', 60, 6],
    ['medium', 80, 8],
    ['high', 110, 10],
  ] as const)('scales %s density without scaling animation rigs', (quality, total, animated) => {
    const scene = new THREE.Scene();
    const crowd = new CrowdManager(scene, 42, 1, quality);
    expect(crowd.stats).toMatchObject({ quality, total, animated, instanced: total - animated });
    expect(
      crowd.group.children.filter((child) => child instanceof THREE.InstancedMesh).length,
    ).toBeLessThanOrEqual(30);
    expect(crowd.stats.meshes).toBeLessThan(350);
    expect(crowd.group.parent).toBe(scene);
    crowd.dispose();
    expect(scene.children).toHaveLength(0);
  });

  test('seeds appearances and placement deterministically, including instance transforms', () => {
    const first = new CrowdManager(new THREE.Scene(), 913, 2);
    const second = new CrowdManager(new THREE.Scene(), 913, 2);
    const different = new CrowdManager(new THREE.Scene(), 914, 2);
    expect(first.stats.total).toBe(84);
    expect(crowdSignature(first)).toEqual(crowdSignature(second));
    expect(crowdSignature(first)).not.toEqual(crowdSignature(different));
    for (const crowd of [first, second, different]) crowd.dispose();
  });

  test('keeps every complete silhouette and placard outside all three playable lanes', () => {
    const crowd = new CrowdManager(new THREE.Scene(), 38, 3, 'high');
    expect(crowd.stats.total).toBe(118);
    const matrix = new THREE.Matrix4();
    const bounds = new THREE.Box3();
    for (const child of crowd.group.children) {
      if (child instanceof THREE.InstancedMesh) {
        child.geometry.computeBoundingBox();
        for (let index = 0; index < child.count; index += 1) {
          child.getMatrixAt(index, matrix);
          bounds.copy(child.geometry.boundingBox!).applyMatrix4(matrix);
          expect(bounds.max.x < -4.4 || bounds.min.x > 4.4).toBe(true);
        }
      } else {
        bounds.setFromObject(child);
        expect(bounds.max.x < -4.4 || bounds.min.x > 4.4).toBe(true);
        expect(child.name).toMatch(/^crowd-(runner|chai|metro|meme)-\d+$/);
      }
    }
    crowd.dispose();
  });

  test('cheers, respects reduced motion, and restores neutral poses on reset', () => {
    const crowd = new CrowdManager(new THREE.Scene());
    const person = crowd.group.children.find((child) => child instanceof THREE.Group)!;
    crowd.cheer();
    crowd.update(0.2, false);
    expect(person.position.y).toBeGreaterThan(0);
    expect(person.getObjectByName('rightArm')!.rotation.z).toBeLessThan(-2);
    crowd.update(0.2, true);
    expect(person.position.y).toBe(0);
    expect(person.getObjectByName('rightArm')!.rotation.z).toBe(-2.4);
    crowd.group.position.z = 22;
    crowd.group.visible = false;
    crowd.reset();
    expect(person.position.y).toBe(0);
    expect(person.getObjectByName('rightArm')!.rotation.z).toBe(-0.1);
    expect(crowd.group.position.z).toBe(0);
    expect(crowd.group.visible).toBe(true);
    crowd.dispose();
  });

  test('quality rebuild releases instance buffers and owned geometry, preserving shared assets', () => {
    const crowd = new CrowdManager(new THREE.Scene(), 42, 1, 'high');
    const owned: ReturnType<typeof vi.fn>[] = [];
    const buffers: ReturnType<typeof vi.fn>[] = [];
    const sharedGeometry = vi.fn();
    const sharedMaterial = vi.fn();
    assets.geometry('box').addEventListener('dispose', sharedGeometry);
    assets.material('#304757').addEventListener('dispose', sharedMaterial);
    crowd.group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) {
        const disposed = vi.fn();
        object.addEventListener('dispose', disposed);
        buffers.push(disposed);
      } else if (object instanceof THREE.Mesh && !object.userData.sharedAsset) {
        const disposed = vi.fn();
        object.geometry.addEventListener('dispose', disposed);
        owned.push(disposed);
      }
    });
    expect(owned.length).toBeGreaterThan(0);
    expect(buffers.length).toBeGreaterThan(0);
    crowd.group.position.z = 14;
    crowd.setQuality('low');
    for (const disposed of [...owned, ...buffers]) expect(disposed).toHaveBeenCalledTimes(1);
    expect(crowd.stats).toMatchObject({ total: 60, animated: 6, quality: 'low' });
    expect(crowd.group.position.z).toBe(14);
    expect(sharedGeometry).not.toHaveBeenCalled();
    expect(sharedMaterial).not.toHaveBeenCalled();
    const signature = crowdSignature(crowd);
    crowd.setQuality('low');
    expect(crowdSignature(crowd)).toEqual(signature);
    crowd.dispose();
    crowd.dispose();
    expect(crowd.stats.total).toBe(0);
    expect(crowd.group.children).toHaveLength(0);
    assets.geometry('box').removeEventListener('dispose', sharedGeometry);
    assets.material('#304757').removeEventListener('dispose', sharedMaterial);
  });
});
