import React from 'react';

export type SettingsState = {
  hospitalName: string;
};

const STORAGE_KEY = 'app_settings';

function loadSettings(): SettingsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SettingsState;
  } catch {}
  return { hospitalName: 'Hospital Name' };
}

function saveSettings(next: SettingsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export const SettingsContext = React.createContext<{
  settings: SettingsState;
  setSettings: (s: SettingsState) => void;
}>({
  settings: { hospitalName: 'Hospital Name' },
  setSettings: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = React.useState<SettingsState>(() => loadSettings());

  const setSettings = React.useCallback((next: SettingsState) => {
    setSettingsState(next);
    saveSettings(next);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  return React.useContext(SettingsContext);
}
