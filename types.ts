
import { translations } from './utils/translations';

export interface UserProfile {
    name: string;
    email: string;
    streak: number;
    lastRecordingDate: string | null;
    xp: number;   
    level: number; 
}

export interface FeedbackItem {
    original: string;
    correction: string;
    explanation: string;
}

export interface AIAnalysis {
    transcript: string;
    score: number; 
    grammarScore: number;
    pronunciationScore: number;
    fluencyScore: number;
    vocabularyScore: number;
    feedback: FeedbackItem[];
    tips: string[];
    encouragement: string;
    timestamp: string;
}

export interface TaskItem {
    goal: string;
    whatToSay: string;
    timeRule: string;
    completion: string;
}

export interface SentenceUpgrade {
    original: string;
    improved: string;
}

export interface ActionPlanData {
    insight: string;
    goal: string;
    tasks: TaskItem[];
    upgrade?: SentenceUpgrade;
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
