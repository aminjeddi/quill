import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Colors {
  background: string;
  primary: string;
  card: string;
  border: string;
  secondaryText: string;
  tertiaryText: string;
  separator: string;
  cardSelected: string;
  bodyText: string;
  placeholder: string;
  statusBar: 'light' | 'dark';
  disabled: string;
  inputBg: string;
  tabBarInactive: string;
}

export const lightColors: Colors = {
  background: '#fafaf8',
  primary: '#1a1a1a',
  card: '#fff',
  border: '#e5e5e5',
  secondaryText: '#999',
  tertiaryText: '#bbb',
  separator: '#f0f0ee',
  cardSelected: '#f5f5f3',
  bodyText: '#333',
  placeholder: '#bbb',
  statusBar: 'dark',
  disabled: '#ddd',
  inputBg: '#EBEBEB',
  tabBarInactive: '#999',
};

export const darkColors: Colors = {
  background: '#111110',
  primary: '#f0f0ee',
  card: '#1c1c1a',
  border: '#2a2a28',
  secondaryText: '#666',
  tertiaryText: '#444',
  separator: '#252523',
  cardSelected: '#252523',
  bodyText: '#b0b0ae',
  placeholder: '#3a3a38',
  statusBar: 'light',
  disabled: '#2e2e2c',
  inputBg: '#2a2a28',
  tabBarInactive: '#777',
};

interface ThemeContextType {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('quill_theme').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('quill_theme', newMode);
  };

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
