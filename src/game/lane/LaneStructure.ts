import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export type LaneStructureKind = 'tower' | 'nexus';

export class LaneStructure {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly group: THREE.Group;
  readonly kind: LaneStructureKind;
  readonly id: number;
  health: number;
  alive = true;

  private readonly material: THREE.MeshStandardMaterial;
  private readonly maxHealth: number;
  private attackCooldown = 1.5;

  constructor(
    private readonly world: RAPIER.World,
    scene: THREE.Scene,
    position: THREE.Vector3,
    id: number,
    kind: LaneStructureKind,
    private readonly onAttackPlayer: (damage: number) => void,
    private readonly onDeath: () => void,
  ) {
    this.id = id;
    this.kind = kind;
    this.maxHealth = kind === 'nexus' ? 1000 : 500;
    this.health = this.maxHealth;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
        position.x,
        position.y,
        position.z,
      ),
    );
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.cylinder(kind === 'nexus' ? 1.2 : 1.8, 0.8),
      this.body,
    );

    this.material = new THREE.MeshStandardMaterial({
      color: kind === 'nexus' ? 0xffd27a : 0xff6a93,
      emissive: kind === 'nexus' ? 0xff9f43 : 0xff214b,
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.5,
    });
    this.group = new THREE.Group();
    this.group.position.copy(position);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(
        kind === 'nexus' ? 1.1 : 1.5,
        kind === 'nexus' ? 1.4 : 1.9,
        kind === 'nexus' ? 1.4 : 3.2,
        8,
      ),
      new THREE.MeshStandardMaterial({
        color: 0x2a2338,
        roughness: 0.7,
        metalness: 0.35,
      }),
    );
    base.position.y = kind === 'nexus' ? 0.7 : 1.6;
    base.castShadow = true;
    this.group.add(base);
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(kind === 'nexus' ? 0.9 : 0.55, 0),
      this.material,
    );
    crystal.position.y = kind === 'nexus' ? 1.9 : 3.5;
    crystal.castShadow = true;
    this.group.add(crystal);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(kind === 'nexus' ? 1.5 : 0.9, 0.04, 6, 24),
      new THREE.MeshBasicMaterial({
        color: this.material.emissive,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = crystal.position.y;
    this.group.add(ring);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    const translation = this.body.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    if (!this.alive || this.kind !== 'tower') return;
    this.attackCooldown -= dt;
    if (
      this.attackCooldown <= 0 &&
      horizontalDistance(this.position, playerPosition) < 14
    ) {
      this.attackCooldown = 2.2;
      this.onAttackPlayer(8);
    }
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    this.material.emissiveIntensity = 3.5;
    window.setTimeout(() => {
      if (this.alive) this.material.emissiveIntensity = 1.2;
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

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
