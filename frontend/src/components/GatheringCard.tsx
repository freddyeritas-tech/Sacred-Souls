import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { format } from 'date-fns';

interface GatheringCardProps {
  gathering: {
    gathering_id: string;
    circle_name: string;
    creator_name: string;
    title: string;
    description: string;
    gathering_type: 'in_person' | 'virtual';
    location?: string;
    virtual_link?: string;
    date: string;
    attendees_count: number;
    is_attending: boolean;
  };
  onAttend: () => void;
  onJoinVirtual?: () => void;
}

export const GatheringCard: React.FC<GatheringCardProps> = ({ 
  gathering, 
  onAttend,
  onJoinVirtual 
}) => {
  const gatheringDate = new Date(gathering.date);
  const day = format(gatheringDate, 'dd');
  const month = format(gatheringDate, 'MMM');
  const time = format(gatheringDate, 'h:mm a');
  const isVirtual = gathering.gathering_type === 'virtual';

  return (
    <View style={styles.container}>
      <View style={[styles.dateBox, isVirtual && styles.virtualDateBox]}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.time}>{time}</Text>
        <View style={styles.typeTag}>
          <Ionicons 
            name={isVirtual ? 'videocam' : 'leaf'} 
            size={12} 
            color={COLORS.text} 
          />
        </View>
      </View>
      
      <View style={styles.content}>
        <View style={styles.typeIndicator}>
          <Ionicons 
            name={isVirtual ? 'videocam' : 'location'} 
            size={14} 
            color={isVirtual ? COLORS.primary : COLORS.nature} 
          />
          <Text style={[styles.typeText, isVirtual && styles.virtualTypeText]}>
            {isVirtual ? 'Virtual Gathering' : 'In-Person'}
          </Text>
        </View>
        
        <Text style={styles.circleName}>{gathering.circle_name}</Text>
        <Text style={styles.title}>{gathering.title}</Text>
        
        {!isVirtual && gathering.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={COLORS.nature} />
            <Text style={styles.location}>{gathering.location}</Text>
          </View>
        )}
        
        <Text style={styles.description} numberOfLines={2}>{gathering.description}</Text>
        
        <View style={styles.footer}>
          <View style={styles.attendees}>
            <Ionicons name="people" size={16} color={COLORS.textMuted} />
            <Text style={styles.attendeesText}>{gathering.attendees_count} attending</Text>
          </View>
          
          <View style={styles.actions}>
            {isVirtual && gathering.is_attending && onJoinVirtual && (
              <TouchableOpacity 
                style={styles.joinButton} 
                onPress={onJoinVirtual}
              >
                <Ionicons name="videocam" size={16} color={COLORS.text} />
                <Text style={styles.joinText}>Join</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.attendButton, gathering.is_attending && styles.attendingButton]} 
              onPress={onAttend}
            >
              <Text style={[styles.attendText, gathering.is_attending && styles.attendingText]}>
                {gathering.is_attending ? 'Attending' : 'Attend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
  },
  dateBox: {
    width: 60,
    alignItems: 'center',
    backgroundColor: COLORS.nature,
    borderRadius: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  virtualDateBox: {
    backgroundColor: COLORS.primary,
  },
  month: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  day: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  time: {
    color: COLORS.text,
    fontSize: 10,
    marginTop: 2,
  },
  typeTag: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 4,
  },
  content: {
    flex: 1,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    color: COLORS.nature,
    marginLeft: 4,
    fontWeight: '500',
  },
  virtualTypeText: {
    color: COLORS.primary,
  },
  circleName: {
    color: COLORS.primaryLight,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  location: {
    color: COLORS.nature,
    fontSize: 13,
    marginLeft: 4,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeesText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  joinText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  attendButton: {
    backgroundColor: COLORS.nature,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attendingButton: {
    backgroundColor: COLORS.success,
  },
  attendText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  attendingText: {
    color: COLORS.text,
  },
});
