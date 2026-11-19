import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { AudioSystem } from './AudioSystem';
import type { DummyShot } from './Dummy';
import { Effects } from './Effects';
import {
  Boss,
  type BossAttackEvent,
  type BossVariant,
} from './boss/Boss';
import { BossAdd } from './boss/BossAdd';
import { BossTelegraph } from './boss/BossTelegraph';
import { RotatingLaser } from './boss/RotatingLaser';
import { LaneMinion } from './lane/LaneMinion';
import { LaneStructure } from './lane/LaneStructure';
import { Hud } from './Hud';
import { InputController } from './InputController';
import { createArtMap } from './art/EnvironmentBuilder';
import { loadArtAssets, type ArtAssets } from './art/AssetLibrary';
import { CharacterView } from './art/CharacterView';
import { PlayerController } from './PlayerController';
import { ProjectileSystem, type ProjectileKind } from './ProjectileSystem';
import { SettingsPanel } from './SettingsPanel';
import {
  loadSettings,
  sanitize,
  saveSettings,
  type ComfortSettings,
} from './SettingsStore';
import { GravityZone } from './abilities/GravityZone';
import { AimPreview } from './abilities/AimPreview';
import { RiftBeam } from './abilities/RiftBeam';
import {
  pickUpgrades,
  UPGRADE_POOL,
  type UpgradeDefinition,
  type UpgradeId,
} from './UpgradeSystem';
import {
  BOSS_MODIFIERS,
  DIFFICULTY_CONFIG,
  pickBossModifier,
  readBestScore,
  readDifficulty,
  saveBestScore,
  saveDifficulty,
  type BossModifier,
  type Difficulty,
} from './RunModifiers';

