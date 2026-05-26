
import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, AIAnalysis, AppView, Language } from './types';
import Header from './components/Header';
import Onboarding from './components/Onboarding';
import AudioRecorder from './components/AudioRecorder';
import FeedbackDisplay from './components/FeedbackDisplay';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { analyzeAudio } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { translations } from './utils/translations';
import { checkAndEnforceVersion } from './utils/versionManager';

const UI_VERSION = '1.0.80'; 

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [history, setHistory] = useState<AIAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetButton, setShowResetButton] = useState(false);
  
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const text = translations[language];

  const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 60000, operationName = 'Unknown'): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout: ${operationName}`)), timeoutMs);
        promise.then(
            res => { clearTimeout(timer); resolve(res); },
            err => { clearTimeout(timer); reject(err); }
        );
    });
  };

  const loadUserData = useCallback(async (uid: string, email: string) => {
    try {
      setUserId(uid);
      let profileBase = { name: 'Student', streak: 0, lastRecordingDate: null as string | null };
      
      const { data: profileData, error: profileError } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        60000, 'fetch profile'
      );
      
      if (profileData) {
        profileBase = {
            name: profileData.name || 'Student',
            streak: profileData.streak || 0,
            lastRecordingDate: profileData.last_recording_date
        };
      } else {
          profileBase.name = 'Student'; // Default name if not in profiles
          if (!profileError) {
             await withTimeout(
                 supabase.from('profiles').upsert({ id: uid, email, name: profileBase.name, streak: 0 }),
                 60000, 'upsert profile'
             ).catch(e => console.warn('Supabase upsert profile blocked (RLS or timeout):', e));
          }
      }

      const { data: historyData } = await withTimeout(
        supabase.from('history').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        60000, 'fetch history'
      );

      let loadedHistory: AIAnalysis[] = [];
      if (historyData) {
        loadedHistory = historyData.map((h: any) => ({
          transcript: h.transcript,
          score: h.score || 0,
          grammarScore: h.grammar_score || 0,
          pronunciationScore: h.pronunciation_score || 0,
          fluencyScore: h.fluency_score || 0,
          vocabularyScore: h.vocabulary_score || 0,
          feedback: h.feedback || [], 
          tips: h.tips || [], 
          encouragement: h.encouragement,
          timestamp: h.created_at
        }));
        setHistory(loadedHistory);
      }
      
      const calculateXP = (historyList: AIAnalysis[]) => {
          let totalXP = 0;
          historyList.forEach(item => {
              const wordCount = item.transcript ? item.transcript.split(' ').length : 0;
              totalXP += Math.round((item.score || 0) + (wordCount * 0.5));
          });
          let level = 1;
          let costForNext = 300;
          let remainingXP = totalXP;
          while (remainingXP >= costForNext) {
              remainingXP -= costForNext;
              level++;
              costForNext += 500;
              if (costForNext > 3000) costForNext = 3000;
          }
          return { totalXP, level };
      };

      const { totalXP, level } = calculateXP(loadedHistory);

      setUser({
        name: profileBase.name,
        email: email,
        streak: profileBase.streak,
        lastRecordingDate: profileBase.lastRecordingDate,
        xp: totalXP,
        level: level
      });
      
      const savedAnalysisStr = localStorage.getItem('current_analysis');
      if (savedAnalysisStr) {
          try {
              setCurrentAnalysis(JSON.parse(savedAnalysisStr));
              setView(AppView.ANALYSIS);
          } catch (e) {
              localStorage.removeItem('current_analysis');
              setView(AppView.DASHBOARD);
          }
      } else {
          setView(AppView.DASHBOARD);
      }
      setIsLoading(false);
    } catch (e) {
      console.error("Critical error loading user data:", e);
      if (e instanceof Error && e.message.includes('timeout')) {
          setShowResetButton(true);
      } else {
          setView(AppView.ONBOARDING);
          setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    checkAndEnforceVersion();
    let isMounted = true;
    
    // Safety timer: If app is still loading after 90 seconds, force a retry button
    const loadingFailsafe = setTimeout(() => {
        if (isMounted) setShowResetButton(true);
    }, 90000);

    const initAuth = async () => {
        try {
            const { data: { session } } = await withTimeout(supabase.auth.getSession(), 60000, 'getSession');

            if (!isMounted) return;
            
            if (session) {
                await loadUserData(session.user.id, session.user.email || '');
            } else {
                setIsLoading(false);
                setView(AppView.ONBOARDING);
            }
        } catch (e) {
            console.error("Init session error:", e);
            if (isMounted) {
                setShowResetButton(true);
            }
        }
    };
    initAuth();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (event === 'SIGNED_IN' && session) {
            try {
                await loadUserData(session.user.id, session.user.email || '');
            } catch (e) {
                console.error('onAuthStateChange loadUserData error:', e);
            }
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserId(null);
            setHistory([]);
            setCurrentAnalysis(null);
            localStorage.removeItem('current_analysis');
            setView(AppView.ONBOARDING);
            setIsRecoveryMode(false);
            setIsLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveryMode(true);
            setView(AppView.PROFILE); 
            setIsLoading(false);
        }
    });
    
    return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
        clearTimeout(loadingFailsafe);
    };
  }, [loadUserData]);

  const handleAuth = async (email: string, password: string, name: string, mode: 'LOGIN' | 'SIGNUP') => {
    try {
      if (mode === 'SIGNUP') {
        const { data, error } = await supabase.auth.signUp({ 
            email, password, options: { data: { name: name } }
        });
        
        if (error) throw error;
        if (data?.user && !data?.session) {
            // Replaced alert with a proper error throw so the user gets notified in the UI instead of stuck
            throw new Error("Please check your email to verify your registration.");
        }
        if (data?.user && data?.session) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, name, streak: 0 }).catch(e => console.warn(e));
          await loadUserData(data.user.id, email);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        
        if (error) throw error;
        // Don't call loadUserData here if you want to avoid double loading, but returning immediately is fine
        // as loadUserData handles safety checks inside itself, avoiding duplicates isn't strictly necessary 
        // since we removed the aggressive timeout logic.
        if (data?.user) await loadUserData(data.user.id, email);
      }
    } catch (error: any) {
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut().catch(e => console.warn(e));
  };

  const handleUpdateProfile = async (newName: string, currentPassword?: string, newPassword?: string) => {
    if (!user || !userId) return;
    try {
      await supabase.from('profiles').update({ name: newName }).eq('id', userId);
      if (newPassword) {
        if (!isRecoveryMode && currentPassword) {
            await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        }
        await supabase.auth.updateUser({ password: newPassword });
        if (isRecoveryMode) {
            setIsRecoveryMode(false);
            setView(AppView.DASHBOARD);
            return; 
        }
      }
      setUser({ ...user, name: newName });
    } catch (error: any) { throw error; }
  };

  const handleAnalyze = useCallback(async (audioBase64: string, duration: number, mimeType: string) => {
    if (!user || !userId) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeAudio(audioBase64, duration, mimeType, language);
      const isoTimestamp = new Date().toISOString();
      analysis.timestamp = isoTimestamp;
      const lastDate = user.lastRecordingDate ? new Date(user.lastRecordingDate).toDateString() : null;
      const today = new Date().toDateString();
      const newStreak = lastDate !== today ? user.streak + 1 : user.streak;
      const newHistory = [...history, analysis];
      setCurrentAnalysis(analysis);
      setHistory(newHistory);
      localStorage.setItem('current_analysis', JSON.stringify(analysis));
      setView(AppView.ANALYSIS);
      setIsAnalyzing(false);
      (async () => {
          await supabase.from('history').insert({
            user_id: userId,
            transcript: analysis.transcript,
            score: analysis.score,
            grammar_score: analysis.grammarScore,
            pronunciation_score: analysis.pronunciationScore,
            fluency_score: analysis.fluencyScore,
            vocabulary_score: analysis.vocabularyScore,
            feedback: analysis.feedback || [], 
            tips: analysis.tips || [], 
            encouragement: analysis.encouragement,
            created_at: isoTimestamp
          });
          await supabase.from('profiles').upsert({ id: userId, streak: newStreak, last_recording_date: isoTimestamp });
      })();
    } catch (error: any) {
      setIsAnalyzing(false);
      throw error;
    }
  }, [user, userId, history, language]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="text-blue-500 animate-pulse text-xl font-serif">Global Voice Club</div>
        {showResetButton && (
            <div className="flex flex-col items-center gap-4">
                <p className="text-red-400 text-sm max-w-sm">
                   Connection to database timed out. The database might be paused.
                </p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm">
                    Retry Connection
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden w-full flex flex-col">
      <Header 
        user={user} 
        text={text}
        language={language}
        version={UI_VERSION}
        onToggleLanguage={() => setLanguage(l => l === 'en' ? 'zh' : 'en')}
        onLogout={handleLogout} 
        onProfileClick={() => setView(AppView.PROFILE)}
        onLogoClick={() => setView(AppView.DASHBOARD)}
      />
      <main className="w-full max-w-[95%] 2xl:max-w-[1800px] mx-auto px-4 md:px-8 pt-6 pb-12 flex-grow">
        {view === AppView.ONBOARDING && (
          <Onboarding onAuth={handleAuth} onResetPassword={handleResetPassword} text={text} />
        )}
        {view === AppView.DASHBOARD && user && userId && (
          <Dashboard user={user} userId={userId} history={history} onStartRecording={() => setView(AppView.RECORDING)} onViewHistory={(a) => { setCurrentAnalysis(a); setView(AppView.ANALYSIS); }} text={text} />
        )}
        {view === AppView.PROFILE && user && (
            <Profile user={user} history={history} onUpdateProfile={handleUpdateProfile} onBack={() => setView(AppView.DASHBOARD)} text={text} isRecoveryMode={isRecoveryMode} />
        )}
        {view === AppView.RECORDING && (
          <AudioRecorder onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} onBack={() => setView(AppView.DASHBOARD)} text={text} />
        )}
        {view === AppView.ANALYSIS && currentAnalysis && user && (
          <FeedbackDisplay analysis={currentAnalysis} userName={user.name} userEmail={user.email} onClose={() => setView(AppView.DASHBOARD)} text={text} />
        )}
      </main>
    </div>
  );
};

export default App;
