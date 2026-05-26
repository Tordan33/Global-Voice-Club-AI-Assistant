
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppText } from '../types';

interface AudioRecorderProps {
  onAnalyze: (audioBase64: string, duration: number, mimeType: string) => Promise<void>;
  isAnalyzing: boolean;
  onBack: () => void;
  text: AppText;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onAnalyze, isAnalyzing, onBack, text }) => {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const timerRef = useRef(0);
  
  // Audio Visualization State
  const [visualizerData, setVisualizerData] = useState<number[]>(new Array(30).fill(5));
  
  // Analysis Progress State
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Watchdog Timer Ref
  const watchdogRef = useRef<number | null>(null);

  // We keep track of the stream to stop tracks later
  const streamRef = useRef<MediaStream | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Store the active mime type for the current session
  const activeMimeTypeRef = useRef<string>("");

  const MAX_RECORDING_TIME = 300; // 5 minutes
  const WARNING_TIME = 270; 
  // Frontend Watchdog: 100s. Backend tries to finish in 55s.
  const TIMEOUT_LIMIT_MS = 100000; 

  // --- 1. CLEANUP & LIFECYCLE MANAGEMENT ---
  
  const cleanupAudio = useCallback(() => {
    // Stop Timer
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    // Stop Visualizer
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    
    // Stop Tracks (Release Microphone) - ONLY on component unmount
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }

    // Close Context
    if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e));
        }
        audioContextRef.current = null;
    }
  }, []);

  // Run cleanup only when the component unmounts
  useEffect(() => {
    // Check permission status on mount
    const checkPermission = async () => {
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                if (status.state === 'granted') setHasPermission(true);
            }
        } catch (e) {
            // Permission API not supported or failed, ignore
        }
    };
    checkPermission();

    return () => {
      cleanupAudio();
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [cleanupAudio]);


  // --- 2. PREVENT ACCIDENTAL REFRESH / NAVIGATION ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (recording || isAnalyzing) {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires this
            return '';
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [recording, isAnalyzing]);

  // --- 3. iOS SAFARI VISIBILITY HANDLER ---
  useEffect(() => {
      const handleVisibilityChange = async () => {
          if (document.visibilityState === 'visible' && recording) {
              // Resume AudioContext if it was suspended by iOS
              if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                  try {
                      await audioContextRef.current.resume();
                      console.log("AudioContext resumed after visibility change");
                  } catch (e) {
                      console.warn("Failed to resume AudioContext", e);
                  }
              }
          }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [recording]);


  // --- 4. PROGRESS & WATCHDOG ---
  useEffect(() => {
    let progressInterval: number;
    
    if (isAnalyzing) {
        setAnalysisProgress(0);
        setStatusMessage("Initializing...");
        
        // WATCHDOG: Force kill if it takes too long
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        watchdogRef.current = window.setTimeout(() => {
            setError(JSON.stringify({
                uiMessage: "System Timeout: The analysis took too long.",
                debug: "Client-side Watchdog triggered (> 100s). Analysis timed out locally."
            }));
        }, TIMEOUT_LIMIT_MS);

        // SPEED TARGET: Aim for 60s completion visually
        const baseInterval = 500; 

        progressInterval = window.setInterval(() => {
            setAnalysisProgress(prev => {
                let increment = 1;
                // 0-30: Uploading
                // 30-70: Analyzing
                // 70-90: Finalizing
                
                if (prev < 30) increment = 2;
                else if (prev < 70) increment = 0.8;
                else if (prev < 90) increment = 0.3;
                else increment = 0.05; // Crawl

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
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
    }

    return () => {
        clearInterval(progressInterval);
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [isAnalyzing]);

  const getSupportedMimeType = () => {
      // Prioritize MP4/AAC for Safari compatibility, then WebM for Chrome/Android
      const types = [
          'audio/mp4',
          'audio/aac',
          'audio/webm;codecs=opus', 
          'audio/webm',
          'audio/ogg'
      ];
      for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return ''; 
  };

  // --- 5. RECORDING LOGIC ---

  const startRecording = async () => {
    setError(null);
    let rawStream: MediaStream | null = null;
    let recordingStream: MediaStream | null = null;

    try {
      // PERMISSION PERSISTENCE: Reuse existing stream if active
      if (streamRef.current && streamRef.current.active) {
          rawStream = streamRef.current;
      } else {
          // Request Permission only if stream is missing or inactive
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
              throw new Error("Your browser or the current environment does not support microphone access. If you are in a preview iframe, try opening the app in a new tab.");
          }
          rawStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                channelCount: 1, 
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
          });
          streamRef.current = rawStream;
          setHasPermission(true);
      }

      // 2. SOFTWARE RESAMPLING (16kHz Mono)
      try {
          // Reuse AudioContext if it exists, otherwise create new
          let ctx = audioContextRef.current;
          if (!ctx || ctx.state === 'closed') {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              ctx = new AudioContextClass({ sampleRate: 16000 });
              audioContextRef.current = ctx;
          }
          
          // CRITICAL IOS FIX: Resume context immediately
          if (ctx.state === 'suspended') {
              await ctx.resume();
          }
          
          const source = ctx.createMediaStreamSource(rawStream);
          const dest = ctx.createMediaStreamDestination();
          
          // Explicitly force mono on destination
          dest.channelCount = 1;
          
          source.connect(dest);
          
          sourceRef.current = source;
          recordingStream = dest.stream;
          
          // Re-create analyzer only if needed
          if (!analyserRef.current) {
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 128; 
              source.connect(analyser); 
              analyserRef.current = analyser;
          } else {
              source.connect(analyserRef.current);
          }
          
      } catch (e) {
          console.warn("Resampling failed, using raw stream.", e);
          recordingStream = rawStream;
      }

      // 3. Visualizer Loop
      const bufferLength = analyserRef.current?.frequencyBinCount || 0;
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
      if (analyserRef.current) updateVisualizer();

      // 4. MediaRecorder
      const selectedMimeType = getSupportedMimeType();
      activeMimeTypeRef.current = selectedMimeType;
      
      // 32kbps ensures better audio quality for AI analysis without bloating file size too much
      let options: MediaRecorderOptions = { 
          mimeType: selectedMimeType,
          audioBitsPerSecond: 32000 
      };
      
      try {
           new MediaRecorder(recordingStream!, options);
      } catch (e) {
           console.warn("Custom bitrate failed, using default.");
           options = { mimeType: selectedMimeType };
      }

      const mediaRecorder = new MediaRecorder(recordingStream!, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // --- STOP TIMER IMMEDIATELY ---
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }

        // DO NOT stop streamRef here. We want to keep the mic open for retries.
        // We only stop the visualizer loop to save CPU.
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        try {
            const blob = new Blob(chunksRef.current, { type: selectedMimeType });
            
            // Validation
            if (blob.size < 100) {
                setError("Recording was empty. Please check microphone.");
                return;
            }
            if (timerRef.current > MAX_RECORDING_TIME + 15) { 
                setError("Recording exceeded 5 minutes.");
                return;
            }
            
            console.log(`Blob: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ${timerRef.current}s`);
            
            // Clean MIME Type for Service
            const safeMimeType = selectedMimeType.split(';')[0].trim();
            
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            
            reader.onloadend = async () => {
                if (reader.result) {
                    const base64String = (reader.result as string).split(',')[1];
                    try {
                        await onAnalyze(base64String, timerRef.current, safeMimeType);
                    } catch (analysisErr: any) {
                        setError(analysisErr.message || "Analysis failed.");
                    }
                } else {
                    setError("Failed to process file.");
                }
            };
            reader.onerror = () => setError("Error reading data.");
        } catch (e) {
            setError("Processing error.");
        }
      };

      mediaRecorder.start(); 
      setRecording(true);
      setTimer(0);
      timerRef.current = 0;
      
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setTimer(prev => {
          const next = prev + 1;
          timerRef.current = next;
          if (next >= MAX_RECORDING_TIME) { 
            setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 0);
            return MAX_RECORDING_TIME;
          }
          return next;
        });
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err?.name === "NotAllowedError" ? "Microphone access denied. Please allow microphone permissions." : `Error: ${err?.message || "Could not access microphone."}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      // Cleanup of visualizer etc happens in onstop event handler
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

      {/* Permission Reminder */}
      {!recording && !isAnalyzing && !hasPermission && (
          <div className="mb-6 text-sm text-gray-400 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
             Tap Start to enable microphone
          </div>
      )}

      {error && (
        <div className="bg-red-900/40 text-red-300 p-4 rounded-lg mb-6 text-sm border border-red-800 animate-pulse max-w-md text-left w-full">
            <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="w-full">
                    {(() => {
                        try {
                            const errObj = JSON.parse(error);
                            return (
                                <>
                                    <strong className="block font-bold text-red-200 mb-1">Analysis Failed</strong>
                                    <p className="mb-2">{errObj.uiMessage}</p>
                                    <details className="mt-2 text-xs bg-black/40 rounded p-2 border border-red-900/50">
                                        <summary className="cursor-pointer font-mono text-red-400 hover:text-red-300 select-none">
                                            View Technical Details
                                        </summary>
                                        <div className="mt-2 font-mono whitespace-pre-wrap break-words opacity-80 overflow-x-auto">
                                            {errObj.debug}
                                        </div>
                                    </details>
                                </>
                            );
                        } catch (e) {
                            return (
                                <>
                                    <strong className="block font-bold text-red-200 mb-1">Error</strong>
                                    <p>{error}</p>
                                </>
                            );
                        }
                    })()}
                </div>
            </div>
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
