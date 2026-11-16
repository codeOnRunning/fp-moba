export type CameraMode = 'first' | 'third';
export type QualityLevel = 'low' | 'medium' | 'high';

export interface ComfortSettings {
  fov: number;
  cameraMode: CameraMode;
  sensitivity: number;
  viewmodelBob: number;
  screenShake: number;
  quality: QualityLevel;
  hideWeapon: boolean;
  invertY: boolean;
}

export const DEFAULT_SETTINGS: ComfortSettings = {
  fov: 70,
  cameraMode: 'third',
  sensitivity: 0.95,
  viewmodelBob: 0,
  screenShake: 0,
  quality: 'medium',
  hideWeapon: false,
  invertY: false,
};

const STORAGE_KEY = 'fp-moba.comfort-settings.v1';

export function loadSettings(): ComfortSettings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ComfortSettings>;
    return sanitize({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: ComfortSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private modes; keep the session usable.
  }
}

export function sanitize(settings: ComfortSettings): ComfortSettings {
  return {
    fov: clamp(settings.fov, 60, 90),
    cameraMode: settings.cameraMode === 'first' ? 'first' : 'third',
    sensitivity: clamp(settings.sensitivity, 0.5, 2),
    viewmodelBob: clamp(settings.viewmodelBob, 0, 100),
    screenShake: clamp(settings.screenShake, 0, 100),
    quality:
      settings.quality === 'low' || settings.quality === 'high'
        ? settings.quality
        : 'medium',
    hideWeapon: Boolean(settings.hideWeapon),
    invertY: Boolean(settings.invertY),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
