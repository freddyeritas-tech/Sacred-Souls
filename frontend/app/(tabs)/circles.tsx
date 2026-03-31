import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { CircleCard } from '../../src/components/CircleCard';
import { COLORS } from '../../src/constants/theme';

export default function CirclesScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [circles, setCircles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCircles = useCallback(async () => {
    try {
      const data = activeTab === 'my' 
        ? await api.getMyCircles()
        : await api.getCircles();
      setCircles(data);
    } catch (error) {
      console.error('Failed to fetch circles:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCircles();
  }, [fetchCircles]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCircles();
  };

  const handleCreateCircle = () => {
    if (user?.subscription_status !== 'premium') {
      Alert.alert(
        'Premium Required',
        'Creating circles is a premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    router.push('/create-circle');
  };

  const handleJoinCircle = async (circleId: string) => {
    try {
      await api.joinCircle(circleId);
      fetchCircles();
      Alert.alert('Success', 'You have joined the circle!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join circle');
    }
  };

  const handleCirclePress = (circleId: string) => {
    router.push(`/circle/${circleId}` as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Circles</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateCircle}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.tabTextActive]}>
            My Circles
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={circles}
        renderItem={({ item }) => (
          <CircleCard
            circle={item}
            onPress={() => handleCirclePress(item.circle_id)}
            onJoin={!item.is_member ? () => handleJoinCircle(item.circle_id) : undefined}
          />
        )}
        keyExtractor={(item) => item.circle_id}
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
              <Ionicons name="people" size={64} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'my' ? 'No circles yet' : 'No circles found'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'my' 
                  ? 'Join or create a circle to connect with others'
                  : 'Be the first to create a spiritual circle'
                }
              </Text>
              {user?.subscription_status === 'premium' && (
                <TouchableOpacity style={styles.createCircleButton} onPress={handleCreateCircle}>
                  <Text style={styles.createCircleText}>Create Circle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
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
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.text,
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
    marginBottom: 24,
  },
  createCircleButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createCircleText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
