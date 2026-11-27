export class TouchButton {
    constructor(parent, label, right, bottom, size, fontSize = 16) {
        this.down = false;
        this.el = document.createElement('button');
        this.el.textContent = label;
        this.el.style.cssText = `position:fixed;right:${right}px;bottom:${bottom}px;width:${size}px;height:${size}px;border-radius:50%;border:none;background:rgba(255,255,255,0.2);color:#fff;font-size:${fontSize}px;font-weight:bold;touch-action:none;`;
        parent.appendChild(this.el);
        this.el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.down = true;
            this.el.style.background = 'rgba(255,255,255,0.45)';
        });
        const release = () => {
            this.down = false;
            this.el.style.background = 'rgba(255,255,255,0.2)';
        };
        this.el.addEventListener('pointerup', release);
        this.el.addEventListener('pointercancel', release);
        this.el.addEventListener('pointerleave', release);
    }
    get isDown() {
        return this.down;
    }
}
