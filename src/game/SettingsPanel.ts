import {
  DEFAULT_SETTINGS,
  type ComfortSettings,
  type CameraMode,
  type QualityLevel,
} from './SettingsStore';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing settings element: #${id}`);
  return found as T;
}

export class SettingsPanel {
  private readonly root = element<HTMLDivElement>('settings-screen');
  private readonly fov = element<HTMLInputElement>('settings-fov');
  private readonly fovValue = element<HTMLSpanElement>('settings-fov-value');
  private readonly cameraMode = element<HTMLSelectElement>('settings-camera-mode');
  private readonly sensitivity = element<HTMLInputElement>('settings-sensitivity');
  private readonly sensitivityValue = element<HTMLSpanElement>('settings-sensitivity-value');
  private readonly bob = element<HTMLInputElement>('settings-bob');
  private readonly bobValue = element<HTMLSpanElement>('settings-bob-value');
  private readonly shake = element<HTMLInputElement>('settings-shake');
  private readonly shakeValue = element<HTMLSpanElement>('settings-shake-value');
  private readonly quality = element<HTMLSelectElement>('settings-quality');
  private readonly hideWeapon = element<HTMLInputElement>('settings-hide-weapon');
  private readonly invertY = element<HTMLInputElement>('settings-invert-y');
  private readonly closeButton = element<HTMLButtonElement>('settings-close');
  private readonly resetButton = element<HTMLButtonElement>('settings-reset');

  private settings: ComfortSettings;

  constructor(
    settings: ComfortSettings,
    private readonly onChange: (settings: ComfortSettings) => void,
    private readonly onClose: () => void,
  ) {
    this.settings = { ...settings };

    this.fov.addEventListener('input', () => {
      this.update({ fov: Number(this.fov.value) });
    });
    this.cameraMode.addEventListener('change', () => {
      this.update({ cameraMode: this.cameraMode.value as CameraMode });
    });
    this.sensitivity.addEventListener('input', () => {
      this.update({ sensitivity: Number(this.sensitivity.value) / 100 });
    });
    this.bob.addEventListener('input', () => {
      this.update({ viewmodelBob: Number(this.bob.value) });
    });
    this.shake.addEventListener('input', () => {
      this.update({ screenShake: Number(this.shake.value) });
    });
    this.quality.addEventListener('change', () => {
      this.update({ quality: this.quality.value as QualityLevel });
    });
    this.hideWeapon.addEventListener('change', () => {
      this.update({ hideWeapon: this.hideWeapon.checked });
    });
    this.invertY.addEventListener('change', () => {
      this.update({ invertY: this.invertY.checked });
    });

    this.resetButton.addEventListener('click', () => {
      this.settings = { ...DEFAULT_SETTINGS };
      this.sync();
      this.onChange({ ...this.settings });
    });
    this.closeButton.addEventListener('click', () => {
      this.hide();
      this.onClose();
    });
  }

  show(settings: ComfortSettings = this.settings): void {
    this.settings = { ...settings };
    this.sync();
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  private update(patch: Partial<ComfortSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.sync();
    this.onChange({ ...this.settings });
  }

  private sync(): void {
    this.fov.value = String(this.settings.fov);
    this.fovValue.textContent = `${Math.round(this.settings.fov)}°`;
    this.cameraMode.value = this.settings.cameraMode;
    this.sensitivity.value = String(Math.round(this.settings.sensitivity * 100));
    this.sensitivityValue.textContent = `${this.settings.sensitivity.toFixed(2)}×`;
    this.bob.value = String(this.settings.viewmodelBob);
    this.bobValue.textContent = `${Math.round(this.settings.viewmodelBob)}%`;
    this.shake.value = String(this.settings.screenShake);
    this.shakeValue.textContent = `${Math.round(this.settings.screenShake)}%`;
    this.quality.value = this.settings.quality;
    this.hideWeapon.checked = this.settings.hideWeapon;
    this.invertY.checked = this.settings.invertY;
  }
}
