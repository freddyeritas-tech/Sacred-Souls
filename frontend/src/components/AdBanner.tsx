import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface AdBannerProps {
  onUpgrade?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({ onUpgrade }) => {
  return (
    <View style={styles.container}>
      <View style={styles.adContent}>
        <Ionicons name="megaphone" size={24} color={COLORS.textMuted} />
        <Text style={styles.adText}>Advertisement Space</Text>
      </View>
      {onUpgrade && (
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
          <Text style={styles.upgradeText}>Go Premium - No Ads</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  adContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  adText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: COLORS.premium,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  upgradeText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 12,
  },
});
