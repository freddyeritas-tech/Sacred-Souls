import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { CircleChat } from '../../src/components/CircleChat';
import { COLORS, SPIRITUAL_INTERESTS } from '../../src/constants/theme';

type TabType = 'chat' | 'about' | 'members';

export default function CircleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const [circle, setCircle] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCircle = useCallback(async () => {
    try {
      const data = await api.getCircle(id as string);
      setCircle(data);
    } catch (error) {
      console.error('Failed to fetch circle:', error);
      Alert.alert('Error', 'Failed to load circle');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCircle();
  }, [fetchCircle]);

  const handleJoin = async () => {
    try {
      await api.joinCircle(id as string);
      fetchCircle();
      Alert.alert('Welcome!', 'You have joined the circle');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join');
    }
  };

  const handleLeave = async () => {
    Alert.alert(
      'Leave Circle',
      'Are you sure you want to leave this circle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.leaveCircle(id as string);
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to leave');
            }
          },
        },
      ]
    );
  };

  const handleStartVideoCall = () => {
    if (user?.subscription_status !== 'premium') {
      Alert.alert(
        'Premium Required',
        'Video calls are a premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    router.push(`/video-call?room=${circle.circle_id}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Circle not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{circle.name}</Text>
          <Text style={styles.headerSubtitle}>{circle.members_count} members</Text>
        </View>
        {circle.is_member && user?.subscription_status === 'premium' && (
          <TouchableOpacity style={styles.videoButton} onPress={handleStartVideoCall}>
            <Ionicons name="videocam" size={22} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>

      {circle.is_member ? (
        <>
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
              onPress={() => setActiveTab('chat')}
            >
              <Ionicons name="chatbubbles" size={18} color={activeTab === 'chat' ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'about' && styles.tabActive]}
              onPress={() => setActiveTab('about')}
            >
              <Ionicons name="information-circle" size={18} color={activeTab === 'about' ? COLORS.text : COLORS.textMuted} />
              <Text style={[styles.tabText, activeTab === 'about' && styles.tabTextActive]}>About</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'chat' ? (
            <CircleChat circleId={circle.circle_id} currentUserId={user?.user_id || ''} />
          ) : (
            <ScrollView style={styles.aboutContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.description}>{circle.description}</Text>
              </View>

              {circle.spiritual_focus?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Spiritual Focus</Text>
                  <View style={styles.tags}>
                    {circle.spiritual_focus.map((focus: string) => {
                      const interest = SPIRITUAL_INTERESTS.find(i => i.id === focus);
                      return (
                        <View key={focus} style={styles.tag}>
                          <Ionicons name={interest?.icon as any || 'star'} size={14} color={COLORS.primary} />
                          <Text style={styles.tagText}>{interest?.label || focus}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Created by</Text>
                <Text style={styles.creatorName}>{circle.creator_name}</Text>
              </View>

              {circle.creator_id !== user?.user_id && (
                <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                  <Ionicons name="exit-outline" size={20} color={COLORS.error} />
                  <Text style={styles.leaveButtonText}>Leave Circle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView style={styles.joinContent}>
          <View style={styles.circleIcon}>
            <Ionicons name="people" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.circleName}>{circle.name}</Text>
          <Text style={styles.circleDescription}>{circle.description}</Text>
          
          {circle.spiritual_focus?.length > 0 && (
            <View style={styles.tags}>
              {circle.spiritual_focus.map((focus: string) => {
                const interest = SPIRITUAL_INTERESTS.find(i => i.id === focus);
                return (
                  <View key={focus} style={styles.tag}>
                    <Text style={styles.tagText}>{interest?.label || focus}</Text>
                  </View>
                );
              })}
            </View>
          )}
          
          <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
            <Text style={styles.joinButtonText}>Join Circle</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  videoButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.text,
  },
  aboutContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 14,
  },
  creatorName: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  leaveButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '600',
  },
  joinContent: {
    flex: 1,
    padding: 24,
  },
  circleIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  circleName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  circleDescription: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  joinButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
