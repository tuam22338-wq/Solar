
export interface InitialEntity {
  name: string;
  type: string;
  personality: string;
  description: string;
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
  // New Fields
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
  level: number;
  statusEffects: string[]; // Poisoned, Blessed, etc.
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
  perspective: 'second' | 'first' | 'third'; // "Bạn...", "Tôi...", "Hắn/Cô ấy..."
  narrativeStyle: string; // Descriptive, Direct, Novel-like...
  responseLength: 'short' | 'medium' | 'long';
}

export interface TemporaryRule {
  text: string;
  enabled: boolean;
}

// --- TIER 3 NEW TYPES ---

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
  archetype: string; // e.g., "The Warrior", "The Diplomat"
  behaviorTags: string[]; // e.g., ["Aggressive", "Calculated"]
  reputation: number; // -100 to 100
}

export interface KnowledgeBase {
    name: string;
    createdDate: string;
    chunks: string[];
}

// ------------------------

export interface WorldConfig {
  storyContext: {
    genre: string;
    setting: string; // General summary
  };
  worldLore: WorldLore; // Detailed lore
  character: CharacterConfig;
  difficulty: string;
  allowAdultContent: boolean;
  sexualContentStyle?: string;
  violenceLevel?: string;
  storyTone?: string;
  startingScenario: string; // The exact situation the game starts in
  writingConfig: WritingConfig;
  coreRules: string[];
  initialEntities: InitialEntity[];
  temporaryRules: TemporaryRule[];
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
    // Modules
    enableStoryGraph: boolean; // StoryGraph + GraphRAG
    enableMemoryBank: boolean; // MemoryBank + Recursive Outlining
    enableChainOfThought: boolean; // Tree of Thoughts (ToT) + Backtracking
    enableSelfReflection: boolean; // Self-RAG + Chain-of-Note
    enableEnsembleModeling: boolean; // Multi-Agent Debate
    enableEmotionalIntelligence: boolean; // EQ Engine

    // Advanced Config
    modelName: string;
    embeddingModelName: string;
    temperature: number;
    topP: number;
    topK: number;
    maxOutputTokens: number;
    thinkingBudget: number; // 0 to disable
}

export interface UiSettings {
    reduceMotion: boolean;
    textSize: 'small' | 'medium' | 'large';
    themeColor: 'fuchsia' | 'cyan' | 'emerald';
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
  stateSnapshot?: Partial<CharacterConfig>; // Stores state at this turn
}

export interface GameState {
  worldConfig: WorldConfig;
  history: GameTurn[];
  summary?: string; // Long-term memory storage
  
  // Tier 3 Fields
  worldTime: WorldTime;
  weather: WeatherType;
  questLog: Quest[];
  playerAnalysis: PlayerAnalysis;
}

export interface SaveSlot extends GameState {
  saveId: number; // Using Date.now()
  saveDate: string; // ISO String for display
  previewText: string;
}
