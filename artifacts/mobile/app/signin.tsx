import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import Logo from '@/components/Logo';
import { useTheme } from '@/context/ThemeContext';

export default function SignInScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const passwordRef = useRef<TextInput>(null);

  const handleSignIn = () => router.replace('/(tabs)');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Logo size="md" />
        <Text style={[styles.title, { color: theme.primaryText }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Sign in to continue your fitness journey</Text>

        <View style={styles.form}>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Feather name="user" size={18} color={theme.iconMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.primaryText }]}
              placeholder="Username"
              placeholderTextColor={theme.mutedText}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Feather name="lock" size={18} color={theme.iconMuted} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              style={[styles.input, { color: theme.primaryText }]}
              placeholder="Password"
              placeholderTextColor={theme.mutedText}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
            <TouchableOpacity onPress={() => setShowPass(s => !s)} style={styles.eyeBtn}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={theme.iconMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.forgotRow}>
            <Text style={[styles.forgot, { color: theme.accent }]}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handleSignIn}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Sign in</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.mutedText }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {[
            { icon: 'apple' as const, label: 'Apple' },
            { icon: 'google' as const, label: 'Google' },
          ].map(({ icon, label }) => (
            <TouchableOpacity key={label} style={[styles.socialBtn, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={handleSignIn} activeOpacity={0.7}>
              <FontAwesome name={icon} size={20} color={theme.primaryText} />
              <Text style={[styles.socialBtnText, { color: theme.primaryText }]}>Continue with {label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: theme.secondaryText }]}>{"Don't have an account? "}</Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.switchLink, { color: theme.accent }]}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingHorizontal: 28, gap: 8 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', marginTop: 24 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  form: { width: '100%', gap: 12, marginTop: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  eyeBtn: { padding: 4 },
  forgotRow: { alignItems: 'flex-end' },
  forgot: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  primaryBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  socialBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  switchLink: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
