import React, { useState } from 'react';
import { UserProfile, AIAnalysis, AppText, Language } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { actionPlan } from '../utils/translations';

interface DashboardProps {
  user: UserProfile;
  history: AIAnalysis[];
  onStartRecording: () => void;
  onViewHistory: (analysis: AIAnalysis) => void;
  text: AppText;
}

const Dashboard: React.FC<DashboardProps> = ({ user, history, onStartRecording, onViewHistory, text }) => {
  
  // Data slicing (Last 10 sessions)
  const recentHistory = history.slice(-10);
  
  const scoreData = recentHistory.map((h, i) => ({
    name: `S${i + 1}`,
    score: h.score,
    date: new Date(h.timestamp).toLocaleDateString()
  })); 

  const metricsData = recentHistory.map((h, i) => ({
    name: `Session ${i + 1}`,
    grammar: h.grammarScore,
    vocabulary: h.vocabularyScore,
    pronunciation: h.pronunciationScore,
  }));

  // --- Advanced Stats Calculation ---
  const averageScore = history.length > 0 
    ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / history.length)
    : 0;

  const avgGrammar = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.grammarScore, 0) / history.length)
    : 0;

  const avgVocab = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.vocabularyScore, 0) / history.length)
    : 0;

  const avgPronunciation = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.pronunciationScore, 0) / history.length)
    : 0;
    
  const avgFluency = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.fluencyScore, 0) / history.length)
    : 0;

  const bestScore = history.length > 0 
    ? Math.max(...history.map(h => h.score)) 
    : 0;

  const totalWordsSpoken = history.reduce((acc, curr) => {
    return acc + (curr.transcript ? curr.transcript.split(' ').length : 0);
  }, 0);

  // Analyze last session for strengths/weaknesses
  const lastSession = history.length > 0 ? history[history.length - 1] : null;
  let topStrength = "N/A";
  let focusArea = "N/A";

  if (lastSession) {
    const skills = [
        { name: text.grammar, val: lastSession.grammarScore },
        { name: text.pronunciation, val: lastSession.pronunciationScore },
        { name: text.vocabulary, val: lastSession.vocabularyScore },
        { name: text.fluency, val: lastSession.fluencyScore }
    ];
    // Sort descending
    skills.sort((a, b) => b.val - a.val);
    topStrength = skills[0].name;
    focusArea = skills[skills.length - 1].name;
  }
  
  // --- Practical Suggestions / Action Plan Logic ---
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  // Identify Weakest Average Skill to suggest improvements
  const skillAverages = [
      { id: 'grammar', val: avgGrammar, name: text.grammar },
      { id: 'vocabulary', val: avgVocab, name: text.vocabulary },
      { id: 'pronunciation', val: avgPronunciation, name: text.pronunciation },
      { id: 'fluency', val: avgFluency, name: text.fluency }
  ];
  skillAverages.sort((a, b) => a.val - b.val); // Ascending order, weakest first
  
  const weakestSkill = skillAverages[0];
  const langKey = text.hello === "哈囉" ? 'zh' : 'en'; // Simple lang detection based on hello text
  const planTexts = actionPlan[langKey];
  
  let suggestionObject = { title: "", details: "", tasks: [] as string[] };
  let levelKey: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (weakestSkill.val >= 80) levelKey = 'advanced';
  else if (weakestSkill.val >= 60) levelKey = 'intermediate';
  
  // Safe access to plan texts
  if (weakestSkill.id === 'grammar') suggestionObject = planTexts.grammar[levelKey];
  else if (weakestSkill.id === 'vocabulary') suggestionObject = planTexts.vocabulary[levelKey];
  else if (weakestSkill.id === 'pronunciation') suggestionObject = planTexts.pronunciation[levelKey];
  else if (weakestSkill.id === 'fluency') suggestionObject = planTexts.fluency[levelKey];


  // --- XP / Level Logic (Match App.tsx Logic) ---
  // Re-calculate the specific progress bar position based on the progressive curve
  // L1->2: 300, L2->3: 800 (+500), etc. Cap at 3000.
  let costForNext = 300;
  let remainingXP = user.xp;
  
  // We simulate the levels to find where the current XP sits within the current bracket
  while (remainingXP >= costForNext) {
      remainingXP -= costForNext;
      costForNext += 500;
      if (costForNext > 3000) costForNext = 3000;
  }
  
  const xpForNextLevel = costForNext;
  const currentLevelProgress = remainingXP;
  const progressPercentage = Math.min((currentLevelProgress / xpForNextLevel) * 100, 100);

  // --- Pagination Logic for Recent Sessions ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Create a reversed copy for display (newest first)
  const reversedHistory = [...history].reverse();
  const totalPages = Math.ceil(reversedHistory.length / itemsPerPage);
  
  const currentHistoryItems = reversedHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const goToNextPage = () => {
      if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  const goToPrevPage = () => {
      if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10 pb-20 w-full">
        
      {/* Hero Section (Gamified) */}
      <div className="grid md:grid-cols-3 gap-6 md:gap-8 items-center bg-gradient-to-r from-gray-900 to-black p-5 md:p-8 rounded-3xl border border-gray-800 relative overflow-hidden">
         {/* Decorative Background */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         
         <div className="md:col-span-2 relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">
                {text.hello}, <span className="text-blue-500">{user.name}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6">
                <div className="bg-gray-800 px-3 py-1 rounded-full text-xs md:text-sm border border-gray-700 whitespace-nowrap">
                    🔥 <span className="font-bold text-white">{user.streak}</span> {text.streak}
                </div>
                <div className="bg-gray-800 px-3 py-1 rounded-full text-xs md:text-sm border border-gray-700 whitespace-nowrap">
                    ⚡ <span className="font-bold text-white">{user.xp}</span> {text.xp}
                </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mb-8 max-w-md w-full">
                <div className="flex justify-between text-xs uppercase text-gray-400 mb-1 tracking-wider">
                    <span>{text.level} {user.level}</span>
                    <span>{text.nextLevel} {user.level + 1}</span>
                </div>
                <div className="h-3 w-full bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <div className="text-right text-xs text-gray-500 mt-1">{currentLevelProgress} / {xpForNextLevel} XP</div>
            </div>

            <button 
                onClick={onStartRecording}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 md:px-8 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform hover:scale-105 flex items-center justify-center md:justify-start gap-3"
            >
                <span className="bg-white/20 rounded-full p-1">🎙️</span> {text.startSession}
            </button>
         </div>
         
         <div className="relative z-10 flex flex-col justify-center items-center md:items-end mt-4 md:mt-0">
             <div className="text-center">
                 <div className="text-5xl md:text-6xl font-bold text-white mb-2">{averageScore}</div>
                 <div className="text-xs md:text-sm text-gray-400 uppercase tracking-widest">{text.avgScore}</div>
             </div>
         </div>
      </div>

      {/* Performance Highlights */}
      {history.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 hover:border-blue-900 transition-colors">
                  <div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.bestScore}</div>
                  <div className="text-2xl md:text-3xl font-bold text-green-400">{bestScore}</div>
              </div>
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 hover:border-blue-900 transition-colors">
                  <div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.totalWords}</div>
                  <div className="text-2xl md:text-3xl font-bold text-blue-400">{totalWordsSpoken.toLocaleString()}</div>
              </div>
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 hover:border-blue-900 transition-colors">
                  <div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.topStrength}</div>
                  <div className="text-lg md:text-xl font-bold text-purple-400 truncate">{topStrength}</div>
              </div>
              <div className="bg-gray-900 p-4 md:p-6 rounded-2xl border border-gray-800 hover:border-blue-900 transition-colors">
                  <div className="text-gray-500 text-[10px] md:text-xs uppercase tracking-wider mb-2">{text.focusArea}</div>
                  <div className="text-lg md:text-xl font-bold text-pink-400 truncate">{focusArea}</div>
              </div>
          </div>
      )}

      {/* Charts Section */}
      {history.length > 1 && (
          <div className="space-y-8">
              {/* Overall Progress Chart */}
              <div className="bg-gray-900 border border-gray-800 p-4 md:p-6 rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-2">
                    <h3 className="text-lg md:text-xl font-serif text-white">{text.overallProgress}</h3>
                    <div className="flex gap-4">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                             <div className="w-2 h-0.5 bg-gray-500"></div> {text.average}: {averageScore}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{text.last10}</span>
                    </div>
                </div>
                <div className="h-60 md:h-72 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scoreData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#666" tick={{fontSize: 10}} />
                            <YAxis stroke="#666" domain={[0, 100]} tick={{fontSize: 10}} width={35} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorScore)" 
                            />
                            <ReferenceLine y={averageScore} stroke="#9ca3af" strokeDasharray="3 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
              </div>

              {/* Skill Progression - Separate Graphs */}
              <div>
                 <h3 className="text-lg md:text-xl font-serif text-white mb-6 pl-2">{text.skillProgression}</h3>
                 <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Grammar Chart */}
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4">
                            <h4 className="text-pink-400 font-medium text-xs md:text-sm uppercase tracking-wide">{text.grammar}</h4>
                            <span className="text-xs text-gray-500">{text.average}: {avgGrammar}%</span>
                        </div>
                        <div className="h-32 md:h-40 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs>
                                        <linearGradient id="colorGrammar" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#ec4899' }} />
                                    <Area type="monotone" dataKey="grammar" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorGrammar)" />
                                    <ReferenceLine y={avgGrammar} stroke="#9ca3af" strokeDasharray="3 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-right text-xl md:text-2xl font-bold text-white">{metricsData[metricsData.length-1].grammar}%</div>
                    </div>

                    {/* Vocabulary Chart */}
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4">
                            <h4 className="text-yellow-400 font-medium text-xs md:text-sm uppercase tracking-wide">{text.vocabulary}</h4>
                            <span className="text-xs text-gray-500">{text.average}: {avgVocab}%</span>
                        </div>
                        <div className="h-32 md:h-40 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs>
                                        <linearGradient id="colorVocabulary" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#eab308' }} />
                                    <Area type="monotone" dataKey="vocabulary" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorVocabulary)" />
                                    <ReferenceLine y={avgVocab} stroke="#9ca3af" strokeDasharray="3 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-right text-xl md:text-2xl font-bold text-white">{metricsData[metricsData.length-1].vocabulary}%</div>
                    </div>

                    {/* Pronunciation Chart */}
                    <div className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-2xl">
                        <div className="flex justify-between mb-4">
                            <h4 className="text-purple-400 font-medium text-xs md:text-sm uppercase tracking-wide">{text.pronunciation}</h4>
                            <span className="text-xs text-gray-500">{text.average}: {avgPronunciation}%</span>
                        </div>
                        <div className="h-32 md:h-40 -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metricsData}>
                                    <defs>
                                        <linearGradient id="colorPronunciation" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="name" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }} itemStyle={{ color: '#8b5cf6' }} />
                                    <Area type="monotone" dataKey="pronunciation" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorPronunciation)" />
                                    <ReferenceLine y={avgPronunciation} stroke="#9ca3af" strokeDasharray="3 3" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-2 text-right text-xl md:text-2xl font-bold text-white">{metricsData[metricsData.length-1].pronunciation}%</div>
                    </div>
                 </div>
              </div>
          </div>
      )}

      {/* Action Plan / Practical Suggestions Card (Moved Here) */}
      {history.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 border border-indigo-500/30 rounded-2xl overflow-hidden transition-all duration-300">
              <div 
                  className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setIsPlanExpanded(!isPlanExpanded)}
              >
                  <div className="bg-indigo-900/50 p-3 md:p-4 rounded-full flex-shrink-0">
                      <span className="text-2xl md:text-3xl">💡</span>
                  </div>
                  <div className="flex-grow w-full">
                      <div className="flex items-center justify-between md:justify-start gap-3 mb-1 w-full">
                        <h3 className="text-base md:text-lg font-bold text-indigo-200">{text.actionPlan}: {weakestSkill.name}</h3>
                        <span className={`text-indigo-400 transform transition-transform duration-300 ${isPlanExpanded ? 'rotate-180' : ''}`}>
                             ▼
                        </span>
                      </div>
                      <p className="text-xs md:text-sm text-indigo-300 mb-1 font-semibold uppercase tracking-wide">{text.recommendedFocus}</p>
                      <p className="text-sm md:text-base text-gray-300 leading-relaxed italic">"{suggestionObject.title}"</p>
                      <div className="text-xs text-indigo-400 mt-2">
                        {isPlanExpanded ? text.hideDetails : text.viewDetails}
                      </div>
                  </div>
              </div>
              
              {/* Expanded Details */}
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isPlanExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                   <div className="p-4 md:p-6 pt-0 border-t border-indigo-500/20 bg-black/20">
                        <p className="text-gray-300 mb-4 text-sm md:text-base">{suggestionObject.details}</p>
                        <ul className="space-y-3">
                            {suggestionObject.tasks.map((task, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm md:text-base">
                                    <span className="text-green-400 mt-1">✓</span>
                                    <span className="text-gray-200">{task}</span>
                                </li>
                            ))}
                        </ul>
                   </div>
              </div>
          </div>
      )}

      {/* Recent Activity List with Pagination */}
      {history.length > 0 && (
        <div>
            <div className="flex justify-between items-end mb-4 pl-2">
                <h3 className="text-lg md:text-xl font-serif text-white">{text.recentSessions}</h3>
            </div>
            
            <div className="space-y-3">
                {currentHistoryItems.map((session, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => onViewHistory(session)}
                        className="w-full bg-black border border-gray-800 p-4 md:p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center hover:border-blue-600 hover:bg-gray-900/50 transition-all group text-left gap-4"
                    >
                        <div className="flex items-center gap-4">
                            {/* Replaced Grades with Score Circles */}
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold border-2 text-sm md:text-base ${
                                session.score >= 90 ? 'border-purple-500 text-purple-400 bg-purple-900/20' : 
                                session.score >= 75 ? 'border-blue-500 text-blue-400 bg-blue-900/20' : 
                                session.score >= 60 ? 'border-green-500 text-green-400 bg-green-900/20' : 
                                'border-gray-600 text-gray-400 bg-gray-900'
                            }`}>
                                {session.score}
                            </div>
                            <div>
                                <div className="text-white font-medium text-sm md:text-base group-hover:text-blue-400 transition-colors">{text.speakingPractice}</div>
                                <div className="text-xs text-gray-500">{new Date(session.timestamp).toLocaleDateString()} • {new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-end pl-14 sm:pl-0">
                            <div className="text-right">
                                <div className="text-[10px] text-gray-500 mb-1 uppercase">{text.focus}</div>
                                <div className="text-xs md:text-sm text-gray-300">{session.vocabularyScore < session.grammarScore ? text.vocabulary : text.grammar}</div>
                            </div>
                            <div className="text-gray-600 group-hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button 
                        onClick={goToPrevPage} 
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        {text.prev}
                    </button>
                    <span className="text-xs md:text-sm text-gray-500">
                        {text.page} {currentPage} / {totalPages}
                    </span>
                    <button 
                        onClick={goToNextPage} 
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-900 border border-gray-800 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        {text.next}
                    </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;