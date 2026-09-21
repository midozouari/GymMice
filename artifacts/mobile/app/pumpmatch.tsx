import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopBar from '@/components/TopBar';
import PumpMatchCard, { PumpMatchCardHandle, SwipeDirection } from '@/components/PumpMatchCard';
import { useTheme } from '@/context/ThemeContext';
import { computeCompatibility, PUMP_MATCH_PROFILES, PumpMatchProfile } from '@/constants/pumpMatchData';
import { ONBOARDING_STORAGE_KEY, OnboardingData } from '@/constants/onboardingData';

const STACK_DEPTH = 3; // how many cards are mounted at once (top + preloaded behind)
const MATCH_EVERY_N_SUPERS = 3; // deterministic: every 3rd right-swipe is a Pump Match

export default function PumpMatchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const [index, setIndex] = useState(0);
  const topCardRef = useRef<PumpMatchCardHandle>(null);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [superStreak, setSuperStreak] = useState(0);
  const [matchProfile, setMatchProfile] = useState<PumpMatchProfile | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setOnboarding(JSON.parse(raw)); } catch { /* ignore malformed cache */ }
      }
    });
  }, []);

  const deck = PUMP_MATCH_PROFILES;
  const visible = useMemo(
    () => Array.from({ length: STACK_DEPTH }, (_, i) => deck[(index + i) % deck.length]),
    [deck, index],
  );

  // Preload the photo of the card that will appear after the current one.
  useEffect(() => {
    const upcoming = deck[(index + 1) % deck.length];
    if (upcoming) Image.prefetch(upcoming.photos[0]);
  }, [deck, index]);

  const pulseScale = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const pulse = () => {
    pulseScale.value = withTiming(1.15, { duration: 100 }, () => {
      pulseScale.value = withSpring(1);
    });
  };

  const advance = () => {
    setIndex(i => i + 1);
    setExpanded(false); // next profile always starts collapsed
  };

  const handleSwipeComplete = (direction: SwipeDirection, profile: PumpMatchProfile) => {
    if (direction === 'super') {
      registerSuper(profile);
    } else {
      advance();
    }
  };

  const registerSuper = (profile: PumpMatchProfile) => {
    const nextStreak = superStreak + 1;
    if (nextStreak >= MATCH_EVERY_N_SUPERS) {
      setSuperStreak(0);
      setMatchProfile(profile);
      // Card is already advanced visually when we return from the match
      // overlay ("Keep matching"), so move the deck pointer now.
      advance();
    } else {
      setSuperStreak(nextStreak);
      advance();
    }
  };

  const handlePassBtn = () => { pulse(); topCardRef.current?.triggerSwipe('pass'); };
  const handleSuperBtn = () => { pulse(); topCardRef.current?.triggerSwipe('super'); };
  const handleInfoBtn = () => { pulse(); setExpanded(e => !e); };
  const handleStageLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setStageSize({ width, height });
  };
  const cardWidth = Math.max(0, stageSize.width - 16);
  const cardHeight = Math.max(0, stageSize.height - 6);

  const goToChat = (name: string) => {
    setMatchProfile(null);
    router.push({ pathname: '/chat/[name]', params: { name } });
  };

  if (matchProfile) {
    return (
      <View style={[styles.matchContainer, { backgroundColor: theme.navy, paddingBottom: botPad + 20 }]}>
        <Text style={styles.matchTitle}>It's a Pump Match! 💪</Text>
        <View style={styles.matchPhotosRow}>
          <View style={[styles.matchAvatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.matchAvatarText}>M</Text>
          </View>
          <View style={styles.matchLinkIcon}>
            <Feather name="zap" size={20} color={theme.accent} />
          </View>
          <Image source={{ uri: matchProfile.photos[0] }} style={styles.matchPhoto} contentFit="cover" />
        </View>
        <Text style={styles.matchSub}>You and {matchProfile.name} matched. Start training together!</Text>
        <TouchableOpacity
          style={[styles.matchMsgBtn, { backgroundColor: theme.accent }]}
          activeOpacity={0.85}
          onPress={() => goToChat(matchProfile.name)}
        >
          <Feather name="message-circle" size={18} color="#fff" />
          <Text style={styles.matchMsgBtnText}>Send message</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMatchProfile(null)}
          style={[styles.keepMatchBtn, { borderColor: 'rgba(255,255,255,0.3)' }]} activeOpacity={0.7}>
          <Text style={styles.keepMatchText}>Keep matching</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TopBar title="Pump Match 💪" showBack />
      <View style={styles.body}>
        <View style={styles.stage} onLayout={handleStageLayout}>
          {stageSize.width > 0 && visible.slice().reverse().map((profile, revIdx) => {
            // Keyed by *slot* (position in the stack), not by profile id —
            // the same card instance is reused as profiles cycle through a
            // slot, which is what lets the "next card" animate its scale up
            // smoothly (96% -> 100%) instead of popping in fresh each time.
            const slot = visible.length - 1 - revIdx;
            const stackOffset = slot;
            return (
              <PumpMatchCard
                key={`slot-${slot}`}
                ref={stackOffset === 0 ? topCardRef : undefined}
                profile={profile}
                compatibility={computeCompatibility(profile, onboarding)}
                isTop={stackOffset === 0}
                stackOffset={stackOffset}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                expanded={stackOffset === 0 && expanded}
                onSwipeComplete={(direction) => handleSwipeComplete(direction, profile)}
                onCollapse={() => setExpanded(false)}
              />
            );
          })}
        </View>

        {/* Icon-only bottom actions */}
        <Animated.View style={[styles.actions, pulseStyle]}>
          <TouchableOpacity onPress={handlePassBtn} style={[styles.passBtn, { backgroundColor: theme.surface }]} activeOpacity={0.8}>
            <Feather name="x" size={26} color={theme.danger} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInfoBtn} style={[styles.infoBtn, { borderColor: theme.navy, backgroundColor: expanded ? theme.navy : theme.surface }]} activeOpacity={0.8}>
            <Feather name="info" size={22} color={expanded ? '#fff' : theme.navy} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSuperBtn} style={[styles.superBtn, { backgroundColor: theme.accent }]} activeOpacity={0.85}>
            <Feather name="star" size={26} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 18, gap: 16 },
  stage: { flex: 1, width: '100%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 26 },
  passBtn: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, borderColor: '#F3D3D3', alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.1)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 } }) },
  infoBtn: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  superBtn: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 } }) },
  // Match screen
  matchContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  matchTitle: { fontSize: 28, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'center' },
  matchPhotosRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  matchAvatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  matchAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 34 },
  matchLinkIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  matchPhoto: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: '#fff' },
  matchSub: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: 'Inter_400Regular', lineHeight: 22 },
  matchMsgBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, marginTop: 8 },
  matchMsgBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  keepMatchBtn: { borderWidth: 2, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  keepMatchText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
});
