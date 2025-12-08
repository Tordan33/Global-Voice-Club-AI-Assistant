import { translations } from './utils/translations';

export interface UserProfile {
    name: string;
    email: string;
    streak: number;
    lastRecordingDate: string | null;
    xp: number;   // Calculated dynamically
    level: number; // Calculated dynamically
}

export interface FeedbackItem {
    original: string;
    correction: string;
    explanation: string;
}

export interface AIAnalysis {
    transcript: string;
    score: number; // 0-100
    grammarScore: number;
    pronunciationScore: number;
    fluencyScore: number;
    vocabularyScore: number;
    feedback: FeedbackItem[];
    tips: string[];
    encouragement: string;
    timestamp: string;
}

export enum AppView {
    ONBOARDING = 'ONBOARDING',
    DASHBOARD = 'DASHBOARD',
    RECORDING = 'RECORDING',
    ANALYSIS = 'ANALYSIS',
    PROFILE = 'PROFILE'
}

export type Language = 'en' | 'zh';
export type AppText = typeof translations.en;