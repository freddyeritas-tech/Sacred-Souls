import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { format } from 'date-fns';

interface MeetupCardProps {
  meetup: {
    meetup_id: string;
    circle_name: string;
    creator_name: string;
    title: string;
    description: string;
    location: string;
    date: string;
    attendees_count: number;
    is_attending: boolean;
  };
  onAttend: () => void;
}

export const MeetupCard: React.FC<MeetupCardProps> = ({ meetup, onAttend }) => {
  const meetupDate = new Date(meetup.date);
  const day = format(meetupDate, 'dd');
  const month = format(meetupDate, 'MMM');
  const time = format(meetupDate, 'h:mm a');

  return (
    <View style={styles.container}>
      <View style={styles.dateBox}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.circleName}>{meetup.circle_name}</Text>
        <Text style={styles.title}>{meetup.title}</Text>
        
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color={COLORS.nature} />
          <Text style={styles.location}>{meetup.location}</Text>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>{meetup.description}</Text>
        
        <View style={styles.footer}>
          <View style={styles.attendees}>
            <Ionicons name="people" size={16} color={COLORS.textMuted} />
            <Text style={styles.attendeesText}>{meetup.attendees_count} attending</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.attendButton, meetup.is_attending && styles.attendingButton]} 
            onPress={onAttend}
          >
            <Text style={[styles.attendText, meetup.is_attending && styles.attendingText]}>
              {meetup.is_attending ? 'Attending' : 'Attend'}
            </Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
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
  attendButton: {
    backgroundColor: COLORS.primary,
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
