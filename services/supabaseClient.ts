
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqypxsarxehfgtslyzoy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeXB4c2FyeGVoZmd0c2x5em95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDk0MTIsImV4cCI6MjA3OTMyNTQxMn0.ejwhSuKBlNxyg2dk761vW9e1uNFRgoZGxcj2ogggS-4';

const memoryStorage = new Map<string, string>();

let currentLock: Promise<any> | null = null;
const memoryLock = async <R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
    let resolveLock: () => void;
    
    // Wait for the previous lock to finish
    while (currentLock) {
        await currentLock.catch(() => {});
    }
    
    // Set up the new lock
    const thisLock = new Promise<void>((resolve) => {
        resolveLock = resolve;
    });
    currentLock = thisLock;

    try {
        return await fn();
    } finally {
        currentLock = null;
        resolveLock!();
    }
};

const customStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // Ignore
    }
    return memoryStorage.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // Ignore
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      // Ignore
    }
    memoryStorage.delete(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    lock: memoryLock
  }
});
