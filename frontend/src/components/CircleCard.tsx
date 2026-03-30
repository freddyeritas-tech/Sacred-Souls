import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPIRITUAL_INTERESTS } from '../constants/theme';

interface CircleCardProps {
  circle: {
    circle_id: string;
    name: string;
    description: string;
    creator_name: string;
    members_count: number;
    is_public: boolean;
    spiritual_focus: string[];
    is_member: boolean;
  };
  onPress: () => void;
  onJoin?: () => void;
}

export const CircleCard: React.FC<CircleCardProps> = ({ circle, onPress, onJoin }) => {
  const getFocusIcon = (focusId: string) => {
    const interest = SPIRITUAL_INTERESTS.find(i => i.id === focusId);
    return interest?.icon || 'star';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={circle.spiritual_focus[0] ? getFocusIcon(circle.spiritual_focus[0]) as any : 'people'} 
            size={28} 
            color={COLORS.primary} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{circle.name}</Text>
          <Text style={styles.creator}>by {circle.creator_name}</Text>
        </View>
        {!circle.is_public && (
          <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
        )}
      </View>
      
      <Text style={styles.description} numberOfLines={2}>{circle.description}</Text>
      
      <View style={styles.footer}>
        <View style={styles.members}>
          <Ionicons name="people" size={16} color={COLORS.textMuted} />
          <Text style={styles.membersText}>{circle.members_count} members</Text>
        </View>
        
        {circle.spiritual_focus.length > 0 && (
          <View style={styles.tags}>
            {circle.spiritual_focus.slice(0, 2).map((focus, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>
                  {SPIRITUAL_INTERESTS.find(i => i.id === focus)?.label || focus}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      
      {onJoin && !circle.is_member && (
        <TouchableOpacity style={styles.joinButton} onPress={onJoin}>
          <Text style={styles.joinText}>Join Circle</Text>
        </TouchableOpacity>
      )}
      
      {circle.is_member && (
        <View style={styles.memberBadge}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.memberText}>Member</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
  },
  creator: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  members: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  membersText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginLeft: 6,
  },
  tags: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: COLORS.primaryLight,
    fontSize: 11,
  },
  joinButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  memberBadge: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  memberText: {
    color: COLORS.success,
    marginLeft: 6,
    fontWeight: '500',
  },
});
