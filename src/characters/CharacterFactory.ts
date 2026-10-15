import * as THREE from 'three';
import type { CharacterAppearance, CharacterDefinition } from './CharacterDefinitions';
import { batchStatic, box, cylinder, mesh, sphere } from '../game/AssetManager';

/** A playful original silhouette. Limb pivots are named for procedural animation. */
export function createCharacter(definition: CharacterDefinition, police = false): THREE.Group {
  if (definition.appearance && !police) return createCaricature(definition, definition.appearance);
  const character = new THREE.Group();
  const outfit = police ? '#ba9c69' : definition.color;
  const accent = police ? '#6c5339' : definition.accent;
  const skin = '#bc754b';
  const dark = '#252d36';
  character.add(box(0.57, 0.64, 0.35, outfit, 0, 1.03, 0));
  character.add(box(0.49, 0.17, 0.32, dark, 0, 0.68, 0));
  character.add(cylinder(0.1, 0.16, skin, 0, 1.4, 0));
  const head = sphere(0.265, skin, 0, 1.64, -0.015);
  head.scale.y *= 1.08;
  character.add(head);
  const hair = sphere(0.267, dark, 0, 1.77, 0.015);
  hair.scale.y *= 0.54;
  character.add(hair);
  character.add(sphere(0.065, skin, -0.26, 1.64, -0.005), sphere(0.065, skin, 0.26, 1.64, -0.005));
  for (const side of [-1, 1]) {
    character.add(box(0.085, 0.067, 0.026, '#fff1dc', side * 0.097, 1.67, -0.25));
    character.add(box(0.033, 0.05, 0.033, dark, side * 0.103, 1.67, -0.268));
    character.add(box(0.1, 0.026, 0.04, dark, side * 0.097, 1.73, -0.245));
  }
  character.add(box(0.11, 0.07, 0.105, skin, 0, 1.59, -0.27));
  character.add(box(0.12, 0.025, 0.026, '#69402d', 0, 1.51, -0.248));

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'leftArm' : 'rightArm';
    arm.position.set(side * 0.35, 1.27, 0);
    arm.add(box(0.19, 0.3, 0.22, outfit, 0, -0.12, 0));
    arm.add(box(0.145, 0.23, 0.17, skin, 0, -0.36, 0));
    arm.add(sphere(0.095, skin, 0, -0.48, 0));
    arm.rotation.z = side * 0.07;
    character.add(arm);
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, 0.69, 0);
    leg.add(box(0.205, 0.53, 0.25, police ? accent : '#304757', 0, -0.25, 0));
    leg.add(box(0.23, 0.135, 0.37, '#f5dfb6', 0, -0.59, -0.065));
    leg.add(box(0.24, 0.045, 0.38, accent, 0, -0.67, -0.065));
    character.add(leg);
  }

  if (police) {
    character.add(cylinder(0.29, 0.16, outfit, 0, 1.88, 0));
    character.add(box(0.42, 0.05, 0.3, accent, 0, 1.84, -0.17));
    character.add(box(0.09, 0.1, 0.03, '#efc354', -0.14, 1.15, -0.19));
    character.add(box(0.58, 0.08, 0.37, accent, 0, 0.82, 0));
    character.add(box(0.12, 0.05, 0.04, '#efc354', 0, 0.82, -0.2));
    character.add(box(0.22, 0.04, 0.035, dark, 0, 1.54, -0.27));
  } else if (definition.accessory === 'scarf') {
    character.add(box(0.62, 0.14, 0.4, accent, 0, 1.29, 0));
    const tail = box(0.18, 0.52, 0.07, accent, 0.15, 1.03, 0.25);
    tail.rotation.x = -0.24;
    character.add(tail);
  } else if (definition.accessory === 'apron') {
    character.add(box(0.43, 0.55, 0.06, accent, 0, 0.91, -0.21));
    character.add(box(0.24, 0.15, 0.035, '#f1d7aa', 0, 0.86, -0.25));
    character.add(cylinder(0.24, 0.12, '#f1d7aa', 0, 1.89, 0));
  } else if (definition.accessory === 'headphones') {
    const band = mesh('torus', accent);
    band.position.set(0, 1.71, 0);
    band.scale.set(0.31, 0.31, 0.31);
    character.add(band);
    character.add(
      box(0.12, 0.21, 0.2, accent, -0.29, 1.64, 0),
      box(0.12, 0.21, 0.2, accent, 0.29, 1.64, 0),
    );
    character.add(box(0.32, 0.37, 0.17, accent, 0, 1.08, 0.25));
  } else if (definition.accessory === 'crown') {
    character.add(cylinder(0.28, 0.14, accent, 0, 1.88, 0));
    for (let i = 0; i < 5; i += 1) {
      const point = mesh('cone', accent);
      point.scale.set(0.07, 0.2, 0.07);
      point.position.set(
        Math.sin(i * Math.PI * 0.4) * 0.22,
        2.03,
        Math.cos(i * Math.PI * 0.4) * 0.22,
      );
      character.add(point);
    }
  }
  // Retain four animation pivots while merging each rigid piece by material.
  // Faces and accessories remain distinct geometry within the combined body mesh.
  const body = new THREE.Group();
  body.name = 'body';
  for (const child of [...character.children]) {
    if (child instanceof THREE.Mesh) body.add(child);
    else if (child instanceof THREE.Group) batchStatic(child);
  }
  character.add(batchStatic(body));
  character.name = police ? 'police' : 'player';
  return character;
}

