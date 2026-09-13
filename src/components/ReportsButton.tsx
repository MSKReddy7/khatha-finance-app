import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type ReportsButtonVariant = 'banner' | 'pill' | 'header';

interface ReportsButtonProps {
  onPress: () => void;
  variant?: ReportsButtonVariant;
  style?: ViewStyle;
}

export const ReportsButton: React.FC<ReportsButtonProps> = ({
  onPress,
  variant = 'banner',
  style,
}) => {
  const { t } = useTranslation();
  const theme = useTheme() as any;

  if (variant === 'header') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.headerBtn,
          {
            backgroundColor: pressed ? theme.colors.primary : theme.colors.primaryContainer,
            borderColor: `${theme.colors.primary}40`,
          },
          style,
        ]}
      >
        {({ pressed }) => (
          <>
            <MaterialCommunityIcons
              name="chart-box-outline"
              size={17}
              color={pressed ? '#FFFFFF' : theme.colors.primary}
            />
            <Text
              variant="labelMedium"
              style={[styles.headerLabel, { color: pressed ? '#FFFFFF' : theme.colors.primary }]}
            >
              {t('reports.title')}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  if (variant === 'pill') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: pressed ? `${theme.colors.primary}18` : `${theme.colors.primary}10`,
            borderColor: `${theme.colors.primary}35`,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          style,
        ]}
      >
        <View style={[styles.pillIconWrap, { backgroundColor: theme.colors.primary }]}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={14} color="#FFFFFF" />
        </View>
        <Text variant="labelMedium" style={[styles.pillLabel, { color: theme.colors.primary }]}>
          {t('reports.title')}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: theme.colors.primary,
          opacity: pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.bannerAccent} />
      <View style={styles.bannerIconWrap}>
        <MaterialCommunityIcons name="chart-box-outline" size={24} color="#FFFFFF" />
      </View>
      <View style={styles.bannerText}>
        <Text variant="titleMedium" style={styles.bannerTitle}>
          {t('reports.title')}
        </Text>
        <Text variant="bodySmall" style={styles.bannerSubtitle}>
          {t('reports.subtitle')}
        </Text>
      </View>
      <View style={styles.bannerChevron}>
        <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  bannerAccent: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bannerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontSize: 12,
    fontWeight: '500',
  },
  bannerChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  pillIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  headerLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
});
