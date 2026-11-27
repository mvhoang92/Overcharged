import { Game } from './game/Game';

document.addEventListener('contextmenu', (e) => e.preventDefault());

const game = new Game(document.getElementById('game')!);
game.start();

declare global {
  interface Window {
    game: Game;
  }
}
window.game = game;