/** Public-appearance cues expressed as original, deliberately stylised geometry. */
function createCaricature(definition: CharacterDefinition, look: CharacterAppearance): THREE.Group {
  const character = new THREE.Group();
  const dark = '#252d36';
  const width = look.build === 'broad' ? 0.68 : look.build === 'slim' ? 0.5 : 0.57;
  const face = avatarFace(definition.id);
  const headWidth =
    face?.width ?? (look.build === 'broad' ? 0.29 : look.build === 'slim' ? 0.252 : 0.265);
  const longTop = ['vest', 'kurta', 'robe'].includes(look.clothing);
  character.add(
    box(width, longTop ? 0.83 : 0.64, 0.36, definition.color, 0, longTop ? 0.94 : 1.03, 0),
  );
  character.add(box(width * 0.86, 0.17, 0.32, look.trousers, 0, 0.68, 0));
  character.add(cylinder(0.095, 0.16, look.skin, 0, 1.4, 0));
  const head = sphere(1, look.skin, 0, 1.64, -0.015);
  head.scale.set(headWidth, face?.height ?? 0.286, face?.depth ?? 0.25);
  if (face) {
    // A small morph keeps shared sphere assets intact while shaping each jaw/cheek.
    head.geometry = head.geometry.clone();
    head.userData.sharedAsset = false;
    const positions = head.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const jaw = y < -0.2 ? THREE.MathUtils.lerp(1, face.jaw, (-y - 0.2) / 0.8) : 1;
      positions.setX(i, positions.getX(i) * jaw);
    }
    positions.needsUpdate = true;
    head.geometry.computeVertexNormals();
  }
  character.add(head);
  character.add(
    sphere(face?.ear ?? 0.062, look.skin, -headWidth, 1.64),
    sphere(face?.ear ?? 0.062, look.skin, headWidth, 1.64),
  );

  if (face) addAvatarHair(character, definition.id, look, headWidth);
  else addHair(character, look, headWidth);
  if (face) addAvatarBeard(character, definition.id, look, headWidth);
  else if (look.beard !== 'none') {
    const long = look.beard === 'long';
    const beard = sphere(1, look.hair, 0, long ? 1.415 : 1.49, -0.143);
    beard.scale.set(headWidth * 0.91, long ? 0.225 : look.beard === 'stubble' ? 0.12 : 0.17, 0.157);
    character.add(beard);
    // Keep cheeks and the mouth open; the beard frames rather than obscures the face.
    const cheek = sphere(1, look.skin, 0, 1.6, -0.157);
    cheek.scale.set(headWidth * 0.86, 0.155, 0.13);
    character.add(cheek);
    if (definition.id === 'pappu') {
      for (const side of [-1, 1]) {
        const grey = sphere(1, '#c5c6bb', side * 0.125, 1.46, -0.255);
        grey.scale.set(0.06, 0.085, 0.025);
        character.add(grey);
      }
    }
  }
  for (const side of [-1, 1]) {
    const eyeX = face?.eyeSpace ?? 0.1;
    const eyeY = face?.eyeY ?? 1.68;
    const eyeZ = face?.eyeZ ?? -0.247;
    character.add(
      box(
        face?.eyeWidth ?? 0.084,
        face?.eyeHeight ?? 0.052,
        0.024,
        '#fff5e5',
        side * eyeX,
        eyeY,
        eyeZ,
      ),
    );
    character.add(
      box(
        0.027,
        face ? 0.034 : 0.042,
        0.029,
        dark,
        side * (eyeX + 0.002),
        eyeY - 0.002,
        eyeZ - 0.016,
      ),
    );
    const brow = box(
      face?.browWidth ?? 0.105,
      face?.browWeight ?? 0.023,
      0.028,
      definition.id === 'pappu' ? '#454740' : look.hair,
      side * eyeX,
      eyeY + 0.057,
      eyeZ + 0.008,
    );
    brow.rotation.z = side * (face?.browAngle ?? -0.08);
    character.add(brow);
  }
  if (face) {
    const nose = sphere(1, look.skin, 0, face.noseY, face.noseZ);
    nose.scale.set(face.noseWidth, face.noseHeight, face.noseDepth);
    character.add(nose);
    character.add(
      box(face.mouthWidth, 0.017, 0.025, '#8f513f', 0, face.mouthY, face.noseZ - 0.035),
    );
    if (definition.id === 'german')
      character.add(
        box(0.085, 0.021, 0.012, '#fff5e5', 0, face.mouthY + 0.008, face.noseZ - 0.051),
      );
  } else {
    character.add(box(0.085, 0.091, 0.1, look.skin, 0, 1.6, -0.276));
    character.add(box(0.105, 0.023, 0.025, '#8f513f', 0, 1.515, -0.286));
  }
  if (look.moustache) {
    for (const side of [-1, 1]) {
      const moustache = face
        ? sphere(
            1,
            definition.id === 'pappu' ? '#4e5149' : look.hair,
            side * face.moustacheOffset,
            face.moustacheY,
            face.noseZ - 0.035,
          )
        : box(0.09, 0.033, 0.034, look.hair, side * 0.038, 1.547, -0.295);
      if (face) moustache.scale.set(face.moustacheWidth, face.moustacheHeight, 0.023);
      moustache.rotation.z = side * (definition.id === 'khujliwaal' ? 0.03 : 0.14);
      character.add(moustache);
    }
  }
  if (look.glasses !== 'none')
    addGlasses(
      character,
      look.glasses,
      definition.id === 'khujliwaal'
        ? '#b0a48b'
        : definition.id === 'mobi' || definition.id === 'amit'
          ? '#918c7c'
          : dark,
      definition.id === 'khujliwaal',
    );
  if (look.tilak) character.add(box(0.025, 0.078, 0.016, '#bd3c16', 0, 1.796, -0.232));

  if (look.headwear === 'saffron-band') {
    character.add(cylinder(headWidth + 0.012, 0.065, '#ee811d', 0, 1.785));
    character.add(box(0.065, 0.26, 0.035, '#ee811d', 0.18, 1.68, 0.25));
  } else if (look.headwear === 'black-cap') {
    character.add(box(0.43, 0.16, 0.34, '#202328', 0, 1.89));
    const top = box(0.32, 0.035, 0.31, '#202328', 0, 1.98);
    top.rotation.z = -0.08;
    character.add(top);
  }

  addClothes(character, definition, look, width);
  if (definition.accessory === 'scarf') {
    character.add(box(width + 0.035, 0.11, 0.4, definition.accent, 0, 1.31));
    character.add(box(0.13, 0.57, 0.06, definition.accent, -0.18, 1.01, -0.235));
    character.add(box(0.13, 0.36, 0.06, definition.accent, 0.18, 1.115, -0.235));
  }
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? 'leftArm' : 'rightArm';
    arm.position.set(side * (width / 2 + 0.065), 1.27, 0);
    arm.add(box(0.19, 0.3, 0.23, definition.color, 0, -0.12, 0));
    const longSleeve = !['shirt', 'polo'].includes(look.clothing);
    arm.add(box(0.15, 0.23, 0.18, longSleeve ? definition.color : look.skin, 0, -0.36, 0));
    arm.add(sphere(0.09, look.skin, 0, -0.48, 0));
    arm.rotation.z = side * 0.07;
    character.add(arm);
    const leg = new THREE.Group();
    leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
    leg.position.set(side * 0.15, 0.69, 0);
    leg.add(box(0.205, 0.53, 0.25, look.trousers, 0, -0.25, 0));
    leg.add(
      box(0.23, 0.135, 0.37, look.clothing === 'robe' ? look.skin : '#e4ded0', 0, -0.59, -0.065),
    );
    leg.add(
      box(0.24, 0.045, 0.38, look.clothing === 'robe' ? '#704c33' : '#333c43', 0, -0.67, -0.065),
    );
    if (look.clothing === 'robe') leg.add(box(0.235, 0.03, 0.08, '#704c33', 0, -0.54, -0.14));
    character.add(leg);
  }

  const body = new THREE.Group();
  body.name = 'body';
  for (const child of [...character.children]) {
    if (child instanceof THREE.Mesh) body.add(child);
    else if (child instanceof THREE.Group) batchStatic(child);
  }
  character.add(batchStatic(body));
  character.name = 'player';
  character.userData.characterId = definition.id;
  return character;
}

