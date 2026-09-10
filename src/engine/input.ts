import { emptyInput, type PlayerInput } from '../types';

/** Trackpad/mouse right (positive movementX) looks right. */
export function lookDeltaYaw(movementX: number, sensitivity: number): number {
  return movementX * sensitivity;
}

export class Input {
  readonly state: PlayerInput = emptyInput();
  locked = false;
  tab = false;
  pauseQueued = false;
  debugNav = false;
  private keys = new Set<string>();
  private mouseButtons = 0;
  sensitivity = 0.0022;
  invertY = false;

  constructor(private canvas: HTMLCanvasElement | null) {
    if (!canvas || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onLock);
  }

  dispose(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onLock);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'Tab') {
      e.preventDefault();
      this.tab = true;
    }
    if (e.code === 'Escape') this.pauseQueued = true;
    if (e.code === 'F3') {
      e.preventDefault();
      this.debugNav = !this.debugNav;
    }
    this.sync();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    if (e.code === 'Tab') this.tab = false;
    this.sync();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.locked) {
      this.canvas?.requestPointerLock();
      return;
    }
    this.mouseButtons |= 1 << e.button;
    this.sync();
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseButtons &= ~(1 << e.button);
    this.sync();
  };

  private onLock = (): void => {
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) this.state.fire = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return;
    this.state.yaw += lookDeltaYaw(e.movementX, this.sensitivity);
    const dy = e.movementY * this.sensitivity * (this.invertY ? 1 : -1);
    this.state.pitch = Math.max(-1.35, Math.min(1.35, this.state.pitch + dy));
  };

  private sync(): void {
    const k = this.keys;
    this.state.forward = k.has('KeyW') || k.has('ArrowUp');
    this.state.back = k.has('KeyS') || k.has('ArrowDown');
    this.state.left = k.has('KeyA') || k.has('ArrowLeft');
    this.state.right = k.has('KeyD') || k.has('ArrowRight');
    this.state.jump = k.has('Space');
    this.state.crouch = k.has('ControlLeft') || k.has('ControlRight') || k.has('KeyC');
    this.state.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
    this.state.swap = k.has('KeyR');
    this.state.fire = k.has('KeyF') || (this.locked && (this.mouseButtons & 1) !== 0);
  }
}
