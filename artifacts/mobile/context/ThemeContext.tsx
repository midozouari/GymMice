import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PALETTES, Palette, PaletteId, ThemeColors, ThemeMode } from '@/constants/palettes';

type ThemeContextType = ThemeColors & {
  // Back-compat alias — `bg` used to be the only "background" token.
  bg: string;
  paletteId: PaletteId;
  setPaletteId: (id: PaletteId) => void;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  /** True once the persisted palette + mode have been read from storage. */
  isThemeReady: boolean;
};

const DEFAULT_PALETTE: Palette = PALETTES.default;

function buildValue(
  paletteId: PaletteId,
  mode: ThemeMode,
  setPaletteId: (id: PaletteId) => void,
  setMode: (mode: ThemeMode) => void,
  toggleMode: () => void,
  isThemeReady: boolean,
): ThemeContextType {
  const palette = PALETTES[paletteId] ?? DEFAULT_PALETTE;
  const colors = mode === 'dark' ? palette.dark : palette.light;
  return {
    ...colors,
    bg: colors.background,
    paletteId,
    setPaletteId,
    mode,
    isDark: mode === 'dark',
    setMode,
    toggleMode,
    isThemeReady,
  };
}

const ThemeContext = createContext<ThemeContextType>(
  buildValue('default', 'light', () => {}, () => {}, () => {}, false),
);

const PALETTE_STORAGE_KEY = '@gymmice_palette';
const MODE_STORAGE_KEY = '@gymmice_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<PaletteId>('default');
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PALETTE_STORAGE_KEY),
      AsyncStorage.getItem(MODE_STORAGE_KEY),
    ]).then(([storedPalette, storedMode]) => {
      if (storedPalette && storedPalette in PALETTES) {
        setPaletteIdState(storedPalette as PaletteId);
      }
      if (storedMode === 'light' || storedMode === 'dark') {
        setModeState(storedMode);
      }
      setIsThemeReady(true);
    });
  }, []);

  const setPaletteId = useCallback((id: PaletteId) => {
    setPaletteIdState(id);
    AsyncStorage.setItem(PALETTE_STORAGE_KEY, id);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_STORAGE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(MODE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => buildValue(paletteId, mode, setPaletteId, setMode, toggleMode, isThemeReady),
    [paletteId, mode, setPaletteId, setMode, toggleMode, isThemeReady],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
