import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { INIT_POSTS, STORIES, Post, Story } from '@/constants/mockData';

// ── Story Viewer ──────────────────────────────────────────────────────────────
function StoryViewer({ story, allStories, storyIdx, setStoryIdx, onClose }: {
  story: Story; allStories: Story[]; storyIdx: number;
  setStoryIdx: (i: number) => void; onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [slideIdx, setSlideIdx] = useState(0);
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState(false);
  const slide = story.slides[slideIdx];

  const goNext = () => {
    if (slideIdx < story.slides.length - 1) { setSlideIdx(i => i + 1); return; }
    const next = storyIdx + 1;
    if (next < allStories.length) { setStoryIdx(next); setSlideIdx(0); } else onClose();
  };
  const goPrev = () => {
    if (slideIdx > 0) { setSlideIdx(i => i - 1); return; }
    const prev = storyIdx - 1;
    if (prev >= 0) { setStoryIdx(prev); setSlideIdx(0); }
  };
  const sendReply = () => { if (!reply.trim()) return; setSent(true); setReply(''); setTimeout(() => setSent(false), 2000); };

  return (
    <View style={[styles.storyContainer, { paddingTop: insets.top }]}>
      <View style={styles.storyProgress}>
        {story.slides.map((_, i) => (
          <View key={i} style={styles.storyProgressTrack}>
            <View style={[styles.storyProgressFill, { width: i < slideIdx ? '100%' : i === slideIdx ? '50%' : '0%' }]} />
          </View>
        ))}
      </View>
      <View style={styles.storyTop}>
        <View style={[styles.storyAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.storyAvatarText}>{story.avatar}</Text>
        </View>
        <Text style={styles.storyUser}>{story.user}</Text>
        <Text style={styles.storyTime}>now</Text>
        <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
          <Feather name="x" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[styles.storySlide, { backgroundColor: slide.bg }]}>
        <Text style={styles.storyCaption}>{slide.caption}</Text>
        <TouchableOpacity onPress={goPrev} style={styles.storyZoneLeft} activeOpacity={1} />
        <TouchableOpacity onPress={goNext} style={styles.storyZoneRight} activeOpacity={1} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {sent ? (
          <View style={[styles.storyReplyBar, { paddingBottom: insets.bottom + 12 }]}>
            <Text style={[styles.storySentText, { color: theme.primary }]}>✓ Reply sent — check your DMs!</Text>
          </View>
        ) : (
          <View style={[styles.storyReplyBar, { paddingBottom: insets.bottom + 12 }]}>
            <TextInput
              value={reply} onChangeText={setReply}
              placeholder={`Reply to ${story.user}...`}
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.storyReplyInput}
              returnKeyType="send"
              onSubmitEditing={sendReply}
            />
            <TouchableOpacity onPress={sendReply} style={[styles.storyReplySend, { backgroundColor: reply.trim() ? theme.primary : 'rgba(255,255,255,0.2)' }]}>
              <Feather name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Comments Sheet ────────────────────────────────────────────────────────────
function CommentsSheet({ post, onClose, onAddComment }: {
  post: Post; onClose: () => void; onAddComment: (id: number, text: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const commentsScrollRef = useRef<ScrollView>(null);
  const send = () => { if (!text.trim()) return; onAddComment(post.id, text.trim()); setText(''); };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {/* A single top-level, flex:1 KeyboardAvoidingView wraps the entire modal
          content (overlay + sheet). Nesting KAV only around the input row inside
          a transparent Modal is unreliable on Android, since the inner KAV doesn't
          reliably receive correct keyboard geometry from within a transparent
          Modal's window. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={[styles.modalOverlay, { backgroundColor: theme.overlay }]} onPress={onClose} activeOpacity={1} />
        <View style={[styles.commentsSheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 8 }]}>
          <View style={[styles.commentsHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.commentsTitle, { color: theme.primaryText }]}>Comments ({post.comments.length})</Text>
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={theme.secondaryText} /></TouchableOpacity>
          </View>
          <ScrollView ref={commentsScrollRef} style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {post.comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <View style={[styles.commentAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={styles.commentAvatarText}>{c.avatar[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.commentBubble, { backgroundColor: theme.card }]}>
                    <Text style={[styles.commentUser, { color: theme.primary }]}>{c.user}</Text>
                    <Text style={[styles.commentText, { color: theme.primaryText }]}>{c.text}</Text>
                  </View>
                  <Text style={[styles.commentTime, { color: theme.mutedText }]}>{c.time}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={[styles.commentInput, { borderTopColor: theme.border }]}>
            <View style={[styles.commentAvatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.commentAvatarText}>M</Text>
            </View>
            <TextInput
              value={text} onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor={theme.mutedText}
              style={[styles.commentTextInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.primaryText }]}
              returnKeyType="send"
              onSubmitEditing={send}
              onFocus={() => setTimeout(() => commentsScrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
            <TouchableOpacity onPress={send} style={[styles.commentSendBtn, { backgroundColor: text.trim() ? theme.primary : theme.border }]}>
              <Feather name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Caught-Up Footer ──────────────────────────────────────────────────────────
function CaughtUpFooter() {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.caughtUp, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.caughtUpDivider}>
        <View style={[styles.caughtUpLine, { backgroundColor: theme.border }]} />
        <Text style={[styles.caughtUpDot, { color: theme.mutedText }]}>✦</Text>
        <View style={[styles.caughtUpLine, { backgroundColor: theme.border }]} />
      </View>
      <Text style={[styles.caughtUpTitle, { color: theme.primaryText }]}>{"You're all caught up! 🎉"}</Text>
      <Text style={[styles.caughtUpSub, { color: theme.mutedText }]}>{"You've seen all the latest posts from your friends."}</Text>
    </Animated.View>
  );
}

// ── Main Social Screen ────────────────────────────────────────────────────────
export default function SocialScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === 'web' ? Math.max(insets.bottom, 84) : insets.bottom;

  const [posts, setPosts] = useState(INIT_POSTS);
  const [stories, setStories] = useState(STORIES);
  const [activeStoryIdx, setActiveStoryIdx] = useState<number | null>(null);
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [anon, setAnon] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const createScrollRef = useRef<ScrollView>(null);

  const openStory = (i: number) => {
    setStories(s => s.map((st, idx) => idx === i ? { ...st, seen: true } : st));
    setActiveStoryIdx(i);
  };

  // Single reaction per post: selecting a new emoji replaces the previous one
  const toggleReaction = (postId: number, emoji: string) => {
    setPosts(ps => ps.map(p => {
      if (p.id !== postId) return p;
      const prevEmoji = Object.keys(p.myReactions).find(k => p.myReactions[k]);
      const isSame = prevEmoji === emoji;
      const newReactions = { ...p.reactions };
      // Remove previous reaction count
      if (prevEmoji) {
        newReactions[prevEmoji] = Math.max(0, (newReactions[prevEmoji] || 0) - 1);
      }
      // Add new reaction only if it's a different one
      if (!isSame) {
        newReactions[emoji] = (newReactions[emoji] || 0) + 1;
      }
      return {
        ...p,
        reactions: newReactions,
        myReactions: isSame ? {} : { [emoji]: true },
      };
    }));
  };

  const addComment = (postId: number, text: string) => {
    const newComment = { id: Date.now(), user: 'Mido', avatar: 'M', text, time: 'now' };
    setPosts(ps => ps.map(p => p.id !== postId ? p : { ...p, comments: [...p.comments, newComment] }));
    setCommentPost(prev => prev?.id === postId ? { ...prev, comments: [...prev.comments, newComment] } : prev);
  };

  if (showCreate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <View style={[styles.createHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.createBack, { borderColor: theme.border }]}><Feather name="arrow-left" size={20} color={theme.primaryText} /></TouchableOpacity>
          <Text style={[styles.createTitle, { color: theme.primaryText }]}>New Post</Text>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={[styles.createPostBtn, { backgroundColor: theme.accent }]}>
            <Text style={styles.createPostBtnText}>Post</Text>
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView ref={createScrollRef} contentContainerStyle={styles.createBody} keyboardShouldPersistTaps="handled">
            <View style={[styles.createAnonRow, { backgroundColor: theme.surface }]}>
              <View>
                <Text style={[styles.createAnonTitle, { color: theme.primaryText }]}>Post anonymously</Text>
                <Text style={[styles.createAnonSub, { color: theme.secondaryText }]}>Your identity stays hidden</Text>
              </View>
              <TouchableOpacity onPress={() => setAnon(a => !a)} activeOpacity={0.8} style={[styles.toggle, { backgroundColor: anon ? theme.primary : theme.border }]}>
                <View style={[styles.toggleThumb, { left: anon ? 22 : 3 }]} />
              </TouchableOpacity>
            </View>
            <View style={[styles.createAuthorRow, { backgroundColor: theme.surface }]}>
              <View style={[styles.authorAvatar, { backgroundColor: anon ? theme.navy : theme.primary }]}>
                <Text style={styles.authorAvatarText}>{anon ? '?' : 'M'}</Text>
              </View>
              <Text style={[styles.authorName, { color: theme.primaryText }]}>{anon ? 'Anonymous' : 'Mido'}</Text>
            </View>
            <TouchableOpacity style={[styles.photoPlaceholder, { borderColor: theme.primary, backgroundColor: theme.primary + '10' }]}>
              <Feather name="camera" size={32} color={theme.primary} />
              <Text style={[styles.photoPlaceholderText, { color: theme.primary }]}>Add photo</Text>
            </TouchableOpacity>
            <TextInput
              value={newPostText} onChangeText={setNewPostText}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.mutedText}
              multiline
              style={[styles.createTextInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.primaryText }]}
              blurOnSubmit
              returnKeyType="done"
              onFocus={() => setTimeout(() => createScrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Stories only (header nav is now fixed above the FlatList)
  const StoriesBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.storiesBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      {stories.map((s, i) => (
        <TouchableOpacity key={s.id} onPress={() => openStory(i)} style={styles.storyItem} activeOpacity={0.8}>
          <View style={[styles.storyRing, { borderColor: s.seen ? theme.border : theme.accent }]}>
            <View style={[styles.storyRingInner, { backgroundColor: s.seen ? theme.mutedText : theme.primary }]}>
              <Text style={styles.storyRingText}>{s.avatar}</Text>
            </View>
          </View>
          <Text style={[styles.storyName, { color: s.seen ? theme.mutedText : theme.primaryText, fontFamily: s.seen ? 'Inter_400Regular' : 'Inter_600SemiBold' }]} numberOfLines={1}>{s.user}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPost = ({ item: p }: { item: Post }) => {
    const total = Object.values(p.reactions).reduce((a, b) => a + b, 0);
    const topReacts = Object.entries(p.reactions).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return (
      <View style={[styles.postCard, { backgroundColor: theme.surface }]}>
        <View style={styles.postHeader}>
          <View style={[styles.postAvatar, { backgroundColor: p.anon ? theme.navy : theme.primary }]}>
            <Text style={styles.postAvatarText}>{p.anon ? '?' : p.avatar[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.postUserRow}>
              <Text style={[styles.postUser, { color: theme.primaryText }]}>{p.user}</Text>
              {p.tag && (
                <View style={[styles.postTag, { backgroundColor: theme.primary + '15' }]}>
                  <Text style={[styles.postTagText, { color: theme.primary }]}>{p.tag}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.postTime, { color: theme.secondaryText }]}>{p.time}</Text>
          </View>
          <Feather name="more-horizontal" size={18} color={theme.iconMuted} />
        </View>
        {/* Optional image placeholder for photo posts */}
        {p.imageBg && (
          <View style={[styles.postImage, { backgroundColor: p.imageBg }]}>
            <Feather name="image" size={28} color="rgba(255,255,255,0.7)" />
          </View>
        )}
        <Text style={[styles.postText, { color: theme.primaryText }]}>{p.text}</Text>
        {total > 0 && (
          <View style={styles.reactionSummary}>
            <View style={{ flexDirection: 'row' }}>{topReacts.map(([e]) => <Text key={e} style={styles.reactionEmoji}>{e}</Text>)}</View>
            <Text style={[styles.reactionCount, { color: theme.secondaryText }]}>{total} reactions</Text>
            <TouchableOpacity onPress={() => setCommentPost(p)} style={{ marginLeft: 'auto' }}>
              <Text style={[styles.commentCount, { color: theme.secondaryText }]}>{p.comments.length} comments</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.actionsRow}>
          {(['💪', '🔥', '❤️', '😂'] as const).map(emoji => {
            const active = !!p.myReactions[emoji];
            return (
              <TouchableOpacity key={emoji} onPress={() => toggleReaction(p.id, emoji)} style={styles.actionBtn} activeOpacity={0.7}>
                <Text style={[styles.actionEmoji, { opacity: active ? 1 : 0.6 }]}>{emoji}</Text>
                <Text style={[styles.actionCount, { color: active ? theme.primary : theme.secondaryText, fontFamily: active ? 'Inter_700Bold' : 'Inter_400Regular' }]}>{p.reactions[emoji] || 0}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setCommentPost(p)} style={[styles.actionBtn, { flex: 1.5 }]} activeOpacity={0.7}>
            <Feather name="message-circle" size={18} color={theme.secondaryText} />
            <Text style={[styles.actionCount, { color: theme.secondaryText }]}>{p.comments.length}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Story viewer modal */}
      {activeStoryIdx !== null && (
        <Modal visible animationType="fade" statusBarTranslucent>
          <StoryViewer
            story={stories[activeStoryIdx]}
            allStories={stories}
            storyIdx={activeStoryIdx}
            setStoryIdx={(i) => { setStories(s => s.map((st, idx) => idx === i ? { ...st, seen: true } : st)); setActiveStoryIdx(i); }}
            onClose={() => setActiveStoryIdx(null)}
          />
        </Modal>
      )}
      {/* Comments sheet */}
      {commentPost && (
        <CommentsSheet post={commentPost} onClose={() => setCommentPost(null)} onAddComment={addComment} />
      )}

      {/* ── Fixed Feed/DM header — does NOT scroll ── */}
      <View style={[styles.feedHeader, { paddingTop: topPad + 8, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Text style={[styles.feedTitle, { color: theme.primaryText }]}>Feed</Text>
        <TouchableOpacity onPress={() => router.push('/dms')} style={[styles.dmBtn, { borderColor: theme.border }]}>
          <Feather name="message-circle" size={22} color={theme.primaryText} />
        </TouchableOpacity>
      </View>

      {/* Feed — stories scroll with content; caught-up message at the end */}
      <FlatList
        data={posts}
        keyExtractor={p => String(p.id)}
        ListHeaderComponent={StoriesBar}
        ListFooterComponent={CaughtUpFooter}
        contentContainerStyle={{ paddingBottom: botPad + 80 }}
        renderItem={renderPost}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity onPress={() => setShowCreate(true)} style={[styles.fab, { backgroundColor: theme.accent, bottom: botPad + 90 }]} activeOpacity={0.85}>
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Story viewer
  storyContainer: { flex: 1, backgroundColor: '#000' },
  storyProgress: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingBottom: 8 },
  storyProgressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  storyProgressFill: { height: '100%', backgroundColor: '#fff' },
  storyTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingBottom: 12 },
  storyAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  storyAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  storyUser: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  storyTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  storySlide: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' },
  storyCaption: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  storyZoneLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%' },
  storyZoneRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%' },
  storyReplyBar: { backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14 },
  storyReplyInput: { flex: 1, padding: 10, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 14 },
  storyReplySend: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  storySentText: { textAlign: 'center', fontFamily: 'Inter_700Bold', fontSize: 14, flex: 1 },
  // Comments
  modalOverlay: { flex: 1 },
  commentsSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  commentsTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  commentRow: { flexDirection: 'row', gap: 10 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 12 },
  commentBubble: { borderRadius: 14, padding: 10, borderTopLeftRadius: 0 },
  commentUser: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  commentText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  commentTime: { fontSize: 11, marginTop: 4, marginLeft: 4 },
  commentInput: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 16, borderTopWidth: 1 },
  commentTextInput: { flex: 1, borderRadius: 22, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  commentSendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  // Fixed Feed header
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  feedTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  dmBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // Stories bar (scrolls with feed)
  storiesBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 14, borderBottomWidth: 1 },
  storyItem: { alignItems: 'center', gap: 4 },
  storyRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, padding: 2, alignItems: 'center', justifyContent: 'center' },
  storyRingInner: { width: '100%', height: '100%', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  storyRingText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  storyName: { fontSize: 11, maxWidth: 60, textAlign: 'center' },
  // Post cards
  postCard: { paddingBottom: 4 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  postAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  postUserRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  postUser: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  postTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  postTagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  postTime: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  postImage: { height: 180, marginHorizontal: 16, marginBottom: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  postText: { fontSize: 15, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 12, fontFamily: 'Inter_400Regular' },
  reactionSummary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 8 },
  reactionEmoji: { fontSize: 14, marginRight: -4 },
  reactionCount: { fontSize: 12, marginLeft: 8, fontFamily: 'Inter_400Regular' },
  commentCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  divider: { height: 1, marginHorizontal: 16 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 8 },
  actionBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 4 },
  actionEmoji: { fontSize: 20 },
  actionCount: { fontSize: 11 },
  // "You're all caught up" footer
  caughtUp: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 },
  caughtUpDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '70%', marginBottom: 4 },
  caughtUpLine: { flex: 1, height: 1 },
  caughtUpDot: { fontSize: 12 },
  caughtUpTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  caughtUpSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  // Create post
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  createBack: { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  createTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  createPostBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  createPostBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 13 },
  createBody: { padding: 20, gap: 16 },
  createAnonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 14 },
  createAnonTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  createAnonSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  toggle: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', position: 'relative' },
  toggleThumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', top: 3 },
  createAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  authorAvatarText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  authorName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  photoPlaceholder: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 14, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoPlaceholderText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  createTextInput: { borderRadius: 14, borderWidth: 1.5, padding: 14, fontSize: 15, height: 100, textAlignVertical: 'top' },
  // FAB
  fab: { position: 'absolute', right: 20, width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', ...Platform.select({ web: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 } }) },
});
