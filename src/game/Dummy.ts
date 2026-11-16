import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface DummyShot {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
}

export class Dummy {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly group: THREE.Group;
  readonly healthBar: THREE.Group;

  maxHealth = 300;
  health = 300;
  alive = true;

  private readonly bodyMaterial: THREE.MeshStandardMaterial;
  private readonly eyeMaterial: THREE.MeshStandardMaterial;
  private healthFill!: THREE.Mesh;
  private readonly healthFillWidth = 1.6;
  private readonly home: THREE.Vector3;
  private patrolTime = 0;
  private shootCooldown = 0.8;
  private respawnTimer = 0;
  private hitFlash = 0;
  private deathCount = 0;
  private primitiveVisible = true;

  constructor(
    private readonly world: RAPIER.World,
    private readonly scene: THREE.Scene,
    home: THREE.Vector3,
    private readonly onShoot: (shot: DummyShot) => void,
    private readonly onDeath: () => void,
  ) {
    this.home = home.clone();

    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(home.x, home.y, home.z),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.58, 0.43).setFriction(0.3),
      this.body,
    );

    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b2638,
      roughness: 0.42,
      metalness: 0.55,
      emissive: 0x1a0610,
      emissiveIntensity: 0.35,
    });
    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffb2c2,
      emissive: 0xff214b,
      emissiveIntensity: 2.2,
      roughness: 0.15,
      metalness: 0.15,
    });

    this.group = this.createVisual();
    this.scene.add(this.group);

    this.healthBar = this.createHealthBar();
    this.scene.add(this.healthBar);
  }

  get position(): THREE.Vector3 {
    const translation = this.body.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }

  get isAlive(): boolean {
    return this.alive;
  }

  get respawnTimerValue(): number {
    return this.respawnTimer;
  }

  get killCount(): number {
    return this.deathCount;
  }

  update(
    dt: number,
    playerPosition: THREE.Vector3,
    playerCollider: RAPIER.Collider,
    camera: THREE.Camera,
  ): void {
    if (!this.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      this.updateHealthBar(camera);
      return;
    }

    this.patrolTime += dt;
    this.shootCooldown -= dt;

    const targetX = this.home.x + Math.sin(this.patrolTime * 0.52) * 4.2;
    const translation = this.body.translation();
    const nextX = THREE.MathUtils.damp(translation.x, targetX, 2.8, dt);

    this.body.setNextKinematicTranslation({
      x: nextX,
      y: this.home.y,
      z: this.home.z,
    });

    this.group.position.set(nextX, 0, this.home.z);
    this.group.rotation.y = Math.atan2(
      playerPosition.x - nextX,
      playerPosition.z - this.home.z,
    );

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const intensity = Math.max(0, this.hitFlash / 0.14);
      this.bodyMaterial.emissiveIntensity = 0.35 + intensity * 2.4;
      this.bodyMaterial.emissive.setHex(0xff4d6d);
    } else {
      this.bodyMaterial.emissiveIntensity = 0.35;
      this.bodyMaterial.emissive.setHex(0x1a0610);
    }

    const distance = Math.hypot(
      playerPosition.x - nextX,
      playerPosition.z - this.home.z,
    );

    if (distance < 30 && this.shootCooldown <= 0 && this.hasLineOfSight(playerPosition, playerCollider)) {
      this.shootCooldown = 1.65 + Math.random() * 0.55;
      const origin = new THREE.Vector3(nextX, 1.35, this.home.z);
      const target = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + 0.18,
        playerPosition.z,
      );
      const direction = target.sub(origin).normalize();
      this.onShoot({ origin, direction });
    }

    this.updateHealthBar(camera);
  }

  setMaxHealth(value: number): void {
    this.maxHealth = Math.max(1, Math.round(value));
    if (this.alive) {
      this.health = Math.min(this.health, this.maxHealth);
    }
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;

    this.health = Math.max(0, this.health - amount);
    this.hitFlash = 0.14;

    if (this.health <= 0) {
      this.alive = false;
      this.respawnTimer = 3.2;
      this.deathCount += 1;
      this.group.visible = false;
      this.healthBar.visible = false;
      this.collider.setEnabled(false);
      this.onDeath();
      return true;
    }

    return false;
  }

  respawn(): void {
    this.health = this.maxHealth;
    this.alive = true;
    this.respawnTimer = 0;
    this.shootCooldown = 1.2;
    this.hitFlash = 0;
    this.body.setTranslation(
      { x: this.home.x, y: this.home.y, z: this.home.z },
      true,
    );
    this.group.position.set(this.home.x, 0, this.home.z);
    this.group.visible = this.primitiveVisible;
    this.healthBar.visible = true;
    this.collider.setEnabled(true);
  }

  getHealthRatio(): number {
    return this.health / this.maxHealth;
  }

  setPrimitiveVisible(visible: boolean): void {
    this.primitiveVisible = visible;
    this.group.visible = visible && this.alive;
  }

  private hasLineOfSight(
    playerPosition: THREE.Vector3,
    playerCollider: RAPIER.Collider,
  ): boolean {
    const origin = {
      x: this.body.translation().x,
      y: this.body.translation().y + 0.35,
      z: this.body.translation().z,
    };
    const target = {
      x: playerPosition.x,
      y: playerPosition.y + 0.15,
      z: playerPosition.z,
    };
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const dz = target.z - origin.z;
    const length = Math.hypot(dx, dy, dz);
    if (length < 0.001) return true;

    const direction = { x: dx / length, y: dy / length, z: dz / length };
    const hit = this.world.castRay(
      new RAPIER.Ray(origin, direction),
      length,
      true,
      undefined,
      undefined,
      this.collider,
    );

    return hit?.collider.handle === playerCollider.handle;
  }

  private updateHealthBar(camera: THREE.Camera): void {
    if (!this.alive) return;

    const position = this.position;
    this.healthBar.position.set(position.x, position.y + 1.55, position.z);
    this.healthBar.quaternion.copy(camera.quaternion);

    const ratio = this.getHealthRatio();
    this.healthFill.scale.x = Math.max(0.001, ratio);
    this.healthFill.position.x = -(this.healthFillWidth * (1 - ratio)) * 0.5;
  }

  private createVisual(): THREE.Group {
    const group = new THREE.Group();
    group.position.set(this.home.x, 0, this.home.z);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 0.72, 4, 10),
      this.bodyMaterial,
    );
    body.position.y = 0.95;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10),
      this.bodyMaterial,
    );
    head.position.y = 1.67;
    head.castShadow = true;
    group.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.08, 0.045),
      this.eyeMaterial,
    );
    visor.position.set(0, 1.7, 0.27);
    group.add(visor);

    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      this.eyeMaterial,
    );
    core.position.set(0, 1.08, 0.36);
    core.rotation.z = Math.PI * 0.25;
    group.add(core);

    const shoulderLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.27, 0.16, 0.3),
      this.bodyMaterial,
    );
    shoulderLeft.position.set(-0.48, 1.25, 0);
    shoulderLeft.rotation.z = -0.18;
    group.add(shoulderLeft);

    const shoulderRight = shoulderLeft.clone();
    shoulderRight.position.x = 0.48;
    shoulderRight.rotation.z = 0.18;
    group.add(shoulderRight);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.9, 0.12, 8),
      new THREE.MeshStandardMaterial({
        color: 0x281c2a,
        roughness: 0.7,
        metalness: 0.45,
      }),
    );
    base.position.y = 0.06;
    base.receiveShadow = true;
    group.add(base);

    return group;
  }

  private createHealthBar(): THREE.Group {
    const group = new THREE.Group();
    group.renderOrder = 12;

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(1.72, 0.16),
      new THREE.MeshBasicMaterial({
        color: 0x090d16,
        transparent: true,
        opacity: 0.85,
        depthTest: false,
        depthWrite: false,
      }),
    );
    back.renderOrder = 12;
    group.add(back);

    const border = new THREE.Mesh(
      new THREE.PlaneGeometry(1.64, 0.1),
      new THREE.MeshBasicMaterial({
        color: 0x2d0a16,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
        depthWrite: false,
      }),
    );
    border.position.z = 0.001;
    border.renderOrder = 13;
    group.add(border);

    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(this.healthFillWidth, 0.085),
      new THREE.MeshBasicMaterial({
        color: 0xff5c7a,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false,
      }),
    );
    this.healthFill.position.z = 0.002;
    this.healthFill.renderOrder = 14;
    group.add(this.healthFill);

    return group;
  }
}
