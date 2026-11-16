import './style.css';
import { Game } from './game/Game';

const canvas = document.getElementById('game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('Game canvas is missing.');
}

const game = new Game(canvas);

game.init().catch((error: unknown) => {
  console.error(error);
  const startScreen = document.getElementById('start-screen');
  if (startScreen) {
    startScreen.innerHTML = `
      <div class="screen-card compact danger">
        <div class="eyebrow">BOOT FAILED</div>
        <h2>训练场启动失败</h2>
        <p class="lead">请打开浏览器控制台查看错误；建议使用最新版 Chrome 或 Edge。</p>
      </div>
    `;
  }
});
