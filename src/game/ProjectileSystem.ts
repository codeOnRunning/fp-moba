import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export type ProjectileKind = 'basic' | 'q' | 'enemy' | 'void';
export type ProjectileOwner = 'player' | 'dummy';

interface ProjectileConfig {
  speed: number;
  damage: number;
  life: number;
  radius: number;
  color: number;
  glowScale: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  glow: THREE.Sprite;
  trail: THREE.Sprite;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  kind: ProjectileKind;
  owner: ProjectileOwner;
  speed: number;
  damage: number;
  life: number;
  maxLife: number;
  radius: number;
  homing: number;
  noStreak: boolean;
}

export interface ProjectileOverrides {
  speed?: number;
  damage?: number;
  life?: number;
  radius?: number;
  glowScale?: number;
  homing?: number;
  noStreak?: boolean;
}

export interface ProjectileCallbacks {
  onDummyHit: (
    damage: number,
    point: THREE.Vector3,
    kind: ProjectileKind,
    noStreak?: boolean,
  ) => void;
  onPlayerHit: (damage: number, point: THREE.Vector3, kind: ProjectileKind) => void;
  onWallHit: (point: THREE.Vector3, kind: ProjectileKind) => void;
  onAddHit?: (targetId: number, damage: number, point: THREE.Vector3, kind: ProjectileKind) => void;
}

export interface ProjectileExtraTarget {
  id: number;
  collider: RAPIER.Collider;
  alive: boolean;
}

const CONFIG: Record<ProjectileKind, ProjectileConfig> = {
  basic: {
    speed: 42,
    damage: 14,
    life: 0.9,
    radius: 0.08,
    color: 0x9fe8ff,
    glowScale: 0.62,
  },
  q: {
    speed: 38,
    damage: 55,
    life: 1.05,
    radius: 0.22,
    color: 0xc7a4ff,
    glowScale: 1.25,
  },
  enemy: {
    speed: 13,
    damage: 9,
    life: 2.4,
    radius: 0.14,
    color: 0xff5c7a,
    glowScale: 0.82,
  },
  void: {
    speed: 8,
    damage: 11,
    life: 4.5,
    radius: 0.2,
    color: 0xb14cff,
    glowScale: 1.15,
  },
};

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available.');

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.32)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class ProjectileSystem {
  private readonly projectiles: Projectile[] = [];
  private readonly glowTexture = makeGlowTexture();
  private readonly geometry: THREE.SphereGeometry;
  private readonly materials = new Map<ProjectileKind, THREE.MeshBasicMaterial>();
  private readonly glowMaterials = new Map<ProjectileKind, THREE.SpriteMaterial>();

  constructor(private readonly scene: THREE.Scene) {
    this.geometry = new THREE.SphereGeometry(1, 12, 10);

    for (const kind of Object.keys(CONFIG) as ProjectileKind[]) {
      const config = CONFIG[kind];
      this.materials.set(
        kind,
        new THREE.MeshBasicMaterial({
          color: config.color,
          transparent: true,
          opacity: 0.95,
        }),
      );
      this.glowMaterials.set(
        kind,
        new THREE.SpriteMaterial({
          map: this.glowTexture,
          color: config.color,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
    }
  }

  spawn(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    kind: ProjectileKind,
    owner: ProjectileOwner,
    overrides: ProjectileOverrides = {},
  ): void {
    const config = CONFIG[kind];
    const material = this.materials.get(kind);
    const glowMaterial = this.glowMaterials.get(kind);
    if (!material || !glowMaterial) return;

    const radius = overrides.radius ?? config.radius;
    const glowScale = overrides.glowScale ?? config.glowScale;
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.scale.setScalar(radius);
    mesh.position.copy(origin);
    mesh.renderOrder = 8;
    this.scene.add(mesh);

    const glow = new THREE.Sprite(glowMaterial);
    glow.position.copy(origin);
    glow.scale.set(glowScale, glowScale, 1);
    glow.renderOrder = 9;
    this.scene.add(glow);

    const trail = new THREE.Sprite(glowMaterial.clone());
    trail.position.copy(origin);
    trail.scale.set(glowScale * 0.72, glowScale * 0.72, 1);
    trail.material.opacity = 0.42;
    trail.renderOrder = 7;
    this.scene.add(trail);

    this.projectiles.push({
      mesh,
      glow,
      trail,
      position: origin.clone(),
      direction: direction.clone().normalize(),
      kind,
      owner,
      speed: overrides.speed ?? config.speed,
      damage: overrides.damage ?? config.damage,
      life: 0,
      maxLife: overrides.life ?? config.life,
      radius,
      homing: overrides.homing ?? 0,
      noStreak: overrides.noStreak ?? false,
    });
  }

  update(
    dt: number,
    world: RAPIER.World,
    playerCollider: RAPIER.Collider,
    dummyCollider: RAPIER.Collider,
    dummyAlive: boolean,
    callbacks: ProjectileCallbacks,
    extraTargets: ProjectileExtraTarget[] = [],
    playerPosition?: THREE.Vector3,
  ): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      if (!projectile) continue;

      if (
        projectile.homing > 0 &&
        projectile.owner === 'dummy' &&
        playerPosition
      ) {
        const desired = playerPosition
          .clone()
          .add(new THREE.Vector3(0, 0.55, 0))
          .sub(projectile.position)
          .normalize();
        const turn = Math.min(1, projectile.homing * dt);
        projectile.direction.lerp(desired, turn).normalize();
      }

      const previous = projectile.position.clone();
      projectile.trail.position.copy(previous);
      const trailScale = projectile.radius * (projectile.kind === 'q' ? 10 : 7);
      projectile.trail.scale.set(trailScale, trailScale, 1);
      const travel = projectile.speed * dt;

      projectile.position.addScaledVector(projectile.direction, travel);
      projectile.life += dt;
      projectile.mesh.position.copy(projectile.position);
      projectile.glow.position.copy(projectile.position);

      const ray = new RAPIER.Ray(previous, projectile.direction);
      const exclude = projectile.owner === 'player' ? playerCollider : dummyCollider;
      const hit = world.castRay(ray, travel, true, undefined, undefined, exclude);

      if (hit) {
        const point = previous
          .clone()
          .addScaledVector(projectile.direction, hit.timeOfImpact);

        if (projectile.owner === 'player') {
          const add = extraTargets.find(
            (target) => target.alive && target.collider.handle === hit.collider.handle,
          );
          if (add) {
            callbacks.onAddHit?.(add.id, projectile.damage, point, projectile.kind);
            this.remove(i);
            continue;
          }
        }

        if (
          projectile.owner === 'player' &&
          dummyAlive &&
          hit.collider.handle === dummyCollider.handle
        ) {
          callbacks.onDummyHit(projectile.damage, point, projectile.kind, projectile.noStreak);
        } else if (
          projectile.owner === 'dummy' &&
          hit.collider.handle === playerCollider.handle
        ) {
          callbacks.onPlayerHit(projectile.damage, point, projectile.kind);
        } else {
          callbacks.onWallHit(point, projectile.kind);
        }

        this.remove(i);
        continue;
      }

      if (projectile.life >= projectile.maxLife) {
        this.remove(i);
      }
    }
  }

  clear(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      this.remove(i);
    }
  }

  get count(): number {
    return this.projectiles.length;
  }

  private remove(index: number): void {
    const projectile = this.projectiles[index];
    if (!projectile) return;
    this.scene.remove(projectile.mesh);
    this.scene.remove(projectile.glow);
    this.scene.remove(projectile.trail);
    projectile.trail.material.dispose();
    this.projectiles.splice(index, 1);
  }
}