const FIXED_DT = 1 / 60;
const MAX_STEPS = 5;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_MAX_MANA = 160;
const MAX_LEVEL = 20;
const XP_BASE = 80;
const XP_PER_LEVEL = 30;
const Q_COOLDOWN = 2.4;
const Q_MANA_COST = 25;
const W_COOLDOWN = 7;
const W_MANA_COST = 30;
const E_COOLDOWN = 9;
const E_MANA_COST = 20;
const R_COOLDOWN = 45;
const R_MANA_COST = 50;
const BASIC_COOLDOWN = 0.32;
const BOSS_SEQUENCE: BossVariant[] = ['star', 'void', 'colossus'];
const BOSS_ROUNDS = BOSS_SEQUENCE.length;
const BOSS_CONFIG: Record<BossVariant, { name: string; health: number }> = {
  star: { name: '星蚀守卫', health: 1800 },
  void: { name: '虚空术士', health: 2200 },
  colossus: { name: '星环巨像', health: 2400 },
};
const BOSS_DAMAGE_GROWTH = 0.15;

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private readonly hud = new Hud();
  private readonly audio = new AudioSystem();

  private world!: RAPIER.World;
  private assets!: ArtAssets;
  private player!: PlayerController;
  private dummy!: Boss;
  private readonly bossTelegraphs: BossTelegraph[] = [];
  private readonly bossAdds: Array<{ id: number; add: BossAdd }> = [];
  private nextBossAddId = 1;
  private bossDefeated = false;
  private bossIntroRemaining = 0;
  private bossTransitionRemaining = 0;
  private bossInvulnerableTime = 0;
  private rotatingLaser: RotatingLaser | null = null;
  private laserTime = 0;
  private laserDamageCooldown = 0;
  private gravityPullTime = 0;
  private mageView!: CharacterView;
  private enemyView!: CharacterView;
  private projectiles!: ProjectileSystem;
  private effects!: Effects;
  private input!: InputController;
  private mageActionLock = 0;
  private enemyActionLock = 0;
  private isMoving = false;

  private viewmodel!: THREE.Group;
  private staffTip!: THREE.Mesh;
  private readonly viewmodelBase = new THREE.Vector3(0.42, -0.58, -1.08);

  private readonly settings: ComfortSettings = loadSettings();
  private settingsPanel!: SettingsPanel;
  private helpOpen = false;
  private cameraMode: 'first' | 'third' = this.settings.cameraMode;
  private started = false;
  private running = false;
  private playerDead = false;
  private deathRemaining = 0;

  private playerHealth = PLAYER_MAX_HEALTH;
  private playerMana = PLAYER_MAX_MANA;
  private playerLevel = 1;
  private playerXp = 0;
  private damageDealt = 0;
  private damageTaken = 0;
  private hitCount = 0;
  private hitStopRemaining = 0;
  private bestTime: number | null = readBestTime();
  private bestScore: number | null = readBestScore();
  private difficulty: Difficulty = readDifficulty();
  private bossModifier: BossModifier = pickBossModifier();
  private gameMode: 'boss' | 'lane' = 'boss';
  private shopOpen = false;
  private shopDamageBonus = 0;
  private shopHealthBonus = 0;
  private shopCooldownBonus = 0;
  private shopItemsBought = 0;
  private readonly laneMinions: LaneMinion[] = [];
  private readonly laneStructures: LaneStructure[] = [];
  private laneWaveTimer = 0;
  private laneNextId = 100000;
  private laneNextStructureId = 200000;
  private laneEnemyAttackTimer = 1.2;
  private runRound = 1;
  private readonly upgrades = new Map<UpgradeId, number>();
  private runFinished = false;
  private upgradePending = false;
  private qCooldown = 0;
  private wCooldown = 0;
  private eCooldown = 0;
  private rCooldown = 0;
  private basicCooldown = 0;
  private qCharge = 0;
  private qHeld = false;
  private markStacks = 0;
  private markTimer = 0;
  private debugGravity = '';
  private debugBossAttack = '';
  private invulnerableTime = 0;
  private readonly gravityZones: GravityZone[] = [];
  private wPreview!: AimPreview;
  private wAiming = false;
  private readonly wAimPoint = new THREE.Vector3();
  private beam!: RiftBeam;
  private beamActiveTime = 0;
  private beamTickTimer = 0;
  private kills = 0;
  private gold = 0;
  private elapsed = 0;

  private lastTime = 0;
  private accumulator = 0;
  private smoothedEyeY = 1.7;
  private cameraInitialized = false;
  private snapCamera = true;
  private fpsFrames = 0;
  private fpsTime = 0;
  private viewmodelKick = 0;
  private bobTime = 0;
  private shakeTime = 0;
  private shakeStrength = 0;

  private readonly respawnPosition = new THREE.Vector3(-20, 0.85, 0);

  private get maxHealth(): number {
    return (
      PLAYER_MAX_HEALTH +
      (this.playerLevel - 1) * 8 +
      (this.upgrades.get('vitality') ?? 0) * 25 +
      this.shopHealthBonus
    );
  }

  private get maxMana(): number {
    return PLAYER_MAX_MANA + (this.playerLevel - 1) * 7;
  }

  private get xpToNext(): number {
    return XP_BASE + (this.playerLevel - 1) * XP_PER_LEVEL;
  }

  private get damageMultiplier(): number {
    return (1 + (this.playerLevel - 1) * 0.045) * (1 + this.shopDamageBonus);
  }

  private get cooldownMultiplier(): number {
    return Math.max(
      0.35,
      (1 - (this.playerLevel - 1) * 0.02) *
        (1 - (this.upgrades.get('cooldown') ?? 0) * 0.1) *
        (1 - this.shopCooldownBonus),
    );
  }

  private get attackSpeedMultiplier(): number {
    return (
      (1 + (this.playerLevel - 1) * 0.02) *
      (1 + (this.upgrades.get('basicSpeed') ?? 0) * 0.15)
    );
  }

  private get qChargeRate(): number {
    return 1 + (this.upgrades.get('qCharge') ?? 0) * 0.3;
  }

  private get wRadius(): number {
    const synergy =
      this.upgrades.has('wRadius') && this.upgrades.has('voidRadius') ? 1.1 : 1;
    return (
      5.2 *
      (1 + (this.upgrades.get('wRadius') ?? 0) * 0.25) *
      synergy
    );
  }

  private get qMarkSynergy(): boolean {
    return this.upgrades.has('qCharge') && this.upgrades.has('markDamage');
  }

  private get eCooldownMultiplier(): number {
    return Math.max(0.4, 1 - (this.upgrades.get('eCooldown') ?? 0) * 0.2);
  }

  private get rDamageMultiplier(): number {
    return 1 + (this.upgrades.get('rDamage') ?? 0) * 0.3;
  }

  private get markDamageMultiplier(): number {
    return 1 + (this.upgrades.get('markDamage') ?? 0) * 0.5;
  }

  private get voidHomingMultiplier(): number {
    return 1 + (this.upgrades.get('voidHoming') ?? 0) * 0.25;
  }

  private get voidRadiusMultiplier(): number {
    return 1 + (this.upgrades.get('voidRadius') ?? 0) * 0.2;
  }

  private get currentBossKind(): BossVariant {
    return BOSS_SEQUENCE[Math.min(this.runRound - 1, BOSS_ROUNDS - 1)];
  }

  private get bossDisplayName(): string {
    return this.gameMode === 'lane'
      ? '敌方英雄'
      : BOSS_CONFIG[this.currentBossKind].name;
  }

  private get bossRoundHealth(): number {
    return this.gameMode === 'lane'
      ? 1200
      : BOSS_CONFIG[this.currentBossKind].health;
  }

  private get difficultyConfig() {
    return DIFFICULTY_CONFIG[this.difficulty];
  }

  private get modifierDefinition() {
    return BOSS_MODIFIERS[this.bossModifier];
  }

  private get bossDamageTakenMultiplier(): number {
    return this.bossModifier === 'shield' ? 0.85 : 1;
  }

  private get bossAttackCooldownScale(): number {
    return (
      this.difficultyConfig.attackCooldownScale *
      (this.bossModifier === 'berserk' ? 0.85 : 1)
    );
  }

  private get buildSummary(): string[] {
    const summary: string[] = [];
    for (const [id, count] of this.upgrades) {
      const definition = UPGRADE_POOL.find((upgrade) => upgrade.id === id);
      if (definition) {
        summary.push(count > 1 ? `${definition.name} ×${count}` : definition.name);
      }
    }
    if (this.qMarkSynergy) summary.push('联动：星辉连锁');
    if (this.upgrades.has('wRadius') && this.upgrades.has('voidRadius')) {
      summary.push('联动：奇点扩张');
    }
    return summary;
  }

  private computeScore(): number {
    const timeScore = Math.max(0, 18000 - this.elapsed * 40);
    const healthScore = Math.round(this.playerHealth * 15);
    const levelScore = this.playerLevel * 120;
    const modifierBonus = this.bossModifier === 'none' ? 0 : 1500;
    return Math.round(
      5000 +
        timeScore +
        healthScore +
        levelScore +
        this.difficultyConfig.scoreBonus +
        modifierBonus,
    );
  }

  private get bossRoundDamage(): number {
    return (
      (1 + (this.runRound - 1) * BOSS_DAMAGE_GROWTH) *
      this.difficultyConfig.bossDamageScale *
      (this.bossModifier === 'berserk' ? 1.15 : 1)
    );
  }

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.05, 180);
    this.camera.rotation.order = 'YXZ';
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });

    this.setupRenderer();
    this.scene.add(this.camera);
  }

  async init(): Promise<void> {
    await RAPIER.init();
    this.assets = await loadArtAssets();

    this.world = new RAPIER.World({ x: 0, y: -26, z: 0 });
    this.world.timestep = FIXED_DT;

    const spawns = createArtMap(this.scene, this.world, this.assets);
    this.respawnPosition.copy(spawns.playerSpawn);

    this.player = new PlayerController(this.world, this.scene, spawns.playerSpawn);
    this.player.setVisualVisible(false);

    this.mageView = new CharacterView(
      this.assets.mage,
      0.5,
      undefined,
      0x142a66,
      true,
      1.2,
      0.78,
    );
    this.mageView.setVisible(false);
    this.scene.add(this.mageView.root);

    this.dummy = new Boss(this.world, spawns.dummySpawn, {
      onAttack: (attack) => this.onBossAttack(attack),
      onBarrage: (origin, directions) => this.onBossBarrage(origin, directions),
      onPhaseTwo: () => this.onBossPhaseTwo(),
      onSummon: () => this.onBossSummon(),
      onDeath: () => this.onDummyDeath(),
      onTeleport: (position) => this.onBossTeleport(position),
      onHomingOrbs: (origin, count) => this.onBossHomingOrbs(origin, count),
      onMirror: () => this.onBossMirror(),
      onLaser: () => this.onBossLaser(),
      onGravity: () => this.onBossGravity(),
      onMeteors: (center, count) => this.onBossMeteors(center, count),
    });
    this.dummy.setVariant(this.currentBossKind);
    this.dummy.setMaxHealth(this.bossRoundHealth);
    this.applyBossModifiers();
    this.dummy.setPrimitiveVisible(false);
    this.enemyView = this.createEnemyView(this.currentBossKind);
    this.enemyView.setPosition(
      spawns.dummySpawn.x,
      this.enemyView.groundOffset,
      spawns.dummySpawn.z,
    );
    this.scene.add(this.enemyView.root);

    this.projectiles = new ProjectileSystem(this.scene);
    this.effects = new Effects(this.scene);
    this.wPreview = new AimPreview(this.scene, 5.2);
    this.beam = new RiftBeam(this.scene);
    this.createViewmodel();

    this.input = new InputController(
      this.canvas,
      (locked) => this.handleLockChange(locked),
      (message) => this.handleLockError(message),
    );

    this.settingsPanel = new SettingsPanel(
      this.settings,
      (settings) => {
        this.applySettings(settings);
        saveSettings(this.settings);
      },
      () => this.closeSettings(),
    );
    this.applySettings(this.settings, false);

    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.hud.setMana(this.playerMana, this.maxMana);
    this.hud.setLevel(this.playerLevel);
    this.hud.setExperience(this.playerXp, this.xpToNext, this.playerLevel);
    this.hud.setKills(0);
    this.hud.setGold(0);
    this.hud.setAbilityCooldown('q', 0, Q_COOLDOWN);
    this.hud.setAbilityCooldown('w', 0, W_COOLDOWN);
    this.hud.setAbilityCooldown('e', 0, E_COOLDOWN);
    this.hud.setAbilityCooldown('r', 0, R_COOLDOWN);
    this.hud.setMode(this.cameraMode);
    this.hud.setTimer(0);

    this.bindUI();
    this.hud.setStartReady();
    this.updateCamera(0);
    this.dummy.update(0, this.player.position);
    this.renderer.info.reset();
    this.composer.render();

    this.lastTime = performance.now();
    requestAnimationFrame(this.animate);
    this.exposeDebugApi();
  }

  private exposeDebugApi(): void {
    if (!import.meta.env.DEV) return;

    (window as unknown as {
      __fpMoba?: {
        state: () => Record<string, unknown>;
        faceDummy: () => void;
        damageDummy: (amount: number) => void;
        damagePlayer: (amount: number) => void;
        damageAdds: (amount: number) => void;
        damageLaneMinions: (amount: number) => void;
        damageLaneStructures: (amount: number) => void;
        addGold: (amount: number) => void;
        damagePlayerFrom: (x: number, z: number) => void;
      };
    }).__fpMoba = {
      state: () => ({
        running: this.running,
        playerDead: this.playerDead,
        yaw: this.input.yaw,
        pitch: this.input.pitch,
        player: this.player.position.toArray(),
        dummyHealth: this.dummy.health,
        dummyMaxHealth: this.dummy.maxHealth,
        dummyAlive: this.dummy.alive,
        dummyPhase: this.dummy.phase,
        bossDefeated: this.bossDefeated,
        bossTelegraphs: this.bossTelegraphs.length,
        debugBossAttack: this.debugBossAttack,
        dummyPosition: this.dummy.position.toArray(),
        playerHealth: this.playerHealth,
        runRound: this.runRound,
        bossKind: this.currentBossKind,
        bossName: this.bossDisplayName,
        difficulty: this.difficulty,
        gameMode: this.gameMode,
        laneMinions: this.laneMinions.map((minion) => ({
          team: minion.team,
          health: minion.health,
          position: minion.position.toArray(),
        })),
        laneStructures: this.laneStructures.map((structure) => ({
          kind: structure.kind,
          health: structure.health,
          alive: structure.alive,
        })),
        gold: this.gold,
        shopItemsBought: this.shopItemsBought,
        shopDamageBonus: this.shopDamageBonus,
        shopCooldownBonus: this.shopCooldownBonus,
        kills: this.kills,
        bossModifier: this.bossModifier,
        build: this.buildSummary,
        score: this.computeScore(),
        upgrades: Object.fromEntries(this.upgrades),
        bossIntroRemaining: this.bossIntroRemaining,
        bossTransitionRemaining: this.bossTransitionRemaining,
        bossInvulnerableTime: this.bossInvulnerableTime,
        bossAdds: this.bossAdds.length,
        laserTime: this.laserTime,
        gravityPullTime: this.gravityPullTime,
        playerLevel: this.playerLevel,
        playerXp: this.playerXp,
        xpToNext: this.xpToNext,
        maxHealth: this.maxHealth,
        maxMana: this.maxMana,
        dummyRespawnTimer: this.dummy.respawnTimerValue,
        cameraMode: this.cameraMode,
        projectiles: this.projectiles.count,
        qCooldown: this.qCooldown,
        wCooldown: this.wCooldown,
        wAiming: this.wAiming,
        wAimPoint: this.wAimPoint.toArray(),
        wPreviewVisible: this.wPreview.visible,
        eCooldown: this.eCooldown,
        rCooldown: this.rCooldown,
        markStacks: this.markStacks,
        beamActive: this.beamActiveTime > 0,
        debugGravity: this.debugGravity,
        keys: [...this.input.keys],
        pointerLocked: this.input.isLocked,
      }),
      faceDummy: () => {
        const target = this.dummy.position.clone().add(new THREE.Vector3(0, 0.55, 0));
        const eye = this.player.position.clone().add(new THREE.Vector3(0, 0.82, 0));
        const dx = target.x - eye.x;
        const dz = target.z - eye.z;
        const horizontal = Math.hypot(dx, dz);
        this.input.yaw = Math.atan2(-dx, -dz);
        this.input.pitch = Math.atan2(target.y - eye.y, Math.max(0.001, horizontal));
        this.updateCamera(0);
      },
      damageDummy: (amount: number) => {
        this.onDummyHit(
          amount,
          this.dummy.position.clone().add(new THREE.Vector3(0, 0.45, 0)),
          'q',
        );
      },
      damagePlayer: (amount: number) => {
        this.onPlayerHit(
          amount,
          this.player.position.clone().add(new THREE.Vector3(0, 0.2, 0)),
          'enemy',
        );
      },
      damageAdds: (amount: number) => {
        for (const { id, add } of [...this.bossAdds]) {
          this.onBossAddHit(id, amount, add.position.clone(), 'q');
        }
      },
      damageLaneMinions: (amount: number) => {
        for (const minion of [...this.laneMinions]) {
          if (minion.team === 'enemy' && minion.alive) {
            this.onLaneMinionHit(
              minion.id,
              amount,
              minion.position.clone(),
              'q',
            );
          }
        }
      },
      damageLaneStructures: (amount: number) => {
        for (const structure of [...this.laneStructures]) {
          if (structure.alive) {
            structure.takeDamage(amount);
          }
        }
      },
      addGold: (amount: number) => {
        this.gold += amount;
        this.hud.setGold(this.gold);
        this.updateShopGold();
      },
      damagePlayerFrom: (x: number, z: number) => {
        const point = this.player.position.clone();
        point.x += x;
        point.z += z;
        point.y += 0.2;
        this.onPlayerHit(5, point, 'enemy');
      },
    };
  }

  private createEnemyView(kind: BossVariant): CharacterView {
    const isVoid = kind === 'void';
    const isColossus = kind === 'colossus';
    const view = new CharacterView(
      this.assets.skeleton,
      isColossus ? 1.45 : isVoid ? 1.08 : 1.15,
      isColossus ? 0xffc36b : isVoid ? 0xc99bff : 0x8a91a8,
      isColossus ? 0x7a3d00 : isVoid ? 0x4f1688 : 0x4b0b1f,
    );
    view.setPosition(
      this.dummy.position.x,
      view.groundOffset,
      this.dummy.position.z,
    );
    return view;
  }

  private replaceEnemyView(): void {
    this.enemyView.root.removeFromParent();
    this.enemyView = this.createEnemyView(this.currentBossKind);
    this.scene.add(this.enemyView.root);
    this.enemyView.setVisible(true);
    this.enemyView.play('Idle', 0);
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.52,
      0.55,
      0.9,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private bindUI(): void {
    document.getElementById('start-button')?.addEventListener('click', () => {
      void this.start();
    });
    document.getElementById('resume-button')?.addEventListener('click', () => {
      void this.resume();
    });
    document.getElementById('start-settings-button')?.addEventListener('click', () => {
      this.openSettings();
    });
    document.getElementById('pause-settings-button')?.addEventListener('click', () => {
      this.openSettings();
    });
    document.getElementById('start-help-button')?.addEventListener('click', () => {
      this.openHelp();
    });
    const modeSelect = document.getElementById(
      'mode-select',
    ) as HTMLSelectElement | null;
    if (modeSelect) {
      modeSelect.value = this.gameMode;
      modeSelect.addEventListener('change', () => {
        this.gameMode = modeSelect.value === 'lane' ? 'lane' : 'boss';
        this.updateStartMeta();
      });
    }
    const difficultySelect = document.getElementById(
      'difficulty-select',
    ) as HTMLSelectElement | null;
    if (difficultySelect) {
      difficultySelect.value = this.difficulty;
      difficultySelect.addEventListener('change', () => {
        const value = difficultySelect.value;
        if (value === 'easy' || value === 'normal' || value === 'hard') {
          this.difficulty = value;
          saveDifficulty(value);
          this.applyBossModifiers();
          this.updateStartMeta();
        }
      });
    }
    this.updateStartMeta();
    document.getElementById('pause-help-button')?.addEventListener('click', () => {
      this.openHelp();
    });
    this.hud.bindHelpClose(() => this.closeHelp());
    document.getElementById('shop-close')?.addEventListener('click', () => {
      this.closeShop();
    });
    document.querySelectorAll<HTMLButtonElement>('[data-shop-item]').forEach((button) => {
      button.addEventListener('click', () => {
        this.buyShopItem(button.dataset.shopItem ?? '');
      });
    });
    this.hud.bindRespawn(() => this.respawn());
    this.hud.bindVictoryRetry(() => this.restartBoss());
  }

  private async start(): Promise<void> {
    if (this.playerDead) return;

    this.started = true;
    this.running = true;
    this.settingsPanel?.hide();
    this.helpOpen = false;
    this.shopOpen = false;
    this.hud.hideHelp();
    document.getElementById('shop-screen')?.classList.add('hidden');
    this.hud.hideStart();
    this.hud.hidePause();
    this.audio.resume();
    this.audio.startMusic(1);
    this.hud.showToast('舒适模式：第三人称 · FOV 70 · 无武器晃动 · V 切换第一人称', 3200);
    if (this.gameMode === 'lane') {
      this.setupLaneMode();
    } else {
      this.beginBossIntro();
    }
    this.lastTime = performance.now();
    this.accumulator = 0;

    const locked = await this.input.requestLock();
    if (!locked) {
      this.running = false;
      this.hud.showPause();
    }
  }

  private async resume(): Promise<void> {
    if (this.playerDead) return;

    this.settingsPanel?.hide();
    this.helpOpen = false;
    this.shopOpen = false;
    this.hud.hideHelp();
    document.getElementById('shop-screen')?.classList.add('hidden');
    this.hud.hidePause();
    this.audio.resume();
    this.audio.startMusic(this.dummy.phase);
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;

    const locked = await this.input.requestLock();
    if (!locked) {
      this.running = false;
      this.hud.showPause();
    }
  }

  private cancelWAim(): void {
    this.wAiming = false;
    this.wPreview?.setVisible(false);
  }

  private applyBossModifiers(): void {
    this.dummy.setAttackCooldownScale(this.bossAttackCooldownScale);
  }

  private setupLaneMode(): void {
    this.clearLaneMinions();
    this.clearLaneStructures();
    this.laneWaveTimer = 1.5;
    this.laneEnemyAttackTimer = 1.2;
    this.dummy.setVariant('star');
    this.dummy.setMaxHealth(1200);
    this.applyBossModifiers();
    this.dummy.respawn();
    this.replaceEnemyView();
    this.spawnLaneStructures();
    this.beginBossIntro(1.4);
    this.hud.showToast('中路试炼：清兵、推塔，击破敌方水晶', 2600);
  }

  private spawnLaneStructures(): void {
    this.laneStructures.push(
      new LaneStructure(
        this.world,
        this.scene,
        new THREE.Vector3(14, 1.6, 3),
        this.laneNextStructureId++,
        'tower',
        (damage) =>
          this.onPlayerHit(damage, this.player.position.clone(), 'enemy'),
        () => this.hud.showToast('敌方防御塔已摧毁', 1200),
      ),
      new LaneStructure(
        this.world,
        this.scene,
        new THREE.Vector3(17, 1.4, 0),
        this.laneNextStructureId++,
        'nexus',
        () => {},
        () => this.finishLaneRun(),
      ),
    );
  }

  private clearLaneStructures(): void {
    for (const structure of this.laneStructures.splice(0)) structure.dispose();
  }

  private clearLaneMinions(): void {
    for (const minion of this.laneMinions.splice(0)) minion.dispose();
  }

  private spawnLaneWave(): void {
    for (let index = 0; index < 3; index += 1) {
      const z = (index - 1) * 1.4;
      this.laneMinions.push(
        new LaneMinion(
          this.world,
          this.scene,
          new THREE.Vector3(-12, 0.95, z),
          'player',
          this.laneNextId++,
          () => {},
        ),
      );
      this.laneMinions.push(
        new LaneMinion(
          this.world,
          this.scene,
          new THREE.Vector3(14, 0.95, z),
          'enemy',
          this.laneNextId++,
          () => this.onLaneMinionDeath(),
        ),
      );
    }
    this.hud.showToast('新一波小兵出发', 900);
  }

  private updateLaneEnemyAI(dt: number): void {
    if (!this.dummy.alive) return;
    const current = this.dummy.position;
    const ratio = this.dummy.health / this.dummy.maxHealth;
    const side = current.x >= this.player.position.x ? 1 : -1;
    const targetX =
      ratio < 0.3
        ? 16
        : THREE.MathUtils.clamp(this.player.position.x + side * 5, -11, 15);
    this.dummy.body.setNextKinematicTranslation({
      x: THREE.MathUtils.damp(current.x, targetX, 0.2, dt),
      y: 0.95,
      z: 0,
    });
    this.laneEnemyAttackTimer -= dt;
    if (this.laneEnemyAttackTimer > 0) return;
    this.laneEnemyAttackTimer = ratio < 0.3 ? 2.2 : 1.6;
    const origin = new THREE.Vector3(current.x, 1.45, 0);
    const aim = this.player.position
      .clone()
      .add(new THREE.Vector3(0, 0.25, 0));
    const direction = aim.sub(origin).normalize();
    this.projectiles.spawn(origin, direction, 'enemy', 'dummy', {
      damage: 6,
      speed: 12 * this.difficultyConfig.projectileSpeedScale,
    });
    this.effects.muzzle(origin, 0xff5c7a);
    this.audio.enemyShoot();
  }

  private updateLaneMinions(dt: number): void {
    const minions = [...this.laneMinions];
    for (const minion of minions) {
      if (!minion.alive) continue;
      const opponent = minions
        .filter((other) => other.alive && other.team !== minion.team)
        .sort(
          (a, b) =>
            horizontalDistance(minion.position, a.position) -
            horizontalDistance(minion.position, b.position),
        )[0];
      const structureTarget =
        minion.team === 'player'
          ? this.laneStructures.find((structure) => structure.alive)
          : null;
      const target = opponent
        ? opponent.position
        : minion.team === 'enemy'
          ? this.player.position
          : structureTarget?.position ?? this.dummy.position;
      minion.update(dt, target);

      const distance = horizontalDistance(minion.position, target);
      if (opponent && distance <= 1.8 && minion.tryAttack()) {
        opponent.takeDamage(10);
      } else if (!opponent && distance <= 1.8 && minion.tryAttack()) {
        if (minion.team === 'enemy') {
          this.onPlayerHit(4, this.player.position.clone(), 'enemy');
        } else if (structureTarget) {
          structureTarget.takeDamage(8);
        } else if (this.dummy.alive) {
          this.onDummyHit(8, this.dummy.position.clone(), 'basic');
        }
      }
    }
    for (let index = this.laneMinions.length - 1; index >= 0; index -= 1) {
      if (!this.laneMinions[index].alive) {
        const [dead] = this.laneMinions.splice(index, 1);
        dead.dispose();
      }
    }
  }

  private finishLaneRun(): void {
    if (this.runFinished) return;
    this.runFinished = true;
    this.bossDefeated = true;
    this.running = false;
    this.hud.hideBossIntro();
    this.audio.stopMusic();
    this.input.exitLock();
    const previousBest = this.bestTime;
    const isNewBest = previousBest === null || this.elapsed < previousBest;
    if (isNewBest) {
      this.bestTime = this.elapsed;
      saveBestTime(this.elapsed);
    }
    const score = this.computeScore();
    if (this.bestScore === null || score > this.bestScore) {
      this.bestScore = score;
      saveBestScore(score);
    }
    this.hud.showVictory(
      this.elapsed,
      this.playerHealth,
      this.playerLevel,
      this.bestTime,
      isNewBest,
      '敌方水晶',
      this.buildSummary,
      score,
      this.bestScore,
      this.difficultyConfig.label,
      this.modifierDefinition.label,
    );
  }

  private onLaneMinionDeath(): void {
    this.gold += 12;
    this.kills += 1;
    this.gainExperience(20);
    this.hud.setGold(this.gold);
    this.hud.setKills(this.kills);
  }

  private onLaneStructureHit(
    id: number,
    damage: number,
    point: THREE.Vector3,
  ): void {
    const structure = this.laneStructures.find(
      (item) => item.alive && item.id === id,
    );
    if (!structure) return;
    structure.takeDamage(Math.round(damage * this.damageMultiplier));
    this.hud.hitMarker();
    this.hud.showDamage(
      point,
      this.camera,
      Math.round(damage * this.damageMultiplier),
      'enemy',
    );
    this.effects.impact(point, 0xffc46b, 0.8);
  }

  private onLaneMinionHit(
    id: number,
    damage: number,
    point: THREE.Vector3,
    kind: ProjectileKind,
  ): void {
    const minion = this.laneMinions.find(
      (item) => item.alive && item.id === id,
    );
    if (!minion) return;
    minion.takeDamage(Math.round(damage * this.damageMultiplier));
    this.hud.hitMarker();
    this.hud.showDamage(point, this.camera, Math.round(damage * this.damageMultiplier), 'enemy');
    this.effects.impact(point, kind === 'q' ? 0xc7a4ff : 0x9fe8ff, 0.7);
  }

  private beginBossIntro(duration = 1.5): void {
    this.bossIntroRemaining = duration;
    this.bossTransitionRemaining = 0;
    this.bossInvulnerableTime = duration;
    this.hud.showBossIntro(
      this.bossDisplayName,
      this.gameMode === 'lane'
        ? `中路试炼 · ${this.difficultyConfig.shortLabel}`
        : `Boss ${this.runRound}/${BOSS_ROUNDS} · ${this.difficultyConfig.shortLabel} · ${this.dummy.phaseLabel}`,
    );
  }

  private pause(): void {
    this.running = false;
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.input.exitLock();
    this.hud.showPause();
  }

  private openSettings(): void {
    this.running = false;
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.input.exitLock();
    this.hud.hideStart();
    this.hud.hidePause();
    this.settingsPanel.show(this.settings);
  }

  private closeSettings(): void {
    this.settingsPanel.hide();
    if (!this.started) {
      this.hud.showStart();
    } else if (!this.playerDead) {
      this.hud.showPause();
    }
  }

  private updateStartMeta(): void {
    const label = document.getElementById('boss-modifier-label');
    if (label) {
      label.textContent =
        `本局词缀：${this.modifierDefinition.label} · ` +
        this.modifierDefinition.description;
    }
  }

  private rollBossModifier(): void {
    this.bossModifier = pickBossModifier();
    this.updateStartMeta();
  }

  private openShop(): void {
    if (!this.started || this.playerDead) return;
    this.running = false;
    this.shopOpen = true;
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.input.exitLock();
    this.hud.hidePause();
    const shop = document.getElementById('shop-screen');
    shop?.classList.remove('hidden');
    this.updateShopGold();
  }

  private closeShop(): void {
    this.shopOpen = false;
    document.getElementById('shop-screen')?.classList.add('hidden');
    if (this.started && !this.playerDead) {
      this.hud.showPause();
    }
  }

  private updateShopGold(): void {
    const gold = document.getElementById('shop-gold');
    if (gold) {
      gold.textContent = `金币 ${this.gold} · 装备 ${this.shopItemsBought}/6`;
    }
  }

  private buyShopItem(item: string): void {
    const costs: Record<string, number> = {
      damage: 30,
      health: 30,
      heal: 20,
      staff: 50,
      armor: 50,
      boots: 40,
    };
    const cost = costs[item] ?? 0;
    if (this.gold < cost) {
      this.hud.showToast('金币不足', 700);
      return;
    }
    if (item === 'heal' && this.playerHealth >= this.maxHealth) {
      this.hud.showToast('生命已满', 700);
      return;
    }
    const equipment = item !== 'heal';
    if (equipment && this.shopItemsBought >= 6) {
      this.hud.showToast('装备栏已满', 700);
      return;
    }
    this.gold -= cost;
    if (item === 'damage') {
      this.shopDamageBonus += 0.1;
    } else if (item === 'health') {
      this.shopHealthBonus += 25;
      this.playerHealth += 25;
    } else if (item === 'heal') {
      this.playerHealth = Math.min(this.maxHealth, this.playerHealth + 40);
    } else if (item === 'staff') {
      this.shopDamageBonus += 0.15;
    } else if (item === 'armor') {
      this.shopHealthBonus += 40;
      this.playerHealth += 40;
    } else if (item === 'boots') {
      this.shopCooldownBonus = Math.min(0.24, this.shopCooldownBonus + 0.08);
    }
    if (equipment) this.shopItemsBought += 1;
    this.hud.setGold(this.gold);
    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.updateShopGold();
    this.hud.showToast(equipment ? '装备已装备' : '购买成功', 700);
  }

  private openHelp(): void {
    this.running = false;
    this.helpOpen = true;
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.input.exitLock();
    this.hud.hideStart();
    this.hud.hidePause();
    this.hud.showHelp();
  }

  private closeHelp(): void {
    this.helpOpen = false;
    this.hud.hideHelp();
    if (!this.started) {
      this.hud.showStart();
    } else if (!this.playerDead) {
      this.hud.showPause();
    }
  }

  private applySettings(settings: ComfortSettings, persist = true): void {
    const next = sanitize(settings);
    Object.assign(this.settings, next);

    this.audio.setVolumes(
      next.masterVolume,
      next.sfxVolume,
      next.musicVolume,
    );
    this.camera.fov = next.fov;
    this.camera.updateProjectionMatrix();
    this.cameraMode = next.cameraMode;
    this.snapCamera = true;

    if (this.input) {
      this.input.sensitivity = 0.002 * next.sensitivity;
      this.input.invertY = next.invertY;
    }

    this.applyQuality(next.quality);
    this.hud.setMode(this.cameraMode);
    if (persist) {
      saveSettings(this.settings);
    }
  }

  private applyQuality(quality: ComfortSettings['quality']): void {
    const pixelRatio =
      quality === 'low' ? 1.0 : quality === 'medium' ? 1.5 : 2.0;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
    this.bloomPass.enabled = quality !== 'low';
    this.bloomPass.strength = quality === 'high' ? 0.52 : 0.36;
    this.renderer.shadowMap.enabled = quality !== 'low';
  }

  private handleLockChange(locked: boolean): void {
    if (locked) {
      this.hud.hideStart();
      this.hud.hidePause();
      if (!this.playerDead) {
        this.running = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
      }
      return;
    }

    if (
      this.started &&
      !this.playerDead &&
      !this.settingsPanel?.isOpen &&
      !this.helpOpen &&
      !this.shopOpen
    ) {
      this.running = false;
      this.hud.showPause();
    }
  }

  private handleLockError(message: string): void {
    this.hud.showToast(message, 2600);
    if (this.started && !this.playerDead) {
      this.running = false;
      this.hud.showPause();
    }
  }

  private readonly handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden && this.running) {
      this.pause();
    }
  };

  private readonly animate = (now: number): void => {
    requestAnimationFrame(this.animate);

    const frameDelta = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (this.running && !this.playerDead) {
      if (this.hitStopRemaining > 0) {
        this.hitStopRemaining = Math.max(
          0,
          this.hitStopRemaining - frameDelta,
        );
        this.updateCamera(frameDelta);
        this.updateHud();
      } else {
        this.accumulator += frameDelta;
        let steps = 0;
        while (this.accumulator >= FIXED_DT && steps < MAX_STEPS) {
          this.fixedUpdate(FIXED_DT);
          this.accumulator -= FIXED_DT;
          steps += 1;
        }
        if (steps === MAX_STEPS) {
          this.accumulator = 0;
        }

        this.updateCamera(frameDelta);
        this.updateViewmodel(frameDelta);
        this.updateHud();
      }
    } else if (this.playerDead) {
      this.deathRemaining = Math.max(0, this.deathRemaining - frameDelta);
      this.hud.setDeathCountdown(this.deathRemaining);
      this.updateCamera(frameDelta);
    }

    this.mageView.update(frameDelta);
    this.effects.update(frameDelta);
    this.renderer.info.reset();
    this.composer.render();
    this.updatePerf(frameDelta);
    this.input.endFrame();
  };

  private fixedUpdate(dt: number): void {
    this.elapsed += dt;
    this.qCooldown = Math.max(0, this.qCooldown - dt);
    this.wCooldown = Math.max(0, this.wCooldown - dt);
    this.eCooldown = Math.max(0, this.eCooldown - dt);
    this.rCooldown = Math.max(0, this.rCooldown - dt);
    this.basicCooldown = Math.max(0, this.basicCooldown - dt);
    this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);
    this.markTimer = Math.max(0, this.markTimer - dt);
    if (this.markTimer <= 0) this.markStacks = 0;
    this.bossIntroRemaining = Math.max(0, this.bossIntroRemaining - dt);
    this.bossTransitionRemaining = Math.max(0, this.bossTransitionRemaining - dt);
    this.bossInvulnerableTime = Math.max(0, this.bossInvulnerableTime - dt);
    if (this.bossIntroRemaining < 0.01) this.bossIntroRemaining = 0;
    if (this.bossTransitionRemaining < 0.01) this.bossTransitionRemaining = 0;
    if (this.bossInvulnerableTime < 0.01) this.bossInvulnerableTime = 0;
    if (this.bossIntroRemaining <= 0 && this.bossTransitionRemaining <= 0) {
      this.hud.hideBossIntro();
    }
    this.playerMana = Math.min(this.maxMana, this.playerMana + 10 * dt);

    if (this.input.consumePressed('KeyV')) {
      this.toggleCamera();
    }
    if (
      this.gameMode === 'lane' &&
      this.input.consumePressed('KeyB')
    ) {
      this.openShop();
    }
    if (this.input.consumePressed(this.settings.keyJump) && this.player.jump()) {
      this.effects.castPulse(
        this.player.position.clone().add(new THREE.Vector3(0, 0.3, 0)),
        0x9fe8ff,
      );
    }

    // Q is charge-on-hold, cast-on-release. The pressed edge also catches a quick tap.
    const qPressed = this.input.consumePressed(this.settings.keyQ);
    const qDown = this.input.isDown(this.settings.keyQ);
    if (
      (qPressed || qDown) &&
      !this.qHeld &&
      this.qCooldown <= 0 &&
      this.playerMana >= Q_MANA_COST
    ) {
      this.qHeld = true;
      this.qCharge = qPressed ? 0.08 : 0;
    }
    if (qDown && this.qHeld) {
      this.qCharge = Math.min(1, this.qCharge + (dt / 0.6) * this.qChargeRate);
    } else if (!qDown && this.qHeld) {
      const charge = Math.max(0.08, this.qCharge);
      this.qHeld = false;
      this.qCharge = 0;
      this.castQ(charge);
    }

    // F is hold-to-aim, release-to-cast. W is movement, so the ability lives on F.
    const fPressed = this.input.consumePressed(this.settings.keyF);
    const fDown = this.input.isDown(this.settings.keyF);
    if (fPressed && !this.wAiming) {
      if (this.wCooldown > 0) {
        this.hud.showToast(`引力法阵冷却中 ${this.wCooldown.toFixed(1)}s`, 650);
      } else if (this.playerMana < W_MANA_COST) {
        this.hud.showToast('法力不足', 750);
      } else {
        this.wAiming = true;
        this.wAimPoint.copy(this.getGroundAimPoint(30));
        this.wPreview.setPosition(this.wAimPoint);
        this.wPreview.setVisible(true);
        this.hud.showToast('按住 F 调整落点 · 松开释放', 900);
      }
    }
    if (this.wAiming) {
      if (!fDown) {
        const target = this.wAimPoint.clone();
        this.wAiming = false;
        this.wPreview.setVisible(false);
        this.castW(target);
      } else {
        this.wAimPoint.copy(this.getGroundAimPoint(30));
        this.wPreview.setPosition(this.wAimPoint);
        this.wPreview.update(dt);
      }
    }

    if (this.input.consumePressed(this.settings.keyE)) this.castE();
    if (this.input.consumePressed(this.settings.keyR)) this.castR();

    if (this.input.isFireHeld) {
      this.tryBasicAttack();
    }

    const move = this.input.getMoveVector();
    this.isMoving = move.x !== 0 || move.z !== 0;
    this.mageActionLock = Math.max(0, this.mageActionLock - dt);
    this.enemyActionLock = Math.max(0, this.enemyActionLock - dt);

    if (this.gravityPullTime > 0 && !this.playerDead) {
      this.gravityPullTime = Math.max(0, this.gravityPullTime - dt);
      const pull = this.dummy.position
        .clone()
        .sub(this.player.position);
      pull.y = 0;
      if (pull.lengthSq() > 0.01) {
        pull.normalize().multiplyScalar(3.1);
        this.player.applyExternalForce(pull.x, pull.z);
      }
    }

    this.player.update(dt, move, this.input.yaw);

    if (this.gameMode === 'lane') {
      this.laneWaveTimer = Math.max(0, this.laneWaveTimer - dt);
      if (this.laneWaveTimer <= 0) {
        this.laneWaveTimer = 12;
        this.spawnLaneWave();
      }
      this.updateLaneMinions(dt);
      for (const structure of this.laneStructures) {
        structure.update(dt, this.player.position);
      }
    }

    if (this.rotatingLaser && this.laserTime > 0) {
      this.laserTime = Math.max(0, this.laserTime - dt);
      this.rotatingLaser.setPosition(this.dummy.position);
      this.rotatingLaser.update(dt);
      this.laserDamageCooldown = Math.max(
        0,
        this.laserDamageCooldown - dt,
      );
      if (
        !this.playerDead &&
        this.laserDamageCooldown <= 0 &&
        this.rotatingLaser.hits(this.player.position)
      ) {
        this.laserDamageCooldown = 0.55;
        this.showIncomingDirection(this.dummy.position);
        this.onPlayerHit(
          Math.round(12 * this.bossRoundDamage),
          this.player.position.clone(),
          'enemy',
        );
      }
      if (this.laserTime <= 0) {
        this.rotatingLaser.dispose();
        this.rotatingLaser = null;
      }
    }

    if (this.bossIntroRemaining <= 0 && this.bossTransitionRemaining <= 0) {
      if (this.gameMode === 'lane') {
        this.updateLaneEnemyAI(dt);
      } else {
        this.dummy.update(dt, this.player.position);
      }
    }
    this.world.step();
    this.player.sync();
    this.updateGravityZones(dt);
    this.updateBossTelegraphs(dt);
    this.updateBeam(dt);

    if (this.mageActionLock <= 0 && !this.playerDead) {
      this.mageView.play(this.isMoving ? 'Walking_A' : 'Idle', 0.18);
    }

    this.enemyView.setPosition(
      this.dummy.position.x,
      this.enemyView.groundOffset,
      this.dummy.position.z,
    );
    if (this.dummy.alive) {
      this.enemyView.setRotation(
        Math.atan2(
          this.player.position.x - this.dummy.position.x,
          this.player.position.z - this.dummy.position.z,
        ),
      );
    }
    if (this.enemyActionLock <= 0 && this.dummy.alive) {
      this.enemyView.play('Idle', 0.18);
    }
    this.enemyView.update(dt);
    this.updateBossAdds(dt);

    this.projectiles.update(
      dt,
      this.world,
      this.player.collider,
      this.dummy.collider,
      this.dummy.alive,
      {
        onDummyHit: (damage, point, kind) => this.onDummyHit(damage, point, kind),
        onPlayerHit: (damage, point, kind) => this.onPlayerHit(damage, point, kind),
        onWallHit: (point, kind) => this.onWallHit(point, kind),
        onAddHit: (id, damage, point, kind) => {
          if (id >= 200000) {
            this.onLaneStructureHit(id, damage, point);
          } else if (id >= 100000) {
            this.onLaneMinionHit(id, damage, point, kind);
          } else {
            this.onBossAddHit(id, damage, point, kind);
          }
        },
      },
      [
        ...this.bossAdds.map(({ id, add }) => ({
          id,
          collider: add.collider,
          alive: add.alive,
        })),
        ...this.laneMinions.map((minion) => ({
          id: minion.id,
          collider: minion.collider,
          alive: minion.alive,
        })),
        ...this.laneStructures.map((structure) => ({
          id: structure.id,
          collider: structure.collider,
          alive: structure.alive,
        })),
      ],
      this.player.position,
    );
  }

  private updateCamera(dt: number): void {
    const position = this.player.position;
    const yaw = this.input.yaw;
    const pitch = this.input.pitch;
    const smoothDt = Math.max(dt, 1 / 120);
    const targetEyeY = position.y + 0.82;

    if (!this.cameraInitialized || this.snapCamera) {
      this.smoothedEyeY = targetEyeY;
      this.cameraInitialized = true;
    } else {
      // Stabilize the eye height against small physics/step jitter.
      this.smoothedEyeY = THREE.MathUtils.damp(
        this.smoothedEyeY,
        targetEyeY,
        20,
        smoothDt,
      );
    }

    const eye = new THREE.Vector3(position.x, this.smoothedEyeY, position.z);
    const forward = new THREE.Vector3(
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ).normalize();

    if (this.cameraMode === 'first') {
      this.camera.position.copy(eye);
      this.camera.rotation.set(pitch, yaw, 0, 'YXZ');
    } else {
      const desired = eye.clone().addScaledVector(forward, -4.2);
      desired.y += 0.22;

      const delta = desired.clone().sub(eye);
      const distance = delta.length();
      if (distance > 0.001) {
        const direction = delta.clone().normalize();
        const hit = this.world.castRay(
          new RAPIER.Ray(eye, direction),
          distance,
          true,
          undefined,
          undefined,
          this.player.collider,
        );
        if (hit) {
          const safeDistance = Math.max(0.5, hit.timeOfImpact - 0.22);
          desired.copy(eye).addScaledVector(direction, safeDistance);
        }
      }

      if (this.snapCamera) {
        this.camera.position.copy(desired);
      } else {
        // Comfort: smooth the spring arm instead of snapping into place.
        this.camera.position.lerp(
          desired,
          1 - Math.exp(-12 * smoothDt),
        );
      }
      this.camera.lookAt(eye.clone().addScaledVector(forward, 20));
    }

    if (this.shakeTime > 0) {
      const progress = this.shakeTime / 0.14;
      const amplitude = this.shakeStrength * progress;
      const phase = performance.now() * 0.045;
      this.camera.position.x += Math.sin(phase) * amplitude;
      this.camera.position.y += Math.cos(phase * 1.7) * amplitude * 0.55;
      this.shakeTime = Math.max(0, this.shakeTime - smoothDt);
    }

    this.snapCamera = false;
    this.player.face(yaw);
    this.player.setVisualVisible(false);
    this.mageView.setPosition(position.x, this.mageView.groundOffset, position.z);
    this.mageView.setRotation(yaw + Math.PI);
    this.mageView.setVisible(this.cameraMode === 'third' && !this.playerDead);
    this.viewmodel.visible =
      this.cameraMode === 'first' && !this.settings.hideWeapon;
    this.hud.setMode(this.cameraMode);
  }

  private updateViewmodel(dt: number): void {
    if (this.cameraMode !== 'first') return;

    const moving =
      this.input.isDown('KeyW') ||
      this.input.isDown('KeyA') ||
      this.input.isDown('KeyS') ||
      this.input.isDown('KeyD');
    const bobAmount = this.settings.viewmodelBob / 100;
    this.bobTime += dt * (moving ? 8.5 : 2.4);

    // Comfort default is 0%; the slider can restore a subtle sway.
    this.viewmodelKick = Math.max(0, this.viewmodelKick - dt * 6.5);
    const bobX = Math.sin(this.bobTime) * 0.007 * bobAmount;
    const bobY = Math.sin(this.bobTime * 2) * 0.005 * bobAmount;

    this.viewmodel.position.set(
      this.viewmodelBase.x + bobX,
      this.viewmodelBase.y + bobY,
      this.viewmodelBase.z + this.viewmodelKick * 0.12,
    );
    this.viewmodel.rotation.set(
      -0.1 - this.viewmodelKick * 0.18,
      -0.16,
      -0.18 + Math.sin(this.bobTime) * 0.008 * bobAmount,
    );
  }

  private updateHud(): void {
    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.hud.setMana(this.playerMana, this.maxMana);
    this.hud.setAbilityCooldown('q', this.qCooldown, Q_COOLDOWN * this.cooldownMultiplier);
    this.hud.setAbilityCooldown('w', this.wCooldown, W_COOLDOWN * this.cooldownMultiplier);
    this.hud.setAbilityCooldown(
      'e',
      this.eCooldown,
      E_COOLDOWN * this.cooldownMultiplier * this.eCooldownMultiplier,
    );
    this.hud.setAbilityCooldown('r', this.rCooldown, R_COOLDOWN * this.cooldownMultiplier);
    this.hud.setTimer(this.elapsed);
    this.hud.setGold(this.gold);
    this.hud.setKills(this.kills);
    this.hud.setExperience(this.playerXp, this.xpToNext, this.playerLevel);
    this.hud.setMarks(this.markStacks);

    const dummyPosition = this.dummy.position;
    const toDummy = dummyPosition
      .clone()
      .add(new THREE.Vector3(0, 0.8, 0))
      .sub(this.camera.position);
    const distance = toDummy.length();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const alignment = distance > 0.001 ? direction.dot(toDummy.normalize()) : 0;
    const visible =
      this.dummy.alive &&
      this.bossIntroRemaining <= 0 &&
      this.bossTransitionRemaining <= 0 &&
      distance < 42 &&
      alignment > 0.15;

    this.hud.setTarget(
      visible,
      this.dummy.health,
      this.dummy.maxHealth,
      this.gameMode === 'lane'
        ? `中路试炼 · ${this.difficultyConfig.shortLabel} · ${this.dummy.phaseLabel}`
        : `Boss ${this.runRound}/${BOSS_ROUNDS} · ${this.difficultyConfig.shortLabel} · ${this.dummy.phaseLabel}`,
      this.bossDisplayName,
    );
    this.hud.updateMinimap(
      this.player.position,
      this.dummy.position,
      this.dummy.alive,
      this.bossAdds.map(({ add }) => add.position),
    );
    this.hud.setCrosshairTargeting(
      this.dummy.alive && distance < 36 && alignment > 0.94,
    );
  }

  private castQ(charge = 0): void {
    if (this.qCooldown > 0) {
      this.hud.showToast(`星弧飞弹冷却中 ${this.qCooldown.toFixed(1)}s`, 650);
      return;
    }
    if (this.playerMana < Q_MANA_COST) {
      this.hud.showToast('法力不足', 750);
      return;
    }

    const shot = this.getAimRay();
    this.projectiles.spawn(shot.origin, shot.direction, 'q', 'player', {
      speed: 36 + charge * 28,
      damage: 55 + charge * 45,
      life: 1.05 + charge * 0.25,
      radius: 0.22 + charge * 0.08,
      glowScale: 1.25 + charge * 0.55,
    });
    this.playerMana -= Q_MANA_COST;
    this.qCooldown = Q_COOLDOWN * this.cooldownMultiplier;
    this.viewmodelKick = 1 + charge * 0.4;
    this.mageView.play('Spellcast_Shoot', 0.08, true);
    this.mageActionLock = 0.44;
    this.hud.pulseQ();
    this.audio.qCast();
    this.effects.castPulse(this.getStaffTipWorldPosition(), 0xc7a4ff);
    if (charge > 0.8) {
      this.hud.showToast('星弧飞弹 · 满蓄力', 550);
    }
  }

  private castW(target: THREE.Vector3): void {
    if (this.wCooldown > 0) {
      this.hud.showToast(`引力法阵冷却中 ${this.wCooldown.toFixed(1)}s`, 650);
      return;
    }
    if (this.playerMana < W_MANA_COST) {
      this.hud.showToast('法力不足', 750);
      return;
    }

    this.gravityZones.push(
      new GravityZone(this.scene, {
        position: target,
        radius: this.wRadius,
        delay: 0.55,
        onExplode: (center, radius) => {
          this.effects.impact(center.clone().add(new THREE.Vector3(0, 0.2, 0)), 0x57e0f0, 1.8);
          this.audio.qCast();
          this.debugGravity = `center ${center.x.toFixed(1)},${center.z.toFixed(1)} dummy ${this.dummy.position.x.toFixed(1)},${this.dummy.position.z.toFixed(1)} dist ${horizontalDistance(center, this.dummy.position).toFixed(1)}`;
          if (
            this.dummy.alive &&
            horizontalDistance(center, this.dummy.position) <= radius
          ) {
            this.onDummyHit(
              78,
              this.dummy.position.clone().add(new THREE.Vector3(0, 0.5, 0)),
              'q',
            );
          }
          for (const { id, add } of [...this.bossAdds]) {
            if (add.alive && horizontalDistance(center, add.position) <= radius) {
              this.onBossAddHit(id, 78, add.position.clone(), 'q');
            }
          }
          for (const minion of [...this.laneMinions]) {
            if (
              minion.alive &&
              horizontalDistance(center, minion.position) <= radius
            ) {
              this.onLaneMinionHit(minion.id, 78, minion.position.clone(), 'q');
            }
          }
        },
      }),
    );

    this.playerMana -= W_MANA_COST;
    this.wCooldown = W_COOLDOWN * this.cooldownMultiplier;
    this.mageView.play('Spellcast_Shoot', 0.08, true);
    this.mageActionLock = 0.35;
    this.hud.pulseAbility('w');
    this.audio.qCast();
    this.effects.castPulse(target.clone().add(new THREE.Vector3(0, 0.2, 0)), 0x57e0f0);
  }

  private castE(): void {
    if (this.eCooldown > 0) {
      this.hud.showToast(`折跃冷却中 ${this.eCooldown.toFixed(1)}s`, 650);
      return;
    }
    if (this.playerMana < E_MANA_COST) {
      this.hud.showToast('法力不足', 750);
      return;
    }

    const move = this.input.getMoveVector();
    let direction = { x: move.x, z: move.z };
    if (Math.hypot(direction.x, direction.z) < 0.01) {
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      direction = { x: forward.x, z: forward.z };
    }
    this.player.dash(direction, 8, 0.18);
    this.invulnerableTime = 0.24;
    this.playerMana -= E_MANA_COST;
    this.eCooldown =
      E_COOLDOWN * this.cooldownMultiplier * this.eCooldownMultiplier;
    this.hud.pulseAbility('e');
    this.audio.qCast();
    this.effects.castPulse(this.player.position.clone().add(new THREE.Vector3(0, 0.55, 0)), 0x9fe8ff);
    this.hud.showToast('折跃 · 0.24s 无敌帧', 650);
  }

  private castR(): void {
    if (this.rCooldown > 0) {
      this.hud.showToast(`天穹裂隙冷却中 ${this.rCooldown.toFixed(1)}s`, 700);
      return;
    }
    if (this.playerMana < R_MANA_COST) {
      this.hud.showToast('法力不足', 750);
      return;
    }

    this.playerMana -= R_MANA_COST;
    this.rCooldown = R_COOLDOWN * this.cooldownMultiplier;
    this.beamActiveTime = 2.5;
    this.beamTickTimer = 0;
    this.hud.pulseAbility('r');
    this.hud.showToast('天穹裂隙 · 引导中', 900);
    this.audio.qCast();
  }

  private updateGravityZones(dt: number): void {
    for (let i = this.gravityZones.length - 1; i >= 0; i -= 1) {
      if (!this.gravityZones[i].update(dt)) {
        this.gravityZones.splice(i, 1);
      }
    }
  }

  private updateBeam(dt: number): void {
    if (this.beamActiveTime <= 0) {
      this.beam.hide();
      return;
    }

    this.beamActiveTime = Math.max(0, this.beamActiveTime - dt);
    const origin = this.player.chestPosition;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const maxDistance = 32;
    const hit = this.world.castRay(
      new RAPIER.Ray(origin, direction),
      maxDistance,
      true,
      undefined,
      undefined,
      this.player.collider,
    );
    const end = hit
      ? origin.clone().addScaledVector(direction, hit.timeOfImpact)
      : origin.clone().addScaledVector(direction, maxDistance);
    this.beam.setSegment(origin, end, true);

    this.beamTickTimer -= dt;
    if (this.beamTickTimer <= 0) {
      this.beamTickTimer = 0.18;
      if (
        hit &&
        this.dummy.alive &&
        hit.collider.handle === this.dummy.collider.handle
      ) {
        this.onDummyHit(
          Math.round(28 * this.rDamageMultiplier),
          end.clone(),
          'q',
        );
        this.effects.impact(end, 0x57e0f0, 0.65);
      } else if (hit) {
        const add = this.bossAdds.find(
          ({ add: target }) =>
            target.alive && target.collider.handle === hit.collider.handle,
        );
        if (add) {
          this.onBossAddHit(
            add.id,
            Math.round(28 * this.rDamageMultiplier),
            end.clone(),
            'q',
          );
          this.effects.impact(end, 0x57e0f0, 0.65);
        }
        const minion = this.laneMinions.find(
          (item) => item.alive && item.collider.handle === hit.collider.handle,
        );
        if (minion) {
          this.onLaneMinionHit(
            minion.id,
            Math.round(28 * this.rDamageMultiplier),
            end.clone(),
            'q',
          );
          this.effects.impact(end, 0x57e0f0, 0.65);
        }
      }
    }

    if (this.beamActiveTime <= 0) {
      this.beam.hide();
    }
  }

  private getGroundAimPoint(maxDistance: number): THREE.Vector3 {
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);

    // If the crosshair is on the boss, land the gravity well on its feet.
    const bossPosition = this.dummy.position;
    const toBoss = bossPosition.clone().sub(cameraPosition);
    const bossDistance = Math.hypot(
      bossPosition.x - this.player.position.x,
      bossPosition.z - this.player.position.z,
    );
    const alignment = toBoss.normalize().dot(forward);
    if (this.dummy.alive && bossDistance <= maxDistance && alignment > 0.86) {
      return new THREE.Vector3(bossPosition.x, 0.06, bossPosition.z);
    }

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Ray(cameraPosition, forward);
    const target = new THREE.Vector3();
    if (ray.intersectPlane(groundPlane, target)) {
      const distance = Math.hypot(
        target.x - this.player.position.x,
        target.z - this.player.position.z,
      );
      if (distance >= 2 && distance <= maxDistance) {
        return new THREE.Vector3(target.x, 0.06, target.z);
      }
    }

    const fallback = this.player.position.clone();
    fallback.add(new THREE.Vector3(forward.x, 0, forward.z).normalize().multiplyScalar(14));
    fallback.y = 0.06;
    return fallback;
  }

  private tryBasicAttack(): void {
    if (this.basicCooldown > 0) return;

    const shot = this.getAimRay();
    this.projectiles.spawn(shot.origin, shot.direction, 'basic', 'player');
    this.basicCooldown = BASIC_COOLDOWN / this.attackSpeedMultiplier;
    this.viewmodelKick = Math.max(this.viewmodelKick, 0.42);
    this.mageView.play('1H_Ranged_Shoot', 0.06, true);
    this.mageActionLock = 0.26;
    this.hud.pulseBasic();
    this.audio.shoot();
    this.effects.muzzle(this.getStaffTipWorldPosition(), 0x9fe8ff);
  }

  private getAimRay(): { origin: THREE.Vector3; direction: THREE.Vector3 } {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);

    const origin =
      this.cameraMode === 'first'
        ? cameraPosition.clone().addScaledVector(cameraDirection, 0.55)
        : this.player.chestPosition;
    const aimPoint = cameraPosition
      .clone()
      .addScaledVector(cameraDirection, 110);

    return {
      origin,
      direction: aimPoint.sub(origin).normalize(),
    };
  }

  private getStaffTipWorldPosition(): THREE.Vector3 {
    return this.staffTip.getWorldPosition(new THREE.Vector3());
  }

  private onDummyHit(
    damage: number,
    point: THREE.Vector3,
    kind: ProjectileKind,
  ): void {
    if (this.bossInvulnerableTime > 0.001) {
      this.hud.showToast('Boss 护盾 / 登场无敌', 450);
      this.effects.impact(point, 0x9fe8ff, 0.5);
      return;
    }

    let finalDamage = Math.round(
      damage * this.damageMultiplier * this.bossDamageTakenMultiplier,
    );
    if (kind === 'q' && this.qMarkSynergy) {
      finalDamage = Math.round(finalDamage * 1.15);
    }

    if (kind === 'basic' && this.markStacks >= 3) {
      finalDamage += Math.round(
        30 *
          this.damageMultiplier *
          this.markDamageMultiplier *
          this.bossDamageTakenMultiplier,
      );
      this.markStacks = 0;
      this.markTimer = 0;
      this.hud.showToast('星辉印记引爆', 650);
      this.effects.impact(point, 0xe8c77a, 1.4);
    } else if (kind === 'q') {
      this.markStacks = Math.min(3, this.markStacks + 1);
      this.markTimer = 6;
    }

    this.damageDealt += finalDamage;
    this.hitCount += 1;
    this.hitStopRemaining = Math.max(
      this.hitStopRemaining,
      finalDamage >= 50 ? 0.045 : 0.02,
    );
    this.hud.setCombatStats(this.damageDealt, this.damageTaken, this.hitCount);
    const died = this.dummy.takeDamage(finalDamage);
    if (!died) {
      this.enemyView.play('Hit_A', 0.06, true);
      this.enemyActionLock = Math.max(this.enemyActionLock, 0.22);
    }
    this.hud.hitMarker();
    this.hud.showDamage(point, this.camera, finalDamage, 'enemy');
    this.audio.hit();
    this.effects.impact(
      point,
      kind === 'q' ? 0xc7a4ff : 0x9fe8ff,
      kind === 'q' ? 1.2 : 0.7,
    );
    this.gainExperience(finalDamage * 0.4);
  }

  private gainExperience(amount: number): void {
    if (this.playerLevel >= MAX_LEVEL) {
      this.playerXp = 0;
      return;
    }

    this.playerXp += Math.max(0, amount);
    let levelsGained = 0;
    while (this.playerLevel < MAX_LEVEL && this.playerXp >= this.xpToNext) {
      this.playerXp -= this.xpToNext;
      this.playerLevel += 1;
      levelsGained += 1;
    }

    if (this.playerLevel >= MAX_LEVEL) {
      this.playerXp = 0;
    }

    if (levelsGained > 0) {
      this.playerHealth = Math.min(
        this.maxHealth,
        this.playerHealth + levelsGained * 12,
      );
      this.playerMana = this.maxMana;
      this.hud.setLevel(this.playerLevel);
      this.hud.setHealth(this.playerHealth, this.maxHealth);
      this.hud.setMana(this.playerMana, this.maxMana);
      this.hud.showToast(
        this.playerLevel >= MAX_LEVEL
          ? `Lv.${this.playerLevel} 满级 · 星辉完全共鸣`
          : `升级 Lv.${this.playerLevel} · 伤害/攻速/冷却提升`,
        1200,
      );
      this.effects.castPulse(
        this.player.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        0xe8c77a,
      );
      this.audio.qCast();
    }

    this.hud.setExperience(this.playerXp, this.xpToNext, this.playerLevel);
  }

  private showIncomingDirection(source: THREE.Vector3): void {
    const hitDirection = new THREE.Vector3(
      source.x - this.player.position.x,
      0,
      source.z - this.player.position.z,
    );
    if (hitDirection.lengthSq() < 0.001) return;
    hitDirection.normalize();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(
      forward,
      new THREE.Vector3(0, 1, 0),
    );
    this.hud.showHitDirection(
      Math.atan2(hitDirection.dot(right), hitDirection.dot(forward)),
    );
  }

  private onPlayerHit(
    damage: number,
    point: THREE.Vector3,
    _kind: ProjectileKind,
  ): void {
    if (this.playerDead || this.invulnerableTime > 0) return;

    this.playerHealth = Math.max(0, this.playerHealth - damage);
    this.damageTaken += damage;
    this.hud.setCombatStats(this.damageDealt, this.damageTaken, this.hitCount);
    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.hud.hitMarker();
    this.hud.showDamage(point, this.camera, damage, 'player');
    this.effects.impact(point, 0xff5c7a, 0.8);
    this.mageView.play('Hit_A', 0.06, true);
    this.mageActionLock = Math.max(this.mageActionLock, 0.24);
    this.audio.hurt();

    const hitDirection = new THREE.Vector3(
      point.x - this.player.position.x,
      0,
      point.z - this.player.position.z,
    );
    if (hitDirection.lengthSq() > 0.001) {
      hitDirection.normalize();
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(
        forward,
        new THREE.Vector3(0, 1, 0),
      );
      this.hud.showHitDirection(
        Math.atan2(hitDirection.dot(right), hitDirection.dot(forward)),
      );
    }

    if (this.settings.screenShake > 0) {
      this.shakeTime = 0.14;
      this.shakeStrength = (this.settings.screenShake / 100) * 0.055;
    }

    if (this.playerHealth <= 0) {
      this.die();
    }
  }

  private onWallHit(point: THREE.Vector3, kind: ProjectileKind): void {
    this.effects.impact(
      point,
      kind === 'q' ? 0xc7a4ff : kind === 'enemy' ? 0xff5c7a : 0x9fe8ff,
      0.55,
    );
  }

  private onBossAttack(attack: BossAttackEvent): void {
    const color =
      attack.type === 'slam'
        ? 0xff5c7a
        : attack.type === 'shockwave'
          ? 0xffa45c
          : 0xb14cff;
    const attackRadius =
      attack.type === 'void'
        ? attack.radius * this.voidRadiusMultiplier
        : attack.radius;
    this.bossTelegraphs.push(
      new BossTelegraph(this.scene, {
        position: attack.position,
        radius: attackRadius,
        delay: attack.delay * this.difficultyConfig.telegraphScale,
        color,
        onComplete: (center, radius) => {
          this.effects.impact(
            center.clone().add(new THREE.Vector3(0, 0.25, 0)),
            color,
            2.2,
          );
          this.audio.enemyShoot();
          const distance = horizontalDistance(center, this.player.position);
          this.debugBossAttack = `center ${center.x.toFixed(1)},${center.z.toFixed(1)} player ${this.player.position.x.toFixed(1)},${this.player.position.z.toFixed(1)} dist ${distance.toFixed(1)} radius ${radius}`;
          if (
            !this.playerDead &&
            !this.bossDefeated &&
            !this.player.isAirborne &&
            distance <= radius
          ) {
            this.showIncomingDirection(this.dummy.position);
            this.onPlayerHit(
              Math.round(attack.damage * this.bossRoundDamage),
              this.player.position.clone().add(new THREE.Vector3(0, 0.45, 0)),
              'enemy',
            );
          }
        },
      }),
    );
    this.enemyView.play('Spellcast_Shoot', 0.08, true);
    this.enemyActionLock = 0.5;
    this.audio.enemyShoot();
  }

  private onBossBarrage(origin: THREE.Vector3, directions: THREE.Vector3[]): void {
    for (const direction of directions) {
      this.projectiles.spawn(origin, direction, 'enemy', 'dummy', {
        damage: Math.round(8 * this.bossRoundDamage),
        speed: 13 * this.difficultyConfig.projectileSpeedScale,
      });
    }
    this.effects.muzzle(origin, 0xff5c7a);
    this.enemyView.play('Spellcast_Shoot', 0.06, true);
    this.enemyActionLock = 0.6;
    this.audio.enemyShoot();
  }

  private onBossPhaseTwo(): void {
    this.bossTransitionRemaining = 1.2;
    this.bossInvulnerableTime = 1.2;
    this.hud.showBossIntro(
      '第二阶段',
      this.dummy.variant === 'void'
        ? '虚空回响'
        : this.dummy.variant === 'colossus'
          ? '星环崩解'
          : '星环解放',
    );
    this.audio.setMusicPhase(2);
    this.hud.showToast(
      `${this.bossDisplayName} · ${this.dummy.phaseLabel}`,
      1600,
    );
    this.effects.castPulse(
      this.dummy.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      0xff5c7a,
    );
    this.audio.qCast();
  }

  private spawnBossAdds(variant: 'shard' | 'mirror', count: number): void {
    const center = this.dummy.position;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.35;
      const radius = 2.6 + Math.random() * 1.2;
      const id = this.nextBossAddId++;
      const add = new BossAdd(
        this.world,
        this.scene,
        new THREE.Vector3(
          center.x + Math.cos(angle) * radius,
          1.15,
          center.z + Math.sin(angle) * radius,
        ),
        (shot) => this.onDummyShoot(shot),
        () => this.onBossAddDeath(id),
        variant,
      );
      this.bossAdds.push({ id, add });
    }
  }

  private onBossSummon(): void {
    if (this.gameMode === 'lane') return;
    const extra = this.bossModifier === 'split' ? 1 : 0;
    if (this.dummy.isVoid) {
      this.hud.showToast('虚空术士召唤镜像', 1100);
      this.spawnBossAdds('mirror', 2 + extra);
      return;
    }
    if (this.dummy.variant === 'colossus') {
      this.hud.showToast('星环巨像 · 星环崩解', 1200);
      this.onBossLaser();
      this.onBossMeteors(this.player.position, 4 + extra);
      return;
    }
    this.hud.showToast('星蚀碎片被召唤', 1100);
    this.spawnBossAdds('shard', 2 + extra);
  }

  private onBossTeleport(position: THREE.Vector3): void {
    this.effects.impact(position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xb14cff, 1.4);
    this.effects.castPulse(position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xb14cff);
    this.audio.enemyShoot();
  }

  private onBossHomingOrbs(origin: THREE.Vector3, count: number): void {
    const target = this.player.position
      .clone()
      .add(new THREE.Vector3(0, 0.55, 0));
    for (let index = 0; index < count; index += 1) {
      const spread = (index - (count - 1) / 2) * 0.18;
      const direction = target
        .clone()
        .sub(origin)
        .normalize()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      this.projectiles.spawn(origin, direction, 'void', 'dummy', {
        damage: Math.round(
          10 * this.bossRoundDamage * this.voidHomingMultiplier,
        ),
        speed: 8 * this.difficultyConfig.projectileSpeedScale,
        life: 5,
        homing: 1.15,
        glowScale: 1.15,
      });
    }
    this.effects.castPulse(origin, 0xb14cff);
    this.audio.enemyShoot();
  }

  private onBossMirror(): void {
    this.spawnBossAdds(
      'mirror',
      1 + (this.bossModifier === 'split' ? 1 : 0),
    );
    this.hud.showToast('镜像分身出现', 700);
    this.effects.castPulse(
      this.dummy.position.clone().add(new THREE.Vector3(0, 1, 0)),
      0xb14cff,
    );
  }

  private onBossLaser(): void {
    if (this.rotatingLaser) {
      this.rotatingLaser.dispose();
    }
    this.rotatingLaser = new RotatingLaser(this.scene, this.dummy.position);
    this.laserTime = this.dummy.phase === 2 ? 5.2 : 4.2;
    this.laserDamageCooldown = 0;
    this.hud.showToast('星环激光 · 注意旋转方向', 1100);
    this.audio.enemyShoot();
  }

  private onBossGravity(): void {
    this.gravityPullTime = this.dummy.phase === 2 ? 3.2 : 2.4;
    this.hud.showToast('引力牵引 · 反向移动抵抗', 1200);
    this.effects.castPulse(
      this.dummy.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      0xffc36b,
    );
    this.audio.enemyShoot();
  }

  private onBossMeteors(center: THREE.Vector3, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4;
      const distance = index === 0 ? 0 : 1.5 + Math.random() * 4.5;
      const position = new THREE.Vector3(
        THREE.MathUtils.clamp(center.x + Math.cos(angle) * distance, -24, 15),
        0.07,
        THREE.MathUtils.clamp(center.z + Math.sin(angle) * distance, -9, 9),
      );
      const radius = 2.0;
      this.bossTelegraphs.push(
        new BossTelegraph(this.scene, {
          position,
          radius,
          delay:
            (0.9 + index * 0.08) *
            this.difficultyConfig.telegraphScale,
          color: 0xff8a3d,
          onComplete: (impact, impactRadius) => {
            this.effects.impact(
              impact.clone().add(new THREE.Vector3(0, 0.3, 0)),
              0xff8a3d,
              1.8,
            );
            this.audio.enemyShoot();
            const distanceToPlayer = horizontalDistance(impact, this.player.position);
            if (
              !this.playerDead &&
              !this.player.isAirborne &&
              distanceToPlayer <= impactRadius
            ) {
              this.showIncomingDirection(this.dummy.position);
              this.onPlayerHit(
                Math.round(16 * this.bossRoundDamage),
                this.player.position.clone(),
                'enemy',
              );
            }
          },
        }),
      );
    }
    this.hud.showToast('陨星雨', 900);
  }

  private updateBossAdds(dt: number): void {
    for (const { add } of this.bossAdds) {
      add.update(dt, this.player.position);
    }
  }

  private onBossAddHit(
    id: number,
    damage: number,
    point: THREE.Vector3,
    kind: ProjectileKind,
  ): void {
    const entry = this.bossAdds.find((item) => item.id === id);
    if (!entry || !entry.add.alive) return;
    const died = entry.add.takeDamage(Math.round(damage * this.damageMultiplier));
    this.hud.hitMarker();
    this.hud.showDamage(point, this.camera, Math.round(damage * this.damageMultiplier), 'enemy');
    this.audio.hit();
    this.effects.impact(point, kind === 'q' ? 0xc7a4ff : 0x9fe8ff, 0.7);
    if (died) {
      this.onBossAddDeath(id);
    }
  }

  private onBossAddDeath(id: number): void {
    const index = this.bossAdds.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [{ add }] = this.bossAdds.splice(index, 1);
    this.effects.impact(add.position, 0xff5c7a, 1.1);
    this.audio.kill();
    this.gainExperience(20);
    add.dispose();
  }

  private clearBossAdds(): void {
    for (const { add } of this.bossAdds.splice(0)) add.dispose();
  }

  private clearBossMechanics(): void {
    this.rotatingLaser?.dispose();
    this.rotatingLaser = null;
    this.laserTime = 0;
    this.laserDamageCooldown = 0;
    this.gravityPullTime = 0;
  }

  private updateBossTelegraphs(dt: number): void {
    for (let i = this.bossTelegraphs.length - 1; i >= 0; i -= 1) {
      if (!this.bossTelegraphs[i].update(dt)) {
        this.bossTelegraphs.splice(i, 1);
      }
    }
  }

  private onDummyShoot(shot: DummyShot): void {
    this.projectiles.spawn(shot.origin, shot.direction, 'enemy', 'dummy', {
      damage: 7,
      speed: 13 * this.difficultyConfig.projectileSpeedScale,
    });
    this.effects.muzzle(shot.origin, 0xff5c7a);
    this.audio.enemyShoot();
  }

  private onDummyDeath(): void {
    if (this.bossDefeated || this.upgradePending || this.runFinished) return;
    if (this.gameMode === 'lane') {
      this.bossDefeated = true;
      this.hud.setTarget(false);
      this.hud.showToast('敌方英雄被击退 · 水晶仍在', 1600);
      this.enemyView.play('Death_A', 0.1, true);
      this.enemyActionLock = 3.0;
      return;
    }
    this.bossDefeated = true;
    this.running = false;
    this.hud.hideBossIntro();
    this.audio.stopMusic();
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.beamActiveTime = 0;
    this.beam.hide();
    this.projectiles.clear();
    this.clearBossAdds();
    this.clearBossMechanics();
    for (const zone of this.gravityZones.splice(0)) zone.dispose();
    for (const telegraph of this.bossTelegraphs.splice(0)) telegraph.dispose();

    this.kills = 1;
    this.gold += 100;
    this.gainExperience(120);
    this.hud.setKills(this.kills);
    this.hud.setGold(this.gold);
    this.hud.setTarget(false);
    this.hud.showToast(`${this.bossDisplayName}已击败 · BOSS CLEARED`, 2200);
    this.audio.kill();
    this.effects.impact(this.dummy.position, 0xff5c7a, 2.2);
    this.enemyView.play('Death_A', 0.1, true);
    this.enemyActionLock = 3.0;
    this.input.exitLock();

    if (this.runRound < BOSS_ROUNDS) {
      this.upgradePending = true;
      this.hud.showToast(
        `${this.bossDisplayName}已击败 · 准备进入 Boss ${this.runRound + 1}`,
        1400,
      );
      this.hud.showUpgrades(
        this.runRound + 1,
        pickUpgrades(),
        (id) => this.chooseUpgrade(id),
      );
      return;
    }

    this.runFinished = true;
    const previousBest = this.bestTime;
    const isNewBest = previousBest === null || this.elapsed < previousBest;
    if (isNewBest) {
      this.bestTime = this.elapsed;
      saveBestTime(this.elapsed);
    }
    const score = this.computeScore();
    if (this.bestScore === null || score > this.bestScore) {
      this.bestScore = score;
      saveBestScore(score);
    }
    this.hud.showVictory(
      this.elapsed,
      this.playerHealth,
      this.playerLevel,
      this.bestTime,
      isNewBest,
      this.bossDisplayName,
      this.buildSummary,
      score,
      this.bestScore,
      this.difficultyConfig.label,
      this.modifierDefinition.label,
    );
  }

  private chooseUpgrade(id: UpgradeId): void {
    this.upgrades.set(id, (this.upgrades.get(id) ?? 0) + 1);
    this.upgradePending = false;
    this.bossDefeated = false;
    this.runRound += 1;
    this.dummy.setVariant(this.currentBossKind);
    this.dummy.setMaxHealth(this.bossRoundHealth);
    this.applyBossModifiers();
    this.dummy.respawn();
    this.replaceEnemyView();
    this.player.teleport(this.respawnPosition);
    this.playerHealth = this.maxHealth;
    this.playerMana = this.maxMana;
    this.qCooldown = 0;
    this.wCooldown = 0;
    this.eCooldown = 0;
    this.rCooldown = 0;
    this.basicCooldown = 0;
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.beamActiveTime = 0;
    this.beam.hide();
    this.projectiles.clear();
    this.clearBossAdds();
    this.clearBossMechanics();
    for (const zone of this.gravityZones.splice(0)) zone.dispose();
    for (const telegraph of this.bossTelegraphs.splice(0)) telegraph.dispose();
    this.wPreview.setRadiusScale(this.wRadius / 5.2);

    this.mageView.play('Idle', 0.1);
    this.mageActionLock = 0;
    this.enemyView.setVisible(true);
    this.enemyView.play('Idle', 0.1);
    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.hud.setMana(this.playerMana, this.maxMana);
    this.hud.setLevel(this.playerLevel);
    this.hud.hideUpgrades();
    this.hud.setTarget(false);
    this.hud.showToast(
      `Boss ${this.runRound} · ${this.bossDisplayName} ${this.dummy.maxHealth} HP`,
      1800,
    );
    this.beginBossIntro(1.1);
    this.audio.startMusic(1);
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.cameraInitialized = false;
    this.snapCamera = true;
    this.updateCamera(0);
    void this.input.requestLock();
  }

  private die(): void {
    this.playerDead = true;
    this.running = false;
    this.deathRemaining = 3;
    this.projectiles.clear();
    this.clearBossAdds();
    this.clearBossMechanics();
    this.clearLaneMinions();
    this.hud.hideBossIntro();
    this.audio.stopMusic();
    this.qHeld = false;
    this.qCharge = 0;
    this.cancelWAim();
    this.beamActiveTime = 0;
    this.beam.hide();
    for (const zone of this.gravityZones.splice(0)) zone.dispose();
    this.hud.setLowHealth(false);
    this.hud.showDeath(this.deathRemaining, this.bossDisplayName);
    this.mageView.play('Death_A', 0.1, true);
    this.input.exitLock();
    this.audio.hurt();
  }

  private respawn(): void {
    if (!this.playerDead) return;
    this.resetEncounter();
  }

  private restartBoss(): void {
    this.playerDead = false;
    this.bossDefeated = false;
    this.runRound = 1;
    this.runFinished = false;
    this.upgradePending = false;
    this.upgrades.clear();
    this.rollBossModifier();
    this.playerLevel = 1;
    this.playerXp = 0;
    this.damageDealt = 0;
    this.damageTaken = 0;
    this.hitCount = 0;
    this.hitStopRemaining = 0;
    this.shopDamageBonus = 0;
    this.shopHealthBonus = 0;
    this.shopCooldownBonus = 0;
    this.shopItemsBought = 0;
    this.dummy.setVariant(this.currentBossKind);
    this.dummy.setMaxHealth(this.bossRoundHealth);
    this.applyBossModifiers();
    this.replaceEnemyView();
    this.wPreview.setRadiusScale(1);
    this.hud.hideVictory();
    this.hud.hideUpgrades();
    this.resetEncounter();
    this.hud.setLevel(1);
    this.hud.setCombatStats(0, 0, 0);
  }

  private resetEncounter(): void {
    this.playerDead = false;
    this.bossDefeated = false;
    this.playerHealth = this.maxHealth;
    this.playerMana = this.maxMana;
    this.qCooldown = 0;
    this.wCooldown = 0;
    this.eCooldown = 0;
    this.rCooldown = 0;
    this.basicCooldown = 0;
    this.qCharge = 0;
    this.qHeld = false;
    this.cancelWAim();
    this.markStacks = 0;
    this.markTimer = 0;
    this.invulnerableTime = 0;
    this.beamActiveTime = 0;
    this.beam.hide();
    for (const zone of this.gravityZones.splice(0)) zone.dispose();
    for (const telegraph of this.bossTelegraphs.splice(0)) telegraph.dispose();
    this.deathRemaining = 0;
    this.elapsed = 0;
    if (this.gameMode === 'lane') {
      this.laneWaveTimer = 1.5;
      this.laneEnemyAttackTimer = 1.2;
      this.clearLaneMinions();
      this.clearLaneStructures();
      this.spawnLaneStructures();
    }
    this.player.teleport(this.respawnPosition);
    this.dummy.respawn();
    this.mageView.play('Idle', 0.1);
    this.mageActionLock = 0;
    this.enemyView.play('Idle', 0.1);
    this.enemyActionLock = 0;
    this.enemyView.setVisible(true);
    this.hud.setHealth(this.playerHealth, this.maxHealth);
    this.hud.setMana(this.playerMana, this.maxMana);
    this.hud.setAbilityCooldown('q', 0, Q_COOLDOWN);
    this.hud.setAbilityCooldown('w', 0, W_COOLDOWN);
    this.hud.setAbilityCooldown('e', 0, E_COOLDOWN);
    this.hud.setAbilityCooldown('r', 0, R_COOLDOWN);
    this.hud.setTarget(false);
    this.hud.hideDeath();
    this.hud.hideVictory();
    this.beginBossIntro(1.1);
    this.audio.startMusic(1);
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.cameraInitialized = false;
    this.snapCamera = true;
    this.updateCamera(0);
    void this.input.requestLock();
  }

  private toggleCamera(): void {
    this.cameraMode = this.cameraMode === 'first' ? 'third' : 'first';
    this.settings.cameraMode = this.cameraMode;
    saveSettings(this.settings);
    this.snapCamera = true;
    this.hud.setMode(this.cameraMode);
    this.hud.showToast(
      this.cameraMode === 'first' ? '第一人称视角' : '第三人称观察视角',
      900,
    );
    this.updateCamera(0);
  }

  private updatePerf(frameDelta: number): void {
    this.fpsFrames += 1;
    this.fpsTime += frameDelta;
    if (this.fpsTime < 0.35) return;

    const fps = this.fpsFrames / this.fpsTime;
    this.hud.setPerf(
      fps,
      this.renderer.info.render.calls,
      this.renderer.info.render.triangles,
    );
    this.fpsFrames = 0;
    this.fpsTime = 0;
  }

  private createViewmodel(): void {
    this.viewmodel = new THREE.Group();
    this.viewmodel.position.copy(this.viewmodelBase);
    this.viewmodel.rotation.set(-0.1, -0.16, -0.18);
    this.viewmodel.scale.setScalar(0.46);
    this.camera.add(this.viewmodel);

    const staffMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e4d35,
      roughness: 0.48,
      metalness: 0.42,
    });
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xb69256,
      roughness: 0.28,
      metalness: 0.78,
    });

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.043, 1.0, 8),
      staffMaterial,
    );
    shaft.rotation.z = -0.12;
    shaft.position.set(0, 0, 0);
    this.viewmodel.add(shaft);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.018, 6, 16),
      metalMaterial,
    );
    collar.position.set(-0.055, 0.46, 0);
    collar.rotation.x = Math.PI * 0.5;
    this.viewmodel.add(collar);

    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xd9c2ff,
      emissive: 0x7245ff,
      emissiveIntensity: 2.3,
      roughness: 0.08,
      metalness: 0.05,
    });
    this.staffTip = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.095, 0),
      tipMaterial,
    );
    this.staffTip.position.set(-0.07, 0.55, 0);
    this.staffTip.rotation.z = 0.18;
    this.viewmodel.add(this.staffTip);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.012, 6, 24),
      new THREE.MeshBasicMaterial({
        color: 0x9f7bff,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.copy(this.staffTip.position);
    halo.rotation.x = Math.PI * 0.5;
    this.viewmodel.add(halo);
  }
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function readBestTime(): number | null {
  try {
    const raw = window.localStorage.getItem('fp-moba.boss-best-time');
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function saveBestTime(seconds: number): void {
  try {
    window.localStorage.setItem('fp-moba.boss-best-time', String(seconds));
  } catch {
    // Private mode/storage-disabled is non-fatal.
  }
}

