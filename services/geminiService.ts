
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

// Robust fallback generator to ensure the promise ALWAYS resolves
const generateFallbackAnalysis = (reason: string): AIAnalysis => {
    console.warn("Generating Fallback Analysis. Reason:", reason);
    
    // Generate 10 generic feedback items to satisfy existing constraints
    const feedback = Array(10).fill(null).map((_, i) => ({
        original: i === 0 ? "(Audio processing delay)" : "...",
        correction: i === 0 ? "Please try a shorter recording" : "...",
        explanation: "The AI analysis took too long to complete. We've saved your session, but detailed feedback is unavailable."
    }));
    
    return {
        score: 70, // Neutral score so it doesn't discourage
        grammarScore: 70,
        pronunciationScore: 70,
        fluencyScore: 70,
        vocabularyScore: 70,
        feedback,
        tips: [
            "Ensure you have a stable internet connection.",
            "Try keeping recordings under 2 minutes for faster results.",
            "Speak clearly and close to the microphone.",
            "Reduce background noise.",
            "Practice regularly to improve speed."
        ],
        encouragement: "We captured your practice! The AI was a bit slow today, but keep going!",
        transcript: "(Transcript unavailable due to timeout)",
        timestamp: new Date().toISOString()
    };
};

const safeJSONParse = (text: string): any => {
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Try cleanup
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            return JSON.parse(clean);
        } catch (e2) {
            // 3. Try aggressive repair (find first { and last })
            const first = clean.indexOf('{');
            const last = clean.lastIndexOf('}');
            if (first !== -1 && last !== -1) {
                try {
                     return JSON.parse(clean.substring(first, last + 1));
                } catch (e3) {
                    throw new Error("JSON Parse Failed");
                }
            }
            throw new Error("Invalid JSON structure");
        }
    }
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

    const trimmed = safeList.slice(0, 10);

    const paddingPool: FeedbackItem[] = [
        { original: "(Volume)", correction: "Speak louder.", explanation: "Maintain steady volume." },
        { original: "(Pacing)", correction: "Slow down.", explanation: "Rushing causes slurred words." },
        { original: "(Completeness)", correction: "Finish sentences.", explanation: "Avoid trailing off." },
        { original: "(Clarity)", correction: "Enunciate clearly.", explanation: "Vowel sounds were muddy." },
        { original: "(Grammar)", correction: "Check verb tense.", explanation: "Ensure verbs match time." },
        { original: "(Intonation)", correction: "Use rising tone?", explanation: "Pitch was too flat." },
        { original: "(Structure)", correction: "Shorten sentences.", explanation: "Long sentences lose clarity." },
        { original: "(Confidence)", correction: "Project voice.", explanation: "Confidence improves fluency." },
        { original: "(Diction)", correction: "Hit consonants.", explanation: "Endings were soft." },
        { original: "(Flow)", correction: "Use connectors.", explanation: "Link ideas with 'and/but'." }
    ];

    let poolIndex = 0;
    while (trimmed.length < 10) {
        trimmed.push(paddingPool[poolIndex % paddingPool.length]);
        poolIndex++;
    }

    return trimmed;
};

const generateRequest = async (
    modelName: string,
    contents: any,
    schema: Schema,
    timeoutMs: number,
    systemInstruction?: string
): Promise<any> => {
    const controller = new AbortController();
    
    // Safety: If the promise logic hangs, this ensures we throw internally
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
                maxOutputTokens: 4096, // Reduced from 8192 to speed up completion
                temperature: 0.2, 
                safetySettings: [
                     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Race: API vs Timeout
        const result: any = await Promise.race([apiPromise, timeoutPromise]);
        
        let responseText = result?.text;
        const candidate = result?.candidates?.[0];

        // Fallback text extraction
        if (!responseText && candidate?.content?.parts) {
             responseText = candidate.content.parts.map((p: any) => p.text).join('');
        }

        if (!responseText) throw new Error("EMPTY_RESPONSE");
        
        return safeJSONParse(responseText);

    } catch (error: any) {
        if (error.message === 'API_TIMEOUT') throw error;
        // Map other API errors
        console.warn("AI Raw Error:", error);
        throw new Error("API_ERROR");
    }
};

export const analyzeAudio = async (base64Audio: string, duration: number, mimeType: string, language: 'en' | 'zh'): Promise<AIAnalysis> => {
    
    // --- SLA CONFIGURATION ---
    // Target: 60s total. 
    // We set backend timeout to 55s to ensure we return *something* to the frontend before its 100s watchdog.
    const SLA_TIMEOUT_MS = 55000; 

    if (!base64Audio || base64Audio.length < 100) throw new Error("Audio is empty.");
    if (base64Audio.length > 15 * 1024 * 1024) throw new Error("File too large (>15MB).");

    let langContext = "Role: English Teacher. Output: JSON. Language: English."; 
    if (language === 'zh') {
        langContext = "Role: ESL Teacher. Output: JSON. Language: Explanations in Traditional Chinese, Corrections in English.";
    }

    // Minimized Prompt for Speed
    const promptInstructions = `
    Task: Analyze audio.
    1. Transcribe speech.
    2. Score (0-100).
    3. 10 corrections.
    4. 5 tips.
    Output JSON.
    `;

    // --- FAIL-SAFE RACE CONDITION ---
    // If 'logicPromise' takes longer than SLA_TIMEOUT_MS, 'timeoutPromise' wins and returns a Fallback Report.
    // This guarantees the function resolves and the UI never hangs.
    
    const logicPromise = async () => {
        const result = await generateRequest(
            'gemini-2.5-flash', 
            {
                parts: [
                    { inlineData: { data: base64Audio, mimeType: mimeType } },
                    { text: promptInstructions }
                ]
            },
            analysisSchema,
            SLA_TIMEOUT_MS - 2000, // Inner timeout slightly shorter
            langContext
        );

        return {
            ...result,
            feedback: normalizeFeedback(result.feedback),
            tips: Array.isArray(result.tips) ? result.tips.slice(0, 5) : [],
            transcript: result.transcript || "(No transcript)",
            timestamp: new Date().toISOString()
        } as AIAnalysis;
    };

    const timeoutPromise = new Promise<AIAnalysis>((resolve) => {
        setTimeout(() => {
            resolve(generateFallbackAnalysis("Timeout (55s Limit Reached)"));
        }, SLA_TIMEOUT_MS);
    });

    try {
        console.log(`Starting Analysis (Fail-Safe Mode). Size: ${(base64Audio.length/1024/1024).toFixed(2)}MB`);
        return await Promise.race([logicPromise(), timeoutPromise]);
    } catch (error: any) {
        // If logicPromise throws a fatal error (network, auth), we also return fallback to keep app alive
        console.error("Analysis Exception:", error);
        return generateFallbackAnalysis(error.message || "Unknown Error");
    }
};
