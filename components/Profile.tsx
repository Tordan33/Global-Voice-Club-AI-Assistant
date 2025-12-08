
import React, { useState } from 'react';
import { UserProfile, AIAnalysis, AppText } from '../types';

interface ProfileProps {
  user: UserProfile;
  history: AIAnalysis[];
  onUpdateProfile: (name: string, currentPassword?: string, newPassword?: string) => Promise<void>;
  onBack: () => void;
  text: AppText;
  isRecoveryMode?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, history, onUpdateProfile, onBack, text, isRecoveryMode = false }) => {
  const [name, setName] = useState(user.name);
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Password Validation
    const isChangingPassword = newPassword.trim().length > 0;
    
    if (isChangingPassword) {
        // In recovery mode, we don't need current password
        if (!isRecoveryMode && !currentPassword) {
            setMessage("Error: Please enter your current password to confirm changes.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setMessage("Error: New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setMessage("Error: Password must be at least 6 characters.");
            return;
        }
    }

    setIsSaving(true);
    try {
        await onUpdateProfile(name, isChangingPassword ? currentPassword : undefined, isChangingPassword ? newPassword : undefined);
        setMessage('Profile updated successfully!');
        
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
        setMessage(`Error: ${e.message || "Failed to update profile"}`);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in pb-12">
      <button onClick={onBack} className="text-gray-500 hover:text-white mb-8 flex items-center gap-2">
        ← {text.backToDash}
      </button>

      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-lg mb-8">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h2 className="text-2xl font-serif text-white">{text.myProfile}</h2>
                <p className="text-gray-500">{user.email}</p>
                {isRecoveryMode && (
                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded border border-yellow-800">
                        Password Reset Mode
                    </span>
                )}
            </div>
        </div>

        {message && (
            <div className={`mb-6 p-3 border rounded-lg text-sm text-center ${message.includes('Error') ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-green-900/30 border-green-800 text-green-400'}`}>
                {message}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">{text.fullName}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="pt-6 border-t border-gray-800">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">{text.changePassword}</h3>
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-300"
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
             
             {!isRecoveryMode && (
                <p className="text-sm text-gray-500 mb-4">
                    {text.passwordRequirement}
                </p>
             )}
             
             <div className="space-y-4">
                 {!isRecoveryMode && (
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{text.currentPassword}</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors"
                    />
                 </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{text.newPassword}</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">{text.confirmNewPassword}</label>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-600 transition-colors"
                        />
                     </div>
                 </div>
             </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-wait text-white px-6 py-3 rounded-lg font-medium transition-all w-full md:w-auto mt-4"
          >
            {isSaving ? text.saving : text.saveChanges}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
