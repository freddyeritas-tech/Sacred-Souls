import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { GatheringCard } from '../../src/components/GatheringCard';
import { COLORS } from '../../src/constants/theme';

type GatheringType = 'all' | 'in_person' | 'virtual';

export default function MeetupsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [gatherings, setGatherings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<GatheringType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGatherings = useCallback(async () => {
    try {
      const gatheringType = activeTab === 'all' ? undefined : activeTab;
      const data = await api.getGatherings(undefined, gatheringType);
      setGatherings(data);
    } catch (error) {
      console.error('Failed to fetch gatherings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchGatherings();
  }, [fetchGatherings]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchGatherings();
  };

  const handleAttend = async (gatheringId: string) => {
    try {
      const { attending } = await api.attendGathering(gatheringId);
      setGatherings(gatherings.map(g => {
        if (g.gathering_id === gatheringId) {
          return {
            ...g,
            is_attending: attending,
            attendees_count: attending 
              ? g.attendees_count + 1 
              : g.attendees_count - 1,
          };
        }
        return g;
      }));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attendance');
    }
  };

  const handleJoinVirtual = (virtualLink?: string) => {
    if (virtualLink) {
      Linking.openURL(virtualLink);
    } else {
      Alert.alert('Info', 'Virtual meeting link will be shared closer to the event');
    }
  };

  const handleCreateGathering = () => {
    if (user?.subscription_status !== 'premium') {
      Alert.alert(
        'Premium Required',
        'Creating gatherings is a premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    router.push('/create-gathering');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gatherings</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateGathering}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'in_person' && styles.tabActive]}
          onPress={() => setActiveTab('in_person')}
        >
          <Ionicons 
            name="leaf" 
            size={16} 
            color={activeTab === 'in_person' ? COLORS.text : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'in_person' && styles.tabTextActive]}>
            In Nature
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'virtual' && styles.tabActive]}
          onPress={() => setActiveTab('virtual')}
        >
          <Ionicons 
            name="videocam" 
            size={16} 
            color={activeTab === 'virtual' ? COLORS.text : COLORS.textMuted} 
          />
          <Text style={[styles.tabText, activeTab === 'virtual' && styles.tabTextActive]}>
            Virtual
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Ionicons 
          name={activeTab === 'virtual' ? 'videocam' : 'leaf'} 
          size={24} 
          color={activeTab === 'virtual' ? COLORS.primary : COLORS.nature} 
        />
        <Text style={styles.bannerText}>
          {activeTab === 'virtual' 
            ? 'Connect with your tribe online'
            : 'Connect with your tribe in nature'
          }
        </Text>
      </View>

      <FlatList
        data={gatherings}
        renderItem={({ item }) => (
          <GatheringCard 
            gathering={item} 
            onAttend={() => handleAttend(item.gathering_id)}
            onJoinVirtual={() => handleJoinVirtual(item.virtual_link)}
          />
        )}
        keyExtractor={(item) => item.gathering_id}
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
              <Ionicons 
                name={activeTab === 'virtual' ? 'videocam' : 'calendar'} 
                size={64} 
                color={activeTab === 'virtual' ? COLORS.primary : COLORS.nature} 
              />
              <Text style={styles.emptyTitle}>No gatherings yet</Text>
              <Text style={styles.emptyText}>
                {activeTab === 'virtual'
                  ? 'Create a virtual gathering to connect online'
                  : 'Create a gathering to meet in nature'
                }
              </Text>
              {user?.subscription_status === 'premium' && (
                <TouchableOpacity style={styles.createGatheringButton} onPress={handleCreateGathering}>
                  <Text style={styles.createGatheringText}>Create Gathering</Text>
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
    backgroundColor: COLORS.nature,
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.nature,
  },
  bannerText: {
    color: COLORS.text,
    fontSize: 15,
    marginLeft: 12,
    fontWeight: '500',
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
  createGatheringButton: {
    backgroundColor: COLORS.nature,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createGatheringText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