function avatarFace(id: string) {
  const base = {
    width: 0.265,
    height: 0.286,
    depth: 0.25,
    jaw: 0.93,
    ear: 0.062,
    eyeSpace: 0.1,
    eyeY: 1.68,
    eyeZ: -0.247,
    eyeWidth: 0.079,
    eyeHeight: 0.043,
    browWidth: 0.109,
    browWeight: 0.024,
    browAngle: -0.08,
    noseWidth: 0.047,
    noseHeight: 0.063,
    noseDepth: 0.065,
    noseY: 1.6,
    noseZ: -0.28,
    mouthWidth: 0.105,
    mouthY: 1.505,
    moustacheWidth: 0.057,
    moustacheHeight: 0.022,
    moustacheOffset: 0.041,
    moustacheY: 1.545,
  };
  switch (id) {
    case 'abhiteep':
      return {
        ...base,
        width: 0.28,
        height: 0.28,
        depth: 0.255,
        jaw: 0.97,
        ear: 0.069,
        eyeHeight: 0.041,
        browWeight: 0.028,
        noseWidth: 0.06,
        noseHeight: 0.057,
        mouthY: 1.49,
        moustacheWidth: 0.067,
        moustacheHeight: 0.025,
        moustacheOffset: 0.045,
        moustacheY: 1.535,
      };
    case 'german':
      return {
        ...base,
        width: 0.249,
        height: 0.306,
        depth: 0.241,
        jaw: 0.73,
        ear: 0.057,
        eyeSpace: 0.096,
        eyeY: 1.688,
        eyeZ: -0.238,
        eyeHeight: 0.04,
        browAngle: -0.025,
        noseWidth: 0.038,
        noseHeight: 0.075,
        noseDepth: 0.059,
        noseY: 1.61,
        noseZ: -0.265,
        mouthWidth: 0.12,
        mouthY: 1.515,
        moustacheWidth: 0.05,
        moustacheHeight: 0.013,
        moustacheY: 1.55,
      };
    case 'pappu':
      return {
        ...base,
        width: 0.279,
        height: 0.291,
        depth: 0.254,
        jaw: 0.98,
        ear: 0.065,
        eyeSpace: 0.105,
        eyeHeight: 0.039,
        browWeight: 0.028,
        browAngle: -0.04,
        noseWidth: 0.052,
        noseHeight: 0.073,
        noseY: 1.595,
        noseZ: -0.283,
        mouthWidth: 0.115,
        mouthY: 1.505,
        moustacheHeight: 0.025,
        moustacheOffset: 0.044,
        moustacheY: 1.545,
      };
    case 'khujliwaal':
      return {
        ...base,
        width: 0.266,
        height: 0.303,
        depth: 0.243,
        jaw: 0.94,
        ear: 0.069,
        eyeSpace: 0.101,
        eyeY: 1.67,
        eyeZ: -0.242,
        eyeWidth: 0.072,
        eyeHeight: 0.034,
        browWidth: 0.096,
        browWeight: 0.019,
        browAngle: -0.035,
        noseWidth: 0.053,
        noseHeight: 0.067,
        noseY: 1.595,
        noseZ: -0.274,
        mouthWidth: 0.097,
        mouthY: 1.49,
        moustacheWidth: 0.067,
        moustacheHeight: 0.023,
        moustacheOffset: 0.043,
        moustacheY: 1.535,
      };
    default:
      return undefined;
  }
}

