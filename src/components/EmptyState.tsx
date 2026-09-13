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
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name={icon as any} size={44} color={theme.colors.primary} />
      </View>
      <Text variant="titleMedium" style={[styles.message, { color: theme.colors.onSurface }]}>
        {message}
      </Text>
      {subMessage && (
        <Text variant="bodyMedium" style={[styles.subMessage, { color: theme.colors.outline }]}>
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
    padding: 32,
    minHeight: 280,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  message: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 8,
  },
  subMessage: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
});
