import React from 'react';
import { Button, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { PALETTES } from '@/constants/palettes';

function Consumer() {
  const theme = useTheme();
  return (
    <View>
      <Text testID="ready">{String(theme.isThemeReady)}</Text>
      <Text testID="palette">{theme.paletteId}</Text>
      <Text testID="mode">{theme.mode}</Text>
      <Text testID="dark">{String(theme.isDark)}</Text>
      <Text testID="background">{theme.background}</Text>
      <Text testID="bg">{theme.bg}</Text>
      <Button title="Pink palette" onPress={() => theme.setPaletteId('pink')} />
      <Button title="Dark mode" onPress={() => theme.setMode('dark')} />
      <Button title="Toggle mode" onPress={theme.toggleMode} />
    </View>
  );
}

const renderTheme = () => render(<ThemeProvider><Consumer /></ThemeProvider>);
const ready = () => waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('ThemeProvider', () => {
  it('uses the default light palette and becomes ready after reading storage', async () => {
    renderTheme();
    await ready();
    expect(screen.getByTestId('palette')).toHaveTextContent('default');
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
    expect(screen.getByTestId('background')).toHaveTextContent(PALETTES.default.light.background);
    expect(screen.getByTestId('bg')).toHaveTextContent(PALETTES.default.light.background);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@gymmice_palette');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@gymmice_theme_mode');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('stays unready until both persisted settings have loaded', async () => {
    let resolvePalette!: (value: string | null) => void;
    let resolveMode!: (value: string | null) => void;
    jest.mocked(AsyncStorage.getItem)
      .mockImplementationOnce(() => new Promise(resolve => { resolvePalette = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { resolveMode = resolve; }));
    renderTheme();
    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    await act(async () => { resolvePalette('midnight'); });
    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    await act(async () => { resolveMode('dark'); });
    await ready();
    expect(screen.getByTestId('palette')).toHaveTextContent('midnight');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
    expect(screen.getByTestId('background')).toHaveTextContent(PALETTES.midnight.dark.background);
    expect(screen.getByTestId('bg')).toHaveTextContent(PALETTES.midnight.dark.background);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('ignores invalid stored choices without overwriting them', async () => {
    await AsyncStorage.setItem('@gymmice_palette', 'not-a-palette');
    await AsyncStorage.setItem('@gymmice_theme_mode', 'not-a-mode');
    jest.clearAllMocks();
    renderTheme();
    await ready();
    expect(screen.getByTestId('palette')).toHaveTextContent('default');
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('updates, persists and restores independent palette and mode choices', async () => {
    const view = renderTheme();
    await ready();
    fireEvent.press(screen.getByText('Pink palette'));
    fireEvent.press(screen.getByText('Dark mode'));
    expect(screen.getByTestId('palette')).toHaveTextContent('pink');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('background')).toHaveTextContent(PALETTES.pink.dark.background);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gymmice_palette', 'pink');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@gymmice_theme_mode', 'dark');
    view.unmount();
    renderTheme();
    await ready();
    expect(screen.getByTestId('palette')).toHaveTextContent('pink');
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    fireEvent.press(screen.getByText('Toggle mode'));
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(screen.getByTestId('dark')).toHaveTextContent('false');
    expect(screen.getByTestId('bg')).toHaveTextContent(PALETTES.pink.light.background);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@gymmice_theme_mode', 'light');
    fireEvent.press(screen.getByText('Toggle mode'));
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('palette')).toHaveTextContent('pink');
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('@gymmice_theme_mode', 'dark');
  });
});