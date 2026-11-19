import * as THREE from 'three';
import type { UpgradeDefinition } from './UpgradeSystem';

type DamageKind = 'enemy' | 'player';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing HUD element: #${id}`);
  return found as T;
}

export class Hud {
  private readonly hpFill = element<HTMLDivElement>('hp-fill');
  private readonly hpText = element<HTMLSpanElement>('hp-text');
  private readonly manaFill = element<HTMLDivElement>('mana-fill');
  private readonly manaText = element<HTMLSpanElement>('mana-text');
  private readonly xpFill = element<HTMLDivElement>('xp-fill');
  private readonly xpText = element<HTMLSpanElement>('xp-text');
  private readonly levelText = element<HTMLSpanElement>('level-text');
  private readonly killsText = element<HTMLElement>('kills-text');
  private readonly goldText = element<HTMLElement>('gold-text');
  private readonly timer = element<HTMLDivElement>('match-timer');
  private readonly perf = element<HTMLDivElement>('perf');
  private readonly targetPanel = element<HTMLDivElement>('target-panel');
  private readonly targetHpText = element<HTMLSpanElement>('target-hp-text');
  private readonly targetHpFill = element<HTMLDivElement>('target-hp-fill');
  private readonly targetPhase = element<HTMLDivElement>('target-phase');
  private readonly targetName = element<HTMLSpanElement>('target-name');
  private readonly bossIntro = element<HTMLDivElement>('boss-intro');
  private readonly bossIntroTitle = element<HTMLHeadingElement>('boss-intro-title');
  private readonly bossIntroSubtitle = element<HTMLParagraphElement>('boss-intro-subtitle');
  private readonly hitDirection = element<HTMLDivElement>('hit-direction');
  private readonly helpScreen = element<HTMLDivElement>('help-screen');
  private readonly helpClose = element<HTMLButtonElement>('help-close');
  private readonly victoryScreen = element<HTMLDivElement>('victory-screen');
  private readonly victorySummary = element<HTMLParagraphElement>('victory-summary');
  private readonly victoryBest = element<HTMLParagraphElement>('victory-best');
  private readonly victoryRetry = element<HTMLButtonElement>('victory-retry-button');
  private readonly victoryTitle = element<HTMLHeadingElement>('victory-title');
  private readonly deathTitle = element<HTMLHeadingElement>('death-title');
  private readonly upgradeScreen = element<HTMLDivElement>('upgrade-screen');
  private readonly upgradeSubtitle = element<HTMLParagraphElement>('upgrade-subtitle');
  private readonly upgradeOptions = element<HTMLDivElement>('upgrade-options');
  private readonly crosshair = element<HTMLDivElement>('crosshair');
  private readonly hitmarker = element<HTMLDivElement>('hitmarker');
  private readonly markStacks = element<HTMLDivElement>('mark-stacks');
  private readonly markPips = Array.from(
    this.markStacks.querySelectorAll<HTMLSpanElement>('span'),
  );
  private readonly damageLayer = element<HTMLDivElement>('damage-layer');
  private readonly toastEl = element<HTMLDivElement>('toast');
  private readonly abilityElements = {
    q: {
      mask: element<HTMLDivElement>('q-cooldown-mask'),
      text: element<HTMLSpanElement>('q-cooldown-text'),
      card: element<HTMLDivElement>('ability-q'),
    },
    w: {
      mask: element<HTMLDivElement>('w-cooldown-mask'),
      text: element<HTMLSpanElement>('w-cooldown-text'),
      card: element<HTMLDivElement>('ability-w'),
    },
    e: {
      mask: element<HTMLDivElement>('e-cooldown-mask'),
      text: element<HTMLSpanElement>('e-cooldown-text'),
      card: element<HTMLDivElement>('ability-e'),
    },
    r: {
      mask: element<HTMLDivElement>('r-cooldown-mask'),
      text: element<HTMLSpanElement>('r-cooldown-text'),
      card: element<HTMLDivElement>('ability-r'),
    },
  } as const;
  private readonly basicAbility = element<HTMLDivElement>('ability-basic');
  private readonly cameraMode = element<HTMLSpanElement>('camera-mode');
  private readonly startScreen = element<HTMLDivElement>('start-screen');
  private readonly startButton = element<HTMLButtonElement>('start-button');
  private readonly pauseScreen = element<HTMLDivElement>('pause-screen');
  private readonly deathScreen = element<HTMLDivElement>('death-screen');
  private readonly deathCountdown = element<HTMLParagraphElement>('death-countdown');
  private readonly respawnButton = element<HTMLButtonElement>('respawn-button');

