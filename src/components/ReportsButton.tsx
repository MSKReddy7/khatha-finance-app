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
          shadowColor: theme.colors.primary,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.bannerAccent} />
      <View style={styles.bannerIconWrap}>
        <MaterialCommunityIcons name="chart-box-outline" size={26} color="#FFFFFF" />
      </View>
      <View style={styles.bannerText}>
        <Text variant="titleSmall" style={styles.bannerTitle}>
          {t('reports.title')}
        </Text>
        <Text variant="bodySmall" style={styles.bannerSubtitle}>
          {t('reports.subtitle')}
        </Text>
      </View>
      <View style={styles.bannerChevron}>
        <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOpacity: 0.28,
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
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    marginTop: 2,
    fontSize: 12,
  },
  bannerChevron: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  pillIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  headerLabel: {
    fontWeight: '700',
    fontSize: 12,
  },
});
