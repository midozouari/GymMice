import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';
import { PALETTE_LIST, PaletteId } from '@/constants/palettes';
import { EMPTY_ONBOARDING_DATA, ONBOARDING_STORAGE_KEY, OnboardingData, SPORT_SELECTOR_TRIGGER, SPORTS } from '@/constants/onboardingData';

const TOTAL_STEPS = 5;

const EXERCISES = ['Weight training', 'Cardio', 'Bodyweight', 'HIIT', 'Yoga', 'Swimming'];
const GOALS = ['Lean', 'Muscular', 'Toned', 'Maintain'];
const GOAL_EMOJIS: Record<string, string> = { Lean: '🏃', Muscular: '💪', Toned: '⚡', Maintain: '🧘' };
const DESCRIBES = ['Athlete', 'Student', 'Working adult'];

export default function OnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const [step, setStep] = useState(1);
  const [gender, setGender] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [describe, setDescribe] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [sportSearch, setSportSearch] = useState('');
  const [gymExperience, setGymExperience] = useState('');
  const [prefs, setPrefs] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  const [goal, setGoal] = useState('');
  const [chronicIllnesses, setChronicIllnesses] = useState('');
  const [dreamPhysiqueUri, setDreamPhysiqueUri] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { paletteId, setPaletteId } = theme;

  // Refs for focus chaining in step 1
  const weightRef = useRef<TextInput>(null);
  // Ref for auto-scrolling the body when a field near the bottom (e.g. step 4's
  // chronic-illness input) gets focused, so the keyboard doesn't cover it.
  const scrollRef = useRef<ScrollView>(null);

  const progress = (step / TOTAL_STEPS) * 100;

  const togglePref = (e: string) =>
    setPrefs(p => (p.includes(e) ? p.filter(x => x !== e) : [...p, e]));

  // Load any onboarding progress saved from a previous session (e.g. app was
  // closed mid-flow, or the user is revisiting after completing it once).
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved: OnboardingData = JSON.parse(raw);
          setGender(saved.gender ?? '');
          setHeightCm(saved.heightCm ?? '');
          setWeightKg(saved.weightKg ?? '');
          setDescribe(saved.describe ?? '');
          setSelectedSport(saved.selectedSport ?? '');
          setGymExperience(saved.gymExperience ?? '');
          setPrefs(saved.exercisePrefs ?? []);
          setDays(saved.daysPerWeek ?? 3);
          setGoal(saved.goal ?? '');
          setChronicIllnesses(saved.chronicIllnesses ?? '');
          setDreamPhysiqueUri(saved.dreamPhysiqueUri ?? null);
        } catch {
          // Corrupt/old data shape — ignore and start fresh rather than crash.
        }
      }
      setHydrated(true);
    });
  }, []);

  // Persist onboarding progress after hydration, on every change, so
  // closing/reopening the app (or navigating back and forth between steps)
  // never loses an answer. This is the same AsyncStorage approach already
  // used for the theme palette and schedule data elsewhere in the app.
  useEffect(() => {
    if (!hydrated) return;
    const data: OnboardingData = {
      gender,
      heightCm,
      weightKg,
      describe,
      selectedSport,
      gymExperience,
      exercisePrefs: prefs,
      daysPerWeek: days,
      goal,
      chronicIllnesses,
      dreamPhysiqueUri,
      paletteId,
      completed: false,
    };
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data));
  }, [hydrated, gender, heightCm, weightKg, describe, selectedSport, gymExperience, prefs, days, goal, chronicIllnesses, dreamPhysiqueUri, paletteId]);

  const filteredSports = SPORTS.filter(s => s.toLowerCase().includes(sportSearch.trim().toLowerCase()));

  const pickDreamPhysiqueImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setDreamPhysiqueUri(result.assets[0].uri);
    }
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        gender, heightCm, weightKg, describe, selectedSport, gymExperience,
        exercisePrefs: prefs, daysPerWeek: days, goal, chronicIllnesses,
        dreamPhysiqueUri, paletteId, completed: true,
      } as OnboardingData));
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Logo size="sm" />
        <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
          <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: theme.accent }]} />
        </View>
        <Text style={[styles.stepLabel, { color: theme.secondaryText }]}>Step {step} of {TOTAL_STEPS}</Text>
      </View>

      {/* KAV wraps scrollable body + footer so footer stays above keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Content */}
        <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.primaryText }]}>Hi there! Welcome to GymMice 👋</Text>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Gender</Text>
              <View style={styles.row}>
                {['Male', 'Female'].map(g => (
                  <TouchableOpacity key={g} onPress={() => setGender(g)} activeOpacity={0.8}
                    style={[styles.chip, { flex: 1, borderColor: gender === g ? theme.accent : theme.border, backgroundColor: gender === g ? theme.accent + '18' : theme.inputBackground }]}>
                    <Text style={[styles.chipText, { color: gender === g ? theme.accent : theme.secondaryText }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Height</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
                  placeholder="e.g. 175"
                  placeholderTextColor={theme.mutedText}
                  keyboardType="numeric"
                  returnKeyType="next"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  onSubmitEditing={() => weightRef.current?.focus()}
                  blurOnSubmit={false}
                />
                <View style={[styles.unitToggle, { backgroundColor: theme.border }]}><Text style={[styles.unitText, { color: theme.secondaryText }]}>cm</Text></View>
              </View>
              <Text style={[styles.label, { color: theme.secondaryText }]}>Weight</Text>
              <View style={styles.row}>
                <TextInput
                  ref={weightRef}
                  style={[styles.input, { flex: 1, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
                  placeholder="e.g. 70"
                  placeholderTextColor={theme.mutedText}
                  keyboardType="numeric"
                  returnKeyType="done"
                  value={weightKg}
                  onChangeText={setWeightKg}
                />
                <View style={[styles.unitToggle, { backgroundColor: theme.border }]}><Text style={[styles.unitText, { color: theme.secondaryText }]}>kg</Text></View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.primaryText }]}>What describes you best?</Text>
              {DESCRIBES.map(d => (
                <TouchableOpacity key={d} onPress={() => setDescribe(d)} activeOpacity={0.8}
                  style={[styles.optionCard, { borderColor: describe === d ? theme.accent : theme.border, backgroundColor: describe === d ? theme.accent + '14' : theme.inputBackground }]}>
                  <Text style={[styles.optionText, { color: describe === d ? theme.accent : theme.primaryText }]}>{d}</Text>
                </TouchableOpacity>
              ))}
              <Text style={[styles.label, { marginTop: 16, color: theme.secondaryText }]}>Gym experience?</Text>
              <View style={styles.row}>
                {['Yes', 'No'].map(g => (
                  <TouchableOpacity key={g} onPress={() => setGymExperience(g)} activeOpacity={0.8}
                    style={[styles.chip, { flex: 1, borderColor: gymExperience === g ? theme.primary : theme.border, backgroundColor: gymExperience === g ? theme.primary + '18' : theme.inputBackground }]}>
                    <Text style={[styles.chipText, { color: gymExperience === g ? theme.primary : theme.secondaryText }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {describe === SPORT_SELECTOR_TRIGGER && (
                <View style={styles.sportSection}>
                  <Text style={[styles.label, { marginTop: 8, color: theme.secondaryText }]}>Which sport?</Text>
                  <View style={styles.sportSearchRow}>
                    <TextInput
                      style={[styles.sportSearchInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
                      placeholder="Search sports..."
                      placeholderTextColor={theme.mutedText}
                      value={sportSearch}
                      onChangeText={setSportSearch}
                      autoCapitalize="none"
                    />
                  </View>
                  {selectedSport !== '' && (
                    <View style={[styles.sportSelectedPill, { borderColor: theme.accent, backgroundColor: theme.accent + '14' }]}>
                      <Text style={[styles.sportSelectedText, { color: theme.accent }]}>Selected: {selectedSport}</Text>
                    </View>
                  )}
                  <ScrollView style={[styles.sportList, { borderColor: theme.border, backgroundColor: theme.surface }]} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {filteredSports.length === 0 ? (
                      <Text style={[styles.sportEmptyText, { color: theme.mutedText }]}>No sports match "{sportSearch}"</Text>
                    ) : (
                      filteredSports.map(sport => {
                        const active = selectedSport === sport;
                        return (
                          <TouchableOpacity key={sport} onPress={() => setSelectedSport(sport)} activeOpacity={0.7}
                            style={[styles.sportRow, { borderBottomColor: theme.border }, active && { backgroundColor: theme.accent + '14' }]}>
                            <Text style={[styles.sportRowText, { color: active ? theme.accent : theme.primaryText }]}>{sport}</Text>
                            {active && <Text style={[styles.checkmark, { color: theme.accent }]}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.primaryText }]}>Exercise preferences</Text>
              <View style={styles.tags}>
                {EXERCISES.map(e => {
                  const on = prefs.includes(e);
                  return (
                    <TouchableOpacity key={e} onPress={() => togglePref(e)} activeOpacity={0.8}
                      style={[styles.tag, { borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary + '18' : theme.inputBackground }]}>
                      <Text style={[styles.tagText, { color: on ? theme.primary : theme.secondaryText }]}>{e}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[styles.label, { marginTop: 20, color: theme.secondaryText }]}>Days per week: <Text style={{ color: theme.accent }}>{days}</Text></Text>
              <View style={styles.sliderRow}>
                {[1,2,3,4,5,6,7].map(n => (
                  <TouchableOpacity key={n} onPress={() => setDays(n)} activeOpacity={0.7} style={[styles.dayDot, { backgroundColor: n <= days ? theme.accent : theme.border }]}>
                    <Text style={[styles.dayDotText, { color: n <= days ? '#fff' : theme.secondaryText }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.primaryText }]}>Your goal physique</Text>
              <View style={styles.goalGrid}>
                {GOALS.map(g => (
                  <TouchableOpacity key={g} onPress={() => setGoal(g)} activeOpacity={0.8}
                    style={[styles.goalCard, { borderColor: goal === g ? theme.accent : theme.border, backgroundColor: goal === g ? theme.accent + '14' : theme.inputBackground }]}>
                    <Text style={styles.goalEmoji}>{GOAL_EMOJIS[g]}</Text>
                    <Text style={[styles.goalText, { color: goal === g ? theme.accent : theme.primaryText }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { marginTop: 20, color: theme.secondaryText }]}>Any chronic illnesses? (optional)</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12, backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
                placeholder="e.g. asthma, knee injury..."
                placeholderTextColor={theme.mutedText}
                multiline
                blurOnSubmit
                returnKeyType="done"
                value={chronicIllnesses}
                onChangeText={setChronicIllnesses}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
              />

              <Text style={[styles.label, { marginTop: 20, color: theme.secondaryText }]}>Upload your dream physique (Optional)</Text>
              {dreamPhysiqueUri ? (
                <View style={styles.physiquePreviewWrap}>
                  <Image source={{ uri: dreamPhysiqueUri }} style={[styles.physiquePreview, { backgroundColor: theme.border }]} resizeMode="cover" />
                  <View style={styles.physiqueActionsRow}>
                    <TouchableOpacity onPress={pickDreamPhysiqueImage} activeOpacity={0.8} style={[styles.physiqueActionBtn, { borderColor: theme.accent }]}>
                      <Text style={[styles.physiqueActionText, { color: theme.accent }]}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setDreamPhysiqueUri(null)} activeOpacity={0.8} style={[styles.physiqueActionBtn, { borderColor: theme.danger }]}>
                      <Text style={[styles.physiqueActionText, { color: theme.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={pickDreamPhysiqueImage} activeOpacity={0.8} style={[styles.physiqueUploadBtn, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                  <Text style={styles.physiqueUploadIcon}>🖼️</Text>
                  <Text style={[styles.physiqueUploadText, { color: theme.secondaryText }]}>Tap to choose a photo from your gallery</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.primaryText }]}>Pick your palette</Text>
              <Text style={[styles.subText, { color: theme.secondaryText }]}>Personalize the app look. You can change this anytime in Profile.</Text>
              {PALETTE_LIST.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setPaletteId(p.id as PaletteId)} activeOpacity={0.8}
                  style={[styles.paletteRow, { borderColor: paletteId === p.id ? theme.accent : theme.border, backgroundColor: paletteId === p.id ? theme.accent + '10' : theme.surface }]}>
                  <View style={styles.swatches}>
                    {/* Intentional swatch preview colors — each palette's own primary/accent from its light variant */}
                    <View style={[styles.swatch, { backgroundColor: p.light.primary }]} />
                    <View style={[styles.swatch, { backgroundColor: p.light.accent }]} />
                  </View>
                  <Text style={[styles.paletteName, { color: paletteId === p.id ? theme.accent : theme.primaryText }]}>{p.label}</Text>
                  {paletteId === p.id && <Text style={[styles.checkmark, { color: theme.accent }]}>✓</Text>}
                </TouchableOpacity>
              ))}
              <Text style={[styles.subText, { color: theme.secondaryText }]}>The app colors update live as you select above.</Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: theme.background }]}>
          {step > 1 && (
            <TouchableOpacity onPress={() => setStep(s => s - 1)} style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]} activeOpacity={0.7}>
              <Text style={[styles.backBtnText, { color: theme.secondaryText }]}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleContinue} style={[styles.continueBtn, { backgroundColor: theme.accent, flex: step > 1 ? undefined : 1 }]} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>{step < TOTAL_STEPS ? 'Continue' : "Let's go 🎉"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8, gap: 12 },
  progressBg: { height: 4, borderRadius: 2 },
  progressFill: { height: '100%', borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 24, paddingBottom: 16 },
  stepContent: { gap: 12 },
  stepTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  label: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  subText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  row: { flexDirection: 'row', gap: 10 },
  input: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: 'Inter_400Regular' },
  chip: { paddingVertical: 14, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  chipText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  optionCard: { padding: 16, borderRadius: 12, borderWidth: 2 },
  optionText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  unitToggle: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, justifyContent: 'center' },
  unitText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 2 },
  tagText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayDot: { flex: 1, aspectRatio: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  dayDotText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: { width: '47%', paddingVertical: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', gap: 8 },
  goalEmoji: { fontSize: 32 },
  goalText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  paletteRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, borderWidth: 2 },
  swatches: { flexDirection: 'row', gap: 6 },
  swatch: { width: 28, height: 28, borderRadius: 8 },
  paletteName: { flex: 1, fontSize: 15, fontFamily: 'Inter_700Bold' },
  checkmark: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  sportSection: { marginTop: 4, gap: 10 },
  sportSearchRow: { flexDirection: 'row' },
  sportSearchInput: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  sportSelectedPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  sportSelectedText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  sportList: { maxHeight: 220, borderWidth: 1.5, borderRadius: 12 },
  sportRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  sportRowText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  sportEmptyText: { padding: 14, fontSize: 13, fontFamily: 'Inter_400Regular' },
  physiqueUploadBtn: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 28, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  physiqueUploadIcon: { fontSize: 28 },
  physiqueUploadText: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', paddingHorizontal: 24 },
  physiquePreviewWrap: { gap: 10 },
  physiquePreview: { width: '100%', height: 220, borderRadius: 14 },
  physiqueActionsRow: { flexDirection: 'row', gap: 10 },
  physiqueActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  physiqueActionText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  footer: { flexDirection: 'row', paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  backBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  backBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  continueBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  continueBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
