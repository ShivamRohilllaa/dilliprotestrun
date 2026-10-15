import { afterAll, describe, expect, test, vi } from 'vitest';
import * as THREE from 'three';
import { assets } from '../../src/game/AssetManager';
import { PursuerCrowd } from '../../src/game/PursuerCrowd';

afterAll(() => assets.dispose());

function batches(crowd: PursuerCrowd): THREE.InstancedMesh[] {
  return crowd.group.children as THREE.InstancedMesh[];
}

function matrices(crowd: PursuerCrowd): number[][] {
  return batches(crowd).map((batch) => Array.from(batch.instanceMatrix.array));
}

describe('PursuerCrowd', () => {
  test('starts disabled and can remove a configured squad without leaving scene objects', () => {
    const scene = new THREE.Scene();
    const crowd = new PursuerCrowd(scene);
    expect(crowd.stats).toEqual({ total: 0, style: null });
    expect(crowd.group.visible).toBe(false);
    crowd.update(1, 1, 2.5, false);
    expect(crowd.group.children).toHaveLength(0);
    crowd.configure('rss');
    expect(crowd.group.visible).toBe(true);
    expect(crowd.stats).toEqual({ total: 36, style: 'rss' });
    crowd.configure(null);
    expect(crowd.group.visible).toBe(false);
    expect(crowd.group.children).toHaveLength(0);
    expect(crowd.stats).toEqual({ total: 0, style: null });
    crowd.dispose();
    expect(scene.children).toHaveLength(0);
  });

  test.each([
    ['low', 24],
    ['medium', 36],
    ['high', 50],
  ] as const)('bounds %s quality to three draw batches for either squad', (quality, count) => {
    const crowd = new PursuerCrowd(new THREE.Scene(), quality);
    const matrix = new THREE.Matrix4();
    for (const style of ['bajrang', 'rss'] as const) {
      crowd.configure(style);
      expect(crowd.stats).toEqual({ total: count, style });
      expect(crowd.group.children).toHaveLength(3);
      expect(batches(crowd).reduce((total, batch) => total + batch.count, 0)).toBe(
        count * (style === 'bajrang' ? 21 : 19),
      );
      for (const batch of batches(crowd)) {
        expect(batch.instanceColor?.count).toBe(batch.count);
        expect(batch.castShadow).toBe(false);
        for (let i = 0; i < batch.count; i += 1) {
          batch.getMatrixAt(i, matrix);
          expect(matrix.determinant()).toBeGreaterThan(0);
          expect(matrix.elements.every(Number.isFinite)).toBe(true);
        }
      }
    }
    crowd.dispose();
  });

  test.each([
    ['low', 36],
    ['medium', 54],
    ['high', 72],
  ] as const)(
    'mixed %s quality combines equal visible squads in three bounded batches',
    (quality, count) => {
      const crowd = new PursuerCrowd(new THREE.Scene(), quality);
      crowd.configure('mixed');
      expect(crowd.stats).toEqual({ total: count, style: 'mixed' });
      expect(crowd.group.children).toHaveLength(3);
      const boxes = batches(crowd).find((batch) => batch.name === 'pursuer-box')!;
      expect(boxes.instanceMatrix.count).toBe(count * 16);
      expect(boxes.count).toBe(count * 15);
      expect(batches(crowd).reduce((total, batch) => total + batch.count, 0)).toBe(count * 20);

      const headwear = batches(crowd).find((batch) => batch.name === 'pursuer-cylinder')!;
      const color = new THREE.Color();
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      let caps = 0;
      let bands = 0;
      for (let i = 0; i < headwear.count; i += 1) {
        headwear.getColorAt(i, color);
        const isCap = color.getHexString() === '26272b';
        if (isCap) caps += 1;
        else {
          expect(color.getHexString()).toBe('f0781d');
          bands += 1;
        }
        if (i < 12) {
          headwear.getMatrixAt(i, matrix);
          position.setFromMatrixPosition(matrix);
          expect(position.x * (isCap ? -1 : 1)).toBeGreaterThan(3);
        }
      }
      expect(caps).toBe(count / 2);
      expect(bands).toBe(count / 2);

      crowd.update(0.13, 0.94, 2.5, false);
      const corner = new THREE.Vector3();
      for (const batch of batches(crowd)) {
        batch.geometry.computeBoundingBox();
        const bounds = batch.geometry.boundingBox!;
        for (let i = 0; i < batch.count; i += 1) {
          batch.getMatrixAt(i, matrix);
          expect(matrix.elements.every(Number.isFinite)).toBe(true);
          expect(matrix.determinant()).toBeGreaterThan(0);
          for (const x of [bounds.min.x, bounds.max.x]) {
            for (const y of [bounds.min.y, bounds.max.y]) {
              for (const z of [bounds.min.z, bounds.max.z]) {
                corner.set(x, y, z).applyMatrix4(matrix);
                expect(batch.boundingSphere!.containsPoint(corner)).toBe(true);
              }
            }
          }
        }
      }
      crowd.dispose();
    },
  );

  test('mixed animation reuses GPU batches and never creates per-frame materials', () => {
    const crowd = new PursuerCrowd(new THREE.Scene(), 'high');
    crowd.configure('mixed');
    const original = batches(crowd).map((batch) => ({
      mesh: batch,
      matrix: batch.instanceMatrix,
      colors: batch.instanceColor,
      material: batch.material,
    }));
    const material = vi.spyOn(assets, 'material');
    for (let i = 0; i < 30; i += 1) crowd.update(1 / 60, 0.9, -2.5, false);
    expect(material).not.toHaveBeenCalled();
    material.mockRestore();
    for (const [index, batch] of batches(crowd).entries()) {
      expect(batch).toBe(original[index].mesh);
      expect(batch.instanceMatrix).toBe(original[index].matrix);
      expect(batch.instanceColor).toBe(original[index].colors);
      expect(batch.material).toBe(original[index].material);
    }
    crowd.update(0.1, 0.9, -2.5, true);
    const still = matrices(crowd);
    crowd.update(0.2, 0.9, -2.5, true);
    expect(matrices(crowd)).toEqual(still);
    crowd.dispose();
  });

  test('mixed quality and style changes dispose old buffers and preserve original squad counts', () => {
    const scene = new THREE.Scene();
    const crowd = new PursuerCrowd(scene, 'low');
    crowd.configure('mixed');
    const disposed = batches(crowd).map((batch) => {
      const listener = vi.fn();
      batch.addEventListener('dispose', listener);
      return listener;
    });
    crowd.setQuality('high');
    expect(crowd.stats).toEqual({ total: 72, style: 'mixed' });
    disposed.forEach((listener) => expect(listener).toHaveBeenCalledTimes(1));
    crowd.setQuality('medium');
    expect(crowd.stats.total).toBe(54);
    const same = [...crowd.group.children];
    crowd.configure('mixed');
    crowd.setQuality('medium');
    expect(crowd.group.children).toEqual(same);
    crowd.configure('rss');
    expect(crowd.stats).toEqual({ total: 36, style: 'rss' });
    expect(batches(crowd).reduce((total, batch) => total + batch.count, 0)).toBe(36 * 19);
    crowd.configure('mixed');
    crowd.configure('bajrang');
    expect(crowd.stats).toEqual({ total: 36, style: 'bajrang' });
    expect(batches(crowd).reduce((total, batch) => total + batch.count, 0)).toBe(36 * 21);
    crowd.configure('mixed');
    crowd.dispose();
    expect(crowd.group.children).toHaveLength(0);
    expect(scene.children).toHaveLength(0);
    expect(crowd.stats).toEqual({ total: 0, style: null });
  });

  test('animates running limbs without reallocating batches and stops bobbing for reduced motion', () => {
    const crowd = new PursuerCrowd(new THREE.Scene());
    crowd.configure('bajrang');
    const meshes = [...crowd.group.children];
    const original = matrices(crowd);
    crowd.update(0.12, 0.2, 0, false);
    expect(matrices(crowd)).not.toEqual(original);
    expect(crowd.group.children).toEqual(meshes);
    crowd.update(0.1, 0.2, 0, true);
    const reduced = matrices(crowd);
    crowd.update(0.4, 0.2, 0, true);
    expect(matrices(crowd)).toEqual(reduced);
    crowd.dispose();
  });

  test('pressure closes the gap while the formation follows gently and stays behind the runner', () => {
    const crowd = new PursuerCrowd(new THREE.Scene(), 'high');
    crowd.configure('rss');
    const startingZ = crowd.group.position.z;
    for (let i = 0; i < 240; i += 1) crowd.update(1 / 60, 1, 2.5, true);
    expect(crowd.group.position.z).toBeLessThan(startingZ);
    expect(crowd.group.position.z).toBeGreaterThanOrEqual(-1.4 - 1e-10);
    expect(crowd.group.position.x).toBeGreaterThan(0.7);
    expect(crowd.group.position.x).toBeLessThanOrEqual(0.75);
    const boxes = batches(crowd).find((batch) => batch.name === 'pursuer-box')!;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    for (let i = 0; i < 50; i += 1) {
      boxes.getMatrixAt(i * 14, matrix);
      position.setFromMatrixPosition(matrix).add(crowd.group.position);
      expect(position.z).toBeGreaterThan(1);
      if (i < 12) expect(Math.abs(position.x - 2.5)).toBeGreaterThan(1.1);
    }
    crowd.reset();
    expect(crowd.group.position.toArray()).toEqual([0, 0, 0.36]);
    expect(crowd.group.visible).toBe(true);
    crowd.dispose();
  });

  test('frame rate does not change gap closing or lane following', () => {
    const slow = new PursuerCrowd(new THREE.Scene());
    const fast = new PursuerCrowd(new THREE.Scene());
    slow.configure('bajrang');
    fast.configure('bajrang');
    for (let i = 0; i < 30; i += 1) slow.update(1 / 30, 0.75, -2.5, false);
    for (let i = 0; i < 120; i += 1) fast.update(1 / 120, 0.75, -2.5, false);
    expect(slow.group.position.x).toBeCloseTo(fast.group.position.x, 10);
    expect(slow.group.position.z).toBeCloseTo(fast.group.position.z, 10);
    slow.dispose();
    fast.dispose();
  });

  test('quality and style changes dispose instance buffers while retaining shared GPU assets', () => {
    const crowd = new PursuerCrowd(new THREE.Scene(), 'low');
    crowd.configure('rss');
    const disposed = batches(crowd).map((batch) => {
      const listener = vi.fn();
      batch.addEventListener('dispose', listener);
      return listener;
    });
    const geometry = vi.fn();
    const material = vi.fn();
    assets.geometry('box').addEventListener('dispose', geometry);
    assets.material('#ffffff').addEventListener('dispose', material);
    crowd.setQuality('high');
    expect(crowd.stats.total).toBe(50);
    for (const listener of disposed) expect(listener).toHaveBeenCalledTimes(1);
    const same = [...crowd.group.children];
    crowd.setQuality('high');
    crowd.configure('rss');
    expect(crowd.group.children).toEqual(same);
    crowd.configure('bajrang');
    expect(crowd.stats).toEqual({ total: 50, style: 'bajrang' });
    expect(crowd.group.children).toHaveLength(3);
    crowd.dispose();
    crowd.dispose();
    expect(geometry).not.toHaveBeenCalled();
    expect(material).not.toHaveBeenCalled();
    expect(crowd.stats).toEqual({ total: 0, style: null });
    assets.geometry('box').removeEventListener('dispose', geometry);
    assets.material('#ffffff').removeEventListener('dispose', material);
  });
});
