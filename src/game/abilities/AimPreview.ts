import * as THREE from 'three';

/** Cyan ground preview shown while holding the gravity-zone key. */
export class AimPreview {
  private readonly root = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly disc: THREE.Mesh;
  private readonly beam: THREE.Mesh;
  private readonly crossA: THREE.Mesh;
  private readonly crossB: THREE.Mesh;
  private readonly ringMaterial: THREE.MeshBasicMaterial;
  private readonly discMaterial: THREE.MeshBasicMaterial;
  private readonly beamMaterial: THREE.MeshBasicMaterial;
  private readonly crossMaterial: THREE.MeshBasicMaterial;
  private readonly radius: number;
  private age = 0;

  constructor(
    private readonly scene: THREE.Scene,
    radius: number,
  ) {
    this.radius = radius;
    this.root.visible = false;
    this.scene.add(this.root);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(this.radius * 0.86, this.radius, 64),
      this.ringMaterial,
    );
    this.ring.rotation.x = -Math.PI * 0.5;
    this.ring.renderOrder = 25;
    this.root.add(this.ring);

    this.discMaterial = new THREE.MeshBasicMaterial({
      color: 0x2d81ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    this.disc = new THREE.Mesh(
      new THREE.CircleGeometry(this.radius * 0.86, 64),
      this.discMaterial,
    );
    this.disc.rotation.x = -Math.PI * 0.5;
    this.disc.renderOrder = 24;
    this.root.add(this.disc);

    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.12, 3.2, 12, 1, true),
      this.beamMaterial,
    );
    this.beam.position.y = 1.6;
    this.beam.renderOrder = 25;
    this.root.add(this.beam);

    this.crossMaterial = new THREE.MeshBasicMaterial({
      color: 0xc9fbff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.crossA = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.045, 0.1),
      this.crossMaterial,
    );
    this.crossA.position.y = 0.03;
    this.crossA.renderOrder = 26;
    this.root.add(this.crossA);

    this.crossB = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.045, 1.15),
      this.crossMaterial,
    );
    this.crossB.position.y = 0.03;
    this.crossB.renderOrder = 26;
    this.root.add(this.crossB);
  }

  setPosition(position: THREE.Vector3): void {
    this.root.position.set(position.x, 0.065, position.z);
  }

  setRadiusScale(scale: number): void {
    this.root.scale.setScalar(scale);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
    if (visible) this.age = 0;
  }

  get visible(): boolean {
    return this.root.visible;
  }

  update(dt: number): void {
    this.age += dt;
    this.ring.rotation.z += dt * 0.35;
    const pulse = 0.5 + Math.sin(this.age * 5.5) * 0.16;
    this.ringMaterial.opacity = 0.55 + pulse * 0.35;
    this.discMaterial.opacity = 0.06 + pulse * 0.08;
    this.beamMaterial.opacity = 0.08 + pulse * 0.08;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.ring.geometry.dispose();
    this.disc.geometry.dispose();
    this.beam.geometry.dispose();
    this.crossA.geometry.dispose();
    this.crossB.geometry.dispose();
    this.ringMaterial.dispose();
    this.discMaterial.dispose();
    this.beamMaterial.dispose();
    this.crossMaterial.dispose();
  }
}
