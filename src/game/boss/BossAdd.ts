import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { DummyShot } from '../Dummy';

export class BossAdd {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly group: THREE.Group;
  health = 100;
  alive = true;

  private readonly material: THREE.MeshStandardMaterial;
  private readonly glow: THREE.PointLight;
  private shootCooldown = 1.2 + Math.random() * 0.8;
  private age = 0;
  private readonly home: THREE.Vector3;

  constructor(
    private readonly world: RAPIER.World,
    scene: THREE.Scene,
    home: THREE.Vector3,
    private readonly onShoot: (shot: DummyShot) => void,
    private readonly onDeath: () => void,
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
      RAPIER.ColliderDesc.ball(0.32),
      this.body,
    );

    this.material = new THREE.MeshStandardMaterial({
      color: 0xff6a93,
      emissive: 0xff214b,
      emissiveIntensity: 2.2,
      roughness: 0.18,
      metalness: 0.25,
    });
    this.group = new THREE.Group();
    this.group.position.copy(home);
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3, 0),
      this.material,
    );
    core.rotation.z = Math.PI * 0.25;
    this.group.add(core);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.025, 6, 24),
      new THREE.MeshBasicMaterial({
        color: 0xff5c7a,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.rotation.x = Math.PI * 0.5;
    this.group.add(halo);
    this.glow = new THREE.PointLight(0xff4d6d, 3, 5, 2);
    this.group.add(this.glow);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    const t = this.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.alive) return;
    this.age += dt;
    this.shootCooldown -= dt;

    const current = this.body.translation();
    const dx = playerPosition.x - current.x;
    const dz = playerPosition.z - current.z;
    const distance = Math.hypot(dx, dz);
    const targetX =
      distance > 7
        ? current.x + (dx / Math.max(distance, 0.01)) * 1.5
        : current.x + Math.sin(this.age * 1.6) * 1.4;
    const targetZ =
      distance > 7
        ? current.z + (dz / Math.max(distance, 0.01)) * 1.5
        : current.z + Math.cos(this.age * 1.6) * 1.4;
    const nextX = THREE.MathUtils.damp(current.x, targetX, 1.6, dt);
    const nextZ = THREE.MathUtils.damp(current.z, targetZ, 1.6, dt);
    this.body.setNextKinematicTranslation({
      x: nextX,
      y: this.home.y + Math.sin(this.age * 2.2) * 0.14,
      z: nextZ,
    });
    this.group.position.set(nextX, this.home.y + Math.sin(this.age * 2.2) * 0.14, nextZ);
    this.group.rotation.y += dt * 1.4;
    this.group.scale.setScalar(1 + Math.sin(this.age * 3) * 0.05);

    if (distance < 25 && this.shootCooldown <= 0) {
      this.shootCooldown = 2.2 + Math.random() * 1.2;
      const origin = new THREE.Vector3(nextX, this.home.y, nextZ);
      const target = new THREE.Vector3(
        playerPosition.x,
        playerPosition.y + 0.25,
        playerPosition.z,
      );
      this.onShoot({
        origin,
        direction: target.sub(origin).normalize(),
      });
    }
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.material.emissiveIntensity = 4.5;
    window.setTimeout(() => {
      if (this.alive) this.material.emissiveIntensity = 2.2;
    }, 80);

    if (this.health <= 0) {
      this.alive = false;
      this.collider.setEnabled(false);
      this.group.visible = false;
      this.onDeath();
      return true;
    }
    return false;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.world.removeRigidBody(this.body);
  }
}
