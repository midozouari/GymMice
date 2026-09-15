import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  showBack?: boolean;
};

export default function TopBar({ title, onBack, right, showBack = true }: Props) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;

  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={[styles.container, { paddingTop: topPad + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={styles.inner}>
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { borderColor: theme.border }]} activeOpacity={0.7}>
              <Feather name="arrow-left" size={20} color={theme.primaryText} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.title, { color: theme.primaryText }]} numberOfLines={1}>{title}</Text>
        <View style={styles.side}>{right ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  side: { width: 44, alignItems: 'flex-start' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
