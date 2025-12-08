
import { GoogleGenAI, Type, Schema, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AIAnalysis } from "../types";

// Critical: Check API Key immediately
if (!process.env.API_KEY) {
    console.error("CRITICAL ERROR: API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// --- SCHEMAS ---

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "Overall score 0-100." },
    grammarScore: { type: Type.NUMBER, description: "Grammar score 0-100." },
    pronunciationScore: { type: Type.NUMBER, description: "Pronunciation score 0-100." },
    fluencyScore: { type: Type.NUMBER, description: "Fluency score 0-100." },
    vocabularyScore: { type: Type.NUMBER, description: "Vocabulary score 0-100." },
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
    transcript: { type: Type.STRING, description: "Verbatim transcription of the audio." }
  },
  required: ["score", "grammarScore", "pronunciationScore", "fluencyScore", "vocabularyScore", "feedback", "tips", "encouragement", "transcript"],
};

// --- HELPERS ---

const extractAndRepairJSON = (text: string): string => {
  try {
    // 1. Try to find the first '{' and the last '}'
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        let cleanJson = text.substring(firstOpen, lastClose + 1);
        
        // Simple heuristic to close unclosed arrays/objects if truncated
        const openBraces = (cleanJson.match(/\{/g) || []).length;
        const closeBraces = (cleanJson.match(/\}/g) || []).length;
        const openBrackets = (cleanJson.match(/\[/g) || []).length;
        const closeBrackets = (cleanJson.match(/\]/g) || []).length;

        if (openBrackets > closeBrackets) cleanJson += ']'.repeat(openBrackets - closeBrackets);
        if (openBraces > closeBraces) cleanJson += '}'.repeat(openBraces - closeBraces);

        return cleanJson;
    }
    
    // Fallback cleanup
    return text.replace(/```json/g, '').replace(/```/g, '').trim();
  } catch (e) {
    return text;
  }
};

const generateRequest = async (
    modelName: string,
    contents: any,
    schema: Schema,
    timeoutMs: number,
    systemInstruction?: string,
    signal?: AbortSignal
): Promise<any> => {
    
    // Fail fast if Key is missing
    if (!process.env.API_KEY) {
        throw new Error("System Error: AI Service Not Configured (Missing API Key)");
    }

    const controller = new AbortController();
    const effectiveSignal = signal; 
    
    if (effectiveSignal) {
        effectiveSignal.addEventListener('abort', () => controller.abort());
    }

    try {
        const responsePromise = ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: systemInstruction,
                // OPTIMIZATION: 8192 is the max output for Flash. 
                // Setting it higher (20k) is invalid and can cause undefined behavior/hangs.
                maxOutputTokens: 8192, 
                // OPTIMIZATION: Lower temperature for faster, deterministic output (less "thinking")
                temperature: 0.2, 
                safetySettings: [
                     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Internal timeout for the API call itself
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
                controller.abort(); 
                reject(new Error(`API Timeout after ${timeoutMs}ms`));
            }, timeoutMs)
        );

        const result: any = await Promise.race([responsePromise, timeoutPromise]);
        
        if (!result.text) throw new Error("Empty response from AI");
        
        const cleanText = extractAndRepairJSON(result.text);
        return JSON.parse(cleanText);

    } catch (error) {
        console.warn("AI Generation Warning:", error); 
        throw error;
    }
};

const generateEmergencyFallback = (errorMessage: string): AIAnalysis => {
    return {
        transcript: "Audio received. The analysis took longer than expected. Please check your internet connection and try again.",
        score: 70,
        grammarScore: 70,
        pronunciationScore: 70,
        fluencyScore: 70,
        vocabularyScore: 70,
        feedback: [],
        tips: ["Ensure you have a stable internet connection.", "Try recording in a quiet environment.", "Speak clearly and at a moderate pace."],
        encouragement: "We secured your audio, but the detailed report timed out. Keep practicing!",
        timestamp: new Date().toISOString()
    };
};

// --- MAIN EXPORT ---

export const analyzeAudio = async (base64Audio: string, duration: number, mimeType: string, language: 'en' | 'zh'): Promise<AIAnalysis> => {
    
    // VALIDATION: Fail fast on invalid inputs
    if (!base64Audio || base64Audio.length < 100) {
        throw new Error("Audio recording is empty or invalid. Please try again.");
    }

    // 12MB Payload Limit Check
    if (base64Audio.length > 12 * 1024 * 1024) {
        throw new Error("File too large. Please record a shorter clip.");
    }

    let langContext = "You are a strict English teacher. Provide feedback in ENGLISH ONLY. Do NOT correct punctuation."; 
    if (language === 'zh') {
        langContext = "You are a friendly Taiwanese ESL teacher. Provide 'explanation', 'tips', 'encouragement' in TRADITIONAL CHINESE (Taiwan). 'correction' stays in English.";
    }

    // OPTIMIZATION: Explicitly ask for speed and concise output to save token generation time.
    const promptInstructions = `
    TASK: 
    1. Transcribe audio verbatim.
    2. Analyze grammar, pronunciation, fluency.
    3. Output JSON immediately.
    
    CONSTRAINTS:
    - SPEED IS CRITICAL. Do not generate markdown.
    - Explanations must be CONCISE (max 20 words).
    - Limit feedback to top 10 most critical errors.
    - Ignore punctuation errors.
    `;
    
    // TIMEOUT STRATEGY:
    // Kept at 100s as safety net, but model optimizations target ~20-30s completion.
    const PROCESSING_TIMEOUT = 100000; 

    return new Promise<AIAnalysis>((resolve, reject) => {
        const controller = new AbortController();
        
        // Global timeout safety net
        const timeoutId = setTimeout(() => {
            console.warn("Global Analysis Timeout Triggered.");
            controller.abort(); 
            resolve(generateEmergencyFallback("Analysis timed out due to high load."));
        }, PROCESSING_TIMEOUT);

        (async () => {
            try {
                console.log(`Starting Fast Analysis. Duration: ${duration}s. Size: ${(base64Audio.length/1024/1024).toFixed(2)}MB`);

                const result = await generateRequest(
                    'gemini-2.5-flash',
                    {
                        parts: [
                            { inlineData: { data: base64Audio, mimeType: mimeType } },
                            { text: promptInstructions }
                        ]
                    },
                    analysisSchema,
                    PROCESSING_TIMEOUT,
                    `${langContext} JSON ONLY. Concise Output.`,
                    controller.signal
                );

                clearTimeout(timeoutId);
                resolve({
                    ...result,
                    timestamp: new Date().toISOString()
                });

            } catch (error: any) {
                clearTimeout(timeoutId);
                console.error("Analysis Failed:", error);
                
                // Critical: If the error is an API Key issue, REJECT it so the UI knows.
                if (error.message && (error.message.includes("API Key") || error.message.includes("API_KEY"))) {
                     reject(error);
                     return;
                }

                // For all other errors (Timeout, Network), RESOLVE with fallback.
                resolve(generateEmergencyFallback(error.message));
            }
        })();
    });
};
