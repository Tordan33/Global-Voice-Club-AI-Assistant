
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

const normalizeFeedback = (rawFeedback: any): FeedbackItem[] => {
    // 1. Sanitize input
    const safeList: FeedbackItem[] = Array.isArray(rawFeedback)
        ? rawFeedback
            .map((item: any) => ({
                original: String(item?.original || "").trim(),
                correction: String(item?.correction || "").trim(),
                explanation: String(item?.explanation || "").trim()
            }))
            .filter(item => item.original && item.correction) // Filter out empty garbage
        : [];

    // 2. Trim to 10 if too many
    const trimmed = safeList.slice(0, 10);

    // 3. Pool of generic but high-quality feedback for padding
    const paddingPool: FeedbackItem[] = [
        { original: "(Volume)", correction: "Speak louder and clearer.", explanation: "Your voice dipped; maintain steady volume." },
        { original: "(Pacing)", correction: "Slow down slightly.", explanation: "Rushing causes slurred words. Breathe." },
        { original: "(Completeness)", correction: "Finish sentences fully.", explanation: "Avoid trailing off at the end of thoughts." },
        { original: "(Clarity)", correction: "Enunciate vowels clearly.", explanation: "Vowel sounds were a bit muddy." },
        { original: "(Grammar)", correction: "Mind subject-verb agreement.", explanation: "Ensure verbs match their subjects." },
        { original: "(Intonation)", correction: "Use rising tone for questions.", explanation: "Your pitch was flat; add emotion." },
        { original: "(Structure)", correction: "Keep sentences concise.", explanation: "Long run-on sentences lose clarity." },
        { original: "(Confidence)", correction: "Project your voice.", explanation: "Sounding confident improves perceived fluency." },
        { original: "(Diction)", correction: "Articulate consonants.", explanation: "Consonant endings were softened too much." },
        { original: "(Flow)", correction: "Use linking words.", explanation: "Connect ideas with 'and', 'but', 'so'." }
    ];

    // 4. Pad if fewer than 10
    // We iterate through the padding pool and add items until we hit 10.
    // We use the 'trimmed.length' offset to cycle through different tips if we already have some items.
    let poolIndex = 0;
    while (trimmed.length < 10) {
        trimmed.push(paddingPool[poolIndex % paddingPool.length]);
        poolIndex++;
    }

    return trimmed;
};

/**
 * Maps raw errors to user-friendly debugging messages + Tech Details.
 */
