export class Joystick {
    constructor(parent) {
        this.pointerId = null;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 60;
        this.vec = { x: 0, y: 0 };
        this.base = document.createElement('div');
        this.base.style.cssText =
            'position:fixed;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.12);display:none;pointer-events:none;transform:translate(-50%,-50%);z-index:5;';
        this.knob = document.createElement('div');
        this.knob.style.cssText =
            'position:absolute;left:50%;top:50%;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,0.35);transform:translate(-50%,-50%);';
        this.base.appendChild(this.knob);
        parent.appendChild(this.base);
        window.addEventListener('pointerdown', (e) => {
            if (this.pointerId !== null)
                return;
            if (e.clientX > window.innerWidth / 2)
                return;
            if (e.target.closest('button'))
                return;
            this.pointerId = e.pointerId;
            this.centerX = e.clientX;
            this.centerY = e.clientY;
            this.base.style.left = `${e.clientX}px`;
            this.base.style.top = `${e.clientY}px`;
            this.base.style.display = 'block';
            this.update(e.clientX, e.clientY);
        });
        window.addEventListener('pointermove', (e) => {
            if (e.pointerId !== this.pointerId)
                return;
            this.update(e.clientX, e.clientY);
        });
        const release = (e) => {
            if (e.pointerId !== this.pointerId)
                return;
            this.pointerId = null;
            this.vec = { x: 0, y: 0 };
            this.base.style.display = 'none';
            this.knob.style.transform = 'translate(-50%,-50%)';
        };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
    }
    get vector() {
        return this.vec;
    }
    update(cx, cy) {
        const dx = cx - this.centerX;
        const dy = cy - this.centerY;
        const len = Math.hypot(dx, dy);
        const clamped = Math.min(len, this.radius);
        const nx = len > 0 ? dx / len : 0;
        const ny = len > 0 ? dy / len : 0;
        this.knob.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
        this.vec = { x: nx * (clamped / this.radius), y: ny * (clamped / this.radius) };
    }
}
