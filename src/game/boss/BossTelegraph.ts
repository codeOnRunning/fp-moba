import * as THREE from 'three';

interface BossTelegraphOptions {
  position: THREE.Vector3;
  radius: number;
  delay: number;
  color?: number;
  onComplete: (center: THREE.Vector3, radius: number) => void;
}

/** Ground warning circle used by boss slam / shockwave attacks. */
export class BossTelegraph {
  private readonly root = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly disc: THREE.Mesh;
  private readonly ringMaterial: THREE.MeshBasicMaterial;
  private readonly discMaterial: THREE.MeshBasicMaterial;
  private readonly radius: number;
  private readonly delay: number;
  private readonly onComplete: (center: THREE.Vector3, radius: number) => void;
  private age = 0;
  private completed = false;

  constructor(
    private readonly scene: THREE.Scene,
    options: BossTelegraphOptions,
  ) {
    this.radius = options.radius;
    this.delay = options.delay;
    this.onComplete = options.onComplete;
    const color = options.color ?? 0xff5c7a;

    this.root.position.copy(options.position);
    this.root.position.y = 0.07;
    this.scene.add(this.root);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(this.radius * 0.82, this.radius, 56),
      this.ringMaterial,
    );
    this.ring.rotation.x = -Math.PI * 0.5;
    this.root.add(this.ring);

    this.discMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
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
  }

  update(dt: number): boolean {
    this.age += dt;
    const progress = Math.min(1, this.age / this.delay);
    const pulse = 0.5 + Math.sin(this.age * 12) * 0.18;
    this.ringMaterial.opacity = 0.4 + pulse * 0.5;
    this.discMaterial.opacity = 0.06 + progress * 0.2;
    this.ring.scale.setScalar(0.98 + progress * 0.02);

    if (!this.completed && this.age >= this.delay) {
      this.completed = true;
      this.onComplete(this.root.position.clone(), this.radius);
    }

    if (this.completed) {
      const fade = Math.max(0, 1 - (this.age - this.delay) / 0.35);
      this.ringMaterial.opacity = 0.9 * fade;
      this.discMaterial.opacity = 0.26 * fade;
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
    this.ringMaterial.dispose();
    this.discMaterial.dispose();
  }
}