function ellipsoid(
  character: THREE.Group,
  color: string,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  angle = 0,
): void {
  const part = sphere(1, color, x, y, z);
  part.scale.set(sx, sy, sz);
  part.rotation.z = angle;
  character.add(part);
}

function addAvatarHair(
  character: THREE.Group,
  id: string,
  look: CharacterAppearance,
  width: number,
): void {
  const hair = id === 'pappu' ? '#55564d' : look.hair;
  const flat = id === 'khujliwaal';
  ellipsoid(
    character,
    hair,
    0,
    flat ? 1.875 : 1.81,
    0.055,
    width * 0.99,
    flat ? 0.079 : 0.132,
    0.215,
  );
  for (const side of [-1, 1]) {
    ellipsoid(
      character,
      hair,
      side * width * 0.89,
      flat ? 1.76 : 1.745,
      0.055,
      0.045,
      flat ? 0.105 : 0.11,
      0.15,
    );
  }
  if (id === 'abhiteep') {
    // Irregular swept locks, shorter sides and a substantial uneven fringe.
    const locks = [
      [-0.19, 1.895, -0.09, 0.38],
      [-0.08, 1.942, -0.07, 0.12],
      [0.055, 1.93, -0.08, -0.22],
      [0.17, 1.875, -0.08, -0.48],
    ];
    for (const [x, y, z, angle] of locks)
      ellipsoid(character, hair, x, y, z, 0.115, 0.12, 0.16, angle);
    ellipsoid(character, hair, -0.07, 1.825, -0.18, 0.17, 0.065, 0.09, 0.16);
  } else if (id === 'german') {
    // Tidy asymmetric quiff and a visible side part rather than a round hair cap.
    ellipsoid(character, hair, -0.055, 1.926, -0.07, 0.18, 0.11, 0.16, -0.22);
    ellipsoid(character, hair, 0.15, 1.855, -0.075, 0.076, 0.078, 0.14, -0.3);
    ellipsoid(character, hair, -0.1, 1.862, -0.175, 0.14, 0.062, 0.075, -0.16);
  } else if (id === 'pappu') {
    // Short waves stay dark on top; grey is concentrated around the temples.
    for (let i = 0; i < 5; i++)
      ellipsoid(
        character,
        hair,
        -0.17 + i * 0.085,
        1.858 + (i % 2) * 0.021,
        -0.09,
        0.083,
        0.075,
        0.14,
        (i - 2) * 0.11,
      );
    for (const side of [-1, 1])
      ellipsoid(character, '#aaa99c', side * 0.251, 1.73, 0.022, 0.027, 0.085, 0.105);
  } else {
    // A high forehead and low, neatly combed side part are the identifying shape.
    ellipsoid(character, hair, -0.064, 1.881, -0.08, 0.17, 0.055, 0.125, -0.095);
    ellipsoid(character, hair, 0.16, 1.849, -0.06, 0.065, 0.067, 0.13, -0.15);
    ellipsoid(character, '#6f716a', 0.236, 1.75, 0.04, 0.015, 0.067, 0.08);
  }
}

