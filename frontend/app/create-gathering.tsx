import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { COLORS } from '../src/constants/theme';

type GatheringType = 'in_person' | 'virtual';

export default function CreateGatheringScreen() {
  const router = useRouter();
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);
  const [gatheringType, setGatheringType] = useState<GatheringType>('in_person');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [virtualLink, setVirtualLink] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);

  useEffect(() => {
    fetchMyCircles();
  }, []);

  const fetchMyCircles = async () => {
    try {
      const data = await api.getMyCircles();
      setCircles(data);
      if (data.length > 0) {
        setSelectedCircle(data[0].circle_id);
      }
    } catch (error) {
      console.error('Failed to fetch circles:', error);
    } finally {
      setIsLoadingCircles(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedCircle) {
      Alert.alert('Error', 'Please select a circle');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (gatheringType === 'in_person' && !location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }
    if (!date || !time) {
      Alert.alert('Error', 'Please enter date and time');
      return;
    }

    const gatheringDate = new Date(`${date}T${time}:00`);
    if (isNaN(gatheringDate.getTime())) {
      Alert.alert('Error', 'Invalid date or time format');
      return;
    }

    setIsLoading(true);
    try {
      await api.createGathering({
        circle_id: selectedCircle,
        title: title.trim(),
        description: description.trim(),
        gathering_type: gatheringType,
        location: gatheringType === 'in_person' ? location.trim() : undefined,
        virtual_link: gatheringType === 'virtual' ? virtualLink.trim() : undefined,
        date: gatheringDate.toISOString(),
      });
      Alert.alert('Success', 'Gathering created successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create gathering');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingCircles) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (circles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Gathering</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people" size={64} color={COLORS.primary} />
          <Text style={styles.emptyTitle}>Join a Circle First</Text>
          <Text style={styles.emptyText}>
            You need to be a member of at least one circle to create a gathering
          </Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => router.replace('/(tabs)/circles')}
          >
            <Text style={styles.browseButtonText}>Browse Circles</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isValid = title && (gatheringType === 'virtual' || location) && date && time;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Gathering</Text>
        <TouchableOpacity 
          style={[styles.createButton, !isValid && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={isLoading || !isValid}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Gathering Type Selector */}
          <View style={styles.typeSelector}>
            <TouchableOpacity 
              style={[styles.typeOption, gatheringType === 'in_person' && styles.typeOptionActive]}
              onPress={() => setGatheringType('in_person')}
            >
              <View style={[styles.typeIcon, gatheringType === 'in_person' && styles.typeIconActive]}>
                <Ionicons name="leaf" size={24} color={gatheringType === 'in_person' ? COLORS.nature : COLORS.textMuted} />
              </View>
              <Text style={[styles.typeLabel, gatheringType === 'in_person' && styles.typeLabelActive]}>
                In Nature
              </Text>
              <Text style={styles.typeDescription}>Meet in person outdoors</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.typeOption, gatheringType === 'virtual' && styles.typeOptionActive]}
              onPress={() => setGatheringType('virtual')}
            >
              <View style={[styles.typeIcon, gatheringType === 'virtual' && styles.typeIconVirtualActive]}>
                <Ionicons name="videocam" size={24} color={gatheringType === 'virtual' ? COLORS.primary : COLORS.textMuted} />
              </View>
              <Text style={[styles.typeLabel, gatheringType === 'virtual' && styles.typeLabelActive]}>
                Virtual
              </Text>
              <Text style={styles.typeDescription}>Connect online</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Circle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.circleSelector}>
                {circles.map((circle) => (
                  <TouchableOpacity
                    key={circle.circle_id}
                    style={[
                      styles.circleChip,
                      selectedCircle === circle.circle_id && styles.circleChipSelected,
                    ]}
                    onPress={() => setSelectedCircle(circle.circle_id)}
                  >
                    <Text style={[
                      styles.circleChipText,
                      selectedCircle === circle.circle_id && styles.circleChipTextSelected,
                    ]}>
                      {circle.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder={gatheringType === 'virtual' ? "e.g., Online Meditation Session" : "e.g., Forest Meditation Walk"}
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What will you do at this gathering?"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          {gatheringType === 'in_person' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <View style={styles.locationInput}>
                <Ionicons name="location" size={20} color={COLORS.nature} style={styles.locationIcon} />
                <TextInput
                  style={styles.locationTextInput}
                  placeholder="e.g., Central Park, North Meadow"
                  placeholderTextColor={COLORS.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Virtual Meeting Link (optional)</Text>
              <View style={styles.locationInput}>
                <Ionicons name="link" size={20} color={COLORS.primary} style={styles.locationIcon} />
                <TextInput
                  style={styles.locationTextInput}
                  placeholder="e.g., https://zoom.us/j/..."
                  placeholderTextColor={COLORS.textMuted}
                  value={virtualLink}
                  onChangeText={setVirtualLink}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <Text style={styles.hint}>You can add the link later before the event</Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textMuted}
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <View style={[styles.tip, gatheringType === 'virtual' && styles.tipVirtual]}>
            <Ionicons 
              name={gatheringType === 'virtual' ? 'videocam' : 'leaf'} 
              size={20} 
              color={gatheringType === 'virtual' ? COLORS.primary : COLORS.nature} 
            />
            <Text style={styles.tipText}>
              {gatheringType === 'virtual'
                ? 'Virtual gatherings are perfect for guided meditations, group discussions, and connecting across distances'
                : 'Nature gatherings are perfect for connecting with your spiritual community outdoors'
              }
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  createButton: {
    backgroundColor: COLORS.nature,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.card,
  },
  createButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeOption: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeOptionActive: {
    borderColor: COLORS.primary,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeIconActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  typeIconVirtualActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  typeLabelActive: {
    color: COLORS.text,
  },
  typeDescription: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  circleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  circleChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  circleChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.backgroundLight,
  },
  circleChipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  circleChipTextSelected: {
    color: COLORS.text,
    fontWeight: '500',
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  locationIcon: {
    paddingLeft: 16,
  },
  locationTextInput: {
    flex: 1,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.nature,
    marginTop: 8,
  },
  tipVirtual: {
    borderLeftColor: COLORS.primary,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
