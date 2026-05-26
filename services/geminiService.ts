
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AIAnalysis, FeedbackItem } from "../types";

// Critical: Check API Key immediately
if (!process.env.API_KEY) {
    console.error("CRITICAL ERROR: API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- SCHEMAS ---

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Score 0-100" },
    grammarScore: { type: Type.NUMBER, description: "Grammar 0-100" },
    pronunciationScore: { type: Type.NUMBER, description: "Pronun 0-100" },
    fluencyScore: { type: Type.NUMBER, description: "Fluency 0-100" },
    vocabularyScore: { type: Type.NUMBER, description: "Vocab 0-100" },
    feedback: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING },
          correction: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["original", "correction", "explanation"]
      }
    },
    tips: { type: Type.ARRAY, items: { type: Type.STRING } },
    encouragement: { type: Type.STRING },
    transcript: { type: Type.STRING }
  },
  required: ["score", "grammarScore", "pronunciationScore", "fluencyScore", "vocabularyScore", "feedback", "tips", "encouragement", "transcript"],
};

// --- HELPERS ---

const generateFallbackAnalysis = (reason: string, partialData?: Partial<AIAnalysis>): AIAnalysis => {
    console.warn("Generating Fallback Analysis. Reason:", reason);
    
    // Default values if partial data is missing
    const baseScore = partialData?.score !== undefined ? partialData.score : 75;
    
    // STRICT RULE: Do not invent corrections.
    // If we have partial feedback, use it. If not, return empty array.
    // This prevents "Audio processed partially" from appearing as a fake correction.
    const feedback = (partialData?.feedback && partialData.feedback.length > 0) 
        ? partialData.feedback 
        : [];
    
    return {
        score: baseScore, 
        grammarScore: partialData?.grammarScore !== undefined ? partialData.grammarScore : baseScore,
        pronunciationScore: partialData?.pronunciationScore !== undefined ? partialData.pronunciationScore : baseScore,
        fluencyScore: partialData?.fluencyScore !== undefined ? partialData.fluencyScore : baseScore,
        vocabularyScore: partialData?.vocabularyScore !== undefined ? partialData.vocabularyScore : baseScore,
        feedback,
        tips: partialData?.tips && partialData.tips.length > 0 ? partialData.tips : [
            "Practice speaking daily.",
            "Listen to native English content.",
            "Record yourself often to check progress."
        ],
        encouragement: partialData?.encouragement || "Analysis incomplete, but good effort!",
        transcript: partialData?.transcript || "(Transcript unavailable - Recovery Mode)",
        timestamp: new Date().toISOString()
    };
};

const repairJSON = (jsonStr: string): string => {
    let repaired = jsonStr.trim();
    // 1. Remove trailing commas before closing braces
    repaired = repaired.replace(/,\s*([\]}])/g, '$1');
    
    // 2. Close open strings if cut off (heuristic: odd count of unescaped quotes)
    // This is risky, but better than a crash.
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
        repaired += '"';
    }

    // 3. Balance Brackets/Braces
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    if (openBrackets > closeBrackets) repaired += ']'.repeat(openBrackets - closeBrackets);
    if (openBraces > closeBraces) repaired += '}'.repeat(openBraces - closeBraces);

    return repaired;
};

// Improved Regex Extraction to salvage data when JSON fails
const extractViaRegex = (text: string): Partial<AIAnalysis> | null => {
    console.log("Attempting Regex Extraction...");
    try {
        const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
        const grammarMatch = text.match(/"grammarScore"\s*:\s*(\d+)/);
        const transcriptMatch = text.match(/"transcript"\s*:\s*"([\s\S]*?)(?:"\s*\}|$)/);
        
        // Attempt to find feedback items (basic)
        // Look for objects containing "original" and "correction"
        const feedbackItems: FeedbackItem[] = [];
        const feedbackRegex = /{\s*"original"\s*:\s*"([^"]+)"\s*,\s*"correction"\s*:\s*"([^"]+)"\s*,\s*"explanation"\s*:\s*"([^"]+)"\s*}/g;
        let match;
        while ((match = feedbackRegex.exec(text)) !== null) {
            feedbackItems.push({
                original: match[1],
                correction: match[2],
                explanation: match[3]
            });
        }

        if (scoreMatch || feedbackItems.length > 0) {
            return {
                score: scoreMatch ? parseInt(scoreMatch[1]) : 70,
                grammarScore: grammarMatch ? parseInt(grammarMatch[1]) : undefined,
                transcript: transcriptMatch ? transcriptMatch[1] : undefined,
                feedback: feedbackItems
            };
        }
    } catch (e) {
        console.warn("Regex extraction failed", e);
    }
    return null;
};

// Validator to ensure we don't return empty "valid" JSON
const validateAnalysis = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    // Must have at least a score OR some feedback to be useful
    // Note: It's valid to have 0 feedback items now (perfect score), so we relax that check
    if (typeof data.score !== 'number') {
        return false;
    }
    return true;
};

const safeJSONParse = (text: string): any => {
    if (!text) throw new Error("Empty JSON text");
    
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // STRATEGY 1: Direct Parse
    try {
        const result = JSON.parse(clean);
        if (validateAnalysis(result)) {
            console.log("JSON Parse: Success (Direct)");
            return result;
        }
    } catch (e) { /* continue */ }

    // STRATEGY 2: Repair & Parse
    try {
        const repaired = repairJSON(clean);
        const result = JSON.parse(repaired);
        if (validateAnalysis(result)) {
            console.log("JSON Parse: Success (Repaired)");
            return result;
        }
    } catch (e) { /* continue */ }

    // STRATEGY 3: Substring Rescue (if wrapper is broken)
    try {
        const first = clean.indexOf('{');
        const last = clean.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
            const sub = clean.substring(first, last + 1);
            const result = JSON.parse(sub);
             if (validateAnalysis(result)) {
                console.log("JSON Parse: Success (Substring)");
                return result;
            }
        }
    } catch (e) { /* continue */ }

    // STRATEGY 4: Regex Fallback (Last Resort)
    const regexResult = extractViaRegex(text);
    if (regexResult && validateAnalysis(regexResult)) {
        console.log("JSON Parse: Success (Regex Fallback)");
        return regexResult; // Return partial data, generateRequest will fill gaps
    }

    throw new Error("Data Extraction Failed (All Strategies)");
};