const mapAIError = (error: any): { uiMessage: string, debug: string } => {
    const msg = (error.message || String(error)).toLowerCase();
    const debug = error.message || String(error);

    // Specific Network/Proxy errors (e.g. payload too large)
    if (msg.includes("proxying failed") || msg.includes("proxiedurl") || msg.includes("load failed")) {
        return { 
            uiMessage: "Network Timeout: The recording is large and the upload timed out. Please try a shorter clip or a faster connection.",
            debug 
        };
    }

    // Network / Connectivity
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
        return {
            uiMessage: "Network Error: Unable to connect to Google Gemini. Please check your internet connection.",
            debug
        };
    }
    
    // Timeout
    if (msg.includes("timeout") || msg.includes("abort")) {
        return {
            uiMessage: "Timeout Error: The analysis took too long. Please record a shorter audio clip.",
            debug
        };
    }

    // API Keys & Auth
    if (msg.includes("api key") || msg.includes("403") || msg.includes("401")) {
        return {
            uiMessage: "Authentication Error: API Key is missing or invalid. Please check system configuration.",
            debug
        };
    }

    // Quotas
    if (msg.includes("429") || msg.includes("quota")) {
        return {
            uiMessage: "Traffic Limit: The AI service is currently busy. Please wait 1 minute and try again.",
            debug
        };
    }

    // Server Side Issues
    if (msg.includes("500") || msg.includes("503") || msg.includes("overloaded")) {
        return {
            uiMessage: "Service Error: Google Gemini is temporarily overloaded. Please try again later.",
            debug
        };
    }

    if (msg.includes("404") || msg.includes("not found")) {
        return {
            uiMessage: "Config Error: The AI model version is currently unavailable. Please check the logs.",
            debug
        };
    }
    
    // Token Limits (MAX_TOKENS)
    if (msg.includes("max_tokens") || msg.includes("token limit")) {
        return {
            uiMessage: "Analysis Truncated: The recording was extremely long. We salvaged what we could.",
            debug
        };
    }

    // Content Safety / Policy
    if (msg.includes("safety") || msg.includes("blocked") || msg.includes("harmcategory")) {
        return {
            uiMessage: "Content Policy: The audio was flagged by safety filters. Please ensure recording is appropriate.",
            debug
        };
    }

    // Parsing / Empty Response
    if (msg.includes("json") || msg.includes("empty response") || msg.includes("empty text") || msg.includes("syntaxerror")) {
        return {
            uiMessage: "Data Error: The AI returned an invalid format. Please try recording again.",
            debug
        };
    }

    // Fallback for unknown debugging
    return {
        uiMessage: "System Error: An unexpected error occurred.",
        debug: debug
    };
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
    
    // Link parent signal to local controller
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
                // OPTIMIZATION: Maximize output capacity
                maxOutputTokens: 8192,
                // OPTIMIZATION: Disable thinking to save tokens for pure output and reduce latency
                thinkingConfig: { thinkingBudget: 0 }, 
                // OPTIMIZATION: Low temp for deterministic, fast JSON structure.
                temperature: 0.2, 
                safetySettings: [
                     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            }
        });

        // Internal timeout for the specific API call
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => {
                controller.abort(); 
                reject(new Error(`API Timeout`));
            }, timeoutMs)
        );

        const result: any = await Promise.race([responsePromise, timeoutPromise]);
        
        // --- ROBUST TEXT EXTRACTION ---
        let responseText = result?.text;
        const candidate = result?.candidates?.[0];

        // Fallback: Manually stitch parts if .text is missing (common in edge cases)
        if (!responseText && candidate?.content?.parts) {
             responseText = candidate.content.parts.map((p: any) => p.text).join('');
             if (responseText) console.warn("Salvaged text from candidate parts.");
        }

        // --- HANDLE TRUNCATION (MAX_TOKENS) ---
        // If we hit MAX_TOKENS, we do NOT throw an error. We use what we have.
        if (candidate?.finishReason === 'MAX_TOKENS') {
             console.warn("AI Generation hit MAX_TOKENS. Using partial response.");
             if (!responseText) {
                 // Last ditch effort: sometimes the SDK hides the partial text in weird places on error
                 // but usually it's in the parts. If it's truly empty, we can't do much.
                 throw new Error("Analysis Truncated (Empty Result)");
             }
        } else if (!responseText) {
            // Only check other blocking reasons if text is truly missing
            if (candidate?.finishReason) {
                if (candidate.finishReason === 'SAFETY') throw new Error("Response blocked due to Safety settings.");
                if (candidate.finishReason === 'RECITATION') throw new Error("Response blocked due to Recitation check.");
                if (candidate.finishReason !== 'STOP') throw new Error(`AI Output Blocked (Reason: ${candidate.finishReason})`);
            }
            if (result?.promptFeedback?.blockReason) {
                 throw new Error(`Content Blocked: ${result.promptFeedback.blockReason}`);
            }
            throw new Error("Empty text content in AI response");
        }
        
        // Repair JSON (closes brackets if truncated)
        const cleanText = extractAndRepairJSON(responseText);
        return JSON.parse(cleanText);

    } catch (error) {
        // Don't log abort errors as warnings
        if ((error as any).name !== 'AbortError') {
             console.warn("AI Generation Warning:", error);
        }
        throw error;
    }
};

const generateEmergencyFallback = (errorMessage: string): AIAnalysis => {
    // Returns a valid, safe, 10-item feedback structure even on crash
    return {
        transcript: `(Analysis Incomplete) ${errorMessage}`,
        score: 0,
        grammarScore: 0,
        pronunciationScore: 0,
        fluencyScore: 0,
        vocabularyScore: 0,
        feedback: normalizeFeedback([]), // Will produce 10 generic tips
        tips: [
            "Please check your internet connection.",
            "Try recording a shorter audio clip.",
            "Ensure background noise is minimal.",
            `Error Detail: ${errorMessage.substring(0, 50)}...`,
            "Refresh the page and try again."
        ],
        encouragement: "Something went wrong during analysis. Please try again!",
        timestamp: new Date().toISOString()
    };
};

/**
 * Robust Request Wrapper
 * Manages the SLA window and one allowed retry for transient errors.
 */
const makeRobustRequest = async (
    params: any, 
    slaDeadline: number, 
    controller: AbortController
): Promise<any> => {
    let attempts = 0;
    const MAX_ATTEMPTS = 2; // 1 initial + 1 retry

    while (attempts < MAX_ATTEMPTS) {
        attempts++;
        const now = Date.now();
        const timeRemaining = slaDeadline - now;

        // Reserve 2 seconds for cleanup/parsing
        if (timeRemaining < 2000) {
            throw new Error("SLA Timeout Exceeded");
        }

        try {
            return await generateRequest(
                params.modelName,
                params.contents,
                params.schema,
                timeRemaining - 500, // Pass dynamic timeout to API
                params.systemInstruction,
                controller.signal
            );
        } catch (error: any) {
            // Treat "Empty text" as a transient error to trigger a retry. 
            // Often, a second attempt yields a valid response from Gemini.
            const isTransient = error.message?.includes('503') || 
                                error.message?.includes('429') || 
                                error.message?.includes('Empty text');
            
            // Only retry if transient AND we haven't used up our attempts AND we have > 15s left
            if (isTransient && attempts < MAX_ATTEMPTS && (slaDeadline - Date.now()) > 15000) {
                console.log(`Transient error detected (${error.message}). Retrying...`);
                await new Promise(r => setTimeout(r, 1000)); // Short backoff
                continue;
            }
            throw error; // Propagate non-retriable or timeout errors
        }
    }
};

