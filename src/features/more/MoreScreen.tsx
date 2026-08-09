import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { EnquiriesScreen } from '../enquiries/EnquiriesScreen';
import { MeterScreen } from '../meter/MeterScreen';
import { NoticesScreen } from '../notices/NoticesScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

type MoreView = 'enquiries' | 'notices' | 'meter' | 'settings';

const moreViews: Array<{ label: string; value: MoreView }> = [
  { label: 'Enquiries', value: 'enquiries' },
  { label: 'Notices', value: 'notices' },
  { label: 'Meter', value: 'meter' },
  { label: 'Settings', value: 'settings' },
];

export function MoreScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const [view, setView] = useState<MoreView>('enquiries');

  return (
    <View>
      <View style={styles.switcher}>
        {moreViews.map((item) => {
          const active = item.value === view;

          return (
            <Pressable key={item.value} onPress={() => setView(item.value)} style={[styles.switchItem, active && styles.switchItemActive]}>
              <Text style={[styles.switchText, active && styles.switchTextActive]}>{t(item.label)}</Text>
            </Pressable>
          );
        })}
      </View>

      {view === 'enquiries' ? (
        <EnquiriesScreen />
      ) : view === 'notices' ? (
        <NoticesScreen />
      ) : view === 'meter' ? (
        <MeterScreen />
      ) : (
        <SettingsScreen />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    switcher: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      padding: spacing.sm,
    },
    switchItem: {
      alignItems: 'center',
      borderRadius: radius.md,
      flex: 1,
      minHeight: 42,
      justifyContent: 'center',
    },
    switchItemActive: {
      backgroundColor: colors.ink,
    },
    switchText: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.black,
    },
    switchTextActive: {
      color: colors.onBrand,
    },
  });
}
