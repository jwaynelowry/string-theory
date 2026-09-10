import type { Quality } from '../view/world';

export interface Settings {
  sensitivity: number;
  fov: number;
  volume: number;
  invertY: boolean;
  quality: Quality;
  colorblind: boolean;
  shake: boolean;
  bigCrosshair: boolean;
  skin: 'classic' | 'zebra' | 'sunset' | 'slime';
}

const KEY = 'string-theory-settings';

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 0.0022,
  fov: 78,
  volume: 0.7,
  invertY: false,
  quality: 'med',
  colorblind: false,
  shake: true,
  bigCrosshair: false,
  skin: 'classic',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
