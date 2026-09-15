import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

type Props = { size?: 'sm' | 'md' | 'lg' };

const SIZES = {
  sm: { icon: 18, gymFont: 16, miceFont: 16, gap: 4 },
  md: { icon: 24, gymFont: 22, miceFont: 22, gap: 6 },
  lg: { icon: 32, gymFont: 30, miceFont: 30, gap: 8 },
};

export default function Logo({ size = 'md' }: Props) {
  const { primary, accent } = useTheme();
  const s = SIZES[size];

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name="dumbbell" size={s.icon} color={primary} />
      <View style={[styles.textRow, { marginLeft: s.gap }]}>
        <Text style={[styles.gym, { fontSize: s.gymFont, color: primary }]}>GYM</Text>
        <Text style={[styles.mice, { fontSize: s.miceFont, color: accent }]}>MICE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  textRow: { flexDirection: 'row', alignItems: 'baseline' },
  gym: { fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  mice: { fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
});
