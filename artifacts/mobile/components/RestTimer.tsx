import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '@/context/ThemeContext';

const PRESETS = [30, 60, 90, 120];

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

// Small local WAV so the completion beep works offline and doesn't depend on
// a network fetch — bundled with the app like any other static asset.
const BEEP_SOUND = require('@/assets/sounds/beep.wav');

// Fully customizable rest timer: hours/minutes/seconds steppers AND direct
// numeric typing, plus the original quick presets. Beeps once when a running
// countdown reaches zero.
export default function RestTimer() {
  const theme = useTheme();
  const player = useAudioPlayer(BEEP_SOUND);

  // The configured (not-yet-started, or reset-to) duration, held as separate
  // h/m/s so both the steppers and the typed inputs can edit each unit
  // independently.
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);

  const totalSecs = hours * 3600 + minutes * 60 + seconds;
  const [remaining, setRemaining] = useState(totalSecs);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against beeping more than once per completed countdown (the
  // interval tick that lands on 0 could otherwise fire the sound repeatedly
  // before `running` flips false).
  const hasBeepedRef = useRef(false);

  // Keep the countdown in sync whenever the configured duration changes
  // while the timer isn't running (editing mid-countdown doesn't reset it).
  useEffect(() => {
    if (!running) setRemaining(totalSecs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSecs]);

  useEffect(() => {
    if (running) {
      hasBeepedRef.current = false;
      timerRef.current = setInterval(() => {
        setRemaining(s => {
          if (s <= 1) {
            setRunning(false);
            if (!hasBeepedRef.current) {
              hasBeepedRef.current = true;
              try {
                player.seekTo(0);
                player.play();
              } catch {
                // Audio playback isn't critical to the timer working — never
                // let it crash the countdown.
              }
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const setPreset = (t: number) => {
    setHours(0);
    setMinutes(Math.floor(t / 60));
    setSeconds(t % 60);
    setRemaining(t);
    setRunning(false);
  };

  const adjust = (unit: 'h' | 'm' | 's', delta: number) => {
    if (running) return;
    if (unit === 'h') setHours(h => clamp(h + delta, 0, 99));
    if (unit === 'm') setMinutes(m => clamp(m + delta, 0, 59));
    if (unit === 's') setSeconds(s => clamp(s + delta, 0, 59));
  };

  const reset = () => { setRunning(false); setRemaining(totalSecs); };

  const rh = Math.floor(remaining / 3600);
  const rm = Math.floor((remaining % 3600) / 60);
  const rs = remaining % 60;
  const activePreset = !running && totalSecs === remaining
    ? PRESETS.find(p => p === totalSecs)
    : undefined;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* Digital display */}
      <View style={styles.displayRow}>
        {rh > 0 && (
          <>
            <Text style={[styles.display, { color: theme.primaryText }]}>{String(rh).padStart(2, '0')}</Text>
            <Text style={[styles.displayUnit, { color: theme.mutedText }]}>h</Text>
          </>
        )}
        <Text style={[styles.display, { color: theme.primaryText }]}>{String(rm).padStart(2, '0')}</Text>
        <Text style={[styles.displayUnit, { color: theme.mutedText }]}>m</Text>
        <Text style={[styles.display, { color: theme.primaryText }]}>{String(rs).padStart(2, '0')}</Text>
        <Text style={[styles.displayUnit, { color: theme.mutedText }]}>s</Text>
      </View>

      {/* Custom h/m/s steppers + direct typing (HH:MM:SS) */}
      <View style={styles.stepperRow}>
        <UnitInput label="h" value={hours} min={0} max={99} onChange={setHours} onInc={() => adjust('h', 1)} onDec={() => adjust('h', -1)} disabled={running} />
        <Text style={[styles.colon, { color: theme.mutedText }]}>:</Text>
        <UnitInput label="m" value={minutes} min={0} max={59} onChange={setMinutes} onInc={() => adjust('m', 1)} onDec={() => adjust('m', -1)} disabled={running} />
        <Text style={[styles.colon, { color: theme.mutedText }]}>:</Text>
        <UnitInput label="s" value={seconds} min={0} max={59} onChange={setSeconds} onInc={() => adjust('s', 1)} onDec={() => adjust('s', -1)} disabled={running} />
      </View>

      {/* Quick presets */}
      <View style={styles.presets}>
        {PRESETS.map(t => (
          <TouchableOpacity key={t} onPress={() => setPreset(t)} activeOpacity={0.7}
            style={[styles.presetBtn, { borderColor: activePreset === t ? theme.accent : theme.border, backgroundColor: activePreset === t ? theme.accent + '18' : theme.surface }]}>
            <Text style={[styles.presetText, { color: activePreset === t ? theme.accent : theme.secondaryText }]}>{t}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress bar */}
      <View style={[styles.timerBar, { backgroundColor: theme.border }]}>
        <View style={[styles.timerFill, { width: `${totalSecs > 0 ? (remaining / totalSecs) * 100 : 0}%` as any, backgroundColor: theme.primary }]} />
      </View>

      <View style={styles.timerActions}>
        <TouchableOpacity
          onPress={() => { Keyboard.dismiss(); setRunning(r => !r); }}
          disabled={totalSecs === 0}
          style={[styles.timerStartBtn, { backgroundColor: theme.accent, opacity: totalSecs === 0 ? 0.5 : 1 }]}
          activeOpacity={0.85}
        >
          <Feather name={running ? 'pause' : 'play'} size={18} color="#fff" />
          <Text style={styles.timerStartText}>{running ? 'Pause' : 'Start'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={reset} style={[styles.timerResetBtn, { borderColor: theme.border }]} activeOpacity={0.7}>
          <Text style={[styles.timerResetText, { color: theme.secondaryText }]}>Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Editable unit box: shows a numeric TextInput (tap to type directly) with
// +/- steppers on either side. Typing is sanitized to digits only, clamped
// to [min, max], and re-padded to 2 digits once the field loses focus.
function UnitInput({ label, value, min, max, onChange, onInc, onDec, disabled }: {
  label: string; value: number; min: number; max: number;
  onChange: (n: number) => void; onInc: () => void; onDec: () => void; disabled: boolean;
}) {
  const theme = useTheme();
  const [text, setText] = useState(String(value).padStart(2, '0'));
  const [focused, setFocused] = useState(false);

  // Keep the field's display in sync with external changes (presets, +/-)
  // as long as the user isn't actively typing into it.
  useEffect(() => {
    if (!focused) setText(String(value).padStart(2, '0'));
  }, [value, focused]);

  const handleChangeText = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, '').slice(0, 2);
    setText(digitsOnly);
    if (digitsOnly === '') { onChange(min); return; }
    const parsed = clamp(parseInt(digitsOnly, 10), min, max);
    onChange(parsed);
  };

  const handleBlur = () => {
    setFocused(false);
    setText(String(value).padStart(2, '0'));
  };

  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={onDec} disabled={disabled} style={[styles.stepperBtn, { backgroundColor: theme.inputBackground }, disabled && { opacity: 0.4 }]} activeOpacity={0.7}>
        <Feather name="minus" size={14} color={theme.primaryText} />
      </TouchableOpacity>
      <View style={styles.stepperValueBox}>
        <TextInput
          style={[styles.stepperInput, { color: theme.primaryText, borderBottomColor: theme.border }]}
          value={text}
          editable={!disabled}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={2}
          selectTextOnFocus
          onFocus={() => setFocused(true)}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          onSubmitEditing={() => Keyboard.dismiss()}
          accessibilityLabel={`${label === 'h' ? 'Hours' : label === 'm' ? 'Minutes' : 'Seconds'} input`}
        />
        <Text style={[styles.stepperUnit, { color: theme.mutedText }]}>{label}</Text>
      </View>
      <TouchableOpacity onPress={onInc} disabled={disabled} style={[styles.stepperBtn, { backgroundColor: theme.inputBackground }, disabled && { opacity: 0.4 }]} activeOpacity={0.7}>
        <Feather name="plus" size={14} color={theme.primaryText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16 },
  displayRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 3, marginBottom: 16 },
  display: { fontSize: 36, fontFamily: 'Inter_700Bold' },
  displayUnit: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginRight: 6 },
  stepperRow: { flexDirection: 'row', gap: 6, marginBottom: 14, justifyContent: 'center', alignItems: 'center' },
  colon: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 14 },
  stepper: { alignItems: 'center', gap: 6 },
  stepperBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepperValueBox: { alignItems: 'center', minWidth: 40 },
  stepperInput: {
    fontSize: 16, fontFamily: 'Inter_700Bold', textAlign: 'center',
    minWidth: 34, paddingVertical: 2, borderBottomWidth: 1.5,
  },
  stepperUnit: { fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  presets: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 14 },
  presetBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  presetText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  timerBar: { height: 4, borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 2 },
  timerActions: { flexDirection: 'row', gap: 10 },
  timerStartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  timerStartText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  timerResetBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  timerResetText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
});
