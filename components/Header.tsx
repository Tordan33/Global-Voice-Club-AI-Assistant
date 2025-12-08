
import React from 'react';
import { AppText, Language } from '../types';

interface HeaderProps {
  user?: { name: string } | null;
  text: AppText;
  language: Language;
  version: string;
  onLogout?: () => void;
  onProfileClick?: () => void;
  onLogoClick?: () => void;
  onToggleLanguage: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, text, language, version, onLogout, onProfileClick, onLogoClick, onToggleLanguage }) => {
  return (
    <header className="w-full px-4 py-2 md:p-4 flex justify-between items-center border-b border-gray-800 bg-black sticky top-0 z-50 h-16 md:h-20 shadow-md">
      <div 
        className={`flex items-center gap-3 ${user ? 'cursor-pointer' : ''}`} 
        onClick={user ? onLogoClick : undefined}
      >
        <img 
          src="https://uqypxsarxehfgtslyzoy.supabase.co/storage/v1/object/public/Logo/amnaYA%20black.png" 
          alt="Amnaya Life Logo" 
          className="h-10 md:h-16 w-auto object-contain transition-all" 
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      
      <div className="flex items-center gap-3 md:gap-6">
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-600 font-mono">v{version}</span>
            {/* Language Toggle */}
            <button 
                onClick={onToggleLanguage}
                className="flex items-center gap-1 md:gap-2 bg-gray-900 border border-gray-700 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold text-gray-300 hover:text-white hover:border-gray-500 transition-all whitespace-nowrap"
            >
                <span>{language === 'en' ? '🇺🇸' : '🇹🇼'}</span>
                <span>{language === 'en' ? 'EN' : '繁中'}</span>
            </button>
        </div>

        {user && (
            <>
            <button 
                onClick={onProfileClick}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors group"
            >
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-blue-900 transition-colors text-blue-400 font-bold text-xs md:text-sm">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block">{text.profile}</span>
            </button>
            <div className="h-4 md:h-6 w-px bg-gray-800"></div>
            <button 
                onClick={onLogout}
                className="text-[10px] md:text-xs text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider"
            >
                {text.logout}
            </button>
            </>
        )}
      </div>
    </header>
  );
};

export default Header;