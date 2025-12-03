

import { GoogleGenAI, Type } from "@google/genai";
import { getSettings } from './settingsService';
import { WorldConfig, SafetySetting, SafetySettingsConfig, InitialEntity, GameTurn, GameState, WeatherType, CodexEntry, CustomStat, Rank, ProgressionSystem } from '../types';
import * as vectorDbService from './vectorDbService';

let ai: GoogleGenAI | null = null;
let currentApiKey: string | null = null;
let keyIndex = 0;

type KeyValidationResult = 'valid' | 'invalid' | 'rate_limited';

// --- Retry Logic Helper ---
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES, delay = RETRY_DELAY_MS): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    let shouldRetry = true;
    let errorMessage = '';

    if (error instanceof Error) {
        errorMessage = error.message;
    } else {
        errorMessage = String(error);
    }

    if (
        errorMessage.includes('bị chặn') || 
        errorMessage.includes('SAFETY') || 
        errorMessage.includes('INVALID_ARGUMENT') ||
        errorMessage.includes('PERMISSION_DENIED') ||
        errorMessage.includes('UNAUTHENTICATED')
    ) {
        shouldRetry = false;
    }

    if (retries <= 0 || !shouldRetry) {
        throw error;
    }

    console.warn(`API call failed. Retrying in ${delay}ms... (${retries} attempts left). Error:`, error);
    await wait(delay);
    return generateWithRetry(fn, retries - 1, delay * 2); 
  }
}

function getAiInstance(): GoogleGenAI {
  const { apiKeyConfig } = getSettings();
  const keys = apiKeyConfig.keys.filter(Boolean);

  if (keys.length === 0) {
    throw new Error('Không tìm thấy API Key nào. Vui lòng thêm API Key trong phần Cài đặt.');
  }
  
  if (keyIndex >= keys.length) {
    keyIndex = 0;
  }
  const apiKey = keys[keyIndex];
  
  if (!ai || currentApiKey !== apiKey) {
      ai = new GoogleGenAI({ apiKey });
      currentApiKey = apiKey;
  }
  
  return ai;
}

function handleApiError(error: unknown, safetySettings: SafetySettingsConfig): Error {
    let rawMessage = '';
    
    if (error instanceof Error) {
        rawMessage = error.message;
    } else {
        rawMessage = String(error);
    }

    console.error('Gemini API Error Detail:', error);

    try {
        const jsonStart = rawMessage.indexOf('{');
        const jsonEnd = rawMessage.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = rawMessage.substring(jsonStart, jsonEnd + 1);
            const errorJson = JSON.parse(jsonStr);
            if (errorJson.error?.code === 429) return new Error('Hệ thống quá tải (429). Đang thử lại...');
        }
    } catch (e) {}

    const isSafetyBlock = /safety/i.test(rawMessage) || /blocked/i.test(rawMessage);
    if (safetySettings.enabled && isSafetyBlock) {
        return new Error("Nội dung bị chặn bởi bộ lọc an toàn.");
    }

    return new Error(`Lỗi hệ thống: ${rawMessage.substring(0, 200)}...`);
}

function processNarration(text: string): string {
    return text.replace(/\[([^\]]+)\]/g, (match, p1) => p1.replace(/-/g, ''));
}

