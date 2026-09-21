import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { PumpMatchProfile } from '@/constants/pumpMatchData';

const SWIPE_THRESHOLD_RATIO = 0.28;
// How much of the card the info sheet covers, collapsed vs. fully expanded —
// the photo always stays mounted underneath at full size; the sheet simply
// grows upward over it (a real resize/remount would cause flicker & jumps).
const SHEET_COLLAPSED_RATIO = 0.34;
const SHEET_EXPANDED_RATIO = 0.87;

export type SwipeDirection = 'pass' | 'super';

type Props = {
  profile: PumpMatchProfile;
  compatibility: number;
  isTop: boolean;
  stackOffset: number; // 0 = active card, 1 = next up, 2 = further back
  cardWidth: number;
  cardHeight: number;
  expanded: boolean;
  onSwipeComplete: (direction: SwipeDirection) => void;
  onCollapse: () => void;
};

export type PumpMatchCardHandle = {
  triggerSwipe: (direction: SwipeDirection) => void;
};

const PumpMatchCard = forwardRef<PumpMatchCardHandle, Props>(function PumpMatchCard(
  { profile, compatibility, isTop, stackOffset, cardWidth, cardHeight, expanded, onSwipeComplete, onCollapse },
  ref,
) {
  const theme = useTheme();
  const [photoIndex, setPhotoIndex] = useState(0);
  const swipeThreshold = cardWidth * SWIPE_THRESHOLD_RATIO;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const stackPos = useSharedValue(stackOffset);
  const expandProgress = useSharedValue(expanded ? 1 : 0);

  // Position in the deck (0 = active) is animated, not snapped — this is what
  // produces the "next card scales from ~96% to 100% as it becomes active"
  // effect instead of an abrupt jump when the top card is swiped away.
  useEffect(() => {
    stackPos.value = withTiming(stackOffset, { duration: 260 });
  }, [stackOffset]);

  useEffect(() => {
    expandProgress.value = withTiming(expanded ? 1 : 0, { duration: 300 });
  }, [expanded]);

  // A fresh profile has landed in this deck slot (e.g. this card just became
  // the bottom of the stack again after the old top card was swiped away) —
  // snap back to a clean, collapsed, first-photo state immediately, with no
  // animation, so nothing "flies in" from an old position.
  useEffect(() => {
    setPhotoIndex(0);
    translateX.value = 0;
    translateY.value = 0;
  }, [profile.id]);

  useEffect(() => {
    const next = profile.photos[photoIndex + 1];
    if (next) Image.prefetch(next);
  }, [profile, photoIndex]);

  const goToPhoto = (dir: 'prev' | 'next') => {
    setPhotoIndex(i => {
      if (dir === 'next') return Math.min(profile.photos.length - 1, i + 1);
      return Math.max(0, i - 1);
    });
  };

  const finishSwipe = (direction: SwipeDirection) => {
    onSwipeComplete(direction);
  };

  const triggerSwipe = (direction: SwipeDirection) => {
    translateX.value = withTiming(direction === 'super' ? cardWidth * 1.6 : -cardWidth * 1.6, { duration: 260 });
    translateY.value = withTiming(translateY.value + 30, { duration: 260 }, () => {
      runOnJS(finishSwipe)(direction);
    });
  };

  useImperativeHandle(ref, () => ({ triggerSwipe }), [profile.id, cardWidth]);

  // Horizontal swipe is the primary gesture and must keep working even while
  // the info sheet is expanded and scrolled — activeOffsetX claims clearly
  // horizontal drags immediately, while failOffsetY releases clearly
  // vertical drags to the nested ScrollView instead of fighting it.
  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-8, 8])
    .failOffsetY([-30, 30])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.35;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > swipeThreshold) {
        const direction: SwipeDirection = e.translationX > 0 ? 'super' : 'pass';
        translateX.value = withTiming(direction === 'super' ? cardWidth * 1.6 : -cardWidth * 1.6, { duration: 220 });
        translateY.value = withTiming(translateY.value + 20, { duration: 220 }, () => {
          runOnJS(finishSwipe)(direction);
        });
      } else {
        translateX.value = withSpring(0, { damping: 16 });
        translateY.value = withSpring(0, { damping: 16 });
      }
    });

  // Tap-to-browse-photos only fires above the exposed photo area (i.e. not
  // over the info sheet), so it never steals taps meant for the sheet's
  // scrollable content or the drag handle.
  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .maxDistance(10)
    .onEnd((e) => {
      'worklet';
      const sheetRatio = interpolate(expandProgress.value, [0, 1], [SHEET_COLLAPSED_RATIO, SHEET_EXPANDED_RATIO]);
      const photoBoundary = cardHeight * (1 - sheetRatio);
      if (e.y >= photoBoundary) return;
      const isLeftHalf = e.x < cardWidth / 2;
      runOnJS(goToPhoto)(isLeftHalf ? 'prev' : 'next');
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Dragging the sheet's grab handle downward collapses it back to the
  // default swiping view — independent of the main card gesture, since it's
  // its own small nested detector.
  const handleGesture = Gesture.Pan()
    .enabled(isTop && expanded)
    .onEnd((e) => {
      if (e.translationY > 36 || e.velocityY > 600) {
        runOnJS(onCollapse)();
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-cardWidth, 0, cardWidth], [-10, 0, 10], Extrapolation.CLAMP);
    const scale = interpolate(stackPos.value, [0, 1, 2], [1, 0.96, 0.93], Extrapolation.CLAMP);
    const topOffset = interpolate(stackPos.value, [0, 1, 2], [0, 10, 18], Extrapolation.CLAMP);
    const opacity = interpolate(stackPos.value, [0, 1, 2, 2.4], [1, 1, 1, 0], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + topOffset },
        { rotate: `${rotate}deg` },
        { scale },
      ],
      opacity,
    };
  });

  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, -20, 0], [0.9, 0.35, 0], Extrapolation.CLAMP),
  }));
  const superOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 20, swipeThreshold], [0, 0.35, 0.9], Extrapolation.CLAMP),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-swipeThreshold, -30, 0], [1, 0.6, 0], Extrapolation.CLAMP),
  }));
  const superStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, 30, swipeThreshold], [0, 0.6, 1], Extrapolation.CLAMP),
  }));

  const sheetStyle = useAnimatedStyle(() => {
    const ratio = interpolate(expandProgress.value, [0, 1], [SHEET_COLLAPSED_RATIO, SHEET_EXPANDED_RATIO]);
    return { height: cardHeight * ratio };
  });
  const collapsedInfoStyle = useAnimatedStyle(() => ({ opacity: interpolate(expandProgress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP) }));
  const expandedInfoStyle = useAnimatedStyle(() => ({ opacity: interpolate(expandProgress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP) }));
  const gradientStyle = useAnimatedStyle(() => ({ opacity: interpolate(expandProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP) }));
  const solidSheetStyle = useAnimatedStyle(() => ({ opacity: interpolate(expandProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP) }));

  const photo = profile.photos[photoIndex];

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[styles.card, cardStyle, { width: cardWidth, height: cardHeight, zIndex: 100 - stackOffset }]}
        pointerEvents={isTop ? 'auto' : 'none'}
      >
        <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" transition={150} />

        {/* Instagram-style photo progress segments */}
        <View style={styles.progressRow} pointerEvents="none">
          {profile.photos.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <View style={[styles.progressFill, { opacity: i <= photoIndex ? 1 : 0.35 }]} />
            </View>
          ))}
        </View>

        {/* Directional swipe tint */}
        <Animated.View style={[styles.overlayTint, { backgroundColor: theme.danger }, passOverlayStyle]} pointerEvents="none" />
        <Animated.View style={[styles.overlayTint, { backgroundColor: theme.success }, superOverlayStyle]} pointerEvents="none" />

        <Animated.View style={[styles.stamp, styles.stampLeft, { borderColor: theme.danger }, passStampStyle]} pointerEvents="none">
          <Feather name="x" size={30} color={theme.danger} />
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampRight, { borderColor: theme.success }, superStampStyle]} pointerEvents="none">
          <Feather name="star" size={30} color={theme.success} />
        </Animated.View>

        {/* Info sheet: grows upward over the photo when expanded */}
        <Animated.View style={[styles.sheet, sheetStyle]}>
          {/* Collapsed look: gradient + minimal info, fades out as it expands */}
          <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]} pointerEvents={expanded ? 'none' : 'auto'}>
            <LinearGradient colors={['transparent', 'rgba(6,6,14,0.92)']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.collapsedInfo, collapsedInfoStyle]}>
              <CollapsedHeader profile={profile} compatibility={compatibility} theme={theme} />
              <View style={styles.badgeRow}>
                <Badge label={profile.goal} />
                <Badge label={profile.experience} />
                <Badge label={`${profile.heightCm} cm`} />
              </View>
            </Animated.View>
          </Animated.View>

          {/* Expanded look: opaque scrollable detail panel, fades in */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.expandedPanel, solidSheetStyle]}
            pointerEvents={expanded ? 'auto' : 'none'}
          >
            <GestureDetector gesture={handleGesture}>
              <View style={styles.grabHandleZone}>
                <View style={styles.grabHandle} />
              </View>
            </GestureDetector>
            <Animated.View style={expandedInfoStyle}>
              <ScrollView
                style={{ height: cardHeight * SHEET_EXPANDED_RATIO - 26 }}
                contentContainerStyle={styles.expandedScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <CollapsedHeader profile={profile} compatibility={compatibility} theme={theme} dark />
                <View style={styles.badgeRow}>
                  <Badge label={profile.goal} dark />
                  <Badge label={profile.experience} dark />
                  <Badge label={`${profile.heightCm} cm`} dark />
                </View>

                <View style={[styles.compatPill, { backgroundColor: theme.accent, alignSelf: 'flex-start' }]}>
                  <Feather name="zap" size={12} color="#fff" />
                  <Text style={styles.compatText}>{compatibility}% Compatible</Text>
                </View>

                <Section title="About Me"><Text style={styles.paragraph}>{profile.bio}</Text></Section>

                <Section title="Interests">
                  <View style={styles.chipRow}>
                    {profile.interests.map(i => <Chip key={i} label={i} />)}
                    <Chip label={profile.musicTaste} />
                  </View>
                </Section>

                <Section title="Looking For">
                  <View style={styles.chipRow}>
                    {profile.lookingFor.map(l => <Chip key={l} label={l} accent theme={theme} />)}
                  </View>
                </Section>

                <Section title="Gym Preferences">
                  <PrefRow icon="activity" label="Sport" value={profile.sport} />
                  <PrefRow icon="repeat" label="Preferred split" value={profile.preferredSplit} />
                  <PrefRow icon="map-pin" label="Gym" value={profile.preferredGym} />
                  <PrefRow icon="clock" label="Training time" value={profile.trainingTime} />
                  <PrefRow icon="zap" label="Workout intensity" value={profile.workoutIntensity} last />
                </Section>

                {profile.photos.length > 1 && (
                  <Section title="Photos">
                    <View style={styles.photoThumbRow}>
                      {profile.photos.map((p, i) => (
                        <ThumbTap key={p} uri={p} active={i === photoIndex} onPress={() => setPhotoIndex(i)} />
                      ))}
                    </View>
                  </Section>
                )}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

export default PumpMatchCard;

function CollapsedHeader({ profile, compatibility, theme, dark }: { profile: PumpMatchProfile; compatibility: number; theme: any; dark?: boolean }) {
  return (
    <View>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
        <Text style={styles.age}>{profile.age}</Text>
        {profile.verified && <Feather name="check-circle" size={18} color="#4FC3F7" style={{ marginLeft: 2 }} />}
        {!dark && (
          <View style={[styles.compatPillInline, { backgroundColor: theme.accent }]}>
            <Text style={styles.compatTextSmall}>{compatibility}%</Text>
          </View>
        )}
      </View>
      <View style={styles.locRow}>
        <Feather name="map-pin" size={13} color="rgba(255,255,255,0.75)" />
        <Text style={styles.locText}>{profile.city}, {profile.country}</Text>
      </View>
    </View>
  );
}

function ThumbTap({ uri, active, onPress }: { uri: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.thumbWrap, active && styles.thumbActive]}>
      <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Badge({ label, dark }: { label: string; dark?: boolean }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

function Chip({ label, accent, theme }: { label: string; accent?: boolean; theme?: any }) {
  return (
    <View style={[styles.chip, accent && { backgroundColor: 'rgba(51,179,106,0.18)' }]}>
      <Text style={[styles.chipText, accent && { color: '#5FDB93' }]}>{label}</Text>
    </View>
  );
}

function PrefRow({ icon, label, value, last }: { icon: keyof typeof Feather.glyphMap; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.prefRow, last && { borderBottomWidth: 0 }]}>
      <Feather name={icon} size={15} color="rgba(255,255,255,0.55)" style={{ width: 22 }} />
      <Text style={styles.prefLabel}>{label}</Text>
      <Text style={styles.prefValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0A0A12',
    ...Platform.select({
      web: { boxShadow: '0px 14px 24px rgba(0, 0, 0, 0.28)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.28,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  photo: { ...StyleSheet.absoluteFill },
  progressRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', gap: 4 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  progressFill: { flex: 1, backgroundColor: '#fff' },
  overlayTint: { ...StyleSheet.absoluteFill },
  stamp: { position: 'absolute', top: 46, width: 56, height: 56, borderRadius: 28, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,20,0.55)' },
  stampLeft: { left: 22, transform: [{ rotate: '-14deg' }] },
  stampRight: { right: 22, transform: [{ rotate: '14deg' }] },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  collapsedInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 30, gap: 8 },
  expandedPanel: {
    backgroundColor: '#0E0E18',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: '0px -6px 12px rgba(0, 0, 0, 0.3)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
    }),
  },
  grabHandleZone: { alignItems: 'center', paddingVertical: 10 },
  grabHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  expandedScrollContent: { paddingHorizontal: 18, paddingBottom: 26, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontSize: 23, fontFamily: 'Inter_700Bold', flexShrink: 1 },
  age: { color: 'rgba(255,255,255,0.85)', fontSize: 17, fontFamily: 'Inter_500Medium' },
  compatPillInline: { marginLeft: 'auto', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  compatTextSmall: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  locText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.14)' },
  badgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  compatPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginTop: 10 },
  compatText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  section: { marginTop: 18, gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.5 },
  paragraph: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter_400Regular', lineHeight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)' },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  prefLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_500Medium' },
  prefValue: { fontSize: 13, color: '#fff', fontFamily: 'Inter_600SemiBold', textAlign: 'right', flexShrink: 1 },
  photoThumbRow: { flexDirection: 'row', gap: 8 },
  thumbWrap: { width: 56, height: 74, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: '#fff' },
  thumb: { width: '100%', height: '100%' },
});
