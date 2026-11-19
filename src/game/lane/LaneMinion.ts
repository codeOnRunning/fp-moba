import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export type LaneTeam = 'player' | 'enemy';

export class LaneMinion {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly group: THREE.Group;
  readonly team: LaneTeam;
  readonly id: number;
  health = 70;
  alive = true;

  private readonly material: THREE.MeshStandardMaterial;
  private attackCooldown = 0.8 + Math.random() * 0.8;
  private age = 0;

  constructor(
    private readonly world: RAPIER.World,
    scene: THREE.Scene,
    position: THREE.Vector3,
    team: LaneTeam,
    id: number,
    private readonly onDeath: () => void,
  ) {
    this.team = team;
    this.id = id;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        position.x,
        position.y,
        position.z,
      ),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(0.34, 0.35),
      this.body,
    );
    const color = team === 'player' ? 0x57e0f0 : 0xff5c7a;
    this.material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.25,
    });
    this.group = new THREE.Group();
    this.group.position.copy(position);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.3, 0.48, 4, 8),
      this.material,
    );
    body.position.y = 0.55;
    this.group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 6),
      this.material,
    );
    head.position.y = 0.95;
    this.group.add(head);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.7, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xffe6a8 }),
    );
    blade.position.set(0.38, 0.55, 0);
    blade.rotation.z = -0.35;
    this.group.add(blade);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    const translation = this.body.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }

  update(dt: number, target: THREE.Vector3): void {
    if (!this.alive) return;
    this.age += dt;
    this.attackCooldown -= dt;
    const current = this.body.translation();
    const dx = target.x - current.x;
    const dz = target.z - current.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 1.8) {
      const step = Math.min(1.55 * dt, distance - 1.4);
      this.body.setNextKinematicTranslation({
        x: current.x + (dx / Math.max(distance, 0.001)) * step,
        y: 0.95,
        z: current.z + (dz / Math.max(distance, 0.001)) * step,
      });
    }
    const translation = this.body.translation();
    this.group.position.set(translation.x, translation.y - 0.95, translation.z);
    this.group.rotation.y = Math.atan2(dx, dz) + Math.PI;
    this.group.scale.setScalar(1 + Math.sin(this.age * 5) * 0.03);
  }

  tryAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 1.5;
    return true;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.material.emissiveIntensity = 2.2;
    window.setTimeout(() => {
      if (this.alive) this.material.emissiveIntensity = 0.45;
    }, 70);
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
