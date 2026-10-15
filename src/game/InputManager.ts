export type InputAction = 'left' | 'right' | 'jump' | 'slide' | 'pause';

const KEYS: Record<string, InputAction> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  a: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  d: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
  w: 'jump',
  Space: 'jump',
  ' ': 'jump',
  ArrowDown: 'slide',
  KeyS: 'slide',
  s: 'slide',
  Escape: 'pause',
  KeyP: 'pause',
  p: 'pause',
};
const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
const INTERACTIVE = 'button, a[href], summary, [role="button"], [role="slider"], [role="tab"]';
const SWIPE_THRESHOLD = 28;

export class InputManager {
  private readonly abort = new AbortController();
  private readonly held = new Set<string>();
  private pointer: { id: number; x: number; y: number } | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly onAction: (action: InputAction) => void,
    private readonly isActive: () => boolean,
  ) {
    const signal = this.abort.signal;
    window.addEventListener('keydown', this.keyDown, { signal });
    window.addEventListener('keyup', this.keyUp, { signal });
    window.addEventListener('blur', this.clearHeld, { signal });
    element.addEventListener('pointerdown', this.pointerDown, { signal, passive: false });
    window.addEventListener('pointermove', this.pointerMove, { signal, passive: false });
    window.addEventListener('pointerup', this.pointerUp, { signal, passive: false });
    window.addEventListener('pointercancel', this.cancelPointer, { signal });
  }

  private keyDown = (event: KeyboardEvent): void => {
    const action = KEYS[event.code] ?? KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
    if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(EDITABLE) || (action !== 'pause' && target?.closest(INTERACTIVE))) return;
    if (action !== 'pause' && !this.isActive()) return;
    event.preventDefault();
    const key = event.code || event.key;
    if (event.repeat || this.held.has(key)) return;
    this.held.add(key);
    this.onAction(action);
  };

  private keyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code || event.key);
  };
  private clearHeld = (): void => {
    this.held.clear();
    this.pointer = null;
  };

  private pointerDown = (event: PointerEvent): void => {
    if (!this.isActive() || !event.isPrimary || event.button !== 0 || this.pointer) return;
    const target = event.target instanceof Element ? event.target : null;
    const canvas = target?.closest('canvas');
    if (!canvas || !this.element.contains(canvas)) return;
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.preventDefault();
  };

  private pointerMove = (event: PointerEvent): void => {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    if (!this.isActive()) {
      this.pointer = null;
      return;
    }
    event.preventDefault();
    this.commitSwipe(event);
  };

  private pointerUp = (event: PointerEvent): void => {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    if (this.isActive()) {
      event.preventDefault();
      this.commitSwipe(event);
    }
    this.pointer = null;
  };

  private cancelPointer = (): void => {
    this.pointer = null;
  };

  private commitSwipe(event: PointerEvent): void {
    if (!this.pointer) return;
    const dx = event.clientX - this.pointer.x;
    const dy = event.clientY - this.pointer.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;
    this.pointer = null;
    this.onAction(
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy < 0 ? 'jump' : 'slide',
    );
  }

  dispose(): void {
    this.abort.abort();
    this.clearHeld();
  }
}
