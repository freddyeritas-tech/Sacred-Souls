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
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/7181865/pexels-photo-7181865.jpeg?auto=compress&cs=tinysrgb&w=300' }}
            style={styles.logoImage}
          />
        </View>
        
        <Text style={styles.title}>Sacred Souls</Text>
        <Text style={styles.subtitle}>Connect to Your Spiritual Tribe</Text>
        
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Ionicons name="people" size={24} color={COLORS.primary} />
            <Text style={styles.featureText}>Join spiritual circles</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="videocam" size={24} color={COLORS.accent} />
            <Text style={styles.featureText}>Virtual & nature gatherings</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="leaf" size={24} color={COLORS.nature} />
            <Text style={styles.featureText}>Connect with conscious souls</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="sunny" size={24} color={COLORS.premium} />
            <Text style={styles.featureText}>Daily spiritual inspiration</Text>
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
      
      <Text style={styles.tagline}>Connect. Grow. Awaken.</Text>
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
    marginBottom: 24,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primaryLight,
    marginBottom: 48,
    fontWeight: '500',
    letterSpacing: 1,
  },
  features: {
    gap: 18,
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
    paddingBottom: 16,
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
  tagline: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
