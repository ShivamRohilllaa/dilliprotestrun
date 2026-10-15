import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { InputManager } from '../../src/game/InputManager';
import type { InputAction } from '../../src/game/InputManager';

/** Only the DOM behavior consumed by input is needed; no renderer is involved. */
class TestElement extends EventTarget {
  constructor(private readonly tag: string) {
    super();
  }
  closest(selector: string): TestElement | null {
    if (selector === 'canvas') return this.tag === 'canvas' ? this : null;
    return selector.split(',').some((part) => part.trim() === this.tag) ? this : null;
  }
  contains(target: TestElement): boolean {
    return target === this;
  }
}

function inputEvent(type: string, properties: Record<string, unknown> = {}): Event {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries({ code: '', key: '', ...properties })) {
    Object.defineProperty(event, key, { value });
  }
  return event;
}

let surface: TestElement;
let keyboard: EventTarget;
let active: boolean;
let actions: InputAction[];
let manager: InputManager;
beforeEach(() => {
  surface = new TestElement('canvas');
  keyboard = new EventTarget();
  active = true;
  actions = [];
  vi.stubGlobal('window', keyboard);
  vi.stubGlobal('Element', TestElement);
  manager = new InputManager(
    surface as unknown as HTMLElement,
    (action) => actions.push(action),
    () => active,
  );
});
afterEach(() => {
  manager.dispose();
  vi.unstubAllGlobals();
});

const key = (code: string, type = 'keydown', properties: Record<string, unknown> = {}): Event => {
  const event = inputEvent(type, { code, ...properties });
  keyboard.dispatchEvent(event);
  return event;
};
const pointer = (
  type: string,
  x: number,
  y: number,
  properties: Record<string, unknown> = {},
): Event => {
  const event = inputEvent(type, {
    clientX: x,
    clientY: y,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    ...properties,
  });
  (type === 'pointerdown' ? surface : keyboard).dispatchEvent(event);
  return event;
};

describe('keyboard input', () => {
  test('maps desktop controls and suppresses held/repeated keydown until release', () => {
    key('Space');
    key('Space');
    key('Space', 'keydown', { repeat: true });
    key('Space', 'keyup');
    key('Space');
    key('KeyA');
    key('ArrowRight');
    key('KeyS');
    expect(actions).toEqual(['jump', 'jump', 'left', 'right', 'slide']);
  });

  test('ignores focused controls and editable fields without preventing their defaults', () => {
    const focusedButton = key('Space', 'keydown', { target: new TestElement('button') });
    const focusedInput = key('KeyA', 'keydown', { target: new TestElement('input') });
    expect(actions).toEqual([]);
    expect(focusedButton.defaultPrevented).toBe(false);
    expect(focusedInput.defaultPrevented).toBe(false);
  });

  test('gates gameplay by state while allowing pause/resume and key-only events', () => {
    active = false;
    expect(key('Space').defaultPrevented).toBe(false);
    key('KeyP');
    key('KeyP', 'keyup');
    active = true;
    expect(key('', 'keydown', { key: 'ArrowLeft' }).defaultPrevented).toBe(true);
    key('KeyP');
    expect(actions).toEqual(['pause', 'left', 'pause']);
  });

  test('clears a held key after focus loss and preserves browser shortcut keys', () => {
    key('KeyA');
    keyboard.dispatchEvent(new Event('blur'));
    key('KeyA');
    key('KeyP', 'keydown', { ctrlKey: true });
    expect(actions).toEqual(['left', 'left']);
  });
});

describe('canvas swipe input', () => {
  test('emits one action per gesture on the dominant axis', () => {
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 107, 95);
    expect(actions).toEqual([]);
    pointer('pointermove', 110, 40);
    pointer('pointermove', 120, 0);
    pointer('pointerup', 120, 0);
    pointer('pointerdown', 100, 100);
    pointer('pointerup', 160, 110);
    expect(actions).toEqual(['jump', 'right']);
  });

  test('ignores UI origins, inactive gameplay, and canceled touches', () => {
    pointer('pointerdown', 100, 100, { target: new TestElement('button') });
    pointer('pointerup', 20, 100);
    active = false;
    pointer('pointerdown', 100, 100);
    pointer('pointerup', 20, 100);
    active = true;
    pointer('pointerdown', 100, 100);
    pointer('pointercancel', 100, 100);
    pointer('pointerup', 20, 100);
    expect(actions).toEqual([]);
  });

  test('disposal removes all keyboard and pointer listeners', () => {
    manager.dispose();
    key('Space');
    key('KeyP');
    pointer('pointerdown', 100, 100);
    pointer('pointerup', 20, 100);
    expect(actions).toEqual([]);
  });
});
