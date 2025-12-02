
import { WorldConfig, HarmCategory, HarmBlockThreshold, SafetySettingsConfig, WeatherType, WorldTime, PlayerAnalysis, AiGenerationSettings, AppSettings } from './types';

export const GENDER_OPTIONS = ['Không xác định (Để AI quyết định)', 'Nam', 'Nữ', 'Khác'];
export const PERSONALITY_OPTIONS = [
    'Tuỳ chỉnh',
    'Dũng Cảm, Bộc Trực',
    'Thận Trọng, Đa Nghi',
    'Lạnh Lùng, Ít Nói',
    'Hài Hước, Thích Trêu Chọc',
    'Nhân Hậu, Vị Tha',
    'Trầm Tĩnh, Thích Quan Sát',
    'Nhút Nhát, Hay Lo Sợ',
    'Tò Mò, Thích Khám Phá',
    'Trung Thành, Đáng Tin Cậy',
    'Lãng Mạn, Mơ Mộng',
    'Thực Dụng, Coi Trọng Lợi Ích',
    'Chính Trực, Ghét Sự Giả Dối',
    'Hoài Nghi, Luôn Đặt Câu Hỏi',
    'Lạc Quan, Luôn Nhìn Về Phía Trước',
    'Lý Trí, Giỏi Phân Tích',
    'Nghệ Sĩ, Tâm Hồn Bay Bổng',
];

export const DIFFICULTY_OPTIONS = [
    'Dễ - Dành cho người mới',
    'Thường - Cân bằng, phù hợp đa số',
    'Khó - Thử thách cao, cần tính toán',
    'Ác Mộng - Cực kỳ khó',
    'Tuỳ Chỉnh AI - Để AI mô tả'
];

export const SEXUAL_CONTENT_STYLE_OPTIONS = ['Hoa mỹ', 'Trần tục', 'Gợi cảm'];
export const VIOLENCE_LEVEL_OPTIONS = ['Nhẹ nhàng', 'Thực tế', 'Cực đoan'];
export const STORY_TONE_OPTIONS = ['Tích cực', 'Trung tính', 'Đen tối', 'Dâm dục'];

export const ENTITY_TYPE_OPTIONS = ['NPC', 'Địa điểm', 'Vật phẩm', 'Phe phái/Thế lực'];

export const PERSPECTIVE_OPTIONS = [
    { value: 'second', label: 'Ngôi thứ hai ("Bạn...") - Chuẩn RPG' },
    { value: 'first', label: 'Ngôi thứ nhất ("Tôi...") - Nhật ký' },
    { value: 'third', label: 'Ngôi thứ ba ("Anh ấy/Cô ấy...") - Tiểu thuyết' }
];

export const STARTING_SCENARIO_OPTIONS = [
    'Tự do (AI tự quyết định)',
    'Tỉnh dậy trong ngục tối không ký ức',
    'Đang ở giữa một trận chiến khốc liệt',
    'Vừa đặt chân đến một thành phố lạ',
    'Đang thực hiện một nhiệm vụ bí mật',
    'Bị truy đuổi bởi kẻ thù hùng mạnh',
    'Thư giãn tại quán rượu trước khi bão tố ập đến',
    'Lạc vào một vùng đất cấm'
];

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  storyContext: {
    genre: '',
    setting: '',
  },
  worldLore: {
    history: '',
    geography: '',
    magicSystem: '',
    factions: []
  },
  character: {
    name: '',
    personality: PERSONALITY_OPTIONS[0],
    customPersonality: '',
    gender: GENDER_OPTIONS[0],
    bio: '',
    skills: { name: '', description: '' },
    motivation: '',
    inventory: [],
    relationships: [],
    hp: 100,
    maxHp: 100,
    gold: 50,
    level: 1,
    statusEffects: []
  },
  difficulty: DIFFICULTY_OPTIONS[1],
  allowAdultContent: false,
  sexualContentStyle: SEXUAL_CONTENT_STYLE_OPTIONS[0],
  violenceLevel: VIOLENCE_LEVEL_OPTIONS[0],
  storyTone: STORY_TONE_OPTIONS[1],
  startingScenario: STARTING_SCENARIO_OPTIONS[0],
  writingConfig: {
      perspective: 'second',
      narrativeStyle: 'Tiểu thuyết nhập vai, chi tiết và gợi hình',
      responseLength: 'medium'
  },
  coreRules: [],
  initialEntities: [],
  temporaryRules: [],
};

// --- TIER 3 DEFAULTS ---

export const WEATHER_OPTIONS: WeatherType[] = ['Sunny', 'Cloudy', 'Rainy', 'Stormy', 'Snowy', 'Foggy', 'Mystical'];

export const DEFAULT_WORLD_TIME: WorldTime = {
    year: 1,
    month: 1,
    day: 1,
    hour: 8, // Start at 8 AM
    minute: 0
};

export const DEFAULT_PLAYER_ANALYSIS: PlayerAnalysis = {
    archetype: 'Nhà Thám Hiểm',
    behaviorTags: [],
    reputation: 0
};

export const WEATHER_TRANSLATIONS: Record<WeatherType, string> = {
    'Sunny': 'Nắng Đẹp',
    'Cloudy': 'Nhiều Mây',
    'Rainy': 'Mưa',
    'Stormy': 'Bão',
    'Snowy': 'Tuyết Rơi',
    'Foggy': 'Sương Mù',
    'Mystical': 'Huyền Bí'
};


// Safety Settings Constants
export const HARM_CATEGORIES: { [key in HarmCategory]: string } = {
  [HarmCategory.HARM_CATEGORY_HARASSMENT]: 'Quấy rối',
  [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 'Lời nói hận thù',
  [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 'Nội dung khiêu dâm',
  [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 'Nội dung nguy hiểm',
};

export const HARM_BLOCK_THRESHOLDS: { [key in HarmBlockThreshold]: string } = {
  [HarmBlockThreshold.BLOCK_NONE]: 'Tắt bộ lọc (Không chặn)',
  [HarmBlockThreshold.BLOCK_ONLY_HIGH]: 'Chỉ chặn mức cao',
  [HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE]: 'Chặn từ mức trung bình',
  [HarmBlockThreshold.BLOCK_LOW_AND_ABOVE]: 'Chặn cả mức thấp (nghiêm ngặt nhất)',
};

export const DEFAULT_SAFETY_SETTINGS: SafetySettingsConfig = {
    enabled: false,
    settings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ]
};

export const DEFAULT_AI_SETTINGS: AiGenerationSettings = {
    enableStoryGraph: true,
    enableMemoryBank: true,
    enableChainOfThought: true,
    enableSelfReflection: true,
    enableEnsembleModeling: true,
    enableEmotionalIntelligence: true,
    enableMultimodalRag: true,
    enableVertexRag: true,
    enableCodexProfiling: true,
    enableDynamicReference: true,
    enableAiTemplates: true,
    enableRelationGraphs: true,
    enableDynamicExtraction: true,
    
    // Default Advanced Config
    modelName: 'gemini-2.5-flash',
    embeddingModelName: 'text-embedding-004',
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    thinkingBudget: 0
};

export const DEFAULT_SETTINGS: AppSettings = {
  apiKeyConfig: { keys: [] },
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  aiSettings: DEFAULT_AI_SETTINGS,
  uiSettings: {
      reduceMotion: false,
      textSize: 'medium',
      themeColor: 'fuchsia',
      zoomLevel: 1.0
  },
  audioSettings: {
      bgmVolume: 50,
      sfxVolume: 80,
      enableTts: false
  }
};