const normalizeFeedback = (rawFeedback: any): FeedbackItem[] => {
    const safeList: FeedbackItem[] = Array.isArray(rawFeedback)
        ? rawFeedback
            .map((item: any) => ({
                original: String(item?.original || "").trim(),
                correction: String(item?.correction || "").trim(),
                explanation: String(item?.explanation || "").trim()
            }))
            .filter(item => item.original && item.correction)
        : [];

    // STRICT: Only return max 10, but DO NOT PAD.
    // If list is empty, return empty.
    return safeList.slice(0, 10);
};

const generateRequest = async (
    modelName: string,
    contents: any,
    schema: Schema,
    timeoutMs: number,
    systemInstruction?: string
): Promise<any> => {
    const controller = new AbortController();
    
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
            controller.abort(); 
            reject(new Error("API_TIMEOUT"));
        }, timeoutMs)
    );

    try {
        const apiPromise = ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: systemInstruction,
                maxOutputTokens: 8192, // High limit for long audio
                temperature: 0.2, 
                safetySettings: [
                     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        const result: any = await Promise.race([apiPromise, timeoutPromise]);
        
        let responseText = result?.text;
        const candidate = result?.candidates?.[0];

        if (!responseText && candidate?.content?.parts) {
             responseText = candidate.content.parts.map((p: any) => p.text).join('');
        }

        if (!responseText) throw new Error("EMPTY_RESPONSE");
        
        // PARSE & VALIDATE
        // safeJSONParse now includes the Regex Fallback strategy internally
        return safeJSONParse(responseText);

    } catch (error: any) {
        if (error.message === 'API_TIMEOUT') throw error;
        
        console.warn("AI Raw Error:", error);
        throw new Error("API_ERROR");
    }
};

export const analyzeAudio = async (base64Audio: string, duration: number, mimeType: string, language: 'en' | 'zh'): Promise<AIAnalysis> => {
    
    // --- SLA CONFIGURATION ---
    const SLA_TIMEOUT_MS = 85000; 

    if (!base64Audio || base64Audio.length < 100) throw new Error("Audio is empty.");
    if (base64Audio.length > 15 * 1024 * 1024) throw new Error("File too large (>15MB).");

    let langContext = "Role: English Teacher. Output: JSON. Language: English."; 
    if (language === 'zh') {
        langContext = "Role: ESL Teacher. Output: JSON. Language: Explanations in Traditional Chinese, Corrections in English.";
    }

    // --- OPTIMIZED PROMPT ---
    const promptInstructions = `
    Task: Analyze audio transcript for English mistakes.
    CRITICAL: Identify ONLY ACTUAL English mistakes (grammar, pronunciation, vocabulary).
    If there are no mistakes, return an empty feedback array.
    Do NOT fabricate errors. Do NOT add generic advice like "Speak louder" in the feedback array.
    Limit feedback to the top 10 most important corrections.

    Output JSON object with these keys in this specific order:
    1. score (number)
    2. grammarScore (number)
    3. pronunciationScore (number)
    4. fluencyScore (number)
    5. vocabularyScore (number)
    6. feedback (array of objects: original, correction, explanation)
    7. tips (array of strings)
    8. encouragement (string)
    9. transcript (string) -- Put transcript LAST.
    `;

    const logicPromise = async () => {
        // Attempt generation
        const result = await generateRequest(
            'gemini-2.5-flash', 
            {
                parts: [
                    { inlineData: { data: base64Audio, mimeType: mimeType } },
                    { text: promptInstructions }
                ]
            },
            analysisSchema,
            SLA_TIMEOUT_MS - 2000, 
            langContext
        );

        // MERGE LOGIC: Even if 'result' is partial (from regex), we fill the gaps here
        // instead of throwing an error.
        
        const baseScore = result.score || 70;

        return {
            score: baseScore,
            grammarScore: result.grammarScore || baseScore,
            pronunciationScore: result.pronunciationScore || baseScore,
            fluencyScore: result.fluencyScore || baseScore,
            vocabularyScore: result.vocabularyScore || baseScore,
            feedback: normalizeFeedback(result.feedback),
            tips: Array.isArray(result.tips) ? result.tips.slice(0, 5) : [],
            encouragement: result.encouragement || "Great job practicing!",
            transcript: result.transcript || "(Transcript unavailable)",
            timestamp: new Date().toISOString()
        } as AIAnalysis;
    };

    const timeoutPromise = new Promise<AIAnalysis>((resolve) => {
        setTimeout(() => {
            resolve(generateFallbackAnalysis("Timeout (85s Limit Reached)"));
        }, SLA_TIMEOUT_MS);
    });

    try {
        console.log(`Starting Analysis. Size: ${(base64Audio.length/1024/1024).toFixed(2)}MB`);
        return await Promise.race([logicPromise(), timeoutPromise]);
    } catch (error: any) {
        console.error("Analysis Exception:", error);
        
        // Only return generic fallback if EVERYTHING failed (including regex rescue)
        return generateFallbackAnalysis(error.message || "Unknown Error");
    }
};
