import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

/**
 * Theme state with data-theme attribute sync and localStorage persistence.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('omni_theme') as Theme) || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omni_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return { theme, setTheme, toggleTheme };
}
