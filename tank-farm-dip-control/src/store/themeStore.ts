import { create } from 'zustand';

type Theme = 'dark' | 'light';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('theme', theme);
  } catch {}
}

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const initial = getStoredTheme();
  applyTheme(initial);

  return {
    theme: initial,

    toggle: () => {
      set((state) => {
        const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        return { theme: next };
      });
    },
  };
});
