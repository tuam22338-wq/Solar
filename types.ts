
export interface InitialEntity {
  name: string;
  type: string;
  personality: string;
  description: string;
}

// --- NEW RPG TYPES ---
export interface CustomStat {
  id: string; // e.g. "sanity", "mana"
  name: string; // Display name e.g. "Lý Trí", "Linh Lực"
  value: number;
  max: number;
  color: string; // hex or tailwind class suffix e.g. "blue", "purple"
  icon: string; // icon name
  description?: string; // Describe what consumes this stat
}

// --- PROGRESSION SYSTEM TYPES ---
export interface RankRequirement {
    statId: string; // Must match a CustomStat.id
    value: number;  // Threshold required
}

export interface Rank {
    id: string;
    name: string; // e.g. "Luyện Khí Kỳ", "Hạng F"
    description: string;
    requirements: RankRequirement[]; // Conditions to reach this rank (from previous) or conditions to maintain? Usually to REACH.
}

export interface ProgressionSystem {
    enabled: boolean;
    name: string; // e.g. "Hệ Thống Tu Tiên", "Class Advancement"
    ranks: Rank[];
}

export interface AdvancedRules {
    enableTimeSystem: boolean;      // Hệ thống ngày đêm
    enableCurrencySystem: boolean;  // Hệ thống tiền tệ
    enableInventorySystem: boolean; // Hệ thống trang bị/túi đồ
    enableCraftingSystem: boolean;  // Hệ thống chế tạo
    enableReputationSystem: boolean;// Hệ thống danh tiếng
}

export interface CharacterConfig {
  name: string;
  personality: string;
  customPersonality?: string;
  gender: string;
  bio: string;
  skills: {
    name: string;
    description: string;
  };
  motivation: string;
  inventory: string[];
  relationships: {
    name: string;
    type: string; // Friend, Enemy, Mentor, etc.
    description: string;
  }[];
  // Dynamic Stats
  hp: number;
  maxHp: number;
  gold: number;
  statusEffects: string[]; // Poisoned, Blessed, etc.
  customStats: CustomStat[];
  
  // Progression
  currentRankIndex: number; // 0-based index pointing to ProgressionSystem.ranks
}

export interface WorldLore {
  history: string;
  geography: string;
  magicSystem: string; // Or Technology system
  factions: {
    name: string;
    description: string;
  }[];
}

export interface WritingConfig {
  perspective: 'second' | 'first' | 'third'; 
  narrativeStyle: string; 
  responseLength: 'short' | 'medium' | 'long';
  minResponseLength: number; // New field for precise word count control
}

export interface TemporaryRule {
  text: string;
  enabled: boolean;
}

export type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Stormy' | 'Snowy' | 'Foggy' | 'Mystical';

export interface WorldTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  type: 'main' | 'side';
}

export interface PlayerAnalysis {
  archetype: string; 
  behaviorTags: string[]; 
  reputation: number; 
}

export interface KnowledgeBase {
    name: string;
    createdDate: string;
    chunks: string[];
}

export interface CodexRelation {
    targetId: string; 
    targetName: string;
    type: string; 
    description?: string;
}

export interface CodexEntry {
    id: string;
    name: string;
    type: 'Character' | 'Location' | 'Item' | 'Faction' | 'Concept' | 'Creature' | 'Lore';
    tags: string[]; 
    description: string;
    relations?: CodexRelation[]; 
    lastUpdated: string; 
    isNew?: boolean; 
    embedding?: number[]; // Vector embedding for RAG
}

// --- STATE MACHINE TYPES ---
export type InterfaceMode = 'adventure' | 'combat' | 'exchange';

export interface CombatEntity {
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    description?: string;
    statusEffects?: string[];
    isDead?: boolean;
}

export interface TradeItem {
    id: string;
    name: string;
    cost: number;
    description?: string;
}

export interface MerchantData {
    name: string;
    inventory: TradeItem[];
}

export interface WorldConfig {
  storyContext: {
    genre: string;
    setting: string; 
  };
  worldLore: WorldLore; 
  character: CharacterConfig;
  difficulty: string;
  allowAdultContent: boolean;
  sexualContentStyle?: string;
  violenceLevel?: string;
  storyTone?: string;
  startingScenario: string; 
  writingConfig: WritingConfig;
  coreRules: string[];
  initialEntities: InitialEntity[];
  temporaryRules: TemporaryRule[];
  
  // New System
  progressionSystem: ProgressionSystem;
  advancedRules: AdvancedRules; // NEW FIELD
  initialCodex?: CodexEntry[]; // RAG Data loaded at start
}

export enum HarmCategory {
  HARM_CATEGORY_HARASSMENT = 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_HATE_SPEECH = 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT = 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_DANGEROUS_CONTENT = 'HARM_CATEGORY_DANGEROUS_CONTENT',
}

export enum HarmBlockThreshold {
  BLOCK_NONE = 'BLOCK_NONE',
  BLOCK_ONLY_HIGH = 'BLOCK_ONLY_HIGH',
  BLOCK_MEDIUM_AND_ABOVE = 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_LOW_AND_ABOVE = 'BLOCK_LOW_AND_ABOVE',
}

export type SafetySetting = {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
};

export interface SafetySettingsConfig {
    enabled: boolean;
    settings: SafetySetting[];
}

export interface AiGenerationSettings {
    enableStoryGraph: boolean; 
    enableMemoryBank: boolean; 
    enableChainOfThought: boolean; 
    enableSelfReflection: boolean; 
    enableEnsembleModeling: boolean; 
    enableEmotionalIntelligence: boolean; 
    enableMultimodalRag: boolean; 
    enableVertexRag: boolean; 
    enableCodexProfiling: boolean; 
    enableDynamicReference: boolean; 
    enableAiTemplates: boolean; 
    enableRelationGraphs: boolean; 
    enableDynamicExtraction: boolean; 

    modelName: string;
    embeddingModelName: string;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    thinkingBudget: number; 
}

export interface UiSettings {
    reduceMotion: boolean;
    textSize: 'small' | 'medium' | 'large';
    themeColor: 'fuchsia' | 'cyan' | 'emerald';
    zoomLevel: number;
}

export interface AudioSettings {
    bgmVolume: number;
    sfxVolume: number;
    enableTts: boolean;
}

export interface ApiKeyStorage {
  keys: string[];
}

export interface AppSettings {
  apiKeyConfig: ApiKeyStorage;
  safetySettings: SafetySettingsConfig;
  aiSettings: AiGenerationSettings;
  uiSettings: UiSettings;
  audioSettings: AudioSettings;
}

export interface GameTurn {
  type: 'narration' | 'action';
  content: string;
  stateSnapshot?: Partial<CharacterConfig>; 
}

export interface GameState {
  worldConfig: WorldConfig;
  history: GameTurn[];
  summary?: string; 
  
  worldTime: WorldTime;
  weather: WeatherType;
  questLog: Quest[];
  playerAnalysis: PlayerAnalysis;
  codex: CodexEntry[]; 
  
  // --- STATE MACHINE ---
  interfaceMode: InterfaceMode; // 'adventure', 'combat', 'exchange'
  activeEnemies: CombatEntity[]; // For combat mode
  activeMerchant: MerchantData | null; // For exchange mode
}

export interface SaveSlot extends GameState {
  saveId: number; 
  saveDate: string; 
  previewText: string;
}
