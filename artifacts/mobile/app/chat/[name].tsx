import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { CONVO_HISTORY, Message } from '@/constants/mockData';

const AUTO_REPLIES = ["😂 haha", "That's fire 🔥", "Bet 💪", "Say less", "Facts bro", "Lmaooo", "Let's gooo 🎉", "100%", "Ok ok I see you 👀", "Respect 🤝"];

export default function ChatScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>(CONVO_HISTORY[name] || []);
  const [input, setInput] = useState('');

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(m => [...m, { from: 'me', text, time: 'now' }]);
    setInput('');
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages(m => [...m, { from: 'them', text: reply, time: 'now' }]);
    }, 900);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const isAnon = name?.includes('Anonymous');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 44) : insets.top + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
          <Feather name="arrow-left" size={20} color={theme.primaryText} />
        </TouchableOpacity>
        <View style={[styles.headerAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.headerAvatarText}>{isAnon ? '?' : (name?.[0] ?? '?')}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: theme.primaryText }]}>{name}</Text>
          <Text style={[styles.headerStatus, { color: theme.primary }]}>● Online</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerIconBtn, { borderColor: theme.border }]}>
            <Feather name="phone" size={20} color={theme.primaryText} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerIconBtn, { borderColor: theme.border }]}>
            <Feather name="video" size={20} color={theme.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: msg, index }) => {
          const isMe = msg.from === 'me';
          const showTime = index === 0 || index % 8 === 0;
          return (
            <View>
              {showTime && (
                <Text style={[styles.timeLabel, { color: theme.mutedText }]}>{msg.time}</Text>
              )}
              <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && (
                  <View style={[styles.msgAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={styles.msgAvatarText}>{isAnon ? '?' : (name?.[0] ?? '?')}</Text>
                  </View>
                )}
                <View style={[
                  styles.bubble,
                  isMe ? [styles.bubbleMe, { backgroundColor: theme.primary }] : [styles.bubbleThem, { backgroundColor: theme.surface, borderColor: theme.border }],
                ]}>
                  <Text style={[styles.bubbleText, { color: theme.primaryText }, isMe && { color: '#fff' }]}>{msg.text}</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputBar, { paddingBottom: botPad + 8, backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Feather name="paperclip" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Message..."
            placeholderTextColor={theme.mutedText}
            style={[styles.textInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={send}
            style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.primary : theme.border }]}
            activeOpacity={0.8}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  headerName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  headerStatus: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeLabel: { textAlign: 'center', fontSize: 11, marginVertical: 8, fontFamily: 'Inter_400Regular' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 2 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  msgAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 11 },
  bubble: { maxWidth: '72%', padding: 10, paddingHorizontal: 14 },
  bubbleMe: { borderRadius: 18, borderBottomRightRadius: 4 },
  bubbleThem: { borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  attachBtn: { padding: 4 },
  textInput: { flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
