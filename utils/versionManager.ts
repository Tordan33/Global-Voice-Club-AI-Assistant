
/**
 * VERSION MANAGER
 * Responsible for ensuring the user is always running the latest deployed code.
 */

export const checkAndEnforceVersion = async () => {
  try {
    // 1. Fetch the hosted version.json
    // We append a timestamp (?t=...) to bypass the browser's HTTP cache for the JSON file itself.
    const response = await fetch(`/version.json?t=${new Date().getTime()}`, {
      cache: 'no-store',
      headers: {
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.warn("Could not fetch version manifest.");
      return;
    }

    const data = await response.json();
    const serverVersion = data.version;
    const localVersion = localStorage.getItem('app_version');

    console.log(`Version Check: Local [${localVersion}] vs Server [${serverVersion}]`);

    // 2. If it's the first time load, just store it and exit
    if (!localVersion) {
      localStorage.setItem('app_version', serverVersion);
      return;
    }

    // 3. Compare Versions
    if (serverVersion !== localVersion) {
      console.log('⚠️ New version detected. Initiating update sequence...');
      
      await performCleanupAndReload(serverVersion);
    }
  } catch (error) {
    console.error('Version check failed:', error);
  }
};

const performCleanupAndReload = async (newVersion: string) => {
  // A. Unregister Service Workers (The #1 cause of stale apps)
  // Wrapped in try/catch to fix "The document is in an invalid state" error
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('Service Worker unregistered.');
      }
    }
  } catch (e) {
    console.warn('Service Worker unregistration failed (non-critical):', e);
  }

  // B. Clear Browser Cache Storage (Assets, chunks, images)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          console.log(`Deleting cache: ${name}`);
          return caches.delete(name);
        })
      );
    } catch (e) {
      console.warn('Cache clearing failed:', e);
    }
  }

  // C. Clear Local Storage to prevent data conflicts
  // NOTE: We preserve "sb-" keys if you want to keep Supabase sessions alive.
  const sessionKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'));
  const sessionData: Record<string, string> = {};
  
  // Backup session
  sessionKeys.forEach(key => {
    sessionData[key] = localStorage.getItem(key) || '';
  });

  // Wipe
  localStorage.clear();
  sessionStorage.clear();

  // Restore session
  Object.keys(sessionData).forEach(key => {
    localStorage.setItem(key, sessionData[key]);
  });

  // Set the new version
  localStorage.setItem('app_version', newVersion);

  // D. Force Reload from Server (ignoring cache)
  console.log('Reloading application...');
  window.location.reload();
};
