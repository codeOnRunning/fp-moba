import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { DummyShot } from '../Dummy';

export interface BossAttackEvent {
  type: 'slam' | 'shockwave';
  position: THREE.Vector3;
  radius: number;
  delay: number;
  damage: number;
}

export interface BossCallbacks {
  onAttack: (attack: BossAttackEvent) => void;
  onBarrage: (origin: THREE.Vector3, directions: THREE.Vector3[]) => void;
  onPhaseTwo: () => void;
  onSummon: () => void;
  onDeath: () => void;
}

export class Boss {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  maxHealth = 1800;
  health = 1800;
  alive = true;
  phase: 1 | 2 = 1;

  private readonly home: THREE.Vector3;
  private attackCooldown = 2.2;
  private hitFlash = 0;
  private deathCount = 0;
  private phaseAnnounced = false;

  constructor(
    world: RAPIER.World,
    home: THREE.Vector3,
    private readonly callbacks: BossCallbacks,
  ) {
    this.home = home.clone();
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        home.x,
        home.y,
        home.z,
      ),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.68, 0.62).setFriction(0.3),
      this.body,
    );
  }

  get position(): THREE.Vector3 {
    const translation = this.body.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }

  get killCount(): number {
    return this.deathCount;
  }

  get respawnTimerValue(): number {
    return 0;
  }

  get isAlive(): boolean {
    return this.alive;
  }

  setPrimitiveVisible(_visible: boolean): void {
    // The skeleton view is rendered by Game; there is no primitive body.
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.alive) return;

    const current = this.body.translation();
    // Keep a readable 4m fighting distance instead of walking into the player.
    const side = current.x >= playerPosition.x ? 1 : -1;
    const targetX = THREE.MathUtils.clamp(playerPosition.x + side * 4, -23, 14);
    const nextX = THREE.MathUtils.damp(current.x, targetX, 0.22, dt);
    this.body.setNextKinematicTranslation({
      x: nextX,
      y: this.home.y,
      z: this.home.z,
    });

    this.attackCooldown -= dt;
    const distance = Math.hypot(playerPosition.x - nextX, playerPosition.z - this.home.z);
    if (this.attackCooldown > 0) return;

    this.attackCooldown = this.phase === 1 ? 2.8 : 2.0;

    if (distance < 7.5 && Math.random() < 0.65) {
      this.callbacks.onAttack({
        type: 'slam',
        position: new THREE.Vector3(nextX, 0.07, this.home.z),
        radius: 4.6,
        delay: 0.8,
        damage: 20,
      });
      return;
    }

    if (Math.random() < 0.55) {
      this.callbacks.onAttack({
        type: 'shockwave',
        position: new THREE.Vector3(nextX, 0.07, this.home.z),
        radius: this.phase === 1 ? 8.5 : 10.5,
        delay: 1.0,
        damage: 15,
      });
      return;
    }

    const origin = new THREE.Vector3(nextX, 1.45, this.home.z);
    const aim = new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 0.25,
      playerPosition.z,
    );
    const base = aim.sub(origin).normalize();
    const directions: THREE.Vector3[] = [];
    for (const spread of [-0.14, 0, 0.14]) {
      directions.push(base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread));
    }
    this.callbacks.onBarrage(origin, directions);
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;

    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.12;

    if (!this.phaseAnnounced && this.health <= this.maxHealth * 0.5) {
      this.phaseAnnounced = true;
      this.phase = 2;
      this.attackCooldown = Math.min(this.attackCooldown, 1.2);
      this.callbacks.onPhaseTwo();
      this.callbacks.onSummon();
    }

    if (this.health <= 0) {
      this.alive = false;
      this.deathCount += 1;
      this.collider.setEnabled(false);
      this.callbacks.onDeath();
      return true;
    }

    return false;
  }

  setMaxHealth(value: number): void {
    this.maxHealth = Math.max(1, Math.round(value));
    if (this.alive) this.health = this.maxHealth;
  }

  respawn(): void {
    this.health = this.maxHealth;
    this.alive = true;
    this.phase = 1;
    this.phaseAnnounced = false;
    this.attackCooldown = 2.2;
    this.hitFlash = 0;
    this.body.setTranslation(
      { x: this.home.x, y: this.home.y, z: this.home.z },
      true,
    );
    this.collider.setEnabled(true);
  }

  get phaseLabel(): string {
    return this.phase === 1 ? '第一阶段' : '第二阶段 · 星环解放';
  }

  get visualPulse(): number {
    return this.hitFlash;
  }

  get shotHeight(): number {
    return this.home.y + 0.5;
  }

  /** Used by the Game to keep the skeleton view at the boss body. */
  getShotOrigin(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.shotHeight, this.home.z);
  }

  getShotTarget(playerPosition: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      playerPosition.x,
      playerPosition.y + 0.25,
      playerPosition.z,
    );
  }

  getBarrageShot(): DummyShot {
    return {
      origin: this.getShotOrigin(),
      direction: new THREE.Vector3(0, 0, -1),
    };
  }
}
