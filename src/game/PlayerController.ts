import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

const PLAYER_RADIUS = 0.34;
const PLAYER_HALF_HEIGHT = 0.52;
const EYE_OFFSET = 0.82;

export class PlayerController {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly position = new THREE.Vector3();
  readonly visual: THREE.Group;

  private readonly controller: RAPIER.KinematicCharacterController;
  private verticalVelocity = 0;
  private grounded = false;
  private readonly horizontalVelocity = new THREE.Vector2();
  private readonly externalVelocity = new THREE.Vector2();
  private readonly dashDirection = new THREE.Vector2();
  private dashTime = 0;
  private dashSpeed = 0;

  constructor(
    private readonly world: RAPIER.World,
    private readonly scene: THREE.Scene,
    spawn: THREE.Vector3,
  ) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z),
    );

    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS).setFriction(0.2),
      this.body,
    );

    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(0.35, 0.2, true);
    this.controller.enableSnapToGround(0.45);
    this.controller.setMaxSlopeClimbAngle((48 * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((28 * Math.PI) / 180);
    this.controller.setSlideEnabled(true);

    this.position.copy(spawn);
    this.visual = this.createVisual();
    scene.add(this.visual);
  }

  get eyePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + EYE_OFFSET,
      this.position.z,
    );
  }

  get chestPosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + 0.22,
      this.position.z,
    );
  }

  get isGrounded(): boolean {
    return this.grounded;
  }

  get isAirborne(): boolean {
    return !this.grounded || this.position.y > 1.02;
  }

  jump(): boolean {
    if (!this.grounded) return false;
    this.verticalVelocity = 7.2;
    this.grounded = false;
    return true;
  }

  applyExternalForce(x: number, z: number): void {
    this.externalVelocity.set(x, z);
  }

  setVisualVisible(visible: boolean): void {
    this.visual.visible = visible;
  }

  face(yaw: number): void {
    this.visual.rotation.y = yaw + Math.PI;
  }

  teleport(spawn: THREE.Vector3): void {
    this.body.setTranslation({ x: spawn.x, y: spawn.y, z: spawn.z }, true);
    this.position.copy(spawn);
    this.verticalVelocity = 0;
    this.grounded = false;
    this.horizontalVelocity.set(0, 0);
    this.dashTime = 0;
    this.syncVisual(0);
  }

  dash(direction: { x: number; z: number }, distance = 8, duration = 0.18): void {
    const length = Math.hypot(direction.x, direction.z);
    if (length < 0.001) return;
    this.dashDirection.set(direction.x / length, direction.z / length);
    this.dashTime = duration;
    this.dashSpeed = distance / duration;
  }

  update(dt: number, moveDirection: { x: number; z: number }, yaw: number): void {
    const maxSpeed = 5.5;
    const hasInput = moveDirection.x !== 0 || moveDirection.z !== 0;
    const acceleration = hasInput ? 20 : 28;
    const translation = this.body.translation();

    if (this.dashTime > 0) {
      this.dashTime = Math.max(0, this.dashTime - dt);
      this.horizontalVelocity.copy(this.dashDirection).multiplyScalar(this.dashSpeed);
    } else {
      const currentSpeed = this.horizontalVelocity.length();
      if (currentSpeed > maxSpeed) {
        this.horizontalVelocity.multiplyScalar(maxSpeed / currentSpeed);
      }
      this.horizontalVelocity.x = approach(
        this.horizontalVelocity.x,
        moveDirection.x * maxSpeed,
        acceleration * dt,
      );
      this.horizontalVelocity.y = approach(
        this.horizontalVelocity.y,
        moveDirection.z * maxSpeed,
        acceleration * dt,
      );
    }

    const desiredX =
      (this.horizontalVelocity.x + this.externalVelocity.x) * dt;
    const desiredZ =
      (this.horizontalVelocity.y + this.externalVelocity.y) * dt;
    this.externalVelocity.set(0, 0);

    this.verticalVelocity -= 26 * dt;
    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    }

    const desired = {
      x: desiredX,
      y: this.verticalVelocity * dt,
      z: desiredZ,
    };

    this.controller.computeColliderMovement(this.collider, desired);
    const corrected = this.controller.computedMovement();

    this.body.setNextKinematicTranslation({
      x: translation.x + corrected.x,
      y: translation.y + corrected.y,
      z: translation.z + corrected.z,
    });

    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
    }

    this.visual.rotation.y = yaw + Math.PI;
  }

  sync(): void {
    const translation = this.body.translation();
    this.position.set(translation.x, translation.y, translation.z);
    this.syncVisual(0);
  }

  private syncVisual(_dt: number): void {
    this.visual.position.set(this.position.x, this.position.y, this.position.z);
  }

  private createVisual(): THREE.Group {
    const group = new THREE.Group();
    group.visible = false;

    const robe = new THREE.MeshStandardMaterial({
      color: 0x273c68,
      roughness: 0.58,
      metalness: 0.3,
    });
    const trim = new THREE.MeshStandardMaterial({
      color: 0xb08a4b,
      roughness: 0.4,
      metalness: 0.65,
    });
    const skin = new THREE.MeshStandardMaterial({
      color: 0xc9b7a9,
      roughness: 0.85,
      metalness: 0.02,
    });

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(PLAYER_RADIUS, 0.72, 4, 10),
      robe,
    );
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), skin);
    head.position.y = 0.7;
    head.castShadow = true;
    group.add(head);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.38, 8), robe);
    hood.position.y = 0.87;
    hood.castShadow = true;
    group.add(hood);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.055, 0.035),
      new THREE.MeshStandardMaterial({
        color: 0x9fe8ff,
        emissive: 0x3f9fff,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      }),
    );
    visor.position.set(0, 0.7, 0.22);
    group.add(visor);

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 16), trim);
    belt.position.y = 0.04;
    belt.rotation.x = Math.PI * 0.5;
    group.add(belt);

    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0x79d9ff,
        emissive: 0x1c7dff,
        emissiveIntensity: 1.1,
        roughness: 0.25,
      }),
    );
    shoulder.position.set(-0.33, 0.3, 0);
    group.add(shoulder);

    const shoulder2 = shoulder.clone();
    shoulder2.position.x = 0.33;
    group.add(shoulder2);

    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.035, 1.05, 6),
      new THREE.MeshStandardMaterial({ color: 0x7c643d, roughness: 0.56, metalness: 0.35 }),
    );
    staff.position.set(0.43, 0.15, 0.08);
    staff.rotation.z = -0.16;
    staff.castShadow = true;
    group.add(staff);

    const staffOrb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      new THREE.MeshStandardMaterial({
        color: 0xd4b5ff,
        emissive: 0x6e39ff,
        emissiveIntensity: 1.8,
        roughness: 0.1,
      }),
    );
    staffOrb.position.set(0.52, 0.7, 0.08);
    group.add(staffOrb);

    this.scene.add(group);
    return group;
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
