import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import TopBar from '@/components/TopBar';
import { useTheme } from '@/context/ThemeContext';

type TabType = 'menu' | 'list' | 'recipes';

const MEALS = [
  { name: 'Garlic Butter Chicken', cat: 'Lunch',     kcal: 520, p: 45, c: 30, f: 18, icon: 'food' as const },
  { name: 'Grilled Salmon & Quinoa', cat: 'Dinner',  kcal: 740, p: 52, c: 60, f: 24, icon: 'fish' as const },
  { name: 'Oatmeal Berry Bowl', cat: 'Breakfast',    kcal: 380, p: 12, c: 68, f: 8,  icon: 'food-apple' as const },
  { name: 'Egg Tartines', cat: 'Snack',             kcal: 290, p: 18, c: 24, f: 12, icon: 'egg' as const },
];

const SAVED = [
  { name: 'Chicken & Veggies', icon: 'food' as const },
  { name: 'Spicy Sweet Potato', icon: 'food-apple' as const },
  { name: 'Za\'atar Tosties', icon: 'bread-slice' as const },
  { name: 'Zucchini Pasta', icon: 'pasta' as const },
  { name: 'Quinoa Oatmeal', icon: 'bowl-mix' as const },
  { name: 'Avocado Toast', icon: 'food-variant' as const },
];

const RECIPE = {
  name: 'Grilled Salmon with Quinoa & Veggies',
  kcal: 740, p: 52, c: 60, f: 24,
  ingredients: ['2 salmon fillets','1 cup quinoa','1 zucchini (sliced)','1 red bell pepper','1 cup broccoli florets','1 tbsp olive oil','Salt, pepper, lemon'],
  steps: [
    'Cook quinoa in broth for 15 min.',
    'Toss vegetables in olive oil, roast at 200°C for 20 min.',
    'Season salmon and grill 4–5 min each side.',
    'Assemble: quinoa base, vegetables, salmon on top.',
  ],
};

