
import { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const SETTINGS_STORAGE_KEY = 'ai_rpg_settings';

export const getSettings = (): AppSettings => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings) as AppSettings;
      // Basic validation to ensure the structure is not completely broken from an old version
      // Merge with default settings to ensure new fields (like aiSettings) exist if loading old data
      return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          apiKeyConfig: { ...DEFAULT_SETTINGS.apiKeyConfig, ...(parsed.apiKeyConfig || {}) },
          safetySettings: { ...DEFAULT_SETTINGS.safetySettings, ...(parsed.safetySettings || {}) },
          aiSettings: { ...DEFAULT_SETTINGS.aiSettings, ...(parsed.aiSettings || {}) },
          uiSettings: { ...DEFAULT_SETTINGS.uiSettings, ...(parsed.uiSettings || {}) },
          audioSettings: { ...DEFAULT_SETTINGS.audioSettings, ...(parsed.audioSettings || {}) }
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error getting settings from localStorage:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};