  private toastTimer = 0;
  private hitmarkerTimer = 0;
  private hitDirectionTimer = 0;

  constructor() {
    this.setHealth(100, 100);
    this.setMana(160, 160);
  }

  setHealth(current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    this.hpFill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `${Math.max(0, Math.ceil(current))} / ${max}`;
    this.setLowHealth(ratio <= 0.3);
  }

  setMana(current: number, max: number): void {
    const ratio = Math.max(0, Math.min(1, current / max));
    this.manaFill.style.width = `${ratio * 100}%`;
    this.manaText.textContent = `${Math.max(0, Math.ceil(current))} / ${max}`;
  }

  setLevel(level: number): void {
    this.levelText.textContent = `Lv.${level}`;
  }

  setExperience(current: number, required: number, level: number): void {
    if (level >= 20) {
      this.xpFill.style.width = '100%';
      this.xpText.textContent = 'MAX LEVEL';
      return;
    }
    const ratio = required > 0 ? Math.max(0, Math.min(1, current / required)) : 0;
    this.xpFill.style.width = `${ratio * 100}%`;
    this.xpText.textContent = `${Math.floor(current)} / ${Math.floor(required)} XP`;
  }

  setKills(kills: number): void {
    this.killsText.textContent = String(kills);
  }

  setGold(gold: number): void {
    this.goldText.textContent = String(Math.max(0, Math.floor(gold)));
  }

  setTimer(seconds: number): void {
    const whole = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(whole / 60);
    const rest = whole % 60;
    this.timer.textContent = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  setPerf(fps: number, drawCalls: number, triangles: number): void {
    this.perf.textContent = `FPS ${String(Math.round(fps)).padStart(3, ' ')} · DRAW ${drawCalls} · TRI ${Math.round(triangles / 1000)}k`;
  }

  setMode(mode: 'first' | 'third'): void {
    this.cameraMode.textContent = mode === 'first' ? '第一人称' : '第三人称';
  }

  setAbilityCooldown(
    slot: 'q' | 'w' | 'e' | 'r',
    remaining: number,
    total: number,
  ): void {
    const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
    const ability = this.abilityElements[slot];
    ability.mask.style.height = `${ratio * 100}%`;
    ability.text.textContent = remaining > 0 ? remaining.toFixed(1) : '';
    ability.card.classList.toggle('ready', remaining <= 0);
  }

  setCooldown(remaining: number, total: number): void {
    this.setAbilityCooldown('q', remaining, total);
  }

  setMarks(stacks: number): void {
    this.markStacks.classList.toggle('hidden', stacks <= 0);
    this.markPips.forEach((pip, index) => {
      pip.classList.toggle('active', index < stacks);
    });
  }

  pulseBasic(): void {
    this.basicAbility.classList.add('firing');
    window.setTimeout(() => this.basicAbility.classList.remove('firing'), 90);
  }

  pulseAbility(slot: 'q' | 'w' | 'e' | 'r'): void {
    const card = this.abilityElements[slot].card;
    card.classList.add('firing');
    window.setTimeout(() => card.classList.remove('firing'), 120);
  }

  pulseQ(): void {
    this.pulseAbility('q');
  }

  setTarget(
    visible: boolean,
    hp = 0,
    max = 1,
    phase = '第一阶段',
    name = '星蚀守卫',
  ): void {
    this.targetPanel.classList.toggle('hidden', !visible);
    if (!visible) return;

    const ratio = Math.max(0, Math.min(1, hp / max));
    this.targetHpFill.style.width = `${ratio * 100}%`;
    this.targetHpText.textContent = `${Math.max(0, Math.ceil(hp))} / ${max}`;
    this.targetPhase.textContent = phase;
    this.targetName.textContent = name;
  }

  showVictory(
    seconds: number,
    health: number,
    level: number,
    best: number | null,
    newBest: boolean,
    bossName = '星蚀守卫',
  ): void {
    this.victoryTitle.textContent = `${bossName}已倒下`;
    this.victorySummary.textContent =
      `用时 ${formatSeconds(seconds)} · 剩余生命 ${Math.ceil(health)} · Lv.${level}`;
    this.victoryBest.textContent =
      best === null
        ? '本地最快：暂无记录'
        : `本地最快 ${formatSeconds(best)}${newBest ? ' · 新纪录' : ''}`;
    this.victoryScreen.classList.remove('hidden');
  }

  hideVictory(): void {
    this.victoryScreen.classList.add('hidden');
  }

  bindVictoryRetry(callback: () => void): void {
    this.victoryRetry.addEventListener('click', callback);
  }

  showUpgrades(
    round: number,
    options: UpgradeDefinition[],
    onPick: (id: UpgradeDefinition['id']) => void,
  ): void {
    this.upgradeSubtitle.textContent = `第 ${round} 个 Boss 前 · 选择一个星辉强化`;
    this.upgradeOptions.replaceChildren();

    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'upgrade-option';

      const glyph = document.createElement('div');
      glyph.className = 'upgrade-glyph';
      glyph.textContent = option.glyph;

      const name = document.createElement('strong');
      name.textContent = option.name;

      const description = document.createElement('span');
      description.textContent = option.description;

      button.append(glyph, name, description);
      button.addEventListener('click', () => {
        this.hideUpgrades();
        onPick(option.id);
      });
      this.upgradeOptions.appendChild(button);
    }

    this.upgradeScreen.classList.remove('hidden');
  }