function addAvatarBeard(
  character: THREE.Group,
  id: string,
  look: CharacterAppearance,
  width: number,
): void {
  if (look.beard === 'none') return;
  const beardColor =
    id === 'pappu'
      ? '#8b8d81'
      : id === 'german'
        ? `#${new THREE.Color(look.skin).lerp(new THREE.Color(look.hair), 0.55).getHexString()}`
        : look.hair;
  if (id === 'abhiteep') {
    ellipsoid(character, beardColor, 0, 1.465, -0.12, width * 0.94, 0.174, 0.177);
    character.add(box(0.31, 0.075, 0.235, beardColor, 0, 1.345, -0.09));
  } else if (id === 'german') {
    ellipsoid(character, beardColor, 0, 1.49, -0.09, width * 0.87, 0.13, 0.169);
    for (const side of [-1, 1])
      ellipsoid(character, beardColor, side * 0.19, 1.53, -0.115, 0.035, 0.092, 0.107, side * -0.2);
  } else {
    ellipsoid(character, beardColor, 0, 1.465, -0.12, width * 0.93, 0.18, 0.18);
  }
  // Clean upper cheeks and a small exposed mouth keep a beard from becoming a mask.
  ellipsoid(
    character,
    look.skin,
    0,
    1.625,
    -0.16,
    width * 0.84,
    id === 'german' ? 0.151 : 0.13,
    0.126,
  );
  if (id === 'pappu') {
    for (const side of [-1, 1]) {
      ellipsoid(character, '#d2d1c1', side * 0.155, 1.46, -0.255, 0.066, 0.1, 0.029, side * -0.23);
      ellipsoid(character, '#53574f', side * 0.2, 1.55, -0.18, 0.04, 0.07, 0.045);
    }
    ellipsoid(character, '#c5c6b8', 0, 1.355, -0.22, 0.1, 0.045, 0.04);
  }
}

