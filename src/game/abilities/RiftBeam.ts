import * as THREE from 'three';

/** R: a visible channeled beam from the caster to the first hit point. */
export class RiftBeam {
  private readonly mesh: THREE.Mesh;
  private readonly core: THREE.Mesh;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly coreMaterial: THREE.MeshBasicMaterial;
  private readonly light: THREE.PointLight;
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly midpoint = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();

  constructor(private readonly scene: THREE.Scene) {
    this.material = new THREE.MeshBasicMaterial({
      color: 0x57e0f0,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8fbff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1, 10, 1, true),
      this.material,
    );
    this.core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 1, 8, 1, true),
      this.coreMaterial,
    );
    this.mesh.renderOrder = 14;
    this.core.renderOrder = 15;
    this.mesh.visible = false;
    this.core.visible = false;
    this.scene.add(this.mesh, this.core);

    this.light = new THREE.PointLight(0x57e0f0, 0, 9, 2);
    this.scene.add(this.light);
  }

  setSegment(start: THREE.Vector3, end: THREE.Vector3, visible = true): void {
    this.mesh.visible = visible;
    this.core.visible = visible;
    this.light.visible = visible;
    if (!visible) {
      this.light.intensity = 0;
      return;
    }

    this.direction.copy(end).sub(start);
    const length = this.direction.length();
    if (length < 0.001) {
      this.mesh.visible = false;
      this.core.visible = false;
      return;
    }

    this.direction.normalize();
    this.midpoint.copy(start).addScaledVector(this.direction, length * 0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(this.up, this.direction);

    this.mesh.position.copy(this.midpoint);
    this.mesh.quaternion.copy(quaternion);
    this.mesh.scale.set(1, length, 1);

    this.core.position.copy(this.midpoint);
    this.core.quaternion.copy(quaternion);
    this.core.scale.set(1, length, 1);

    this.light.position.copy(end);
    this.light.intensity = 3.5;
  }

  hide(): void {
    this.mesh.visible = false;
    this.core.visible = false;
    this.light.visible = false;
    this.light.intensity = 0;
  }
}
