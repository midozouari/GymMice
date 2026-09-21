import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { ExerciseProgress } from '@/constants/analyticsData';

import { AnimatedPolyline } from './AnimatedSvg';

const CHART_WIDTH = 300;
const CHART_HEIGHT = 100;
const PADDING = 8;

type ExerciseProgressChartProps = {
  exercise: ExerciseProgress;
  color: string;
};

// Line chart for a single exercise's history, built on react-native-svg (same
// approach as the Home dashboard's "Session Progress" preview) — no new
// charting library required. PR weeks are marked with a filled dot.
export default function ExerciseProgressChart({ exercise, color }: ExerciseProgressChartProps) {
  const theme = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: false }).start();
  }, [exercise.name, anim]);

  const weights = exercise.points.map(p => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(max - min, 1);
  const stepX = (CHART_WIDTH - PADDING * 2) / (exercise.points.length - 1);

  const coords = exercise.points.map((p, i) => {
    const x = PADDING + i * stepX;
    const y = PADDING + (1 - (p.weight - min) / range) * (CHART_HEIGHT - PADDING * 2);
    return { x, y, isPR: p.isPR };
  });
  const fullPoints = coords.map(c => `${c.x},${c.y}`).join(' ');

  const trend = exercise.current - exercise.points[0].weight;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.name, { color: theme.primaryText }]}>{exercise.name}</Text>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>
            Current <Text style={{ color, fontFamily: 'Inter_700Bold' }}>{exercise.current}kg</Text>
            {'  ·  '}PR <Text style={{ color: theme.chartPR, fontFamily: 'Inter_700Bold' }}>{exercise.personalRecord}kg</Text>
          </Text>
        </View>
        <View style={[styles.trendPill, { backgroundColor: trend >= 0 ? theme.chartPositiveBg : theme.chartNegativeBg }]}>
          <Text style={[styles.trendText, { color: trend >= 0 ? theme.chartPositive : theme.chartNegative }]}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}kg
          </Text>
        </View>
      </View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none">
        <Line x1={PADDING} y1={CHART_HEIGHT - PADDING} x2={CHART_WIDTH - PADDING} y2={CHART_HEIGHT - PADDING} stroke={theme.chartGrid} strokeWidth={1} />
        <AnimatedPolyline
          points={fullPoints}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[1000, 1000] as any}
          strokeDashoffset={anim.interpolate({ inputRange: [0, 1], outputRange: [1000, 0] })}
        />
        {coords.filter(c => c.isPR).map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3.5} fill={theme.chartPR} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  name: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  trendPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  trendText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
});
