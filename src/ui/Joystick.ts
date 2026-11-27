export class Joystick {
  private el: HTMLDivElement;
  private knob: HTMLDivElement;
  private pointerId: number | null = null;
  private centerX = 0;
  private centerY = 0;
  private radius = 70;
  private vec = { x: 0, y: 0 };

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.style.cssText =
      'position:fixed;left:24px;bottom:24px;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,0.12);touch-action:none;';
    this.knob = document.createElement('div');
    this.knob.style.cssText =
      'position:absolute;left:50%;top:50%;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,0.35);transform:translate(-50%,-50%);';
    this.el.appendChild(this.knob);
    parent.appendChild(this.el);

    this.el.addEventListener('pointerdown', (e) => {
      this.pointerId = e.pointerId;
      this.el.setPointerCapture(e.pointerId);
      const rect = this.el.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.update(e.clientX, e.clientY);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.update(e.clientX, e.clientY);
    });
    const release = (e: PointerEvent) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.vec = { x: 0, y: 0 };
      this.knob.style.transform = 'translate(-50%,-50%)';
    };
    this.el.addEventListener('pointerup', release);
    this.el.addEventListener('pointercancel', release);
  }

  get vector(): { x: number; y: number } {
    return this.vec;
  }

  private update(cx: number, cy: number): void {
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