// --- Hallucination Fix: Robust JSON Extractor ---
function extractJson(text: string): any {
    let content = text.trim();
    
    // 1. Try to find Markdown block first (most reliable if present)
    const markdownMatch = content.match(/```(?:json)?([\s\S]*?)```/);
    if (markdownMatch) {
        content = markdownMatch[1].trim();
    }

    // 2. Isolate the JSON object/array
    const firstOpenBrace = content.indexOf('{');
    const firstOpenBracket = content.indexOf('[');
    
    let startIndex = -1;
    let endIndex = -1;

    // Check which one comes first to determine if it's an object or array
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIndex = firstOpenBrace;
        endIndex = content.lastIndexOf('}');
    } else if (firstOpenBracket !== -1) {
        startIndex = firstOpenBracket;
        endIndex = content.lastIndexOf(']');
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        content = content.substring(startIndex, endIndex + 1);
    }

    // 3. Cleanup common LLM JSON errors
    content = content.replace(/^\s*\/\/.*$/gm, ''); // Comments
    content = content.replace(/,(\s*[}\]])/g, '$1'); // Trailing commas

    // 4. Attempt Parse with Fallback Repairs
    try { 
        return JSON.parse(content); 
    } catch (e) {
        console.warn("JSON Parse Failed. Attempting repairs on:", content);
        
        // REPAIR STRATEGY: Missing Array Brackets
        // The AI sometimes outputs: "key": {obj}, {obj} instead of "key": [{obj}, {obj}]
        // We regex replace to wrap known array-keys in brackets if they look like comma-separated items.
        
        const arrayKeys = ['inventory_add', 'inventory_remove', 'custom_stats_update', 'codex_update', 'combat_data', 'suggestions'];
        
        for (const key of arrayKeys) {
             // 1. Fix comma-separated objects: "key": {...}, {...}
             const multiObjRegex = new RegExp(`"${key}"\\s*:\\s*(\\{[\\s\\S]*?\\}(?:\\s*,\\s*\\{[\\s\\S]*?\\})+)`, 'g');
             content = content.replace(multiObjRegex, `"${key}": [$1]`);

             // 2. Fix comma-separated strings (like suggestions): "key": "...", "..."
             const multiStrRegex = new RegExp(`"${key}"\\s*:\\s*("[^"]*"(?:\\s*,\\s*"[^"]*")+)`, 'g');
             content = content.replace(multiStrRegex, `"${key}": [$1]`);
        }

        // 3. Fix double brackets if we accidentally wrapped something twice or AI did weird stuff
        content = content.replace(/\[\s*\[/g, '[').replace(/\]\s*\]/g, ']');

        try {
            return JSON.parse(content);
        } catch (retryError) {
             console.error("JSON Repair Failed. Final Content:", content);
             throw new Error(`Cannot extract valid JSON: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
        }
    }
}


async function generate(prompt: string, systemInstruction?: string): Promise<string> {
  return generateWithRetry(async () => {
    const aiInstance = getAiInstance();
    const { safetySettings, aiSettings } = getSettings();
    const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : [];
    
    const generationConfig: any = {
        temperature: aiSettings.temperature,
        topP: aiSettings.topP,
        topK: aiSettings.topK,
        maxOutputTokens: aiSettings.maxOutputTokens
    };
    if (aiSettings.thinkingBudget > 0) {
        generationConfig.thinkingConfig = { thinkingBudget: aiSettings.thinkingBudget };
    }

    try {
        const response = await aiInstance.models.generateContent({
            model: aiSettings.modelName || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                generationConfig
            }
        });
        
        if (!response.text) throw new Error("AI returned empty text.");
        return processNarration(response.text.trim());

    } catch (error) {
        throw handleApiError(error, safetySettings);
    }
  });
}

async function generateJson<T>(prompt: string, schema: any): Promise<T> {
  return generateWithRetry(async () => {
      const aiInstance = getAiInstance();
      const { safetySettings, aiSettings } = getSettings();
      const activeSafetySettings = safetySettings.enabled ? safetySettings.settings : [];
      
      const generationConfig: any = {
        temperature: aiSettings.temperature,
        topP: aiSettings.topP,
        topK: aiSettings.topK,
        maxOutputTokens: aiSettings.maxOutputTokens
      };
      if (aiSettings.thinkingBudget > 0) {
        generationConfig.thinkingConfig = { thinkingBudget: aiSettings.thinkingBudget };
      }

      try {
        const response = await aiInstance.models.generateContent({
            model: aiSettings.modelName || 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                safetySettings: activeSafetySettings as unknown as SafetySetting[],
                generationConfig
            }
        });

        if (!response.text) throw new Error("Empty JSON response");
        
        // Use robust extractor instead of direct parse
        return extractJson(response.text) as T;

      } catch (error) {
        throw handleApiError(error, safetySettings);
    }
  });
}

// --- Generator Helper Functions ---

export const generateGenre = (config: WorldConfig) => generate(`Give me a creative and unique genre idea for a world with setting: "${config.storyContext.setting}". Just the genre name/short phrase.`);

export const generateSetting = (config: WorldConfig) => generate(`Describe a unique world setting for a "${config.storyContext.genre}" story. Keep it concise (2-3 sentences).`);

export const generateCharacterBio = (config: WorldConfig) => generate(`Write a short, intriguing bio for a character named "${config.character.name}" in a "${config.storyContext.genre}" world. Focus on their past and what drives them.`);

export const generateCharacterMotivation = (config: WorldConfig) => generate(`What is the main motivation/goal for "${config.character.name}" in this "${config.storyContext.genre}" world? Keep it short.`);

export const generateEntityName = (config: WorldConfig, entity: InitialEntity) => generate(`Generate a unique name for a "${entity.type}" in a "${config.storyContext.setting}" world.`);

export const generateEntityDescription = (config: WorldConfig, entity: InitialEntity) => generate(`Describe "${entity.name}" (${entity.type}) in this world. Keep it under 50 words.`);

// --- Custom Stats Generator ---
export async function generateCustomStats(genre: string): Promise<CustomStat[]> {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
                max: { type: Type.NUMBER },
                color: { type: Type.STRING, enum: ['blue', 'red', 'green', 'yellow', 'purple', 'fuchsia'] },
                icon: { type: Type.STRING, enum: ['magic', 'heart', 'shield', 'brain', 'lightning'] },
                description: { type: Type.STRING }
            },
            required: ['id', 'name', 'value', 'max', 'color', 'icon']
        }
    };
    const prompt = `Gợi ý 3 chỉ số RPG đặc trưng cho thể loại game "${genre}" (không bao gồm HP/Gold).`;
    return generateJson<CustomStat[]>(prompt, schema);
}

// --- Progression Generator ---
export async function generateProgressionSystem(genre: string, customStats: CustomStat[]): Promise<ProgressionSystem> {
    const schema = {
        type: Type.OBJECT,
        properties: {
            enabled: { type: Type.BOOLEAN },
            name: { type: Type.STRING },
            ranks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        requirements: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: {
                                    statId: { type: Type.STRING },
                                    value: { type: Type.NUMBER }
                                },
                                required: ['statId', 'value']
                            } 
                        }
                    },
                    required: ['id', 'name', 'description']
                }
            }
        },
        required: ['name', 'ranks']
    };

    const statsInfo = customStats.map(s => `${s.name} (ID: ${s.id}, Max: ${s.max})`).join(', ');
    const prompt = `Gợi ý hệ thống cấp bậc (Progression System) cho thể loại "${genre}".
    Dựa trên các chỉ số hiện có: ${statsInfo}.
    Tạo ra 5-7 cấp bậc từ thấp đến cao.
    Đặt yêu cầu (requirements) tăng dần dựa trên ID của các chỉ số trên.`;
    
    const result = await generateJson<ProgressionSystem>(prompt, schema);
    return { ...result, enabled: true };
}

export async function generateWorldFromIdea(idea: string): Promise<WorldConfig> {
    const entitySchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, personality: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'type', 'description'] };
    
    // Comprehensive Schema
    const schema = { type: Type.OBJECT, properties: { 
        storyContext: { type: Type.OBJECT, properties: { genre: { type: Type.STRING }, setting: { type: Type.STRING } }, required: ['genre', 'setting'] },
        worldLore: { type: Type.OBJECT, properties: { history: { type: Type.STRING }, geography: { type: Type.STRING }, magicSystem: { type: Type.STRING }, factions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } } }, required: ['history', 'geography', 'magicSystem', 'factions'] },
        character: { 
            type: Type.OBJECT, 
            properties: { 
                name: { type: Type.STRING }, 
                personality: { type: Type.STRING }, 
                gender: { type: Type.STRING }, 
                bio: { type: Type.STRING }, 
                skills: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } }, 
                motivation: { type: Type.STRING }, 
                inventory: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                relationships: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } } } }, 
                customStats: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            id: { type: Type.STRING }, 
                            name: { type: Type.STRING }, 
                            value: { type: Type.NUMBER }, 
                            max: { type: Type.NUMBER }, 
                            color: { type: Type.STRING, enum: ['blue', 'red', 'green', 'yellow', 'purple', 'fuchsia'] }, 
                            icon: { type: Type.STRING, enum: ['magic', 'heart', 'shield', 'brain', 'lightning'] } 
                        },
                        required: ['id', 'name', 'value', 'max', 'color', 'icon']
                    } 
                } 
            }, 
            required: ['name', 'personality', 'gender', 'bio', 'skills', 'motivation', 'inventory', 'relationships', 'customStats'] 
        },
        progressionSystem: {
            type: Type.OBJECT,
            properties: {
                enabled: { type: Type.BOOLEAN },
                name: { type: Type.STRING },
                ranks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            requirements: { 
                                type: Type.ARRAY, 
                                items: { 
                                    type: Type.OBJECT, 
                                    properties: { statId: { type: Type.STRING }, value: { type: Type.NUMBER } } 
                                } 
                            }
                        }
                    }
                }
            },
            required: ['name', 'ranks', 'enabled']
        },
        difficulty: { type: Type.STRING }, 
        allowAdultContent: { type: Type.BOOLEAN }, 
        initialEntities: { type: Type.ARRAY, items: entitySchema }
    }, required: ['storyContext', 'worldLore', 'character', 'difficulty', 'allowAdultContent', 'initialEntities', 'progressionSystem'] };
    
    // Explicitly enforce Vietnamese in the prompt and ask for comprehensive generation including stats/ranks
    const prompt = `
    Create a COMPREHENSIVE RPG World Configuration from this idea: "${idea}". 
    
    Requirements:
    1. Language: VIETNAMESE (Tiếng Việt). Translate everything.
    2. Character: Must have at least 2 Custom Stats (e.g. Mana, Stamina, Sanity) compatible with the genre.
    3. Progression: Must have a Progression System (Hệ thống cấp bậc) with 5 ranks using the Custom Stats for requirements.
    4. Lore: Detailed and creative.
    5. Inventory: 3 starter items.
    
    Output strictly JSON matching the schema.
    `;

    return generateJson<WorldConfig>(prompt, schema);
}

export async function expandCodexEntry(config: WorldConfig, entry: CodexEntry): Promise<Partial<CodexEntry>> {
    const schema = { type: Type.OBJECT, properties: { description: { type: Type.STRING }, tags: { type: Type.ARRAY, items: { type: Type.STRING } }, relations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { targetName: { type: Type.STRING }, type: { type: Type.STRING } } } } }, required: ['description', 'tags'] };
    return generateJson<Partial<CodexEntry>>(`Expand Codex entry "${entry.name}"`, schema);
}
export async function testSingleKey(key: string): Promise<KeyValidationResult> {
    if (!key || !key.trim()) return 'invalid';
    try {
        const testAi = new GoogleGenAI({ apiKey: key });
        await testAi.models.generateContent({ model: 'gemini-2.5-flash', contents: "test" });
        return 'valid';
    } catch (e) { return 'invalid'; }
}

// --- RAG & SYSTEM PROMPT ---

const getRelevantLore = async (config: WorldConfig, recentHistory: GameTurn[], input: string, codex: CodexEntry[] = []): Promise<string> => {
    // 1. Sync Vector DB (Lazy sync)
    if (codex.length > 0) {
        await vectorDbService.syncCodexToVectorDb(codex);
    }
    
    const query = input + " " + (recentHistory[recentHistory.length-1]?.content || "");
    
    // 2. Vector Search
    const searchResults = await vectorDbService.searchVectorDb(query, 3);
    const vectorContext = searchResults.map(r => `[Codex Match (${r.score.toFixed(2)})] ${r.record.text}`).join('\n');

    // 3. Fallback/Complementary Keyword Match (for immediate things like stats/items)
    const keywords: string[] = [];
    config.character.customStats.forEach(s => keywords.push(`[Stat] ${s.name}: ${s.value}/${s.max} (Dùng cho: ${s.description || 'Magic/Skill'})`));
    
    // Combine
    if (!vectorContext && keywords.length === 0) return '';

    return `\n--- THÔNG TIN THẾ GIỚI (RAG) ---\n${vectorContext}\n${keywords.join('\n')}`;
};

const getGameMasterSystemInstruction = (config: WorldConfig): string => {
  const currentRankIndex = config.character.currentRankIndex || 0;
  const progressionSystem = config.progressionSystem;
  const minLength = config.writingConfig.minResponseLength || 1500;
  const advanced = config.advancedRules || { enableTimeSystem: true, enableCurrencySystem: true, enableInventorySystem: true, enableCraftingSystem: false, enableReputationSystem: false };

  let progressionPrompt = "";
  
  if (progressionSystem?.enabled && progressionSystem.ranks.length > 0) {
      const currentRank = progressionSystem.ranks[currentRankIndex];
      const nextRank = progressionSystem.ranks[currentRankIndex + 1];
      
      progressionPrompt = `
      --- HỆ THỐNG CẤP BẬC: ${progressionSystem.name} ---
      Cấp hiện tại: ${currentRank ? currentRank.name : 'Vô danh'} (${currentRank ? currentRank.description : ''}).
      `;
      
      if (nextRank) {
          const reqs = nextRank.requirements.map(r => {
              const stat = config.character.customStats.find(s => s.id === r.statId);
              return `${stat ? stat.name : r.statId} >= ${r.value}`;
          }).join(', ');
          progressionPrompt += `\nCấp tiếp theo: ${nextRank.name}. Điều kiện đột phá: [${reqs}].
          NHIỆM VỤ CỦA GM: Nếu người chơi đạt đủ chỉ số yêu cầu, hãy tạo tình huống/sự kiện "Đột phá" hoặc cho phép họ thăng cấp.
          Nếu thăng cấp, hãy xuất JSON: "custom_stats_update" (nếu có thưởng) và thông báo chúc mừng trong lời dẫn.`;
      } else {
          progressionPrompt += `\nĐã đạt cảnh giới tối cao.`;
      }
  }

  // --- ADVANCED RULES PROMPTS ---
  let advancedPrompt = "\n--- CÁC QUY TẮC NÂNG CAO (ADVANCED RULES) ---\n";
  if (advanced.enableTimeSystem) {
      advancedPrompt += "- TIME SYSTEM ACTIVE: Hãy theo dõi thời gian (Giờ/Ngày) trong JSON `time_passed` (phút). Mô tả ánh sáng/môi trường theo thời gian (Ngày/Đêm).\n";
  }
  if (advanced.enableCurrencySystem) {
      advancedPrompt += "- CURRENCY SYSTEM ACTIVE: Người chơi sử dụng 'Gold'. Hãy xử lý mua bán, trả giá, kiếm tiền. Cập nhật `gold_change` trong JSON.\n";
  }
  if (advanced.enableInventorySystem) {
      advancedPrompt += "- INVENTORY SYSTEM ACTIVE: Theo dõi sát sao túi đồ. Nhặt được gì thì `inventory_add`, dùng/mất thì `inventory_remove`.\n";
  }
  if (advanced.enableCraftingSystem) {
      advancedPrompt += "- CRAFTING SYSTEM ACTIVE: Nếu người chơi muốn chế tạo và có đủ nguyên liệu, hãy cho phép họ ghép đồ. Output item mới và remove item cũ trong JSON.\n";
  }
  if (advanced.enableReputationSystem) {
      advancedPrompt += "- REPUTATION SYSTEM ACTIVE: NPC phản ứng dựa trên Danh Tiếng (Reputation). Nếu làm việc tốt, NPC nể trọng. Nếu làm việc xấu, bị truy nã/xa lánh.\n";
  }

  return `Bạn là Quản trò (GM) của game nhập vai text-based Solaris.
Nhiệm vụ: Dẫn dắt câu chuyện, cập nhật trạng thái game.

QUY TẮC BẮT BUỘC:
1. Ngôn ngữ: Tiếng Việt.
2. Vai trò: Khách quan, sáng tạo.
3. ĐỘ DÀI PHẢN HỒI: Tối thiểu ${minLength} từ. Tập trung hoàn toàn vào việc xây dựng chiều sâu cốt truyện, miêu tả tâm lý, môi trường và không khí.
4. TUYỆT ĐỐI KHÔNG đưa ra danh sách lựa chọn (A, B, C...) trong lời dẫn. Hãy để người chơi tự do quyết định hành động.
5. Không nhắc đến "Level" hay cấp độ nhân vật theo kiểu số học game cũ. Hãy dùng tên Cấp Bậc (Rank).

${progressionPrompt}
${advancedPrompt}

--- HỆ THỐNG PHÉP THUẬT & CHỈ SỐ (HARD-LINK) ---
Hệ thống phép thuật trong thế giới này: "${config.worldLore.magicSystem}".
Nhân vật có các Custom Stats (Chỉ số tùy chỉnh): ${config.character.customStats?.map(s => `"${s.name}" (ID: "${s.id}")`).join(', ') || 'Không có'}.

QUY TẮC QUAN TRỌNG VỀ CHỈ SỐ (CUSTOM STATS):
- Mọi hành động sử dụng phép thuật/kỹ năng đặc biệt ĐỀU PHẢI tiêu tốn Custom Stats tương ứng.
- Khi trừ điểm, BẮT BUỘC phải trả về JSON trong trường "custom_stats_update" với đúng "id" của chỉ số.

--- QUẢN LÝ TRẠNG THÁI (JSON Output) ---
Cuối phản hồi, BẮT BUỘC xuất thẻ <state>JSON</state>.
JSON phải hợp lệ.

Cấu trúc JSON:
<state>
{
  "inventory_add": ["Item Name", "Item Name 2"],
  "inventory_remove": ["Item Name"],
  "hp_change": -10,
  "gold_change": -50,
  "custom_stats_update": [ {"id": "ID_CUA_STAT", "value": -15} ], 
  "time_passed": 30,
  "ui_mode": "adventure" | "combat" | "exchange",
  "combat_data": [{"id": "e1", "name": "Enemy", "hp": 100, "maxHp": 100}],
  "merchant_data": {"name": "Shop", "inventory": [{"id": "i1", "name": "Potion", "cost": 10}]},
  "codex_update": [{"id": "unique_id", "name": "Tên", "description": "Mô tả", "type": "Type", "tags": ["tag1"]}],
  "suggestions": ["Gợi ý hành động 1", "Gợi ý hành động 2"]
}
</state>

LƯU Ý QUAN TRỌNG VỀ JSON:
1. Các trường "custom_stats_update", "codex_update", "inventory_add", "suggestions", "combat_data" PHẢI LUÔN LÀ MẢNG ĐƯỢC BAO BỞI [ ].
2. TUYỆT ĐỐI KHÔNG xuất ra danh sách object rời rạc hoặc danh sách chuỗi không có ngoặc vuông (Ví dụ SAI: "key": {obj}, {obj} hoặc "key": "A", "B"). 
3. Nếu có nhiều item, bắt buộc phải viết: "key": [{obj}, {obj}] hoặc "key": ["A", "B"].
4. Đảm bảo đóng ngoặc đầy đủ và dùng dấu phẩy hợp lệ.

LƯU Ý VỀ CODEX (QUAN TRỌNG NHẤT):
- Bạn có quyền highlight các danh từ riêng (Tên NPC, Địa danh, Vật phẩm) trong văn bản bằng thẻ <exp> (Ví dụ: Chào mừng tới <exp>Thành Phố Sương Mù</exp>).
- NẾU BẠN SỬ DỤNG THẺ <exp> ĐỂ HIGHLIGHT, BẠN **BẮT BUỘC** PHẢI TẠO ENTRY TƯƠNG ỨNG TRONG "codex_update". Không được bỏ sót.
- Nếu xuất hiện Nhân vật mới, Địa danh mới, hoặc Khái niệm quan trọng mới: BẮT BUỘC phải thêm vào "codex_update" ngay lập tức.
`;
};

export const summarizeOldestTurns = async (oldHistory: GameTurn[], currentSummary: string): Promise<string> => generate(`Summarize: ${currentSummary} + new turns...`);

export const startGame = (config: WorldConfig): Promise<string> => {
    const systemInstruction = getGameMasterSystemInstruction(config);
    const minLength = config.writingConfig.minResponseLength || 1500;
    const prompt = `Bắt đầu cuộc phiêu lưu: "${config.startingScenario}". Viết chương mở đầu thật chi tiết (tối thiểu ${minLength} từ). Đừng quên kèm theo <state>JSON</state> với 4 suggestions. Nhớ cập nhật Codex cho các địa danh/nhân vật đầu tiên.`;
    return generate(prompt, systemInstruction);
};

export const getNextTurn = async (config: WorldConfig, history: GameTurn[], currentSummary: string = '', gameState: GameState): Promise<{ narration: string; newSummary?: string; truncatedHistory?: GameTurn[]; stateUpdate?: any }> => {
    let summaryPrompt = '';
    let processedHistory = history;
    let newSummary = currentSummary;
    let truncatedHistory: GameTurn[] | undefined = undefined;

    // Summarization logic (keep existing)
    if (history.length > 12) {
        const turnsToKeep = history.slice(6);
        try { newSummary = await summarizeOldestTurns(history.slice(0, 6), currentSummary); processedHistory = turnsToKeep; truncatedHistory = turnsToKeep; } catch (e) {}
    }
    if (newSummary) summaryPrompt = `\n[KÝ ỨC DÀI HẠN]: ${newSummary}`;

    const systemInstruction = getGameMasterSystemInstruction(config);
    
    // RAG Injection (Now uses Vector DB)
    const loreInjection = await getRelevantLore(config, processedHistory, history[history.length - 1]?.content || '', gameState.codex);
    
    const worldStatePrompt = `
    [TRẠNG THÁI HIỆN TẠI]:
    - HP: ${gameState.worldConfig.character.hp}/${gameState.worldConfig.character.maxHp}
    - Custom Stats: ${gameState.worldConfig.character.customStats?.map(s => `ID "${s.id}" (${s.name}): ${s.value}/${s.max}`).join(', ')}
    - Mode: ${gameState.interfaceMode}
    `;

    const formattedHistory = processedHistory.map(turn => `${turn.type === 'narration' ? 'GM' : 'PLAYER'}: ${turn.content}`).join('\n\n');
    const minLength = config.writingConfig.minResponseLength || 1500;

    const prompt = `
    ${summaryPrompt}
    ${loreInjection}
    ${worldStatePrompt}
    
    LỊCH SỬ:
    ${formattedHistory}
    
    Viết tiếp câu chuyện. 
    Yêu cầu:
    1. Độ dài tối thiểu: ${minLength} từ.
    2. Tập trung vào cốt truyện, KHÔNG viết suggestions trong văn bản.
    3. Cập nhật chính xác Custom Stats (dùng ID) vào JSON <state> nếu nhân vật sử dụng năng lượng/tài nguyên.
    4. Trả về 4 suggestions trong JSON <state>.
    5. QUAN TRỌNG: Kiểm tra xem có danh từ riêng nào cần thêm vào Codex không? Nếu có, hãy thêm vào codex_update.
    `;

    const rawNarration = await generate(prompt, systemInstruction);
    
    // Extract State
    let narration = rawNarration;
    let stateUpdate = null;
    const stateMatch = rawNarration.match(/<state>([\s\S]*?)<\/state>/);
    
    if (stateMatch) {
        try {
            stateUpdate = extractJson(stateMatch[1]); // Use robust extractor
            narration = rawNarration.replace(/<state>[\s\S]*?<\/state>/, '').trim();
        } catch (e) {
            console.error("Failed to parse state update JSON", e);
        }
    }

    return { narration, newSummary, truncatedHistory, stateUpdate };
};