function addHair(character: THREE.Group, look: CharacterAppearance, headWidth: number): void {
  if (look.hairStyle === 'shaved') return;
  const cap = sphere(1, look.hair, 0, 1.79, 0.045);
  cap.scale.set(headWidth * 1.01, look.hairStyle === 'bald' ? 0.075 : 0.137, 0.225);
  if (!['bald', 'receding'].includes(look.hairStyle)) character.add(cap);
  for (const side of [-1, 1]) {
    const sideHair = sphere(1, look.hair, side * headWidth * 0.86, 1.73, 0.055);
    sideHair.scale.set(0.062, look.hairStyle === 'bald' ? 0.08 : 0.12, 0.16);
    character.add(sideHair);
  }
  if (look.hairStyle === 'bald') return;
  if (look.hairStyle === 'receding') {
    const back = sphere(1, look.hair, 0, 1.795, 0.14);
    back.scale.set(0.225, 0.1, 0.1);
    character.add(back);
    return;
  }
  const tuftCount = look.hairStyle === 'tousled' ? 5 : 3;
  for (let i = 0; i < tuftCount; i++) {
    const tuft = sphere(
      1,
      look.hair,
      -0.15 + i * (0.3 / (tuftCount - 1)),
      1.84 + (i % 2) * 0.025,
      -0.075,
    );
    tuft.scale.set(0.115, look.hairStyle === 'tousled' ? 0.12 : 0.075, 0.16);
    tuft.rotation.z = look.hairStyle === 'swept' ? -0.32 : (i - 2) * 0.12;
    character.add(tuft);
  }
}

