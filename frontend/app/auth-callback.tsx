import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const processGoogleAuth = useAuthStore((state) => state.processGoogleAuth);
  const hasProcessed = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        // Get the current URL
        const url = await Linking.getInitialURL();
        
        if (url) {
          // Parse the URL to get the session_id from the fragment
          const hashIndex = url.indexOf('#');
          if (hashIndex !== -1) {
            const fragment = url.substring(hashIndex + 1);
            const params = new URLSearchParams(fragment);
            const sessionId = params.get('session_id');
            
            if (sessionId) {
              const user = await processGoogleAuth(sessionId);
              
              if (!user.has_completed_questionnaire) {
                router.replace('/questionnaire');
              } else {
                router.replace('/(tabs)/feed');
              }
              return;
            }
          }
        }
        
        setError('Authentication failed. Please try again.');
        setTimeout(() => router.replace('/'), 2000);
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => router.replace('/'), 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.redirectText}>Redirecting...</Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.text}>Completing sign in...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginBottom: 8,
  },
  redirectText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
