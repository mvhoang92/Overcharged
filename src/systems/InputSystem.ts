import { Joystick } from '../ui/Joystick';
import { TouchButton } from '../ui/TouchButton';

export interface InputState {
  move: { x: number; y: number };
  actionDown: boolean;
  actionJustPressed: boolean;
  dashJustPressed: boolean;
}

export class InputSystem {
  private joystick: Joystick;
  private actionBtn: TouchButton;
  private dashBtn: TouchButton;
  private keys = new Set<string>();
  private prevAction = false;
  private prevDash = false;
  private current: InputState = {
    move: { x: 0, y: 0 },
    actionDown: false,
    actionJustPressed: false,
    dashJustPressed: false,
  };

  constructor(uiRoot: HTMLElement) {
    this.joystick = new Joystick(uiRoot);
    this.actionBtn = new TouchButton(uiRoot, 'A', 24, 40, 88);
    this.dashBtn = new TouchButton(uiRoot, 'DASH', 130, 110, 64);
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  update(): void {
    let mx = 0;
    let my = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) mx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) mx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) my -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) my += 1;
    if (mx === 0 && my === 0) {
      const v = this.joystick.vector;
      mx = v.x;
      my = v.y;
    } else {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }

    const actionDown = this.actionBtn.isDown || this.keys.has('Space');
    const dashDown = this.dashBtn.isDown || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    this.current.move = { x: mx, y: my };
    this.current.actionDown = actionDown;
    this.current.actionJustPressed = actionDown && !this.prevAction;
    this.current.dashJustPressed = dashDown && !this.prevDash;
    this.prevAction = actionDown;
    this.prevDash = dashDown;
  }

  get state(): InputState {
    return this.current;
  }
}
