
import React, { useState, useRef, useEffect } from 'react';
import { AppText } from '../types';

interface AudioRecorderProps {
  onAnalyze: (audioBase64: string, duration: number, mimeType: string) => void;
  isAnalyzing: boolean;
  onBack: () => void;
  text: AppText;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAnalyze, isAnalyzing, onBack, text }) => {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef(0);
  
  // Audio Visualization State
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(30).fill(5));
  
  // Analysis Progress State
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Store the active mime type for the current session
  const activeMimeTypeRef = useRef<string>("");

  const MAX_RECORDING_TIME = 300; // 5 minutes (reduced for reliability)
  const WARNING_TIME = 270; 

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  // Adaptive Progress Bar Logic
  useEffect(() => {
    let progressInterval: number;
    
    if (isAnalyzing) {
        setAnalysisProgress(0);
        setStatusMessage("Initializing...");
        
        // ADAPTIVE TIMING OPTIMIZATION:
        // Move faster through the initial stages to make the app feel responsive.
        const duration = timerRef.current || 30;
        let baseInterval = 300; // Default faster
        
        // Scale interval slightly for long files, but keep it snappy
        if (duration > 60) baseInterval = 600;
        else if (duration > 180) baseInterval = 900;
        
        // Very short audio should zip through
        if (duration < 15) baseInterval = 150;

        console.log(`Loading Bar Interval: ${baseInterval}ms for duration: ${duration}s`);

        progressInterval = window.setInterval(() => {
            setAnalysisProgress(prev => {
                // Aggressive increment until 80%
                const increment = prev < 60 ? 2 : prev < 85 ? 0.5 : 0.1;
                const next = prev + increment;
                
                if (next < 25) setStatusMessage("Uploading audio...");
                else if (next < 60) setStatusMessage("Transcribing speech...");
                else if (next < 85) setStatusMessage("Analyzing grammar & fluency...");
                else setStatusMessage("Finalizing report...");

                return next >= 95 ? 95 : next;
            });
        }, baseInterval);
    } else {
        setAnalysisProgress(0);
    }

    return () => clearInterval(progressInterval);
  }, [isAnalyzing]);

  const cleanupAudio = () => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e));
        }
        audioContextRef.current = null;
    }
  };

  // Helper to find the best supported MIME type
  // CRITICAL FIX: Prioritize 'audio/mp4' for Safari/iOS compatibility
  const getSupportedMimeType = () => {
      const types = [
          'audio/mp4',             // Best for Safari/iOS
          'audio/webm;codecs=opus', // Best for Chrome/Firefox
          'audio/webm',
          'audio/aac',
          'audio/ogg'
      ];
      for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return ''; 
  };

  const startRecording = async () => {
    setError(null);
    let stream: MediaStream | null = null;

    try {
      // STRATEGY: Progressive Constraints
      // 1. Try Optimized: 16kHz Mono (Smallest File)
      try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000, 
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            } 
          });
      } catch (optErr) {
          console.warn("Optimized audio constraints failed. Falling back to default.", optErr);
          // 2. Fallback: Default Device Settings (Higher compatibility)
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (!stream) throw new Error("Could not initialize audio stream");

      const selectedMimeType = getSupportedMimeType();
      if (!selectedMimeType) {
          setError("Your browser does not support audio recording.");
          return;
      }
      activeMimeTypeRef.current = selectedMimeType;
      console.log("Using MIME Type:", selectedMimeType);

      // Setup Visualizer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128; 
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateVisualizer = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const barCount = 30;
          const step = Math.floor((bufferLength * 0.7) / barCount); 
          const newVisuals = [];
          for(let i = 0; i < barCount; i++) {
              const val = dataArray[i * step];
              const height = Math.max(5, (val / 255) * 100); 
              newVisuals.push(height);
          }
          setVisualizerData(newVisuals);
          animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      
      updateVisualizer();

      // Recorder Setup
      // Note: We try to set bitrate, but wrap it as it crashes some Safaris
      let options: MediaRecorderOptions = { mimeType: selectedMimeType };
      try {
           // Try to compress if supported
           options.audioBitsPerSecond = 32000;
           // Test instantiation
           new MediaRecorder(stream, options); 
      } catch (e) {
           // If bitrate causes fail, reset options to just mimeType
           options = { mimeType: selectedMimeType };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
            const blob = new Blob(chunksRef.current, { type: selectedMimeType });
            
            // VALIDATION: Prevent empty uploads which hang the API
            if (blob.size < 100) {
                setError("Recording was empty or too short. Please try again.");
                return;
            }
            
            console.log(`Audio Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
    
            // Clean MIME type for API
            const safeMimeType = selectedMimeType.split(';')[0].trim();
    
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                if (reader.result) {
                    const base64String = (reader.result as string).split(',')[1];
                    onAnalyze(base64String, timerRef.current, safeMimeType);
                } else {
                    setError("Failed to process audio file.");
                }
            };
            reader.onerror = () => {
                setError("Error reading audio data.");
            };
        } catch (e) {
            console.error("Processing Error:", e);
            setError("An error occurred while processing the recording.");
        }
      };

      mediaRecorder.start(1000); 
      setRecording(true);
      setTimer(0);
      timerRef.current = 0;
      
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setTimer(prev => {
          const next = prev + 1;
          timerRef.current = next;
          if (next >= MAX_RECORDING_TIME) { 
            setTimeout(() => stopRecording(), 0);
            return MAX_RECORDING_TIME;
          }
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error("Recording Error:", err);
      setError("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e));
        }
        audioContextRef.current = null;
      }
      
      setVisualizerData(new Array(30).fill(5)); 

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const isWarningTime = timer >= WARNING_TIME;
  const remainingTime = MAX_RECORDING_TIME - timer;

  return (
    <div className="flex flex-col items-center justify-center py-6 md:py-12 animate-fade-in max-w-2xl mx-auto w-full px-4">
      {!isAnalyzing && (
          <button onClick={onBack} className="self-start text-gray-500 hover:text-white mb-6 flex items-center gap-2">
            ← {text.backToDash}
          </button>
      )}

      <div className="relative w-full max-w-lg mb-8 flex flex-col items-center justify-center">
        
        <div className={`z-10 bg-gray-900 w-56 h-56 md:w-64 md:h-64 rounded-full flex flex-col items-center justify-center border-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-colors duration-500 ${isWarningTime ? 'border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.3)]' : 'border-gray-800 shadow-[0_0_50px_rgba(0,68,255,0.15)]'}`}>
            <div className="relative z-20 flex flex-col items-center p-4 rounded-full">
                <div className={`text-4xl md:text-5xl font-mono font-bold mb-2 drop-shadow-md transition-colors ${isWarningTime ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {formatTime(timer)}
                </div>
                <p className="text-gray-500 text-xs md:text-sm uppercase tracking-widest drop-shadow-sm font-bold">
                    {recording ? text.recording : text.ready}
                </p>
                {!recording && !isAnalyzing && (
                    <span className="text-[10px] text-gray-500 mt-1 font-mono opacity-60">Max: 5m</span>
                )}
            </div>
        </div>
        
        {isWarningTime && recording && (
            <div className="mt-6 bg-red-900/20 border border-red-500/50 px-4 py-2 rounded-lg animate-pulse flex items-center gap-2 text-red-400">
                <span className="font-mono font-bold">Recording ends in {remainingTime}s</span>
            </div>
        )}

        <div className="mt-8 h-16 flex items-center justify-center gap-1.5 w-full max-w-sm px-4">
            {visualizerData.map((height, i) => (
                <div 
                    key={i}
                    className={`w-1.5 md:w-2 rounded-full transition-all duration-75 ease-linear ${isWarningTime ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ 
                        height: recording ? `${height}%` : '4px',
                        minHeight: '4px',
                        opacity: recording ? 0.8 : 0.2
                    }}
                ></div>
            ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 text-red-400 p-3 rounded-lg mb-6 text-sm border border-red-900 animate-pulse">
            {error}
        </div>
      )}

      {isAnalyzing ? (
        <div className="w-full max-w-md space-y-4">
            <div className="flex items-center justify-between text-blue-400 mb-2">
                <div className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-medium text-sm md:text-base">{text.analyzing}</span>
                </div>
                <span className="text-xs font-mono">{Math.round(analysisProgress)}%</span>
            </div>
            
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-700">
                <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-500 h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    style={{ width: `${analysisProgress}%` }}
                ></div>
            </div>
            
            <div className="text-center mt-3 space-y-1">
                <p className="text-blue-300 text-sm font-semibold animate-pulse">{statusMessage}</p>
                {(timerRef.current > 60) && (
                     <p className="text-gray-500 text-xs italic">{text.waitLong}</p>
                )}
            </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            {!recording ? (
                <button 
                    onClick={startRecording}
                    className="flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-lg shadow-blue-900/50 transition-all hover:scale-105 w-full md:w-auto"
                >
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                    {text.startRecording}
                </button>
            ) : (
                <button 
                    onClick={stopRecording}
                    className="flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gray-800 hover:bg-gray-700 text-white font-bold text-lg border-2 border-gray-600 transition-all hover:scale-105 w-full md:w-auto"
                >
                    <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
                    {text.stopRecording}
                </button>
            )}
        </div>
      )}

      <div className="mt-12 text-center max-w-md">
        <p className="text-gray-400 text-xs md:text-sm">{text.tip}</p>
      </div>
    </div>
  );
};

export default AudioRecorder;
