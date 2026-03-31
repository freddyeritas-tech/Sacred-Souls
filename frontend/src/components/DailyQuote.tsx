import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { COLORS } from '../constants/theme';

interface DailyQuoteProps {
  onClose?: () => void;
}

export const DailyQuote: React.FC<DailyQuoteProps> = ({ onClose }) => {
  const [quote, setQuote] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    try {
      const data = await api.getDailyQuote();
      setQuote(data.quote);
      setTheme(data.theme || '');
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      setQuote('The journey within is the greatest adventure you will ever take.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="sunny" size={24} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>Daily Inspiration</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.quote}>"{quote}"</Text>
      
      {theme && (
        <View style={styles.themeTag}>
          <Ionicons name="leaf" size={12} color={COLORS.nature} />
          <Text style={styles.themeText}>{theme}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.shareButton} onPress={() => {}}>
        <Ionicons name="share-outline" size={18} color={COLORS.primary} />
        <Text style={styles.shareText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  quote: {
    fontSize: 18,
    fontStyle: 'italic',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 16,
  },
  themeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    marginBottom: 12,
  },
  themeText: {
    fontSize: 12,
    color: COLORS.nature,
    textTransform: 'capitalize',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  shareText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
