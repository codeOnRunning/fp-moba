import * as THREE from 'three';

interface GravityZoneOptions {
  position: THREE.Vector3;
  radius: number;
  delay?: number;
  onExplode: (center: THREE.Vector3, radius: number) => void;
}

/**
 * W: a telegraphed gravity well. It visibly charges for `delay` seconds,
 * then explodes once and fades out.
 */
export class GravityZone {
  private readonly root = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly disc: THREE.Mesh;
  private readonly pillar: THREE.Mesh;
  private readonly ringMaterial: THREE.MeshBasicMaterial;
  private readonly discMaterial: THREE.MeshBasicMaterial;
  private readonly pillarMaterial: THREE.MeshBasicMaterial;
  private readonly radius: number;
  private readonly delay: number;
  private readonly onExplode: (center: THREE.Vector3, radius: number) => void;
  private age = 0;
  private exploded = false;

  constructor(
    private readonly scene: THREE.Scene,
    options: GravityZoneOptions,
  ) {
    this.radius = options.radius;
    this.delay = options.delay ?? 1.0;
    this.onExplode = options.onExplode;

    this.root.position.copy(options.position);
    this.root.position.y = 0.06;
    this.scene.add(this.root);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(this.radius * 0.84, this.radius, 56),
      this.ringMaterial,
    );
    this.ring.rotation.x = -Math.PI * 0.5;
    this.root.add(this.ring);

    this.discMaterial = new THREE.MeshBasicMaterial({
      color: 0x2d81ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.82, 56),
      this.discMaterial,
    );
    this.disc.rotation.x = -Math.PI * 0.5;
    this.root.add(this.disc);

    this.pillarMaterial = new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.22, 1.4, 16, 1, true),
      this.pillarMaterial,
    );
    this.pillar.position.y = 0.7;
    this.root.add(this.pillar);
  }

  update(dt: number): boolean {
    this.age += dt;
    const charge = Math.min(1, this.age / this.delay);
    this.ring.rotation.z += dt * 0.9;
    this.ring.scale.setScalar(0.94 + charge * 0.06);
    this.ringMaterial.opacity = 0.35 + charge * 0.55;
    this.discMaterial.opacity = 0.06 + charge * 0.16;
    this.pillarMaterial.opacity = 0.04 + charge * 0.18;

    if (!this.exploded && this.age >= this.delay) {
      this.exploded = true;
      this.onExplode(this.root.position.clone(), this.radius);
    }

    if (this.exploded) {
      const fade = Math.max(0, 1 - (this.age - this.delay) / 0.35);
      this.ringMaterial.opacity = 0.9 * fade;
      this.discMaterial.opacity = 0.24 * fade;
      this.pillarMaterial.opacity = 0.22 * fade;
      this.root.scale.setScalar(1 + (1 - fade) * 0.08);
    }

    if (this.age >= this.delay + 0.4) {
      this.dispose();
      return false;
    }
    return true;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.ring.geometry.dispose();
    this.disc.geometry.dispose();
    this.pillar.geometry.dispose();
    this.ringMaterial.dispose();
    this.discMaterial.dispose();
    this.pillarMaterial.dispose();
  }
}
