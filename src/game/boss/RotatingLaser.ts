import * as THREE from 'three';

export class RotatingLaser {
  readonly root = new THREE.Group();
  private readonly beams: THREE.Mesh[] = [];
  private readonly material: THREE.MeshBasicMaterial;
  private angle = 0;
  private readonly halfLength = 8.5;

  constructor(private readonly scene: THREE.Scene, position: THREE.Vector3) {
    this.root.position.set(position.x, 0.9, position.z);
    this.scene.add(this.root);

    this.material = new THREE.MeshBasicMaterial({
      color: 0xff8a3d,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let index = 0; index < 2; index += 1) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(this.halfLength * 2, 0.055, 0.16),
        this.material,
      );
      beam.rotation.y = index * Math.PI * 0.5;
      this.root.add(beam);
      this.beams.push(beam);
    }

    const core = new THREE.PointLight(0xff7a3d, 4.5, 6, 2);
    core.position.y = 0.2;
    this.root.add(core);
  }

  update(dt: number): void {
    this.angle += dt * 1.15;
    this.root.rotation.y = this.angle;
  }

  setPosition(position: THREE.Vector3): void {
    this.root.position.set(position.x, 0.9, position.z);
  }

  hits(position: THREE.Vector3): boolean {
    if (position.y > 1.5) return false;
    const dx = position.x - this.root.position.x;
    const dz = position.z - this.root.position.z;
    const cos = Math.cos(-this.angle);
    const sin = Math.sin(-this.angle);
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    return Math.abs(localX) <= this.halfLength && Math.abs(localZ) <= 0.38;
  }

  dispose(): void {
    this.scene.remove(this.root);
    for (const beam of this.beams) beam.geometry.dispose();
    this.material.dispose();
  }
}
