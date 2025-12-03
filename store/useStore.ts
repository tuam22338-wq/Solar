

import { create } from 'zustand';
import { GameState, AppSettings, WorldConfig, GameTurn, WeatherType, CodexEntry, CustomStat } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_WORLD_TIME, DEFAULT_PLAYER_ANALYSIS } from '../constants';
import { getSettings, saveSettings } from '../services/settingsService';
import { saveGame } from '../services/gameService';

interface AppState {
    currentScreen: 'home' | 'create' | 'settings' | 'gameplay' | 'train';
    gameState: GameState | null;
    editingConfig: WorldConfig | null;
    appSettings: AppSettings;
    zoomLevel: number;
    
    // Actions
    setScreen: (screen: 'home' | 'create' | 'settings' | 'gameplay' | 'train') => void;
    setGameState: (state: GameState | null) => void;
    setEditingConfig: (config: WorldConfig | null) => void;
    updateSettings: (settings: AppSettings) => void;
    setZoomLevel: (zoom: number) => void;
    applyGameStateUpdate: (update: any) => void;
    startNewGame: (config: WorldConfig) => void;
    loadSavedGame: (state: GameState) => void;
}

export const useStore = create<AppState>((set, get) => ({
    currentScreen: 'home',
    gameState: null,
    editingConfig: null,
    appSettings: getSettings(),
    zoomLevel: 1.0,

    setScreen: (screen) => set({ currentScreen: screen }),
    setGameState: (state) => set({ gameState: state }),
    setEditingConfig: (config) => set({ editingConfig: config }),
    
    updateSettings: (newSettings) => {
        saveSettings(newSettings);
        set({ appSettings: newSettings });
        // Apply zoom immediately
        if (newSettings.uiSettings.zoomLevel) {
            set({ zoomLevel: newSettings.uiSettings.zoomLevel });
        }
    },

    setZoomLevel: (zoom) => {
        const { appSettings } = get();
        set({ zoomLevel: zoom });
        // Sync with settings
        const newSettings = { ...appSettings, uiSettings: { ...appSettings.uiSettings, zoomLevel: zoom } };
        saveSettings(newSettings);
        set({ appSettings: newSettings });
    },

    startNewGame: (config) => {
        const newState: GameState = {
            worldConfig: config,
            history: [],
            worldTime: DEFAULT_WORLD_TIME,
            weather: 'Sunny',
            questLog: [],
            playerAnalysis: DEFAULT_PLAYER_ANALYSIS,
            codex: config.initialCodex || [], // LOAD RAG DATA
            interfaceMode: 'adventure',
            activeEnemies: [],
            activeMerchant: null
        };
        
        // Trigger background vector sync if there is initial codex data
        if (newState.codex.length > 0) {
            import('../services/vectorDbService').then(service => {
                service.syncCodexToVectorDb(newState.codex);
            });
        }

        set({ gameState: newState, currentScreen: 'gameplay' });
    },

    loadSavedGame: (state) => {
         // Migration logic for old saves
         const upgradedState = {
            ...state,
            worldTime: state.worldTime && state.worldTime.year ? state.worldTime : DEFAULT_WORLD_TIME,
            weather: state.weather || 'Sunny',
            questLog: state.questLog || [],
            playerAnalysis: state.playerAnalysis || DEFAULT_PLAYER_ANALYSIS,
            codex: state.codex || [],
            interfaceMode: state.interfaceMode || 'adventure',
            activeEnemies: state.activeEnemies || [],
            activeMerchant: state.activeMerchant || null,
            // Deep merge Character Config to ensure customStats exist
            worldConfig: {
                ...state.worldConfig,
                character: {
                    ...state.worldConfig.character,
                    customStats: state.worldConfig.character.customStats || []
                },
                initialCodex: state.worldConfig.initialCodex || []
            }
        };
        
        // Re-sync vectors on load
        if (upgradedState.codex.length > 0) {
            import('../services/vectorDbService').then(service => {
                service.syncCodexToVectorDb(upgradedState.codex);
            });
        }

        set({ gameState: upgradedState, currentScreen: 'gameplay' });
    },

    applyGameStateUpdate: (update: any) => {
        const currentState = get().gameState;
        if (!currentState) return;

        const newState = { ...currentState };
        let character = { ...newState.worldConfig.character };
        
        // Basic Stats
        if (update.inventory_add) {
            const items = Array.isArray(update.inventory_add) ? update.inventory_add : [update.inventory_add];
            character.inventory = [...character.inventory, ...items];
        }
        if (update.inventory_remove) {
            const itemsToRemove = Array.isArray(update.inventory_remove) ? update.inventory_remove : [update.inventory_remove];
            character.inventory = character.inventory.filter(item => !itemsToRemove.includes(item));
        }
        if (update.hp_change) {
            character.hp = Math.min(character.maxHp, Math.max(0, character.hp + update.hp_change));
        }
        if (update.gold_change) {
            character.gold = Math.max(0, character.gold + update.gold_change);
        }
        
        // Custom Stats Updates - Defensive Array Check
        if (update.custom_stats_update) {
            const updates = Array.isArray(update.custom_stats_update) ? update.custom_stats_update : [update.custom_stats_update];
            character.customStats = character.customStats.map(stat => {
                const change = updates.find((u: any) => u.id === stat.id);
                if (change) {
                    const newVal = Math.min(stat.max, Math.max(0, stat.value + change.value));
                    return { ...stat, value: newVal };
                }
                return stat;
            });
        }

        // State Machine: UI Modes
        if (update.ui_mode) {
            newState.interfaceMode = update.ui_mode;
            
            if (update.ui_mode === 'combat' && update.combat_data) {
                // Defensive check for combat_data array
                newState.activeEnemies = Array.isArray(update.combat_data) ? update.combat_data : [update.combat_data];
            }
            if (update.ui_mode === 'exchange' && update.merchant_data) {
                newState.activeMerchant = update.merchant_data;
            }
            if (update.ui_mode === 'adventure') {
                newState.activeEnemies = [];
                newState.activeMerchant = null;
            }
        }

        // Time & Weather
        if (update.time_passed) {
            let minutesToAdd = update.time_passed;
            let current = { ...newState.worldTime };
            current.minute += minutesToAdd;
            while (current.minute >= 60) {
                current.minute -= 60;
                current.hour += 1;
            }
            newState.worldTime = current;
        }
        if (update.weather_update) {
            newState.weather = update.weather_update as WeatherType;
        }

        // Codex - Defensive Array Check
        if (update.codex_update) {
            const updates = Array.isArray(update.codex_update) ? update.codex_update : [update.codex_update];
            const newCodex = [...(newState.codex || [])];
            updates.forEach((entry: Partial<CodexEntry>) => {
                if (!entry.id || !entry.name) return;
                const existingIndex = newCodex.findIndex(c => c.id === entry.id);
                const now = new Date().toISOString();
                if (existingIndex >= 0) {
                    newCodex[existingIndex] = { ...newCodex[existingIndex], ...entry, lastUpdated: now };
                } else {
                    newCodex.push({
                        id: entry.id,
                        name: entry.name,
                        type: (entry.type as any) || 'Concept',
                        tags: entry.tags || [],
                        description: entry.description || '',
                        relations: entry.relations || [],
                        lastUpdated: now,
                        isNew: true
                    });
                }
            });
            newState.codex = newCodex;
            
            // Sync new items to vector DB
             import('../services/vectorDbService').then(service => {
                service.syncCodexToVectorDb(newCodex);
            });
        }
        
        newState.worldConfig.character = character;
        
        // Auto-save
        saveGame(newState);
        
        set({ gameState: newState });
    }
}));
