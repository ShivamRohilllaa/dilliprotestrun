import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHARACTERS, REWARD_CHARACTERS } from '../../src/characters/CharacterDefinitions';
import { PURSUERS } from '../../src/characters/PursuerDefinitions';
import { createCharacter } from '../../src/characters/CharacterFactory';
import { characterPortrait } from '../../src/characters/CharacterPortrait';
import { disposeObject } from '../../src/game/AssetManager';

const cast = [...CHARACTERS, ...REWARD_CHARACTERS, ...PURSUERS];

describe('procedural cast', () => {
  it.each(cast.map((definition) => [definition.id, definition] as const))(
    '%s keeps animation pivots, bounded geometry and a small material batch count',
    (_id, definition) => {
      const model = createCharacter(definition);
      for (const name of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'body']) {
        const part = model.getObjectByName(name);
        expect(part).toBeInstanceOf(THREE.Group);
        expect(part!.children.length).toBeGreaterThan(0);
      }
      expect(model.children).toHaveLength(5);
      let draws = 0;
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        draws += 1;
        expect(object.geometry.attributes.position.count).toBeGreaterThan(0);
        expect(Array.from(object.geometry.attributes.position.array).every(Number.isFinite)).toBe(
          true,
        );
      });
      expect(draws).toBeLessThanOrEqual(30);
      const bounds = new THREE.Box3().setFromObject(model);
      expect(bounds.min.y).toBeGreaterThan(-0.02);
      expect(bounds.max.y).toBeLessThan(2.16);
      expect(bounds.getSize(new THREE.Vector3()).x).toBeLessThan(1.2);
      disposeObject(model);
    },
  );

  it('none accessory does not accidentally add the original crown', () => {
    const plain = createCharacter({ ...CHARACTERS[0], appearance: undefined, accessory: 'none' });
    const crown = createCharacter({ ...CHARACTERS[0], appearance: undefined, accessory: 'crown' });
    expect(new THREE.Box3().setFromObject(crown).max.y).toBeGreaterThan(
      new THREE.Box3().setFromObject(plain).max.y + 0.1,
    );
    disposeObject(plain);
    disposeObject(crown);
  });

  it('broad builds change the visible silhouette while keeping feet and animation height', () => {
    const definition = PURSUERS.find((item) => item.id === 'amit')!;
    const broad = createCharacter(definition);
    const slim = createCharacter({
      ...definition,
      appearance: { ...definition.appearance!, build: 'slim' },
    });
    const broadBounds = new THREE.Box3().setFromObject(broad);
    const slimBounds = new THREE.Box3().setFromObject(slim);
    expect(broadBounds.getSize(new THREE.Vector3()).x).toBeGreaterThan(
      slimBounds.getSize(new THREE.Vector3()).x + 0.1,
    );
    expect(broadBounds.min.y).toBeCloseTo(slimBounds.min.y);
    expect(broad.getObjectByName('leftLeg')!.position.y).toBe(
      slim.getObjectByName('leftLeg')!.position.y,
    );
    disposeObject(broad);
    disposeObject(slim);
  });

  it('adds black-cap geometry to the head without merging away the limb pivots', () => {
    const definition = PURSUERS.find((item) => item.id === 'baba')!;
    const plain = createCharacter(definition);
    const cap = createCharacter({
      ...definition,
      appearance: { ...definition.appearance!, headwear: 'black-cap' },
    });
    expect(new THREE.Box3().setFromObject(cap).max.y).toBeGreaterThan(
      new THREE.Box3().setFromObject(plain).max.y + 0.05,
    );
    expect(cap.getObjectByName('leftArm')!.parent).toBe(cap);
    disposeObject(plain);
    disposeObject(cap);
  });
});

describe('original SVG cast portraits', () => {
  it.each(cast.map((definition) => [definition.id, definition] as const))(
    '%s renders self-contained artwork',
    (_id, definition) => {
      const portrait = characterPortrait(definition);
      expect(portrait).toContain('viewBox="0 0 240 248"');
      expect(portrait).toContain(`<title>${definition.name}</title>`);
      expect(portrait).not.toMatch(/<(?:script|image|foreignObject)\b|\bhref=|\bon\w+=/i);
      expect(portrait).not.toContain('undefined');
      expect(portrait).not.toContain('NaN');
    },
  );

  it('escapes text and rejects non-color paint values', () => {
    const portrait = characterPortrait({
      ...CHARACTERS[0],
      name: '<script>"bad"</script>',
      color: 'url(https://example.com)',
    });
    expect(portrait).toContain('&lt;script&gt;&quot;bad&quot;&lt;/script&gt;');
    expect(portrait).not.toContain('<script>');
    expect(portrait).not.toContain('example.com');
  });
});
