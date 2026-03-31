import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { PostCard } from '../../src/components/PostCard';
import { AdBanner } from '../../src/components/AdBanner';
import { DailyQuote } from '../../src/components/DailyQuote';
import { COLORS } from '../../src/constants/theme';

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    setIsPosting(true);
    try {
      const post = await api.createPost(newPost.trim());
      setPosts([post, ...posts]);
      setNewPost('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const { liked } = await api.likePost(postId);
      setPosts(posts.map(post => {
        if (post.post_id === postId) {
          return {
            ...post,
            liked_by_user: liked,
            likes_count: liked ? post.likes_count + 1 : post.likes_count - 1,
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleUpgrade = () => {
    router.push('/subscription');
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    // Show ad after every 3 posts for free users
    const showAd = user?.subscription_status === 'free' && (index + 1) % 3 === 0;
    
    return (
      <>
        <PostCard post={item} onLike={handleLike} />
        {showAd && <AdBanner onUpgrade={handleUpgrade} />}
      </>
    );
  };

  const ListHeaderComponent = () => (
    <>
      {/* Daily Quote for all users (free feature) */}
      <DailyQuote />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sacred Feed</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.createPost}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.nickname?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Share your spiritual journey..."
            placeholderTextColor={COLORS.textMuted}
            value={newPost}
            onChangeText={setNewPost}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.postButton, !newPost.trim() && styles.postButtonDisabled]}
            onPress={handleCreatePost}
            disabled={!newPost.trim() || isPosting}
          >
            <Ionicons name="send" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.post_id}
          ListHeaderComponent={ListHeaderComponent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="leaf" size={64} color={COLORS.primary} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyText}>Be the first to share something with the community</Text>
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  createPost: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    marginHorizontal: 12,
    maxHeight: 80,
  },
  postButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    backgroundColor: COLORS.card,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
