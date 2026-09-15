import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';

export default function SplashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <LinearGradient
      colors={['#ffffff', theme.background]}
      style={[styles.container, { paddingTop: topPad, paddingBottom: botPad + 32 }]}
    >
      {/* Centered brand identity */}
      <View style={styles.centerBlock}>
        <Logo size="lg" />
        <Text style={[styles.tagline, { color: theme.secondaryText }]}>Train · Eat · Connect</Text>
      </View>

      {/* Single CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
        onPress={() => router.replace('/signin')}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Get Started</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  tagline: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'Inter_500Medium',
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
