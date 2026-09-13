import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DatabaseService } from '../services/DatabaseService';
import { useDataStore } from '../store';
import { BooksStackParamList, TransactionType } from '../types';
import dayjs from 'dayjs';

type NavigationProp = NativeStackNavigationProp<BooksStackParamList>;
type AddTransactionRouteProp = RouteProp<BooksStackParamList, 'AddTransaction'>;

const getTransactionSchema = (t: (key: string) => string) =>
  z.object({
    type: z.enum(['GAVE', 'RECEIVED']),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: t('validation.amountMin'),
    }),
    note: z.string().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .refine((val) => dayjs(val).isValid(), 'Enter a valid date'),
  });

type FormData = {
  type: TransactionType;
  amount: string;
  note: string;
  date: string;
};

export const AddTransactionScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddTransactionRouteProp>();

  const { contactId, transactionId, initialType } = route.params;
  const [loading, setLoading] = useState(false);

  const triggerRefresh = useDataStore((state) => state.triggerRefresh);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(getTransactionSchema(t)) as any,
    defaultValues: {
      type: initialType || 'GAVE',
      amount: '',
      note: '',
      date: dayjs().format('YYYY-MM-DD'),
    },
  });

  const selectedType = watch('type');
  const typeColor = selectedType === 'GAVE' ? theme.colors.gave : theme.colors.received;

  useEffect(() => {
    if (transactionId) {
      DatabaseService.getTransactionById(transactionId).then((tx) => {
        if (tx) {
          setValue('type', tx.type);
          setValue('amount', tx.amount.toString());
          setValue('note', tx.note || '');
          setValue('date', dayjs(tx.transaction_date).format('YYYY-MM-DD'));
        }
      });
    }
  }, [transactionId]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const amt = parseFloat(data.amount);
      const note = data.note || '';
      const dateStr = dayjs(data.date).toISOString();

      if (transactionId) {
        await DatabaseService.updateTransaction(transactionId, data.type, amt, note, dateStr);
      } else {
        await DatabaseService.createTransaction(contactId, data.type, amt, note, dateStr);
      }
      triggerRefresh();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert(t('common.error'), 'Could not save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Type selector */}
      <Controller
        control={control}
        name="type"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.outline }]}>
              {t('transactions.type')}
            </Text>
            <SegmentedButtons
              value={value}
              onValueChange={onChange}
              buttons={[
                {
                  value: 'GAVE',
                  label: `💰 ${t('transactions.gave').split(' ')[0]}`,
                  checkedColor: '#FFFFFF',
                  style: [
                    styles.segmentedButton,
                    value === 'GAVE' ? { backgroundColor: theme.colors.gave, borderColor: theme.colors.gave } : { borderColor: theme.colors.border },
                  ],
                },
                {
                  value: 'RECEIVED',
                  label: `💵 ${t('transactions.received').split(' ')[0]}`,
                  checkedColor: '#FFFFFF',
                  style: [
                    styles.segmentedButton,
                    value === 'RECEIVED' ? { backgroundColor: theme.colors.received, borderColor: theme.colors.received } : { borderColor: theme.colors.border },
                  ],
                },
              ]}
            />
          </View>
        )}
      />

      {/* Amount */}
      <Controller
        control={control}
        name="amount"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.outline }]}>
              {t('transactions.amount')}
            </Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              keyboardType="numeric"
              error={!!errors.amount}
              left={<TextInput.Affix text="₹ " />}
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={typeColor}
              placeholderTextColor={theme.colors.outline}
              theme={{ roundness: 12 }}
              placeholder="0"
            />
            {errors.amount && (
              <Text style={[styles.error, { color: theme.colors.error }]}>
                {errors.amount.message}
              </Text>
            )}
          </View>
        )}
      />

      {/* Date */}
      <Controller
        control={control}
        name="date"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.outline }]}>
              {t('transactions.date')}
            </Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              placeholder="YYYY-MM-DD"
              error={!!errors.date}
              right={<TextInput.Icon icon="calendar" color={theme.colors.primary} />}
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              placeholderTextColor={theme.colors.outline}
              theme={{ roundness: 12 }}
            />
            {errors.date && (
              <Text style={[styles.error, { color: theme.colors.error }]}>
                {errors.date.message}
              </Text>
            )}
          </View>
        )}
      />

      {/* Note */}
      <Controller
        control={control}
        name="note"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text variant="labelLarge" style={[styles.label, { color: theme.colors.outline }]}>
              {t('transactions.note')}
            </Text>
            <TextInput
              value={value}
              onChangeText={onChange}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              outlineColor={theme.colors.border}
              activeOutlineColor={theme.colors.primary}
              placeholderTextColor={theme.colors.outline}
              theme={{ roundness: 12 }}
              placeholder={t('transactions.notePlaceholder') || 'Add a description...'}
            />
          </View>
        )}
      />

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          style={[styles.button, { borderColor: theme.colors.border }]}
          textColor={theme.colors.onSurface}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          {t('transactions.cancel')}
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          buttonColor={typeColor}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
        >
          {t('transactions.save')}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: { backgroundColor: 'transparent' },
  segmentedButton: {
    borderRadius: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
});
