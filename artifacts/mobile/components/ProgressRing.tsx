import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0..1
  color: string;
  trackColor?: string;
  durationMs?: number;
  children?: React.ReactNode;
  // Change this value to replay the fill animation from 0 (e.g. on screen
  // focus). Left undefined, the ring just animates once on mount.
  resetKey?: number | string;
};

// Reusable animated circular progress ring built on react-native-svg (already
// a project dependency — no new charting library needed). Used for the
// Calories / Water / Steps rings on the Home dashboard, and reusable for any
// future ring-style metric (e.g. weekly volume %, recovery score).
export default function ProgressRing({
  size = 92,
  strokeWidth = 9,
  progress,
  color,
  trackColor,
  durationMs = 1100,
  children,
  resetKey,
}: ProgressRingProps) {
  const theme = useTheme();
  const resolvedTrackColor = trackColor ?? theme.chartTrack;

  const anim = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: clamped,
      duration: durationMs,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, durationMs, anim, resetKey]);

  const strokeDashoffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}, ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
