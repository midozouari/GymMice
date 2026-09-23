import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAPIConnectivity } from '@/context/APIConnectivityContext';
import { useTheme } from '@/context/ThemeContext';

export function APIStatusBar() {
  const { status, message, retry, isRetrying, canRetry } = useAPIConnectivity();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isProblem = status === 'offline' || status === 'unreachable' || status === 'misconfigured';

  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: isProblem ? theme.dangerBg : theme.surface,
          borderBottomColor: theme.border,
        },
      ]}
      testID="api-status"
    >
      <View style={styles.content}>
        {isRetrying && <ActivityIndicator size="small" color={theme.primary} testID="api-spinner" />}
        <Text
          style={[styles.message, { color: isProblem ? theme.danger : theme.secondaryText }]}
        >
          {message}
        </Text>
        {isProblem && canRetry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry API connection"
            disabled={!canRetry}
            onPress={retry}
            style={styles.retry}
            testID="api-retry"
          >
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    minHeight: 32,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  message: {
    flexShrink: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  retryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
});