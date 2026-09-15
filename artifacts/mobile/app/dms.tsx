import React from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import TopBar from '@/components/TopBar';
import { useTheme } from '@/context/ThemeContext';
import { CONVERSATIONS } from '@/constants/mockData';

export default function DMsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TopBar title="Chats" showBack
        right={
          <TouchableOpacity style={styles.composeBtn}>
            <Feather name="edit" size={20} color={theme.accent} />
          </TouchableOpacity>
        }
      />
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.iconMuted} />
        <TextInput
          placeholder="Search conversations..."
          placeholderTextColor={theme.mutedText}
          style={[styles.searchInput, { color: theme.primaryText }]}
          returnKeyType="search"
        />
      </View>
      <FlatList
        data={CONVERSATIONS}
        keyExtractor={c => c.name}
        contentContainerStyle={{ paddingBottom: botPad + 20 }}
        renderItem={({ item: c }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/chat/[name]', params: { name: c.name } })}
            style={[styles.convoItem, { backgroundColor: theme.surface }]}
            activeOpacity={0.7}
          >
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {c.name.includes('Anonymous') ? '?' : c.name[0]}
              </Text>
            </View>
            <View style={styles.convoInfo}>
              <Text style={[styles.convoName, { color: theme.primaryText, fontFamily: c.unread ? 'Inter_700Bold' : 'Inter_600SemiBold' }]}>{c.name}</Text>
              <Text style={[styles.convoLast, { color: theme.secondaryText }]} numberOfLines={1}>{c.last}</Text>
            </View>
            <View style={styles.convoMeta}>
              <Text style={[styles.convoTime, { color: theme.mutedText }]}>{c.time}</Text>
              {c.unread && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  composeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  convoItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingHorizontal: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  convoInfo: { flex: 1, minWidth: 0 },
  convoName: { fontSize: 15 },
  convoLast: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  convoMeta: { alignItems: 'flex-end', gap: 6 },
  convoTime: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  separator: { height: 1, marginLeft: 82 },
});
