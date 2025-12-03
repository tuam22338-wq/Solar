
import { GoogleGenAI } from "@google/genai";
import { getSettings } from './settingsService';

// Naive Client-Side Vector Store
// In a real production app, use 'voy' or 'transformers.js' with a local persistent DB.
// For this environment, we store vectors in memory/JSON.

interface VectorRecord {
    id: string;
    text: string;
    metadata: any;
    vector: number[];
}

let vectorStore: VectorRecord[] = [];

// Cosine Similarity
function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get Embedding using Gemini API
async function getEmbedding(text: string): Promise<number[]> {
    const { apiKeyConfig, aiSettings } = getSettings();
    const apiKey = apiKeyConfig.keys[0]; // Use first key
    if (!apiKey) throw new Error("No API Key");

    const ai = new GoogleGenAI({ apiKey });
    // Use text-embedding-004
    const model = aiSettings.embeddingModelName || "text-embedding-004";
    
    const result = await ai.models.embedContent({
        model: model,
        content: { parts: [{ text }] }
    });
    
    return result.embedding?.values || [];
}

export const addToVectorDb = async (id: string, text: string, metadata: any) => {
    // Check if exists
    const existingIndex = vectorStore.findIndex(v => v.id === id);
    if (existingIndex >= 0) {
        // Optimisation: If text hasn't changed drastically, maybe skip? 
        // For now, simple overwrite.
        vectorStore.splice(existingIndex, 1);
    }

    try {
        const vector = await getEmbedding(text);
        if (vector) {
            vectorStore.push({ id, text, metadata, vector });
        }
    } catch (e) {
        console.warn("Failed to generate embedding for:", text, e);
    }
};

export const searchVectorDb = async (query: string, k: number = 3): Promise<{record: VectorRecord, score: number}[]> => {
    if (vectorStore.length === 0) return [];
    
    try {
        const queryVector = await getEmbedding(query);
        
        const results = vectorStore.map(record => ({
            record,
            score: cosineSimilarity(queryVector, record.vector)
        }));

        // Sort by similarity descending
        results.sort((a, b) => b.score - a.score);
        
        return results.slice(0, k);
    } catch (e) {
        console.error("Vector Search Error:", e);
        return [];
    }
};

export const clearVectorDb = () => {
    vectorStore = [];
};

// Populate DB from Codex
export const syncCodexToVectorDb = async (codex: any[]) => {
    // This process can be heavy, should run in background or iteratively
    // For prototype, we sync a few items or checks if missing
    for (const entry of codex) {
        // Only embed if description exists and not already in store (naive check)
        if (entry.description && !vectorStore.find(v => v.id === entry.id)) {
            await addToVectorDb(entry.id, `${entry.name}: ${entry.description} Tags: ${entry.tags.join(', ')}`, { type: 'codex', entry });
        }
    }
};