function addGlasses(
  character: THREE.Group,
  style: 'round' | 'rectangular',
  color: string,
  thin = false,
): void {
  for (const side of [-1, 1]) {
    const x = side * 0.11;
    if (style === 'round') {
      const frame = mesh('torus', color);
      frame.position.set(x, 1.68, -0.281);
      frame.scale.set(0.083, 0.077, 0.033);
      character.add(frame);
    } else {
      const top = thin ? 1.708 : 1.733;
      const bottom = thin ? 1.634 : 1.63;
      const weight = thin ? 0.008 : 0.012;
      character.add(box(0.164, weight, 0.014, color, x, top, -0.279));
      character.add(box(0.164, weight, 0.014, color, x, bottom, -0.279));
      character.add(box(weight, top - bottom, 0.014, color, x - 0.076, (top + bottom) / 2, -0.279));
      character.add(box(weight, top - bottom, 0.014, color, x + 0.076, (top + bottom) / 2, -0.279));
    }
    character.add(box(0.02, 0.018, 0.23, color, side * 0.235, 1.69, -0.14));
  }
  character.add(box(0.055, 0.013, 0.018, color, 0, 1.69, -0.282));
}

function addClothes(
  character: THREE.Group,
  definition: CharacterDefinition,
  look: CharacterAppearance,
  width: number,
): void {
  const { color, accent } = definition;
  if (look.clothing === 'vest') {
    character.add(box(width + 0.015, 0.64, 0.035, accent, 0, 1.03, -0.197));
    character.add(box(width + 0.015, 0.64, 0.035, accent, 0, 1.03, 0.197));
    character.add(box(0.13, 0.075, 0.4, accent, 0, 1.335));
  }
  if (look.clothing === 'robe') {
    const sash = box(0.16, 0.8, 0.045, accent, 0.07, 1.03, -0.216);
    sash.rotation.z = -0.29;
    character.add(sash);
    character.add(box(0.14, 0.65, 0.045, accent, -0.16, 1.0, 0.21));
    // A small beaded mala is visible from the front in the intro.
    for (let i = 0; i < 9; i++) {
      const angle = Math.PI * (i / 8);
      character.add(
        sphere(0.018, '#744427', Math.cos(angle) * 0.14, 1.31 - Math.sin(angle) * 0.19, -0.235),
      );
    }
    return;
  }
  if (look.clothing === 'sweater') {
    character.add(box(width + 0.005, 0.11, 0.03, accent, 0, 1.15, -0.2));
    character.add(box(width + 0.005, 0.11, 0.03, accent, 0, 1.15, 0.2));
    character.add(cylinder(0.12, 0.075, accent, 0, 1.34));
    return;
  }
  for (const side of [-1, 1]) {
    const collar = box(
      0.11,
      0.13,
      0.04,
      look.clothing === 'vest' ? color : accent,
      side * 0.07,
      1.29,
      -0.21,
    );
    collar.rotation.z = side * -0.35;
    character.add(collar);
  }
  const buttonColor = look.clothing === 'vest' ? '#dac69a' : accent;
  const buttons = look.clothing === 'polo' ? 2 : 4;
  for (let i = 0; i < buttons; i++)
    character.add(sphere(0.014, buttonColor, 0, 1.23 - i * 0.115, -0.223));
  if (look.clothing === 'shirt') character.add(box(0.105, 0.1, 0.024, accent, -0.16, 1.12, -0.2));
}
