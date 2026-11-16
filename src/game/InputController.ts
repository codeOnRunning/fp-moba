export type LockChangeHandler = (locked: boolean) => void;
export type LockErrorHandler = (message: string) => void;

const PITCH_LIMIT = Math.PI / 2 - 0.08;

export class InputController {
  readonly keys = new Set<string>();

  yaw = -Math.PI / 2;
  pitch = 0;
  sensitivity = 0.0019;
  invertY = false;

  private readonly pressed = new Set<string>();
  private fireHeld = false;
  private firePressed = false;
  private locked = false;
  private disposed = false;
  private ignoreMouseUntil = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly onLockChange: LockChangeHandler,
    private readonly onLockError?: LockErrorHandler,
  ) {
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('pointerlockerror', this.handlePointerLockError);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  get isFireHeld(): boolean {
    return this.fireHeld;
  }

  async requestLock(): Promise<boolean> {
    if (document.pointerLockElement === this.canvas) {
      return true;
    }

    try {
      const request = this.canvas.requestPointerLock as unknown as (
        options?: { unadjustedMovement?: boolean },
      ) => Promise<void> | void;

      const result = request.call(this.canvas, { unadjustedMovement: true });
      if (result instanceof Promise) {
        await result;
      }
      return true;
    } catch {
      try {
        this.canvas.requestPointerLock();
        return true;
      } catch {
        this.onLockError?.('浏览器没有允许锁定鼠标，请再点击一次画面。');
        return false;
      }
    }
  }

  exitLock(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  consumePressed(code: string): boolean {
    if (!this.pressed.has(code)) {
      return false;
    }
    this.pressed.delete(code);
    return true;
  }

  consumeFirePressed(): boolean {
    if (!this.firePressed) {
      return false;
    }
    this.firePressed = false;
    return true;
  }

  /** Returns a normalized world-space movement direction. */
  getMoveVector(): { x: number; z: number } {
    let forward = 0;
    let strafe = 0;

    if (this.isDown('KeyW') || this.isDown('ArrowUp')) forward += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) forward -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) strafe += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) strafe -= 1;

    if (forward === 0 && strafe === 0) {
      return { x: 0, z: 0 };
    }

    // Camera forward at yaw=0 is -Z. Right is +X.
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const fx = -sin;
    const fz = -cos;
    const rx = cos;
    const rz = -sin;

    const x = fx * forward + rx * strafe;
    const z = fz * forward + rz * strafe;
    const length = Math.hypot(x, z);

    return { x: x / length, z: z / length };
  }

  endFrame(): void {
    // Keep pressed edges until a fixed step consumes them. Clearing here drops
    // quick taps when the render rate is lower than the simulation rate.
    this.firePressed = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    document.removeEventListener('pointerlockerror', this.handlePointerLockError);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.locked) return;

    if (
      event.code === 'KeyW' ||
      event.code === 'KeyA' ||
      event.code === 'KeyS' ||
      event.code === 'KeyD' ||
      event.code === 'KeyQ' ||
      event.code === 'KeyV' ||
      event.code === 'Space' ||
      event.code === 'ArrowUp' ||
      event.code === 'ArrowDown' ||
      event.code === 'ArrowLeft' ||
      event.code === 'ArrowRight'
    ) {
      event.preventDefault();
    }

    if (!event.repeat) {
      this.pressed.add(event.code);
    }
    this.keys.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly handleBlur = (): void => {
    this.keys.clear();
    this.pressed.clear();
    this.fireHeld = false;
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.locked || performance.now() < this.ignoreMouseUntil) return;

    this.yaw -= event.movementX * this.sensitivity;
    this.pitch -=
      event.movementY * this.sensitivity * (this.invertY ? -1 : 1);
    this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || !this.locked) return;
    this.fireHeld = true;
    this.firePressed = true;
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.fireHeld = false;
    }
  };

  private readonly handlePointerLockChange = (): void => {
    this.locked = document.pointerLockElement === this.canvas;
    if (!this.locked) {
      this.keys.clear();
      this.pressed.clear();
      this.fireHeld = false;
    } else {
      // Some browsers emit one large synthetic movement event when lock is acquired.
      this.ignoreMouseUntil = performance.now() + 140;
    }
    this.onLockChange(this.locked);
  };

  private readonly handlePointerLockError = (): void => {
    this.locked = false;
    this.onLockError?.('鼠标锁定失败。点击“继续”后重试，或换用 Chrome / Edge。');
    this.onLockChange(false);
  };

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };
}