// --- MAIN EXPORT ---

export const analyzeAudio = async (base64Audio: string, duration: number, mimeType: string, language: 'en' | 'zh'): Promise<AIAnalysis> => {
    
    // CONFIGURATION
    const MAX_DURATION_SECONDS = 300; // 5 minutes
    // Increase SLA to 120s (2 mins) to handle large 5-min audio upload/processing on slower connections
    const SLA_TIMEOUT_MS = 120000;     
    const START_TIME = Date.now();
    const DEADLINE = START_TIME + SLA_TIMEOUT_MS;

    // 1. INPUT VALIDATION (Fail Fast)
    if (!base64Audio || base64Audio.length < 100) {
        throw new Error("Audio recording is empty or invalid. Please try again.");
    }
    // Note: duration checking here relies on client-reported duration. 
    // Additional server-side checks would require decoding headers (expensive).
    if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("Audio duration invalid. Please re-record.");
    }
    if (duration > MAX_DURATION_SECONDS + 10) { // +10s buffer
        throw new Error("Recording too long. Please keep audio within 5 minutes.");
    }
    // 12MB limit check (Base64 is ~1.33x larger than binary, so 12MB base64 is ~9MB binary)
    if (base64Audio.length > 12 * 1024 * 1024) {
        throw new Error("File too large. Please record a shorter clip.");
    }

    // 2. CONTEXT SETUP
    let langContext = "You are a strict English teacher. Provide feedback in ENGLISH ONLY. Do NOT correct punctuation."; 
    if (language === 'zh') {
        langContext = "You are a friendly Taiwanese ESL teacher. Provide 'explanation', 'tips', 'encouragement' in TRADITIONAL CHINESE (Taiwan). 'correction' stays in English.";
    }

    const promptInstructions = `
    TASK: 
    1. Transcribe audio verbatim.
    2. Analyze grammar, pronunciation, fluency.
    3. Output JSON immediately.
    
    CRITICAL:
    - If the audio is silent, unintelligible, or contains no speech, return a JSON with "score": 0 and "transcript": "(No speech detected)".
    - DO NOT return empty text.

    CONSTRAINTS:
    - Respond in under 50 seconds. Do not add markdown.
    - Explanations must be CONCISE (max 20 words).
    - Return EXACTLY 10 feedback objects.
    - Ignore punctuation errors.
    `;

    return new Promise<AIAnalysis>((resolve, reject) => {
        const controller = new AbortController();
        
        // 3. GLOBAL TIMEOUT (Safety Net)
        const timeoutId = setTimeout(() => {
            console.warn("Global Analysis Timeout Triggered.");
            controller.abort(); 
            // Rejecting here allows UI to catch the timeout error specifically
            reject(new Error("Analysis timed out due to high load."));
        }, SLA_TIMEOUT_MS);

        (async () => {
            try {
                console.log(`Starting Analysis. Dur: ${duration}s. Size: ${(base64Audio.length/1024/1024).toFixed(2)}MB`);

                // 4. EXECUTE REQUEST (with Bounded Retry)
                const result = await makeRobustRequest({
                    modelName: 'gemini-2.5-flash', // Corrected model name
                    contents: {
                        parts: [
                            { inlineData: { data: base64Audio, mimeType: mimeType } },
                            { text: promptInstructions }
                        ]
                    },
                    schema: analysisSchema,
                    systemInstruction: `${langContext} JSON ONLY. Concise Output.`
                }, DEADLINE, controller);

                clearTimeout(timeoutId);
                
                // 5. NORMALIZE & RETURN
                resolve({
                    ...result,
                    feedback: normalizeFeedback(result.feedback), // Force 10 items
                    tips: Array.isArray(result.tips) ? result.tips.slice(0, 5) : [],
                    transcript: result.transcript || "(No transcript available)",
                    timestamp: new Date().toISOString()
                });

            } catch (error: any) {
                clearTimeout(timeoutId);
                console.error("Analysis Pipeline Failed:", error);
                
                // Map to user-friendly message + DEBUG INFO
                const errInfo = mapAIError(error);
                
                // Reject with the stringified JSON so UI can parse it
                reject(new Error(JSON.stringify(errInfo)));
            }
        })();
    });
};
