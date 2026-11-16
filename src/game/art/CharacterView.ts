import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { LoadedModel } from './AssetLibrary';

export class CharacterView {
  readonly root: THREE.Group;
  readonly groundOffset: number;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private current: THREE.AnimationAction | null = null;

  constructor(
    model: LoadedModel,
    scale: number,
    tint?: number,
    emissive?: number,
    recolorMage = false,
    stretchY = 1,
    widthScale = 1,
  ) {
    const root = cloneSkeleton(model.scene) as THREE.Group;
    root.scale.set(scale * widthScale, scale * stretchY, scale * widthScale);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const cloned = materials.map((material) => {
        const copy = material.clone();
        if (copy instanceof THREE.MeshStandardMaterial) {
          if (tint) copy.color.multiply(new THREE.Color(tint));
          if (emissive) {
            copy.emissive.setHex(emissive);
            copy.emissiveIntensity = 0.55;
          }
          if (recolorMage && copy.map?.image) {
            copy.map = recolorMagePalette(copy.map);
          }
        }
        return copy;
      });
      object.material = Array.isArray(object.material) ? cloned : cloned[0];
    });

    this.root = root;
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    this.groundOffset = Math.max(0, -bounds.min.y);
    this.mixer = new THREE.AnimationMixer(root);

    for (const clip of model.animations) {
      this.actions.set(clip.name, this.mixer.clipAction(clip));
    }

    this.play('Idle', 0);
  }

  setPosition(x: number, y: number, z: number): void {
    this.root.position.set(x, y, z);
  }

  setRotation(yaw: number): void {
    this.root.rotation.y = yaw;
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  play(name: string, fade = 0.16, once = false): void {
    const action = this.actions.get(name);
    if (!action || action === this.current) return;

    if (this.current) {
      this.current.fadeOut(fade);
    }

    action.reset();
    action.setEffectiveTimeScale(1);
    action.setEffectiveWeight(1);
    action.fadeIn(fade);
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    action.play();
    this.current = action;
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }

  hasAction(name: string): boolean {
    return this.actions.has(name);
  }
}

function recolorMagePalette(source: THREE.Texture): THREE.Texture {
  const image = source.image as CanvasImageSource & { width?: number; height?: number };
  if (!image || !image.width || !image.height) return source;

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return source;

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;

  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    // The KayKit atlas uses magenta/purple for the mage robe and hat.
    // Shift those swatches to deep blue/cyan while keeping skin and gold trim.
    if (s > 0.22 && h >= 270 && h <= 350) {
      const shifted = 205 + (h - 270) * 0.08;
      const [r, g, b] = hslToRgb(shifted, Math.min(0.72, s * 0.9), l);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = source.wrapS;
  texture.wrapT = source.wrapT;
  texture.minFilter = source.minFilter;
  texture.magFilter = source.magFilter;
  texture.needsUpdate = true;
  return texture;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) return [0, 0, lightness];

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue: number;
  if (max === red) {
    hue = ((green - blue) / delta + (green < blue ? 6 : 0)) * 60;
  } else if (max === green) {
    hue = ((blue - red) / delta + 2) * 60;
  } else {
    hue = ((red - green) / delta + 4) * 60;
  }

  return [hue, saturation, lightness];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 60) [red, green, blue] = [c, x, 0];
  else if (hue < 120) [red, green, blue] = [x, c, 0];
  else if (hue < 180) [red, green, blue] = [0, c, x];
  else if (hue < 240) [red, green, blue] = [0, x, c];
  else if (hue < 300) [red, green, blue] = [x, 0, c];
  else [red, green, blue] = [c, 0, x];

  return [
    Math.round((red + m) * 255),
    Math.round((green + m) * 255),
    Math.round((blue + m) * 255),
  ];
}