export default function NutritionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const [tab, setTab] = useState<TabType>('menu');
  const [showRecipe, setShowRecipe] = useState(false);

  const TABS: { id: TabType; label: string }[] = [
    { id: 'menu', label: "Today's menu" },
    { id: 'list', label: 'My list' },
    { id: 'recipes', label: 'Recipes' },
  ];

  if (showRecipe) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TopBar title="Recipe" onBack={() => setShowRecipe(false)} showBack
          right={<TouchableOpacity><Feather name="heart" size={20} color={theme.accent} /></TouchableOpacity>}
        />
        <ScrollView contentContainerStyle={{ paddingBottom: botPad + 20 }}>
          <View style={[styles.recipeHero, { backgroundColor: theme.primary + '22' }]}>
            <MaterialCommunityIcons name="fish" size={80} color={theme.primary} />
          </View>
          <View style={styles.recipeBody}>
            <Text style={[styles.recipeName, { color: theme.accent }]}>{RECIPE.name}</Text>
            <View style={styles.macroRow}>
              {[['Protein', `${RECIPE.p}g`, theme.primary], ['Carbs', `${RECIPE.c}g`, theme.accent], ['Fat', `${RECIPE.f}g`, '#7C3AED']].map(([l, v, col]) => (
                <View key={l as string} style={[styles.macroCard, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.macroLabel, { color: theme.secondaryText }]}>{l as string}</Text>
                  <Text style={[styles.macroValue, { color: col as string }]}>{v as string}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.recipeSection, { color: theme.primary }]}>Ingredients</Text>
            {RECIPE.ingredients.map(ing => (
              <Text key={ing} style={[styles.ingredient, { color: theme.primaryText, borderBottomColor: theme.border }]}>• {ing}</Text>
            ))}
            <Text style={[styles.recipeSection, { color: theme.primary }]}>Steps</Text>
            {RECIPE.steps.map((s, i) => (
              <View key={i} style={[styles.stepRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.stepNum, { backgroundColor: theme.accent }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: theme.primaryText }]}>{s}</Text>
              </View>
            ))}
            <TouchableOpacity style={[styles.watchBtn, { backgroundColor: theme.accent }]} activeOpacity={0.85}>
              <Feather name="youtube" size={18} color="#fff" />
              <Text style={styles.watchBtnText}>Watch tutorial on YouTube</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar title="Nutrition" showBack />
      <View style={[styles.tabs, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tabBtn, { borderBottomColor: tab === t.id ? theme.accent : 'transparent' }]} activeOpacity={0.7}>
            <Text style={[styles.tabText, { color: tab === t.id ? theme.accent : theme.secondaryText }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: botPad + 20 }}>
        {tab === 'menu' && (
          <>
            {/* Calorie ring */}
            <View style={[styles.calorieCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.calLabel, { color: theme.secondaryText }]}>Calories today</Text>
              <View style={{ position: 'relative', width: 130, height: 130 }}>
                <Svg width={130} height={130} viewBox="0 0 130 130">
                  <Circle cx="65" cy="65" r="52" fill="none" stroke={theme.chartTrack} strokeWidth="12" />
                  <Circle cx="65" cy="65" r="52" fill="none" stroke={theme.accent} strokeWidth="12" strokeDasharray="196 327" strokeLinecap="round" transform="rotate(-90 65 65)" />
                </Svg>
                <View style={styles.calorieCenter}>
                  <Text style={[styles.calorieValue, { color: theme.primaryText }]}>1,840</Text>
                  <Text style={[styles.calorieGoal, { color: theme.secondaryText }]}>/ 2,200</Text>
                </View>
              </View>
              <View style={styles.macroSummary}>
                {[['Protein', '148g', theme.primary], ['Carbs', '180g', theme.accent], ['Fat', '54g', '#7C3AED']].map(([l, v, c]) => (
                  <View key={l as string} style={styles.macroSummaryItem}>
                    <View style={[styles.macroSummaryDot, { backgroundColor: c as string }]} />
                    <Text style={[styles.macroSummaryLabel, { color: theme.secondaryText }]}>{l as string}</Text>
                    <Text style={[styles.macroSummaryVal, { color: c as string }]}>{v as string}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ gap: 10 }}>
              {MEALS.map(m => (
                <TouchableOpacity key={m.name} onPress={() => setShowRecipe(true)} style={[styles.mealCard, { backgroundColor: theme.surface }]} activeOpacity={0.8}>
                  <View style={[styles.mealIconBg, { backgroundColor: theme.background }]}>
                    <MaterialCommunityIcons name={m.icon} size={30} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealCat, { color: theme.secondaryText }]}>{m.cat}</Text>
                    <Text style={[styles.mealName, { color: theme.primaryText }]}>{m.name}</Text>
                    <View style={styles.mealMacros}>
                      <Text style={[styles.mealMacro, { color: theme.primary }]}>P {m.p}g</Text>
                      <Text style={[styles.mealMacro, { color: theme.accent }]}>C {m.c}g</Text>
                      <Text style={[styles.mealMacro, { color: '#7C3AED' }]}>F {m.f}g</Text>
                    </View>
                  </View>
                  <Text style={[styles.mealKcal, { color: theme.accent }]}>{m.kcal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {(tab === 'list' || tab === 'recipes') && (
          <>
            <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="search" size={16} color={theme.mutedText} />
              <TextInput
                placeholder={tab === 'list' ? 'Search saved meals...' : 'Search recipes...'}
                placeholderTextColor={theme.mutedText}
                style={[styles.searchInput, { color: theme.primaryText }]}
                returnKeyType="search"
              />
            </View>
            <View style={styles.savedGrid}>
              {SAVED.map(m => (
                <TouchableOpacity key={m.name} onPress={() => setShowRecipe(true)} style={[styles.savedCard, { backgroundColor: theme.surface }]} activeOpacity={0.8}>
                  <View style={[styles.savedIcon, { backgroundColor: theme.background }]}>
                    <MaterialCommunityIcons name={m.icon} size={40} color={theme.primary} />
                  </View>
                  <Text style={[styles.savedName, { color: theme.primaryText }]} numberOfLines={2}>{m.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3 },
  tabText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  calorieCard: { borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', gap: 12 },
  calLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  calorieCenter: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  calorieValue: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  calorieGoal: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  macroSummary: { flexDirection: 'row', gap: 16 },
  macroSummaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroSummaryDot: { width: 8, height: 8, borderRadius: 4 },
  macroSummaryLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  macroSummaryVal: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  mealCard: { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  mealIconBg: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealCat: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  mealName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  mealMacros: { flexDirection: 'row', gap: 8, marginTop: 4 },
  mealMacro: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  mealKcal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  savedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  savedCard: { width: '47%', borderRadius: 14, overflow: 'hidden' },
  savedIcon: { height: 100, alignItems: 'center', justifyContent: 'center' },
  savedName: { padding: 10, fontSize: 13, fontFamily: 'Inter_700Bold' },
  // Recipe
  recipeHero: { height: 200, alignItems: 'center', justifyContent: 'center' },
  recipeBody: { padding: 20, gap: 12 },
  recipeName: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  macroRow: { flexDirection: 'row', gap: 10 },
  macroCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  macroLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  macroValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  recipeSection: { fontSize: 16, fontFamily: 'Inter_700Bold', marginTop: 8 },
  ingredient: { fontSize: 14, paddingVertical: 6, borderBottomWidth: 1, fontFamily: 'Inter_400Regular' },
  stepRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  watchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 14, borderRadius: 12, marginTop: 8 },
  watchBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
});
