
import React, { useState, useEffect } from 'react';
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

// We now read the version from the manifest via the manager, 
// but we keep this for the UI display.
// IMPORTANT: Update 'version.json' when you update this!
const UI_VERSION = '1.0.32'; 

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Supabase Auth ID
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [history, setHistory] = useState<AIAnalysis[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetButton, setShowResetButton] = useState(false); // Fail-safe button
  
  // Recovery Mode State (For Password Reset)
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  
  // Language State - Default to Traditional Chinese ('zh')
  const [language, setLanguage] = useState<Language>('zh');
  const text = translations[language];

  // Initialize Session
  useEffect(() => {
    
    // --- STEP 1: VERSION CHECK ---
    // This runs immediately. If update is found, it reloads the page before app initializes.
    checkAndEnforceVersion();

    // Timer to show the "Reset" button if loading takes too long (e.g. > 4 seconds)
    const resetTimer = setTimeout(() => {
        if (isLoading) setShowResetButton(true);
    }, 4000);

    const initApp = async () => {
        // SAFETY TIMEOUT: Force loading to stop after 7 seconds max
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Initialization timed out")), 7000)
        );

        const sessionPromise = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (data?.session) {
                await loadUserData(data.session.user.id, data.session.user.email || '');
            } else {
                setView(AppView.ONBOARDING);
            }
        };

        try {
            await Promise.race([sessionPromise(), timeoutPromise]);
        } catch (error) {
            console.warn("App Initialization fallback:", error);
            // If anything fails or times out, default to Onboarding so user isn't stuck
            if (!userId) setView(AppView.ONBOARDING);
        } finally {
            setIsLoading(false);
            clearTimeout(resetTimer);
        }
    };

    initApp();

    // 2. Listen for Auth Changes (Password Recovery / Login / Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setIsRecoveryMode(true);
            setView(AppView.PROFILE); // Direct user to profile to change password
            setIsLoading(false);
        } else if (event === 'SIGNED_IN' && session) {
             // Only reload if we aren't already loaded (prevents double firing)
             if (!userId) {
                await loadUserData(session.user.id, session.user.email || '');
             }
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setUserId(null);
            setHistory([]);
            setCurrentAnalysis(null);
            setView(AppView.ONBOARDING);
            setIsRecoveryMode(false);
            setIsLoading(false);
        }
    });

    return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(resetTimer);
    };
  }, []);

  // Helper to calculate XP/Level from history list
  const calculateGamification = (historyList: AIAnalysis[]) => {
      let totalXP = 0;
      historyList.forEach(item => {
          const wordCount = item.transcript ? item.transcript.split(' ').length : 0;
          // Formula: Score + (Words * 0.5)
          // Rewards length/effort even if score is low
          totalXP += Math.round(item.score + (wordCount * 0.5));
      });
      
      // PROGRESSIVE LEVELING FORMULA
      // Level 1 -> 2: 300 XP
      // Increase by 500 XP per level until Cap of 3000 XP
      
      let level = 1;
      let costForNext = 300;
      let remainingXP = totalXP;

      while (remainingXP >= costForNext) {
          remainingXP -= costForNext;
          level++;
          
          // Progressive Increase
          costForNext += 500;
          
          // Cap at 3000
          if (costForNext > 3000) costForNext = 3000;
      }
      
      return { totalXP, level };
  };

  const loadUserData = async (uid: string, email: string) => {
    try {
      setUserId(uid);
      
      // 1. Fetch Profile (Base Data)
      let profileBase = { name: 'Student', streak: 0, lastRecordingDate: null as string | null };
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (!profileError && profileData) {
        profileBase = {
            name: profileData.name,
            streak: profileData.streak || 0,
            lastRecordingDate: profileData.last_recording_date
        };
      } else {
          // Fallback if profile missing
          const { data: { user: authUser } } = await supabase.auth.getUser();
          profileBase.name = authUser?.user_metadata?.name || 'Student';
      }

      // 2. Fetch History
      const { data: historyData, error: historyError } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

      let loadedHistory: AIAnalysis[] = [];
      if (!historyError && historyData) {
        loadedHistory = historyData.map((h: any) => ({
          transcript: h.transcript,
          score: h.score,
          grammarScore: h.grammar_score,
          pronunciationScore: h.pronunciation_score,
          fluencyScore: h.fluency_score,
          vocabularyScore: h.vocabulary_score,
          feedback: h.feedback || [], 
          tips: h.tips || [], 
          encouragement: h.encouragement,
          timestamp: h.created_at
        }));
        setHistory(loadedHistory);
      }
      
      // 3. Calculate Dynamic XP/Level
      const { totalXP, level } = calculateGamification(loadedHistory);

      setUser({
        name: profileBase.name,
        email: email,
        streak: profileBase.streak,
        lastRecordingDate: profileBase.lastRecordingDate,
        xp: totalXP,
        level: level
      });
      
      // Only go to dashboard if NOT in recovery mode
      if (!isRecoveryMode) {
          setView(AppView.DASHBOARD);
      }
    } catch (e) {
      console.error("Error loading user data", e);
      // If error occurs but session exists, we should probably still show dashboard or handle gracefully
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Authentication (Login/Signup)
  const handleAuth = async (email: string, password: string, name: string, mode: 'LOGIN' | 'SIGNUP') => {
    setIsLoading(true);
    try {
      if (mode === 'SIGNUP') {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { name: name } // Store name in metadata as backup
            }
        });
        
        if (error) throw error;

        // CRITICAL: Check if session exists. 
        if (data.user && !data.session) {
            alert("Registration successful! Please check your email to verify your account before logging in.");
            setIsLoading(false);
            return; 
        }

        if (data.user && data.session) {
          // Create Profile Row immediately if we have a session
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: email,
            name: name,
            streak: 0,
            last_recording_date: null
          });

          if (profileError) {
              console.error("Profile creation warning:", profileError);
          }

          await loadUserData(data.user.id, email);
        }
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await loadUserData(data.user.id, email);
        }
      }
    } catch (error: any) {
      // Suppress console.error for auth failures to prevent alarm
      setIsLoading(false);
      // Re-throw so component can handle UI message
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
      // DYNAMIC URL FIX:
      // Uses window.location.origin to work on both Dev and Production (Cloud Run)
      const redirectUrl = window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
      });
      if (error) throw error;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserId(null);
    setUser(null);
    setHistory([]);
    setCurrentAnalysis(null);
    setView(AppView.ONBOARDING);
  };

  const handleUpdateProfile = async (newName: string, currentPassword?: string, newPassword?: string) => {
    if (!user || !userId) return;

    try {
      // 1. Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: newName })
        .eq('id', userId);

      if (updateError) throw updateError;

      // 2. Update Password (if provided)
      if (newPassword) {
        // If NOT in recovery mode, we MUST verify the old password first for security.
        if (!isRecoveryMode && currentPassword) {
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (verifyError) {
                throw new Error("Incorrect current password. Cannot update password.");
            }
        }
        
        // Update to new password
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
        
        // If successful, exit recovery mode
        if (isRecoveryMode) {
            setIsRecoveryMode(false);
            alert("Password updated successfully! Redirecting to Dashboard.");
            setView(AppView.DASHBOARD);
            return; // Exit early to avoid double alert
        }
      }

      // Update Local State (preserve XP/Level)
      setUser({ ...user, name: newName });

    } catch (error: any) {
      console.error("Update failed", error);
      throw error; 
    }
  };

  const handleStartRecording = () => {
    setView(AppView.RECORDING);
  };

  const handleAnalyze = async (audioBase64: string, duration: number, mimeType: string) => {
    if (!user || !userId) return;
    
    setIsAnalyzing(true);
    try {
      // Pass language to Gemini
      const analysis = await analyzeAudio(audioBase64, duration, mimeType, language);
      
      // Update Streak logic
      const today = new Date().toDateString();
      const lastDate = user.lastRecordingDate ? new Date(user.lastRecordingDate).toDateString() : null;
      const isoTimestamp = new Date().toISOString();
      
      let newStreak = user.streak;
      if (lastDate !== today) {
          newStreak = user.streak + 1;
      }

      // 1. Save to History DB
      const { error: historyError } = await supabase.from('history').insert({
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

      if (historyError) {
          // If error is related to response size, log it but don't crash app if possible
          console.error("Failed to save history:", historyError.message);
      }

      // 2. Update Profile DB (Streak only)
      // We do NOT save XP to DB to avoid schema errors. XP is calculated on load.
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId,
          name: user.name,
          email: user.email,
          streak: newStreak, 
          last_recording_date: isoTimestamp 
        });

      if (profileError) console.error("Failed to update streak", profileError);

      // 3. Update Local State (Recalculate XP)
      analysis.timestamp = isoTimestamp;
      const newHistory = [...history, analysis];
      const { totalXP, level } = calculateGamification(newHistory);

      setUser({
          ...user,
          streak: newStreak,
          lastRecordingDate: isoTimestamp,
          xp: totalXP,
          level: level
      });
      
      setCurrentAnalysis(analysis);
      setHistory(newHistory);

      setView(AppView.ANALYSIS);
    } catch (error: any) {
      console.error("Analysis Error:", error);
      // Show cleaner error message
      const msg = error.message.includes("Timeout") ? "Analysis timed out. Please try a shorter recording." : error.message;
      alert(`Error: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCloseFeedback = () => {
    setCurrentAnalysis(null);
    setView(AppView.DASHBOARD);
  };

  const handleViewHistory = (analysis: AIAnalysis) => {
    setCurrentAnalysis(analysis);
    setView(AppView.ANALYSIS);
  };

  // Manual Hard Reset for "Stuck" scenarios
  const handleManualReset = () => {
      // Clear all local storage to remove potentially corrupt tokens
      localStorage.clear();
      // Force reload the page
      window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4 text-center">
        <div className="text-blue-500 animate-pulse text-xl font-serif">Loading Global Voice Club...</div>
        
        {showResetButton && (
            <div className="animate-fade-in flex flex-col items-center">
                <p className="text-gray-500 text-sm mb-3">Taking longer than usual?</p>
                <button 
                    onClick={handleManualReset}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 hover:border-white transition-all flex items-center gap-2 text-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Refresh & Fix
                </button>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden w-full flex flex-col">
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
      
      {/* 
        LAYOUT FIX: 
        Replaced 'container' and 'max-w-full' with an explicit centered container.
        This fixes the off-center issue on mobile devices.
      */}
      <main className="w-full max-w-[95%] 2xl:max-w-[1800px] mx-auto px-4 md:px-8 pt-6 pb-12 flex-grow">
        {view === AppView.ONBOARDING && (
          <Onboarding 
            onAuth={handleAuth} 
            onResetPassword={handleResetPassword}
            text={text}
          />
        )}
        
        {view === AppView.DASHBOARD && user && (
          <Dashboard 
            user={user} 
            history={history} 
            onStartRecording={handleStartRecording}
            onViewHistory={handleViewHistory}
            text={text}
          />
        )}

        {view === AppView.PROFILE && user && (
            <Profile 
                user={user}
                history={history}
                onUpdateProfile={handleUpdateProfile}
                onBack={() => setView(AppView.DASHBOARD)}
                text={text}
                isRecoveryMode={isRecoveryMode}
            />
        )}
        
        {view === AppView.RECORDING && (
          <AudioRecorder 
            onAnalyze={handleAnalyze} 
            isAnalyzing={isAnalyzing}
            onBack={() => setView(AppView.DASHBOARD)}
            text={text}
          />
        )}
        
        {view === AppView.ANALYSIS && currentAnalysis && user && (
          <FeedbackDisplay 
            analysis={currentAnalysis} 
            userName={user.name}
            userEmail={user.email}
            onClose={handleCloseFeedback}
            text={text}
          />
        )}
      </main>
    </div>
  );
};

export default App;
