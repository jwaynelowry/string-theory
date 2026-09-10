import { attachHeadless, Game } from './Game';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const hud = document.querySelector<HTMLElement>('#hud')!;
const ui = document.querySelector<HTMLElement>('#ui')!;

const game = new Game(canvas, hud, ui);
attachHeadless(game);
game.startLoop();

canvas.addEventListener('click', () => {
  game.audio.unlock();
});
