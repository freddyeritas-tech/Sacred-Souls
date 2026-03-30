import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: {
    post_id: string;
    user_id: string;
    user_nickname: string;
    user_picture?: string;
    content: string;
    likes_count: number;
    liked_by_user: boolean;
    created_at: string;
  };
  onLike: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onLike }) => {
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {post.user_picture ? (
            <Image source={{ uri: post.user_picture }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{post.user_nickname.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.nickname}>{post.user_nickname}</Text>
          <Text style={styles.time}>{timeAgo}</Text>
        </View>
      </View>
      
      <Text style={styles.content}>{post.content}</Text>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onLike(post.post_id)}
        >
          <Ionicons 
            name={post.liked_by_user ? 'heart' : 'heart-outline'} 
            size={22} 
            color={post.liked_by_user ? COLORS.error : COLORS.textSecondary} 
          />
          <Text style={[styles.actionText, post.liked_by_user && styles.likedText]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  userInfo: {
    marginLeft: 12,
  },
  nickname: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  time: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontSize: 14,
  },
  likedText: {
    color: COLORS.error,
  },
});