  hideUpgrades(): void {
    this.upgradeScreen.classList.add('hidden');
  }

  setCrosshairTargeting(targeting: boolean): void {
    this.crosshair.classList.toggle('targeting', targeting);
  }

  hitMarker(): void {
    window.clearTimeout(this.hitmarkerTimer);
    this.hitmarker.classList.remove('active');
    void this.hitmarker.offsetWidth;
    this.hitmarker.classList.add('active');
    this.hitmarkerTimer = window.setTimeout(() => {
      this.hitmarker.classList.remove('active');
    }, 180);
  }

  showBossIntro(title: string, subtitle: string): void {
    this.bossIntroTitle.textContent = title;
    this.bossIntroSubtitle.textContent = subtitle;
    this.bossIntro.classList.remove('hidden');
  }

  hideBossIntro(): void {
    this.bossIntro.classList.add('hidden');
  }

  showHitDirection(angleRadians: number): void {
    this.hitDirection.style.setProperty('--hit-angle', `${angleRadians}rad`);
    this.hitDirection.classList.remove('hidden');
    window.clearTimeout(this.hitDirectionTimer);
    this.hitDirectionTimer = window.setTimeout(() => {
      this.hitDirection.classList.add('hidden');
    }, 520);
  }

  showHelp(): void {
    this.helpScreen.classList.remove('hidden');
  }

  hideHelp(): void {
    this.helpScreen.classList.add('hidden');
  }

  bindHelpClose(callback: () => void): void {
    this.helpClose.addEventListener('click', callback);
  }

  showDamage(
    worldPosition: THREE.Vector3,
    camera: THREE.Camera,
    amount: number,
    kind: DamageKind,
  ): void {
    const projected = worldPosition.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) return;

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    if (x < -40 || x > window.innerWidth + 40 || y < -40 || y > window.innerHeight + 40) {
      return;
    }

    const node = document.createElement('div');
    node.className = `damage-number ${kind}`;
    node.textContent = `-${Math.max(1, Math.round(amount))}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    this.damageLayer.appendChild(node);
    window.setTimeout(() => node.remove(), 760);
  }

  showToast(message: string, duration = 1600): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, duration);
  }

  setLowHealth(low: boolean): void {
    document.body.classList.toggle('low-health', low);
  }

  setStartReady(): void {
    this.startButton.disabled = false;
    this.startButton.textContent = '点击进入星辉峡谷';
  }

  showStart(): void {
    this.startScreen.classList.remove('hidden');
  }

  hideStart(): void {
    this.startScreen.classList.add('hidden');
  }

  showPause(): void {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause(): void {
    this.pauseScreen.classList.add('hidden');
  }

  showDeath(seconds: number, bossName = '星蚀守卫'): void {
    this.deathTitle.textContent = `你被${bossName}击倒了`;
    this.deathCountdown.textContent = `正在重构星辉之躯… ${Math.max(0, Math.ceil(seconds))}`;
    this.respawnButton.disabled = true;
    this.respawnButton.textContent = '等待复活';
    this.deathScreen.classList.remove('hidden');
  }

  setDeathCountdown(seconds: number): void {
    this.deathCountdown.textContent =
      seconds > 0
        ? `正在重构星辉之躯… ${Math.ceil(seconds)}`
        : '星辉已重新凝聚。';
    this.respawnButton.disabled = seconds > 0;
    this.respawnButton.textContent = seconds > 0 ? '等待复活' : '点击复活';
  }

  hideDeath(): void {
    this.deathScreen.classList.add('hidden');
  }

  bindRespawn(callback: () => void): void {
    this.respawnButton.addEventListener('click', callback);
  }
}

function formatSeconds(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}
