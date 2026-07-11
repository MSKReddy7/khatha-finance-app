import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BooksStackParamList, TabParamList } from '../types';

// Screens
import { BooksScreen } from '../screens/BooksScreen';
import { BookDetailsScreen } from '../screens/BookDetailsScreen';
import { ContactDetailsScreen } from '../screens/ContactDetailsScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { BookReportsScreen } from '../screens/BookReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<TabParamList>();
const BooksStack = createNativeStackNavigator<BooksStackParamList>();

// Inner stack navigator for the Books tab
const BooksNavigator = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;

  const headerStyle = {
    backgroundColor: theme.colors.surface,
  };
  const headerOptions = {
    headerStyle,
    headerShadowVisible: false,
    headerTintColor: theme.colors.onSurface,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
  };

  return (
    <BooksStack.Navigator screenOptions={headerOptions}>
      <BooksStack.Screen
        name="BooksList"
        component={BooksScreen}
        options={{ title: t('books.title') }}
      />
      <BooksStack.Screen
        name="BookDetails"
        component={BookDetailsScreen}
        options={({ route, navigation }) => ({
          title: route.params.bookName,
          // headerRight: () => (
          //   <IconButton
          //     icon="file-document-outline"
          //     iconColor={theme.colors.primary}
          //     onPress={() =>
          //       navigation.navigate('BookReports', {
          //         bookId: route.params.bookId,
          //         bookName: route.params.bookName,
          //       })
          //     }
          //   />
          // ),
        })}
      />
      <BooksStack.Screen
        name="BookReports"
        component={BookReportsScreen}
        options={({ route }) => ({ title: `${route.params.bookName} — ${t('reports.title')}` })}
      />
      <BooksStack.Screen
        name="ContactDetails"
        component={ContactDetailsScreen}
        options={{ title: t('contacts.title') }}
      />
      <BooksStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={({ route }) => ({
          title: route.params.transactionId
            ? t('transactions.editTransaction')
            : t('transactions.addTransaction'),
        })}
      />
    </BooksStack.Navigator>
  );
};

export const AppNavigator = () => {
  const { t } = useTranslation();
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const iconName = route.name === 'BooksTab' ? 'book-multiple' : 'cog';
          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          paddingTop: 6,
          elevation: 8,
          shadowOpacity: 0.1,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="BooksTab"
        component={BooksNavigator}
        options={{ tabBarLabel: t('books.title') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings.title'),
          headerShown: true,
          headerTitle: t('settings.title'),
          headerStyle: { backgroundColor: theme.colors.surface },
          headerShadowVisible: false,
          headerTintColor: theme.colors.onSurface,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}
      />
    </Tab.Navigator>
  );
};

export default AppNavigator;
