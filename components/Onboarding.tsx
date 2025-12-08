
import React, { useState } from 'react';
import { AppText } from '../types';

interface OnboardingProps {
  onAuth: (email: string, password: string, name: string, mode: 'LOGIN' | 'SIGNUP') => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
  text: AppText;
}

const Onboarding: React.FC<OnboardingProps> = ({ onAuth, onResetPassword, text }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'SIGNUP' && (!name.trim() || !email.trim() || !password.trim())) return;
    if (mode === 'LOGIN' && (!email.trim() || !password.trim())) return;
    if (mode === 'FORGOT' && !email.trim()) return;
    
    setIsLoading(true);
    setError(null);

    try {
        if (mode === 'FORGOT') {
            await onResetPassword(email);
            setResetSent(true);
        } else {
            await onAuth(email, password, name, mode);
        }
    } catch (e: any) {
        // Suppress console.error here to avoid noise for expected errors
        
        const errorMessage = e.message || e.error_description || (typeof e === 'string' ? e : '');
        
        // Catch specific Supabase error strings for incorrect credentials
        if (errorMessage && (
            errorMessage.includes('Invalid login credentials') || 
            errorMessage.includes('invalid_grant') || 
            errorMessage.includes('Invalid email or password')
        )) {
            setError(text.invalidCredentials);
        } else {
            setError(errorMessage || text.genericAuthError);
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 animate-fade-in">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl text-center">
        <div className="mb-8 flex justify-center">
             <img 
                src="https://uqypxsarxehfgtslyzoy.supabase.co/storage/v1/object/public/Logo/amnaYA%20black.png" 
                alt="Global Voice Club" 
                className="h-32 w-auto object-contain"
             />
        </div>
        
        <h2 className="text-3xl font-serif mb-2 text-white">
            {mode === 'SIGNUP' ? text.joinClub : text.welcomeBack}
        </h2>
        <p className="text-gray-400 mb-8">
            {mode === 'SIGNUP' ? text.subtitleSignup : text.subtitleLogin}
        </p>

        {/* Tabs */}
        {mode !== 'FORGOT' && (
            <div className="flex p-1 bg-black rounded-lg mb-6 border border-gray-800">
                <button
                    onClick={() => { setMode('LOGIN'); setError(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        mode === 'LOGIN' 
                        ? 'bg-gray-800 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {text.signIn}
                </button>
                <button
                    onClick={() => { setMode('SIGNUP'); setError(null); }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        mode === 'SIGNUP' 
                        ? 'bg-gray-800 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    {text.signUp}
                </button>
            </div>
        )}

        {/* Error Message Pop-up/Box */}
        {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-200 text-sm p-4 rounded-lg mb-6 flex items-start gap-3 text-left animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {mode === 'SIGNUP' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-400 mb-1">{text.name}</label>
                <input
                  type="text"
                  required={mode === 'SIGNUP'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors placeholder-gray-600"
                  placeholder={text.name}
                />
              </div>
          )}
          
          {!resetSent ? (
              <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{text.email}</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors placeholder-gray-600"
                      placeholder={mode === 'FORGOT' ? text.enterEmailForRecovery : text.email}
                    />
                  </div>

                  {mode !== 'FORGOT' && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-400">{text.password}</label>
                            {mode === 'LOGIN' && (
                                <button type="button" onClick={() => { setMode('FORGOT'); setError(null); }} className="text-xs text-blue-400 hover:text-blue-300">
                                    {text.forgotPassword}
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors placeholder-gray-600 pr-12"
                              placeholder={mode === 'SIGNUP' ? text.createPassword : text.enterPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                      </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 disabled:cursor-wait text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] mt-4 shadow-lg shadow-blue-900/20 flex justify-center items-center"
                  >
                    {isLoading ? (
                         <div className="flex items-center gap-2">
                             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{text.sending}</span>
                         </div>
                    ) : (
                        mode === 'SIGNUP' ? text.startPracticing : mode === 'FORGOT' ? text.sendRecoveryLink : text.resumeJourney
                    )}
                  </button>
              </>
          ) : (
              <div className="text-center py-6 animate-fade-in">
                  <div className="text-green-500 text-5xl mb-4">✓</div>
                  <h3 className="text-xl font-bold text-white mb-2">{text.recoveryEmailSent}</h3>
                  <p className="text-gray-400 mb-6">Check your inbox for instructions.</p>
                  <button onClick={() => { setMode('LOGIN'); setResetSent(false); setError(null); }} className="text-blue-400 hover:text-blue-300 underline">
                      {text.backToLogin}
                  </button>
              </div>
          )}
          
          {mode === 'FORGOT' && !resetSent && (
             <button type="button" onClick={() => { setMode('LOGIN'); setError(null); }} className="w-full text-center text-sm text-gray-500 hover:text-gray-300 mt-2">
                {text.backToLogin}
             </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
