
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, AIAnalysis, AppText, ActionPlanData, TaskItem } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { actionPlan } from '../utils/translations';
import { supabase } from '../services/supabaseClient';

interface DashboardProps {
  user: UserProfile;
  userId: string;
  history: AIAnalysis[];
  onStartRecording: () => void;
  onViewHistory: (analysis: AIAnalysis) => void;
  text: AppText;
}

const Dashboard: React.FC<DashboardProps> = ({ user, userId, history, onStartRecording, onViewHistory, text }) => {
  
  const recentHistory = history.slice(-10);
  
  const scoreData = recentHistory.map((h, i) => ({
    name: `S${i + 1}`,
    score: h.score || 0,
    date: new Date(h.timestamp).toLocaleDateString()
  })); 

  const metricsData = recentHistory.map((h, i) => ({
    name: `Session ${i + 1}`,
    grammar: h.grammarScore || 0,
    vocabulary: h.vocabularyScore || 0,
    pronunciation: h.pronunciationScore || 0,
    fluency: h.fluencyScore || 0
  }));

  const averageScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + (curr.score || 0), 0) / history.length)
    : 0;

  const avgGrammar = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.grammarScore || 0), 0) / history.length)
    : 0;

  const avgVocab = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.vocabularyScore || 0), 0) / history.length)
    : 0;

  const avgPronunciation = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.pronunciationScore || 0), 0) / history.length)
    : 0;
    
  const avgFluency = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + (curr.fluencyScore || 0), 0) / history.length)
    : 0;

  const bestScore = history.length > 0 
    ? Math.max(...history.map(h => h.score || 0)) 
    : 0;

  const totalWordsSpoken = history.reduce((acc, curr) => {
    return acc + (curr.transcript ? curr.transcript.split(' ').length : 0);
  }, 0);

  const lastSession = history.length > 0 ? history[history.length - 1] : null;
  let topStrength = "N/A";
  let focusArea = "N/A";

  if (lastSession) {
    const skills = [
        { name: text.grammar, val: lastSession.grammarScore || 0 },
        { name: text.pronunciation, val: lastSession.pronunciationScore || 0 },
        { name: text.vocabulary, val: lastSession.vocabularyScore || 0 },
        { name: text.fluency, val: lastSession.fluencyScore || 0 }
    ];
    skills.sort((a, b) => b.val - a.val);
    topStrength = skills[0].name;
    focusArea = skills[skills.length - 1].name;
  }
  
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('completed_tasks');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('completed_tasks', JSON.stringify(completedTasks));
  }, [completedTasks]);

  const { suggestionObject, nextMilestone, currentTierName, planId, focusSkillLabel } = useMemo(() => {
    const foundationalAverages = [
        { id: 'grammar', val: avgGrammar, name: text.grammar },
        { id: 'vocabulary', val: avgVocab, name: text.vocabulary },
        { id: 'pronunciation', val: avgPronunciation, name: text.pronunciation },
        { id: 'fluency', val: avgFluency, name: text.fluency }
    ];
    foundationalAverages.sort((a, b) => a.val - b.val);
    const weakest = foundationalAverages[0];

    let levelKey: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
    let tierName = text.rankNovice;
    if (averageScore >= 80) {
        levelKey = 'advanced'; tierName = text.rankMaestro;
    } else if (averageScore >= 55) {
        levelKey = 'intermediate'; tierName = text.rankRisingStar;
    }

    const pointsToNextRefresh = 3 - (averageScore % 3);
    const langKey = text.hello === "哈囉" ? 'zh' : 'en';
    const planTexts = (actionPlan as any)[langKey];
    let selectedAdvice = planTexts[weakest.id]?.[levelKey] || planTexts[weakest.id]?.['beginner'];
    if (!selectedAdvice) {
        selectedAdvice = { insight: "Keep speaking!", goal: "Improve every day.", tasks: [] };
    }
    const currentPlanId = `${weakest.id}_${levelKey}_${Math.floor(averageScore/3)}`;
    return { 
        suggestionObject: selectedAdvice as ActionPlanData, 
        nextMilestone: pointsToNextRefresh,
        currentTierName: tierName,
        planId: currentPlanId,
        focusSkillLabel: weakest.name
    };
  }, [averageScore, avgGrammar, avgVocab, avgPronunciation, avgFluency, text, text.hello]);

  const toggleTask = (index: number) => {
    const key = `${planId}_${index}`;
    setCompletedTasks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllCompleted = suggestionObject.tasks.length > 0 && 
    suggestionObject.tasks.every((_, i) => !!completedTasks[`${planId}_${i}`]);

  let costForNext = 300;
  let remainingXP = user.xp;
  while (remainingXP >= costForNext) {
      remainingXP -= costForNext;
      costForNext += 500;
      if (costForNext > 3000) costForNext = 3000;
  }
  const progressPercentage = Math.min((remainingXP / costForNext) * 100, 100);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const reversedHistory = [...history].reverse();
  const totalPages = Math.ceil(reversedHistory.length / itemsPerPage);
  const currentHistoryItems = reversedHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Support & Feedback Logic
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'rating' | 'bug'>('rating');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  const submitFeedback = async () => {
    if (!feedbackMessage && feedbackType === 'bug') return;
    if (feedbackType === 'rating' && feedbackRating === 0) return;

    setIsSubmittingFeedback(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: userId,
        type: feedbackType,
        rating: feedbackType === 'rating' ? feedbackRating : null,
        message: feedbackMessage,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      setFeedbackStatus(text.feedbackSuccess);
      setTimeout(() => {
        setIsFeedbackOpen(false);
        setFeedbackStatus(null);
        setFeedbackMessage('');
        setFeedbackRating(0);
      }, 2000);
    } catch (e: any) {
      setFeedbackStatus(text.feedbackError);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10 pb-20 w-full">
      {/* Header Profile Section */}
      <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-center bg-gradient-to-r from-gray-900 to-black p-5 md:p-8 rounded-3xl border border-gray-800 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         <div className="md:col-span-2 relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">{text.hello}, <span className="text-blue-500">{user.name}</span></h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6">
                <div className="bg-gray-800 px-3 py-1 rounded-full text-xs md:text-sm border border-gray-700 whitespace-nowrap">🔥 <span className="font-bold text-white">{user.streak}</span> {text.streak}</div>
                <div className="bg-gray-800 px-3 py-1 rounded-full text-xs md:text-sm border border-gray-700 whitespace-nowrap">⚡ <span className="font-bold text-white">{user.xp}</span> {text.xp}</div>
            </div>
            <div className="mb-8 max-w-md w-full">
                <div className="flex justify-between text-xs uppercase text-gray-400 mb-1 tracking-wider"><span>{text.level} {user.level}</span><span>{text.nextLevel} {user.level + 1}</span></div>
                <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-600 to-purple-500" style={{ width: `${progressPercentage}%` }}></div></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <button onClick={onStartRecording} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 md:px-8 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform hover:scale-105 flex items-center justify-center gap-3"><span className="bg-white/20 rounded-full p-1">🎙️</span> {text.startSession}</button>
                <button 
                  onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                  className="text-gray-400 hover:text-white text-sm flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 hover:bg-gray-800 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {text.reportRate}
                </button>
            </div>
         </div>
         <div className="relative z-10 flex flex-col justify-center items-center md:items-end mt-4 md:mt-0">
             <div className="text-center"><div className="text-5xl md:text-6xl font-bold text-white mb-2">{averageScore}</div><div className="text-xs md:text-sm text-gray-400 uppercase tracking-widest">{text.avgScore}</div></div>
         </div>
      </div>

      {/* Feedback & Bug Reporting Modal-like UI */}
      {isFeedbackOpen && (
        <div className="bg-gray-900 border border-blue-500/30 rounded-2xl p-6 md:p-8 animate-fade-in relative shadow-2xl">
          <button onClick={() => setIsFeedbackOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
          <div className="flex gap-4 mb-6 border-b border-gray-800 pb-4">
            <button 
              onClick={() => {setFeedbackType('rating'); setFeedbackStatus(null);}} 
              className={`pb-2 px-2 transition-colors ${feedbackType === 'rating' ? 'text-blue-500 border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
            >
              {text.rateApp}
            </button>
            <button 
              onClick={() => {setFeedbackType('bug'); setFeedbackStatus(null);}} 
              className={`pb-2 px-2 transition-colors ${feedbackType === 'bug' ? 'text-blue-500 border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}
            >
              {text.reportProblem}
            </button>
          </div>

          <div className="space-y-6">
            {feedbackType === 'rating' && (
              <div className="flex flex-col items-center gap-4">
                <p className="text-gray-300">{text.feedbackExperience}</p>
                <div className="flex gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setFeedbackRating(star)}
                      className={`text-3xl transition-transform hover:scale-125 ${feedbackRating >= star ? 'text-yellow-400' : 'text-gray-700'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 uppercase tracking-widest">
                {feedbackType === 'rating' ? text.feedbackCommentLabel : text.feedbackBugLabel}
              </label>
              <textarea 
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder={feedbackType === 'rating' ? text.feedbackCommentPlaceholder : text.feedbackBugPlaceholder}
                className="w-full bg-black border border-gray-800 rounded-xl p-4 text-sm focus:border-blue-500 transition-all h-32 resize-none outline-none"
              />
            </div>

            {feedbackStatus && (
              <div className={`text-sm text-center p-2 rounded-lg ${feedbackStatus === text.feedbackError ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                {feedbackStatus}
              </div>
            )}

            <button 
              onClick={submitFeedback}
              disabled={isSubmittingFeedback || (feedbackType === 'bug' && !feedbackMessage) || (feedbackType === 'rating' && feedbackRating === 0)}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-bold transition-all"
            >
              {isSubmittingFeedback ? text.submitting : text.submitFeedback}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Mini-Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 transition-colors"><div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.bestScore}</div><div className="text-2xl md:text-3xl font-bold text-green-400">{bestScore}</div></div>
          <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 transition-colors"><div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.totalWords}</div><div className="text-2xl md:text-3xl font-bold text-blue-400">{totalWordsSpoken.toLocaleString()}</div></div>
          <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 transition-colors"><div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.topStrength}</div><div className="text-lg md:text-xl font-bold text-purple-400 truncate">{topStrength}</div></div>
          <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 transition-colors"><div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.focusArea}</div><div className="text-lg md:text-xl font-bold text-pink-400 truncate">{focusArea}</div></div>
      </div>

      {/* Action Plan Section */}
      {history.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950 to-blue-950 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-xl shadow-indigo-900/10">
              <div className="p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 cursor-pointer hover:bg-white/5 transition-colors group" onClick={() => setIsPlanExpanded(!isPlanExpanded)}>
                  <div className="relative flex-shrink-0">
                      <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform"><span className="text-3xl md:text-4xl">👔</span></div>
                  </div>
                  <div className="flex-grow w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg md:text-2xl font-bold text-white uppercase tracking-tight">{text.actionPlan}</h3>
                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] md:text-xs px-2 py-1 rounded-md border border-indigo-500/30 font-mono">Focus: {focusSkillLabel}</span>
                        <span className="bg-blue-500/20 text-blue-300 text-[10px] md:text-xs px-2 py-1 rounded-md border border-blue-500/30 font-mono">{currentTierName}</span>
                      </div>
                      <p className="text-sm md:text-lg text-indigo-100/90 leading-relaxed font-serif uppercase tracking-wider">Coach's Recommended Strategy</p>
                      <div className="flex items-center gap-4 mt-4">
                          <div className="text-[10px] md:text-xs text-indigo-400 flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-indigo-500/10">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"></path></svg>
                              {nextMilestone} {text.pointsToRefresh}
                          </div>
                          <span className={`text-indigo-400 transform transition-transform duration-300 ml-auto ${isPlanExpanded ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                  </div>
              </div>
              
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPlanExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                   <div className="p-5 md:p-8 pt-0 border-t border-indigo-500/20 bg-black/20">
                        <div className="grid md:grid-cols-2 gap-8 mt-6">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-3">{text.insightLabel}</h4>
                                    <p className="text-gray-300 text-sm md:text-base leading-relaxed p-4 bg-indigo-900/10 rounded-xl border border-indigo-500/10 italic">{suggestionObject.insight}</p>
                                </div>
                                <div>
                                    <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-3">{text.goalLabel}</h4>
                                    <p className="text-white text-lg font-serif">{suggestionObject.goal}</p>
                                </div>
                                {suggestionObject.upgrade && (
                                    <div className="p-4 bg-black/40 border border-indigo-500/20 rounded-xl">
                                        <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-3">{text.upgradeLabel}</h4>
                                        <div className="space-y-2">
                                            <div className="text-red-400/70 text-sm line-through">❌ {suggestionObject.upgrade.original}</div>
                                            <div className="text-green-400 font-medium">✅ {suggestionObject.upgrade.improved}</div>
                                            <div className="text-[10px] text-gray-500 mt-2">🎤 {text.actionLabel}: Record the improved version once.</div>
                                        </div>
                                    </div>
                                )}
                                {isAllCompleted && (
                                    <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
                                        <p className="text-green-300 text-sm font-medium">{text.congratsTasks}</p>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <h4 className="text-indigo-300 font-bold text-xs uppercase tracking-widest mb-4">{text.tasksLabel}</h4>
                                <ul className="space-y-4">
                                    {suggestionObject.tasks.map((task, idx) => {
                                        const isDone = !!completedTasks[`${planId}_${idx}`];
                                        return (
                                            <li key={idx} onClick={() => toggleTask(idx)} className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${isDone ? 'bg-green-900/10 border-green-500/20 opacity-70' : 'bg-white/5 border-white/5 hover:border-indigo-500/30'}`}>
                                                <div className="flex items-start gap-3">
                                                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isDone ? 'bg-green-500 text-black' : 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                                        {isDone ? '✓' : idx + 1}
                                                    </span>
                                                    <div className="flex-grow">
                                                        <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDone ? 'text-green-400/60' : 'text-indigo-300'}`}>{task.goal}</div>
                                                        <div className={`text-sm mb-2 ${isDone ? 'text-gray-400 line-through' : 'text-white'}`}>{task.whatToSay}</div>
                                                        {!isDone && (
                                                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                                <div className="text-gray-500">⏳ {task.timeRule}</div>
                                                                <div className="text-gray-500">🎯 {task.completion}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                   </div>
              </div>
          </div>
      )}

      {/* Progress Charts */}
      {history.length > 0 && (
          <div className="space-y-8">
              <div className="bg-gray-900 border border-gray-800 p-4 md:p-6 rounded-2xl overflow-hidden shadow-xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2"><h3 className="text-lg md:text-xl font-serif text-white">{text.overallProgress}</h3><div className="flex gap-4"><span className="text-xs text-gray-500 flex items-center gap-1"><div className="w-2 h-0.5 bg-gray-500"></div> {text.average}: {averageScore}%</span></div></div>
                <div className="h-64 md:h-80 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scoreData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis dataKey="name" stroke="#555" tick={{fontSize: 10}} /><YAxis stroke="#555" domain={[0, 100]} tick={{fontSize: 10}} width={35} /><Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                            <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                            <ReferenceLine y={averageScore} stroke="#666" strokeDasharray="3 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
              </div>

              <div>
                 <h3 className="text-lg md:text-xl font-serif text-white mb-6 pl-2">{text.skillProgression}</h3>
                 <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4"><h4 className="text-pink-400 font-medium text-[10px] md:text-xs uppercase tracking-wide">{text.grammar}</h4><span className="text-[10px] text-gray-500">{text.average}: {avgGrammar}%</span></div>
                        <div className="h-32 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs><linearGradient id="colorGrammar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/><stop offset="95%" stopColor="#ec4899" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} hide />
                                    <Area type="monotone" dataKey="grammar" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorGrammar)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4"><h4 className="text-yellow-400 font-medium text-[10px] md:text-xs uppercase tracking-wide">{text.vocabulary}</h4><span className="text-[10px] text-gray-500">{text.average}: {avgVocab}%</span></div>
                        <div className="h-32 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs><linearGradient id="colorVocabulary" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/><stop offset="95%" stopColor="#eab308" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} hide />
                                    <Area type="monotone" dataKey="vocabulary" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorVocabulary)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4"><h4 className="text-purple-400 font-medium text-[10px] md:text-xs uppercase tracking-wide">{text.pronunciation}</h4><span className="text-[10px] text-gray-500">{text.average}: {avgPronunciation}%</span></div>
                        <div className="h-32 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs><linearGradient id="colorPronunciation" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} hide />
                                    <Area type="monotone" dataKey="pronunciation" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPronunciation)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4"><h4 className="text-green-400 font-medium text-[10px] md:text-xs uppercase tracking-wide">{text.fluency}</h4><span className="text-[10px] text-gray-500">{text.average}: {avgFluency}%</span></div>
                        <div className="h-32 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs><linearGradient id="colorFluency" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} /><XAxis dataKey="name" hide /><YAxis domain={[0, 100]} hide />
                                    <Area type="monotone" dataKey="fluency" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorFluency)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                 </div>
              </div>
          </div>
      )}

      {/* History List */}
      {history.length > 0 && (
        <div className="pb-12">
            <div className="flex justify-between items-end mb-4 pl-2"><h3 className="text-lg md:text-xl font-serif text-white">{text.recentSessions}</h3></div>
            <div className="space-y-3">
                {currentHistoryItems.map((session, idx) => (
                    <button key={idx} onClick={() => onViewHistory(session)} className="w-full bg-black border border-gray-800 p-4 md:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-blue-600 hover:bg-gray-900/50 transition-all group text-left gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold border-2 text-sm md:text-base ${session.score >= 90 ? 'border-purple-500 text-purple-400 bg-purple-900/20' : session.score >= 75 ? 'border-blue-500 text-blue-400 bg-blue-900/20' : session.score >= 60 ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-gray-600 text-gray-400 bg-gray-900'}`}>{session.score}</div>
                            <div><div className="text-white font-medium text-sm md:text-base group-hover:text-blue-400 transition-colors">{text.speakingPractice}</div><div className="text-xs text-gray-500">{new Date(session.timestamp).toLocaleDateString()}</div></div>
                        </div>
                        <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end pl-14 sm:pl-0">
                            <div className="text-right"><div className="text-[10px] text-gray-500 mb-1 uppercase">{text.focus}</div><div className="text-xs md:text-sm text-gray-300">
                                {(() => {
                                    const low = [
                                        { name: text.grammar, val: session.grammarScore },
                                        { name: text.vocabulary, val: session.vocabularyScore },
                                        { name: text.pronunciation, val: session.pronunciationScore },
                                        { name: text.fluency, val: session.fluencyScore }
                                    ].sort((a,b) => a.val - b.val)[0];
                                    return low.name;
                                })()}
                            </div></div>
                            <div className="text-gray-600 group-hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></div>
                        </div>
                    </button>
                ))}
            </div>
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">{text.prev}</button>
                    <span className="text-xs md:text-sm text-gray-500">{text.page} {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm">{text.next}</button>
                </div>
            )}
        </div>
      )}

      {/* Instructions Footer */}
      <div className="mt-12 text-center p-8 border border-gray-800 rounded-2xl bg-gray-900/30">
        <h4 className="text-gray-300 mb-4 font-serif">{text.howToUse}</h4>
        <a href="https://emphasized-nyala-97a.notion.site/Voice-AI-APP-2d1eb1df49ca8071b8bec4674dd89737?source=copy_link" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-blue-400 px-6 py-3 rounded-xl border border-gray-700 transition-all font-semibold"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" /></svg>View Full Instruction Guide</a>
      </div>
    </div>
  );
};

export default Dashboard;
