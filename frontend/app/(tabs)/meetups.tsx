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
import { MeetupCard } from '../../src/components/MeetupCard';
import { COLORS } from '../../src/constants/theme';

export default function MeetupsScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [meetups, setMeetups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMeetups = useCallback(async () => {
    try {
      const data = await api.getMeetups();
      setMeetups(data);
    } catch (error) {
      console.error('Failed to fetch meetups:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetups();
  }, [fetchMeetups]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMeetups();
  };

  const handleAttend = async (meetupId: string) => {
    try {
      const { attending } = await api.attendMeetup(meetupId);
      setMeetups(meetups.map(meetup => {
        if (meetup.meetup_id === meetupId) {
          return {
            ...meetup,
            is_attending: attending,
            attendees_count: attending 
              ? meetup.attendees_count + 1 
              : meetup.attendees_count - 1,
          };
        }
        return meetup;
      }));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update attendance');
    }
  };

  const handleCreateMeetup = () => {
    if (user?.subscription_status !== 'premium') {
      Alert.alert(
        'Premium Required',
        'Creating meetups is a premium feature. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }
    router.push('/create-meetup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nature Meetups</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateMeetup}>
          <Ionicons name="add" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Ionicons name="leaf" size={24} color={COLORS.nature} />
        <Text style={styles.bannerText}>Connect with your tribe in nature</Text>
      </View>

      <FlatList
        data={meetups}
        renderItem={({ item }) => (
          <MeetupCard meetup={item} onAttend={() => handleAttend(item.meetup_id)} />
        )}
        keyExtractor={(item) => item.meetup_id}
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
              <Ionicons name="calendar" size={64} color={COLORS.nature} />
              <Text style={styles.emptyTitle}>No meetups yet</Text>
              <Text style={styles.emptyText}>
                Create a meetup to gather with your spiritual community in nature
              </Text>
              {user?.subscription_status === 'premium' && (
                <TouchableOpacity style={styles.createMeetupButton} onPress={handleCreateMeetup}>
                  <Text style={styles.createMeetupText}>Create Meetup</Text>
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
  createMeetupButton: {
    backgroundColor: COLORS.nature,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createMeetupText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
