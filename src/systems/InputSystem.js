import { Joystick } from '../ui/Joystick';
import { TouchButton } from '../ui/TouchButton';
export class InputSystem {
    constructor(uiRoot) {
        this.keys = new Set();
        this.prevPick = false;
        this.prevAction = false;
        this.prevDash = false;
        this.current = {
            move: { x: 0, y: 0 },
            pickJustPressed: false,
            actionJustPressed: false,
            dashJustPressed: false,
        };
        this.joystick = new Joystick(uiRoot);
        this.pickBtn = new TouchButton(uiRoot, 'CẦM', 28, 28, 96, 18);
        this.actionBtn = new TouchButton(uiRoot, 'CỌ', 136, 52, 72, 16);
        this.dashBtn = new TouchButton(uiRoot, 'DASH', 52, 140, 56, 12);
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    }
    update() {
        let mx = 0;
        let my = 0;
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft'))
            mx -= 1;
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight'))
            mx += 1;
        if (this.keys.has('KeyW') || this.keys.has('ArrowUp'))
            my -= 1;
        if (this.keys.has('KeyS') || this.keys.has('ArrowDown'))
            my += 1;
        if (mx === 0 && my === 0) {
            const v = this.joystick.vector;
            mx = v.x;
            my = v.y;
        }
        else {
            const len = Math.hypot(mx, my);
            mx /= len;
            my /= len;
        }
        const pickDown = this.pickBtn.isDown || this.keys.has('Space');
        const actionDown = this.actionBtn.isDown || this.keys.has('KeyE');
        const dashDown = this.dashBtn.isDown || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        this.current.move = { x: mx, y: my };
        this.current.pickJustPressed = pickDown && !this.prevPick;
        this.current.actionJustPressed = actionDown && !this.prevAction;
        this.current.dashJustPressed = dashDown && !this.prevDash;
        this.prevPick = pickDown;
        this.prevAction = actionDown;
        this.prevDash = dashDown;
    }
    get state() {
        return this.current;
    }
}
