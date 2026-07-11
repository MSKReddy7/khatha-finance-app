import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  message: string;
  subMessage?: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  subMessage,
  actionButton,
}) => {
  const theme = useTheme() as any;

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.elevation.level1 }]}>
        <MaterialCommunityIcons name={icon as any} size={48} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={styles.message}>
        {message}
      </Text>
      {subMessage && (
        <Text variant="bodyMedium" style={[styles.subMessage, { color: theme.colors.onSurfaceVariant }]}>
          {subMessage}
        </Text>
      )}
      {actionButton && <View style={styles.actionContainer}>{actionButton}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    minHeight: 250,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  message: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subMessage: {
    textAlign: 'center',
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
