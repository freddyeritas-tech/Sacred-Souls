import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../src/services/api';
import { useAuthStore } from '../src/store/authStore';
import { COLORS, SPIRITUAL_INTERESTS, EXPERIENCE_LEVELS, LOOKING_FOR } from '../src/constants/theme';

export default function QuestionnaireScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((state) => state.updateUser);
  
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleLookingFor = (id: string) => {
    setLookingFor(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step === 1 && selectedInterests.length === 0) {
      Alert.alert('Select Interests', 'Please select at least one spiritual interest');
      return;
    }
    if (step === 2 && !experienceLevel) {
      Alert.alert('Select Level', 'Please select your experience level');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (lookingFor.length === 0) {
      Alert.alert('Select Goals', 'Please select what you\'re looking for');
      return;
    }

    setIsLoading(true);
    try {
      await api.submitQuestionnaire({
        spiritual_interests: selectedInterests,
        experience_level: experienceLevel,
        looking_for: lookingFor,
      });
      updateUser({ 
        has_completed_questionnaire: true,
        spiritual_interests: selectedInterests,
      });
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save your preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <Text style={styles.stepTitle}>What spiritual paths resonate with you?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply</Text>
      
      <View style={styles.grid}>
        {SPIRITUAL_INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest.id}
            style={[
              styles.interestCard,
              selectedInterests.includes(interest.id) && styles.interestCardSelected,
            ]}
            onPress={() => toggleInterest(interest.id)}
          >
            <Ionicons 
              name={interest.icon as any} 
              size={28} 
              color={selectedInterests.includes(interest.id) ? COLORS.primary : COLORS.textSecondary} 
            />
            <Text style={[
              styles.interestLabel,
              selectedInterests.includes(interest.id) && styles.interestLabelSelected,
            ]}>
              {interest.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={styles.stepTitle}>What's your experience level?</Text>
      <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>
      
      <View style={styles.levelList}>
        {EXPERIENCE_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.id}
            style={[
              styles.levelCard,
              experienceLevel === level.id && styles.levelCardSelected,
            ]}
            onPress={() => setExperienceLevel(level.id)}
          >
            <View style={styles.levelHeader}>
              <Text style={[
                styles.levelLabel,
                experienceLevel === level.id && styles.levelLabelSelected,
              ]}>
                {level.label}
              </Text>
              {experienceLevel === level.id && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.levelDescription}>{level.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={styles.stepTitle}>What are you looking for?</Text>
      <Text style={styles.stepSubtitle}>Select all that apply</Text>
      
      <View style={styles.levelList}>
        {LOOKING_FOR.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.levelCard,
              lookingFor.includes(item.id) && styles.levelCardSelected,
            ]}
            onPress={() => toggleLookingFor(item.id)}
          >
            <View style={styles.levelHeader}>
              <Text style={[
                styles.levelLabel,
                lookingFor.includes(item.id) && styles.levelLabelSelected,
              ]}>
                {item.label}
              </Text>
              {lookingFor.includes(item.id) && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </View>
            <Text style={styles.levelDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progress}>
          {[1, 2, 3].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressDot,
                s <= step && styles.progressDotActive,
              ]} 
            />
          ))}
        </View>
        <Text style={styles.stepIndicator}>Step {step} of 3</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setStep(step - 1)}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.nextButton, step === 1 && styles.nextButtonFull]} 
          onPress={step === 3 ? handleSubmit : handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Complete' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressDot: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.card,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  stepIndicator: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  interestCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  interestCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundLight,
  },
  interestLabel: {
    color: COLORS.textSecondary,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  interestLabelSelected: {
    color: COLORS.text,
    fontWeight: '500',
  },
  levelList: {
    gap: 12,
  },
  levelCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  levelCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundLight,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  levelLabelSelected: {
    color: COLORS.text,
  },
  levelDescription: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButton: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
