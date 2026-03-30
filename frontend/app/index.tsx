import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { LoadingScreen } from '../src/components/LoadingScreen';
import { COLORS } from '../src/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (!user.has_completed_questionnaire) {
        router.replace('/questionnaire');
      } else {
        router.replace('/(tabs)/feed');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return <LoadingScreen message="Awakening your journey..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="flower" size={60} color={COLORS.primary} />
          </View>
        </View>
        
        <Text style={styles.title}>Sacred Souls</Text>
        <Text style={styles.subtitle}>Connect with your spiritual tribe</Text>
        
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Join spiritual circles</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="leaf" size={24} color={COLORS.nature} />
            <Text style={styles.featureText}>Nature meetups & events</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="heart" size={24} color={COLORS.accent} />
            <Text style={styles.featureText}>Share your journey</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryButtonText}>Begin Your Journey</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: 48,
  },
  features: {
    gap: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureText: {
    fontSize: 16,
    color: COLORS.text,
  },
  buttons: {
    gap: 12,
    paddingBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
