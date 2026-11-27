import { bus } from '../systems/EventBus';

export class Hud {
  private scoreEl: HTMLDivElement;
  private comboEl: HTMLDivElement;
  private timerEl: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.scoreEl = document.createElement('div');
    this.scoreEl.style.cssText =
      'position:fixed;right:16px;top:16px;font-size:20px;font-weight:bold;color:#fff;';
    this.comboEl = document.createElement('div');
    this.comboEl.style.cssText =
      'position:fixed;left:50%;top:56px;transform:translateX(-50%);font-size:18px;font-weight:bold;color:#f1c40f;';
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText =
      'position:fixed;left:50%;top:16px;transform:translateX(-50%);font-size:24px;font-weight:bold;color:#fff;';
    parent.append(this.scoreEl, this.comboEl, this.timerEl);

    bus.on('score:changed', (score) => this.setScore(score as number));
    bus.on('combo:changed', (streak) => this.setCombo(streak as number));
    bus.on('timer:changed', (t) => this.setTimer(t as number));
    bus.on('game:over', (score) => this.showGameOver(score as number));
  }

  private setScore(score: number): void {
    this.scoreEl.textContent = `Điểm: ${Math.round(score)}`;
  }

  private setCombo(streak: number): void {
    this.comboEl.textContent = streak > 0 ? `⭐ Combo x${streak}` : '';
  }

  private setTimer(t: number): void {
    this.timerEl.textContent = `${Math.ceil(t)}`;
  }

  private showGameOver(score: number): void {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:16px;';
    const title = document.createElement('div');
    title.textContent = 'HẾT GIỜ!';
    title.style.cssText = 'font-size:48px;font-weight:bold;';
    const scoreEl = document.createElement('div');
    scoreEl.textContent = `Điểm: ${Math.round(score)}`;
    scoreEl.style.cssText = 'font-size:32px;';
    const btn = document.createElement('button');
    btn.textContent = 'CHƠI LẠI';
    btn.style.cssText =
      'padding:12px 28px;font-size:24px;font-weight:bold;border:none;border-radius:10px;background:#0b5cff;color:#fff;';
    btn.addEventListener('pointerdown', () => window.location.reload());
    overlay.append(title, scoreEl, btn);
    document.getElementById('ui')!.appendChild(overlay);
  }
}
