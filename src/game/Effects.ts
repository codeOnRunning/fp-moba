import * as THREE from 'three';

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  life: number;
  material: THREE.PointsMaterial;
}

interface Flash {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  startScale: number;
  endScale: number;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is not available.');

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.16, 'rgba(255,255,255,0.92)');
  gradient.addColorStop(0.42, 'rgba(255,255,255,0.38)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Effects {
  private readonly glowTexture = makeGlowTexture();
  private readonly bursts: ParticleBurst[] = [];
  private readonly flashes: Flash[] = [];

  constructor(private readonly scene: THREE.Scene) {}

  impact(position: THREE.Vector3, color: number, scale = 1): void {
    this.flash(position, color, 0.45 * scale, 1.8 * scale, 0.24);
    this.burst(position, color, Math.round(8 + scale * 5), 2.4 * scale, 0.36);
  }

  muzzle(position: THREE.Vector3, color: number): void {
    this.flash(position, color, 0.28, 0.9, 0.12);
  }

  castPulse(position: THREE.Vector3, color: number): void {
    this.flash(position, color, 0.6, 2.8, 0.3);
    this.burst(position, color, 12, 1.6, 0.32);
  }

  update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i -= 1) {
      const burst = this.bursts[i];
      burst.age += dt;
      const positions = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = positions.array as Float32Array;

      for (let particle = 0; particle < array.length / 3; particle += 1) {
        const offset = particle * 3;
        array[offset] += burst.velocities[offset] * dt;
        array[offset + 1] += burst.velocities[offset + 1] * dt;
        array[offset + 2] += burst.velocities[offset + 2] * dt;
        burst.velocities[offset + 1] -= 5.2 * dt;
      }

      positions.needsUpdate = true;
      const progress = burst.age / burst.life;
      burst.material.opacity = Math.max(0, 0.9 * (1 - progress));
      burst.material.size = Math.max(0.015, 0.14 * (1 - progress * 0.55));

      if (burst.age >= burst.life) {
        this.scene.remove(burst.points);
        burst.points.geometry.dispose();
        burst.material.dispose();
        this.bursts.splice(i, 1);
      }
    }

    for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
      const flash = this.flashes[i];
      flash.age += dt;
      const progress = Math.min(1, flash.age / flash.life);
      const scale = THREE.MathUtils.lerp(
        flash.startScale,
        flash.endScale,
        easeOutCubic(progress),
      );
      flash.sprite.scale.set(scale, scale, 1);
      const material = flash.sprite.material as THREE.SpriteMaterial;
      material.opacity = Math.max(0, 0.95 * (1 - progress));

      if (flash.age >= flash.life) {
        this.scene.remove(flash.sprite);
        material.dispose();
        this.flashes.splice(i, 1);
      }
    }
  }

  private flash(
    position: THREE.Vector3,
    color: number,
    startScale: number,
    endScale: number,
    life: number,
  ): void {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(startScale, startScale, 1);
    sprite.renderOrder = 20;
    this.scene.add(sprite);
    this.flashes.push({ sprite, age: 0, life, startScale, endScale });
  }

  private burst(
    position: THREE.Vector3,
    color: number,
    count: number,
    speed: number,
    life: number,
  ): void {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const index = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const magnitude = speed * (0.35 + Math.random() * 0.65);
      velocities[index] = Math.sin(phi) * Math.cos(theta) * magnitude;
      velocities[index + 1] = Math.cos(phi) * magnitude * 0.75 + 0.8;
      velocities[index + 2] = Math.sin(phi) * Math.sin(theta) * magnitude;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color,
      map: this.glowTexture,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      alphaTest: 0.01,
    });
    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    points.renderOrder = 21;
    this.scene.add(points);
    this.bursts.push({ points, velocities, age: 0, life, material });
  }
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
