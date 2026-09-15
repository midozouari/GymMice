import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BADGES, CURRENT_STREAK } from '@/constants/mockData';
import { PALETTE_LIST, PaletteId } from '@/constants/palettes';
import TopBar from '@/components/TopBar';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 84) : insets.bottom;
  const [sub, setSub] = useState<null | 'palette'>(null);
  const { paletteId, setPaletteId } = theme;

  // Single source of truth — both header area and badge list use this same filtered set
  const earnedBadges = BADGES.filter(b => b.earned);

  if (sub === 'palette') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar title="Color Palette" onBack={() => setSub(null)} showBack />
        <ScrollView contentContainerStyle={[styles.paletteContent, { paddingBottom: botPad + 20 }]}>
          <Text style={[styles.paletteDesc, { color: theme.secondaryText }]}>Changes apply across the whole app instantly.</Text>
          {PALETTE_LIST.map(p => (
            <TouchableOpacity key={p.id} onPress={() => setPaletteId(p.id as PaletteId)} activeOpacity={0.8}
              style={[styles.paletteRow, { borderColor: paletteId === p.id ? theme.accent : theme.border, backgroundColor: paletteId === p.id ? theme.accent + '10' : theme.card }]}>
              <View style={styles.swatches}>
                <View style={[styles.swatch, { backgroundColor: (theme.isDark ? p.dark : p.light).primary }]} />
                <View style={[styles.swatch, { backgroundColor: (theme.isDark ? p.dark : p.light).accent }]} />
              </View>
              <Text style={[styles.paletteName, { color: paletteId === p.id ? theme.accent : theme.primaryText }]}>{p.label}</Text>
              {paletteId === p.id && <Feather name="check" size={18} color={theme.accent} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Notifications removed — access exists elsewhere in the app
  const SETTINGS = [
    { icon: 'sliders' as const, label: 'Color palette', action: () => setSub('palette') },
    { icon: 'lock' as const, label: 'Privacy', action: () => {} },
    { icon: 'settings' as const, label: 'Settings', action: () => {} },
    { icon: 'log-out' as const, label: 'Log out', action: () => router.replace('/signin'), danger: true },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: botPad + 90 }} showsVerticalScrollIndicator={false}>
        {/* Header spacer */}
        <View style={{ height: topPad + 8 }} />

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={[styles.bigAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.bigAvatarText}>M</Text>
          </View>
          <Text style={[styles.name, { color: theme.primaryText }]}>Mido</Text>
          <Text style={[styles.handle, { color: theme.mutedText }]}>@mido_lifts</Text>

          {/* Stats row — earned badge count consistent with badge list below */}
          <View style={styles.statsRow}>
            {[
              ['124', 'Followers'],
              ['87', 'Following'],
              [String(earnedBadges.length), 'Badges'],
            ].map(([n, l]) => (
              <View key={l} style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.primaryText }]}>{n}</Text>
                <Text style={[styles.statLbl, { color: theme.secondaryText }]}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Earned badge emoji strip — same source as badge list */}
          {earnedBadges.length > 0 && (
            <View style={styles.earnedStrip}>
              {earnedBadges.map(b => (
                <View key={b.days} style={[styles.earnedChip, { backgroundColor: b.bg, borderColor: b.color + '55' }]}>
                  <Text style={styles.earnedAnimal}>{b.animal}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.editBtn, { borderColor: theme.accent }]} activeOpacity={0.7}>
            <Text style={[styles.editBtnText, { color: theme.accent }]}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        {/* Streak & badges */}
        <View style={[styles.streakBanner, { backgroundColor: theme.accent }]}>
          <Feather name="zap" size={18} color="#fff" />
          <Text style={styles.streakText}>🔥  {CURRENT_STREAK}-day streak — keep going!</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>STREAK BADGES</Text>
          <View style={styles.badgeList}>
            {BADGES.map(b => (
              <View key={b.days} style={[styles.badgeCard, { backgroundColor: b.earned ? b.bg : theme.inputBackground, borderColor: b.earned ? b.color + '55' : theme.border, opacity: b.earned ? 1 : 0.55 }]}>
                <View style={[styles.badgeIcon, { backgroundColor: b.earned ? b.color + '22' : theme.border, borderColor: b.earned ? b.color : theme.mutedText }]}>
                  <Text style={styles.badgeAnimal}>{b.animal}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.badgeTopRow}>
                    <Text style={[styles.badgeDays, { color: b.earned ? b.color : theme.mutedText }]}>{b.days} DAY STREAK</Text>
                    <View style={[styles.badge, { backgroundColor: b.earned ? b.color : theme.mutedText }]}>
                      <Text style={styles.badgeLabel}>{b.earned ? 'EARNED' : 'LOCKED'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.badgeName, { color: b.earned ? theme.primaryText : theme.mutedText }]}>{b.name}</Text>
                  <Text style={[styles.badgeSub, { color: b.earned ? theme.secondaryText : theme.mutedText }]} numberOfLines={2}>{b.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.mutedText }]}>ACCOUNT</Text>
          <View style={styles.settingsList}>
            <View style={[styles.settingItem, { backgroundColor: theme.surface }]}>
              <View style={[styles.settingIconBg, { backgroundColor: theme.background }]}>
                <Feather name="moon" size={18} color={theme.primary} />
              </View>
              <Text style={[styles.settingLabel, { color: theme.primaryText }]}>Dark Mode</Text>
              <Switch
                style={{ marginLeft: 'auto' }}
                value={theme.isDark}
                onValueChange={(next) => theme.setMode(next ? 'dark' : 'light')}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
            {SETTINGS.map(item => (
              <TouchableOpacity key={item.label} onPress={item.action} style={[styles.settingItem, { backgroundColor: theme.surface }]} activeOpacity={0.7}>
                <View style={[styles.settingIconBg, { backgroundColor: item.danger ? theme.dangerBg : theme.background }]}>
                  <Feather name={item.icon} size={18} color={item.danger ? theme.danger : theme.primary} />
                </View>
                <Text style={[styles.settingLabel, { color: item.danger ? theme.danger : theme.primaryText }]}>{item.label}</Text>
                {!item.danger && <Feather name="chevron-right" size={18} color={theme.mutedText} style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { backgroundColor: '#fff', padding: 24, alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  bigAvatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  bigAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 32 },
  name: { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#1A1A2E' },
  handle: { fontSize: 14, color: '#9CA3AF', fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', gap: 32, marginVertical: 4 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#1A1A2E' },
  statLbl: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  earnedStrip: { flexDirection: 'row', gap: 8, marginVertical: 2 },
  earnedChip: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  earnedAnimal: { fontSize: 18 },
  editBtn: { paddingHorizontal: 40, paddingVertical: 10, borderRadius: 20, borderWidth: 2 },
  editBtnText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 20 },
  streakText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#9CA3AF', letterSpacing: 1, marginBottom: 12 },
  badgeList: { gap: 10 },
  badgeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  badgeIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, flexShrink: 0 },
  badgeAnimal: { fontSize: 28 },
  badgeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  badgeDays: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeLabel: { fontSize: 9, color: '#fff', fontFamily: 'Inter_700Bold' },
  badgeName: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  badgeSub: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  settingsList: { gap: 2 },
  settingItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, backgroundColor: '#fff', borderRadius: 12 },
  settingIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Palette sub-screen
  paletteContent: { padding: 20, gap: 12 },
  paletteDesc: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_400Regular' },
  paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, borderWidth: 2 },
  swatches: { flexDirection: 'row', gap: 6 },
  swatch: { width: 28, height: 28, borderRadius: 8 },
  paletteName: { flex: 1, fontSize: 15, fontFamily: 'Inter_700Bold' },
});
