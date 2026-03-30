import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/theme';

const PREMIUM_FEATURES = [
  { icon: 'people', title: 'Create Circles', description: 'Build your own spiritual communities' },
  { icon: 'calendar', title: 'Host Meetups', description: 'Organize nature gatherings' },
  { icon: 'chatbubbles', title: 'Group Chat', description: 'Connect within your circles' },
  { icon: 'eye-off', title: 'Ad-Free', description: 'Distraction-free experience' },
  { icon: 'star', title: 'Premium Badge', description: 'Stand out in the community' },
  { icon: 'infinite', title: 'Unlimited Access', description: 'All features unlocked' },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((state) => state.updateUser);
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const data = await api.getSubscriptionStatus();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    Alert.alert(
      'Upgrade to Premium',
      'This will activate your premium subscription for €10/month. (Demo - no actual payment)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade',
          onPress: async () => {
            setIsUpgrading(true);
            try {
              await api.upgradeSubscription();
              updateUser({ subscription_status: 'premium' });
              Alert.alert('Success!', 'Welcome to Sacred Souls Premium!');
              fetchSubscription();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to upgrade');
            } finally {
              setIsUpgrading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription?',
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelSubscription();
              updateUser({ subscription_status: 'free' });
              fetchSubscription();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPremium = subscription?.plan === 'premium';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.starContainer}>
            <Ionicons name="star" size={48} color={COLORS.premium} />
          </View>
          <Text style={styles.heroTitle}>
            {isPremium ? 'You\'re Premium!' : 'Go Premium'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isPremium 
              ? 'Thank you for supporting our community'
              : 'Unlock the full Sacred Souls experience'
            }
          </Text>
        </View>

        {!isPremium && (
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Monthly</Text>
            <View style={styles.priceRow}>
              <Text style={styles.currency}>€</Text>
              <Text style={styles.price}>10</Text>
              <Text style={styles.period}>/month</Text>
            </View>
            <Text style={styles.priceNote}>Cancel anytime</Text>
          </View>
        )}

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={[styles.featureIcon, isPremium && styles.featureIconActive]}>
                <Ionicons 
                  name={feature.icon as any} 
                  size={24} 
                  color={isPremium ? COLORS.premium : COLORS.primary} 
                />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              {isPremium && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
              )}
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.subscriptionInfo}>
            <Text style={styles.infoLabel}>Current Plan</Text>
            <Text style={styles.infoValue}>Premium - €10/month</Text>
            
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.upgradeButton} 
            onPress={handleUpgrade}
            disabled={isUpgrading}
          >
            {isUpgrading ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <>
                <Ionicons name="star" size={20} color={COLORS.background} />
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Demo mode - No actual payment will be processed
        </Text>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    width: 44,
  },
  scrollContent: {
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.premium,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: COLORS.premium,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  currency: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.premium,
    marginBottom: 4,
  },
  price: {
    fontSize: 56,
    fontWeight: '700',
    color: COLORS.premium,
  },
  period: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  priceNote: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureIconActive: {
    backgroundColor: COLORS.backgroundLight,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  subscriptionInfo: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.premium,
    marginBottom: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.premium,
    paddingVertical: 18,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  upgradeButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
  },
});
