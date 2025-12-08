
import React, { useRef, useState } from 'react';
import { AIAnalysis, AppText } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface FeedbackDisplayProps {
  analysis: AIAnalysis;
  userName: string;
  userEmail: string;
  onClose: () => void;
  text: AppText;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ analysis, userName, userEmail, onClose, text }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Gamification Logic: Rank System instead of Grades
  const getRank = (score: number) => {
    if (score >= 90) return { title: text.rankMaestro, color: 'text-purple-400', bg: 'bg-purple-500', emoji: '👑' };
    if (score >= 75) return { title: text.rankRisingStar, color: 'text-blue-400', bg: 'bg-blue-500', emoji: '🌟' };
    if (score >= 60) return { title: text.rankExplorer, color: 'text-green-400', bg: 'bg-green-500', emoji: '🧭' };
    return { title: text.rankNovice, color: 'text-gray-400', bg: 'bg-gray-500', emoji: '🌱' };
  };

  const rankInfo = getRank(analysis.score);

  // Calculate XP for this session for display
  const wordCount = analysis.transcript ? analysis.transcript.split(' ').length : 0;
  const xpEarned = Math.round(analysis.score + (wordCount * 0.5));

  // --- NEW PDF GENERATION STRATEGY: SNAPSHOT ---
  // Instead of using jsPDF text methods (which break Chinese fonts),
  // we capture the "Print View" DOM element as an image using html2canvas.
  const downloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);

    try {
        // 1. Capture the hidden Print Layout
        const canvas = await html2canvas(printRef.current, {
            scale: 2, // High resolution
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // 2. Convert to PDF
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate scaling to fit width
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // If content is longer than one page, we might need simple logic or just scale to fit for now.
        // For typical reports, scaling to width usually fits or we add pages.
        // Here we just add the image. If it's very long, it might stretch or cut.
        // For a single session report, it usually fits on 1-2 pages. 
        
        // Simple multi-page support logic:
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`GVC_Report_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (err) {
        console.error("PDF Generation failed:", err);
        alert("Could not generate PDF. Please try again.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="animate-fade-in w-full pb-20">
      
      {/* 
        --- HIDDEN PRINT LAYOUT --- 
        This is what gets captured for the PDF. 
        It is absolutely positioned off-screen but visible to the DOM/html2canvas.
        We use standard fonts that support Chinese (sans-serif fallback).
      */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none overflow-hidden">
        <div 
            ref={printRef} 
            className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] font-sans"
            style={{ fontFamily: '"Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif' }}
        >
            {/* Header */}
            <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Global Voice Club</h1>
                    <p className="text-gray-600">AI Speech Analysis Report</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">{new Date(analysis.timestamp).toLocaleDateString()}</p>
                    <p className="text-lg font-bold">{userName}</p>
                </div>
            </div>

            {/* Score & Rank */}
            <div className="flex items-center gap-8 mb-10 bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-center">
                    <div className="text-6xl font-black text-blue-600 mb-2">{analysis.score}</div>
                    <div className="text-sm uppercase tracking-widest text-gray-500">{text.score}</div>
                </div>
                <div className="h-16 w-px bg-gray-300"></div>
                <div>
                    <div className="text-2xl font-bold mb-1">{rankInfo.title} {rankInfo.emoji}</div>
                    <div className="text-gray-600 text-sm italic">"{analysis.encouragement}"</div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="mb-10">
                <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 uppercase tracking-wider">{text.detailedBreakdown}</h3>
                <div className="grid grid-cols-2 gap-8">
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold">{text.grammar}</span>
                            <span>{analysis.grammarScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-pink-600 h-2 rounded-full" style={{width: `${analysis.grammarScore}%`}}></div></div>
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold">{text.pronunciation}</span>
                            <span>{analysis.pronunciationScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-purple-600 h-2 rounded-full" style={{width: `${analysis.pronunciationScore}%`}}></div></div>
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold">{text.vocabulary}</span>
                            <span>{analysis.vocabularyScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-yellow-600 h-2 rounded-full" style={{width: `${analysis.vocabularyScore}%`}}></div></div>
                     </div>
                     <div>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold">{text.fluency}</span>
                            <span>{analysis.fluencyScore}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-green-600 h-2 rounded-full" style={{width: `${analysis.fluencyScore}%`}}></div></div>
                     </div>
                </div>
            </div>

            {/* Corrections */}
            <div className="mb-10">
                <div className="flex justify-between items-end border-b-2 border-gray-200 pb-2 mb-6">
                    <h3 className="text-xl font-bold uppercase tracking-wider">{text.corrections}</h3>
                    <span className="text-xs text-gray-400 italic">(Max 10 per session)</span>
                </div>
                {analysis.feedback.length === 0 ? (
                    <p className="text-gray-500 italic">{text.noErrors}</p>
                ) : (
                    <div className="space-y-4">
                        {analysis.feedback.map((item, idx) => (
                            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100 break-inside-avoid">
                                <div className="flex items-start gap-2 mb-1 text-red-700">
                                    <span className="font-bold">×</span>
                                    <span className="line-through decoration-red-400 decoration-2">{item.original}</span>
                                </div>
                                <div className="flex items-start gap-2 mb-2 text-green-700">
                                    <span className="font-bold">✓</span>
                                    <span className="font-bold">{item.correction}</span>
                                </div>
                                <p className="text-sm text-gray-600 ml-5 bg-white p-2 rounded border border-gray-100">{item.explanation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tips */}
            <div className="mb-10 break-inside-avoid">
                 <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 uppercase tracking-wider">{text.coachTips}</h3>
                 <ul className="space-y-3">
                    {analysis.tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 items-start">
                            <span className="bg-black text-white w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i+1}</span>
                            <span className="text-gray-800">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
             {/* Transcript */}
            <div className="break-inside-avoid">
                 <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 uppercase tracking-wider">{text.transcript}</h3>
                 <p className="text-gray-600 text-sm leading-relaxed italic bg-gray-50 p-4 rounded-lg border border-gray-100">"{analysis.transcript}"</p>
            </div>
        </div>
      </div>

      {/* --- NORMAL UI --- */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-2">
             ← Back
        </button>
        <h2 className="text-2xl font-serif text-white">{text.analysisResult}</h2>
        <div className="flex gap-2">
            <button 
                onClick={downloadPDF}
                disabled={isGeneratingPdf}
                className="bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:cursor-wait text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors border border-gray-600"
            >
                {isGeneratingPdf ? (
                    <>Generating...</>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        {text.downloadPdf}
                    </>
                )}
            </button>
        </div>
      </div>

      {/* NEW: XP Gained Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-xl p-4 mb-8 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-3">
             <div className="text-2xl">⚡</div>
             <div>
                 <div className="text-blue-200 font-bold">{text.xpGained}</div>
                 <div className="text-xs text-blue-300">Based on speaking time + score</div>
             </div>
        </div>
        <div className="text-3xl font-bold text-white">+{xpEarned} XP</div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Main Score Card (Rank Based) */}
        <div className="col-span-1 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gray-800 text-xs text-gray-400 px-2 py-1 rounded-bl-lg">{text.overall}</div>
            
            <div className="text-5xl mt-2 mb-4">{rankInfo.emoji}</div>
            <div className={`text-2xl font-bold mb-1 ${rankInfo.color}`}>{rankInfo.title}</div>
            <div className="text-4xl font-bold text-white mb-1">{analysis.score}<span className="text-lg text-gray-500">/100</span></div>
            
            <p className="mt-4 text-sm text-gray-300 italic">"{analysis.encouragement}"</p>
        </div>

        {/* Detailed Stats */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">{text.detailedBreakdown}</h3>
            <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                {[
                    { label: text.grammar, val: analysis.grammarScore, color: 'bg-pink-500' },
                    { label: text.pronunciation, val: analysis.pronunciationScore, color: 'bg-purple-500' },
                    { label: text.vocabulary, val: analysis.vocabularyScore, color: 'bg-yellow-500' },
                    { label: text.fluency, val: analysis.fluencyScore, color: 'bg-green-500' }
                ].map((stat) => (
                    <div key={stat.label}>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-400">{stat.label}</span>
                            <span className="text-sm font-bold text-white">{stat.val}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2.5">
                            <div className={`${stat.color} h-2.5 rounded-full transition-all duration-1000`} style={{ width: `${stat.val}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* Corrections */}
      <div className="grid md:grid-cols-2 gap-6">
         <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-serif text-white flex items-center gap-2">
                    🎯 {text.corrections}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-full border border-gray-700">Max 10</span>
            </div>
            
            {analysis.feedback.length === 0 ? (
                <p className="text-gray-500 italic">{text.noErrors}</p>
            ) : (
                <div className="space-y-6">
                    {analysis.feedback.map((item, idx) => (
                        <div key={idx} className="bg-black p-4 rounded-lg border border-gray-800">
                            <div className="flex items-start gap-2 mb-2">
                                <span className="text-red-500 mt-1">✖</span>
                                <p className="text-gray-300 line-through decoration-red-500/50">{item.original}</p>
                            </div>
                            <div className="flex items-start gap-2 mb-2">
                                <span className="text-green-500 mt-1">✔</span>
                                <p className="text-green-400 font-medium">{item.correction}</p>
                            </div>
                            <p className="text-xs text-gray-500 ml-6">{item.explanation}</p>
                        </div>
                    ))}
                </div>
            )}
         </div>

         <div className="space-y-6">
            {/* Tips */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-serif text-white mb-4 flex items-center gap-2">
                    🚀 {text.coachTips}
                </h3>
                <ul className="space-y-3">
                    {analysis.tips.map((tip, i) => (
                        <li key={i} className="flex gap-3 items-start">
                            <span className="bg-blue-900 text-blue-200 w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">{i+1}</span>
                            <span className="text-gray-300">{tip}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Transcript */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-xl font-serif text-white mb-4">📝 {text.transcript}</h3>
                <p className="text-gray-400 text-sm leading-relaxed italic">"{analysis.transcript}"</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FeedbackDisplay;
